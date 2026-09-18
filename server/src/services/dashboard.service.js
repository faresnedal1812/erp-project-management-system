import prisma from "../config/database.js";
import { DateTime } from "luxon";

// ── Timezone Helpers ───────────────────────────────────────────────

/**
 * Returns UTC-aware start-of-week (Monday) and end-of-week (Sunday 23:59:59.999)
 * boundaries for the current week, adjusted by the given IANA timezone offset.
 *
 * Because Prisma/PostgreSQL stores all datetimes in UTC, we compute the window
 * in UTC using the company's timezone offset so that "this week" is correctly
 * scoped to the company's local calendar.
 */

const getWeekBoundaries = (timezone = "UTC") => {
  try {
    const localNow = DateTime.now().setZone(timezone);

    if (!localNow.isValid) {
      throw new Error(`Invalid timezone: ${timezone}`);
    }

    const weekStart = localNow.startOf("week");
    const weekEnd = localNow.endOf("week");

    return {
      weekStart: weekStart.toUTC().toJSDate(),
      weekEnd: weekEnd.toUTC().toJSDate(),
    };
  } catch {
    const utcNow = DateTime.utc();

    return {
      weekStart: utcNow.startOf("week").toJSDate(),
      weekEnd: utcNow.endOf("week").toJSDate(),
    };
  }
};

// ── Constants ─────────────────────────────────────────────────────

const OPEN_TASK_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW"];
const UPCOMING_DAYS = 7;

// ── Main Service ──────────────────────────────────────────────────

/**
 * Aggregates all dashboard metrics for a given company.
 *
 * WHY NO EMPLOYEE RESOLUTION FOR THE VIEWER:
 * Dashboard access is gated via CompanyMember role + READ:DASHBOARD permission.
 * An OWNER or ADMIN may not have an Employee record (they are company members,
 * not necessarily department employees). We never resolve an employeeId for the
 * requesting user — we only read aggregated company data.
 *
 * @param {string} companyId - The company scope (from requireCompany middleware)
 */
export const getDashboard = async (companyId) => {
  // 1. Fetch company timezone from settings (for week-boundary calculations).
  const settings = await prisma.companySettings.findUnique({
    where: { companyId },
    select: { timezone: true },
  });
  const timezone = settings?.timezone ?? "UTC";
  const { weekStart, weekEnd } = getWeekBoundaries(timezone);

  const now = new Date();
  const upcomingCutoff = new Date(now);
  upcomingCutoff.setDate(upcomingCutoff.getDate() + UPCOMING_DAYS);

  // ── Scoping helpers ──────────────────────────────────────────────
  // Tasks belong to projects which belong to the company.
  // TimeEntries belong to tasks → projects → company.
  const companyProjectIds = (
    await prisma.project.findMany({
      where: { companyId },
      select: { id: true },
    })
  ).map((p) => p.id);

  // Active employees scoped to this company (via department → branch → company).
  const companyBranchIds = (
    await prisma.branch.findMany({
      where: { companyId },
      select: { id: true },
    })
  ).map((b) => b.id);

  const companyDepartmentIds = (
    await prisma.department.findMany({
      where: { branchId: { in: companyBranchIds } },
      select: { id: true },
    })
  ).map((d) => d.id);

  // ── All Aggregations in Parallel ─────────────────────────────────
  const [
    // Projects
    totalProjects,
    projectsByStatus,
    topActiveProjects,
    // Tasks
    totalTasks,
    tasksByStatus,
    tasksByPriority,
    openTaskCount,
    overdueTaskCount,
    // Employees
    totalActiveEmployees,
    employeesByDept,
    // Meetings
    meetingsThisWeek,
    // Documents
    totalDocuments,
    // Clients
    totalClients,
    activeClients,
    // Vendors
    totalVendors,
    activeVendors,
    // Time Tracking
    timeEntriesThisWeek,
    // Upcoming Deadlines: Tasks
    upcomingTasks,
    // Upcoming Deadlines: Milestones
    upcomingMilestones,
    // Recent Activity
    recentActivity,
  ] = await Promise.all([
    // ── Projects ────────────────────────────────────────────────────
    prisma.project.count({ where: { companyId } }),

    prisma.project.groupBy({
      by: ["status"],
      where: { companyId },
      _count: { status: true },
    }),

    // Top active projects ranked by open task count (limited to 5).
    prisma.project
      .findMany({
        where: { companyId, status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          status: true,
          _count: {
            select: {
              tasks: { where: { status: { in: OPEN_TASK_STATUSES } } },
            },
          },
        },
      })
      .then((projects) =>
        projects
          .map((p) => ({
            id: p.id,
            name: p.name,
            openTaskCount: p._count.tasks,
          }))
          .sort((a, b) => b.openTaskCount - a.openTaskCount)
          .slice(0, 5),
      ),

    // ── Tasks ───────────────────────────────────────────────────────
    companyProjectIds.length > 0
      ? prisma.task.count({
          where: { projectId: { in: companyProjectIds } },
        })
      : Promise.resolve(0),

    companyProjectIds.length > 0
      ? prisma.task.groupBy({
          by: ["status"],
          where: { projectId: { in: companyProjectIds } },
          _count: { status: true },
        })
      : Promise.resolve([]),

    companyProjectIds.length > 0
      ? prisma.task.groupBy({
          by: ["priority"],
          where: { projectId: { in: companyProjectIds } },
          _count: { priority: true },
        })
      : Promise.resolve([]),

    companyProjectIds.length > 0
      ? prisma.task.count({
          where: {
            projectId: { in: companyProjectIds },
            status: { in: OPEN_TASK_STATUSES },
          },
        })
      : Promise.resolve(0),

    companyProjectIds.length > 0
      ? prisma.task.count({
          where: {
            projectId: { in: companyProjectIds },
            status: { in: OPEN_TASK_STATUSES },
            dueDate: { lt: now },
          },
        })
      : Promise.resolve(0),

    // ── Employees ───────────────────────────────────────────────────
    companyDepartmentIds.length > 0
      ? prisma.employee.count({
          where: {
            departmentId: { in: companyDepartmentIds },
            employmentStatus: "ACTIVE",
          },
        })
      : Promise.resolve(0),

    companyDepartmentIds.length > 0
      ? prisma.employee
          .groupBy({
            by: ["departmentId"],
            where: {
              departmentId: { in: companyDepartmentIds },
              employmentStatus: "ACTIVE",
            },
            _count: { departmentId: true },
          })
          .then(async (groups) => {
            const deptIds = groups.map((g) => g.departmentId);
            const depts = await prisma.department.findMany({
              where: { id: { in: deptIds } },
              select: { id: true, name: true },
            });
            const deptMap = Object.fromEntries(
              depts.map((d) => [d.id, d.name]),
            );
            return groups.map((g) => ({
              departmentId: g.departmentId,
              departmentName: deptMap[g.departmentId] ?? "Unknown",
              count: g._count.departmentId,
            }));
          })
      : Promise.resolve([]),

    // ── Meetings ────────────────────────────────────────────────────
    prisma.meeting.count({
      where: {
        companyId,
        startTime: { gte: weekStart, lte: weekEnd },
      },
    }),

    // ── Documents ───────────────────────────────────────────────────
    prisma.document.count({ where: { companyId } }),

    // ── Clients ─────────────────────────────────────────────────────
    prisma.client.count({ where: { companyId } }),
    prisma.client.count({ where: { companyId, status: "ACTIVE" } }),

    // ── Vendors ─────────────────────────────────────────────────────
    prisma.vendor.count({ where: { companyId } }),
    prisma.vendor.count({ where: { companyId, status: "ACTIVE" } }),

    // ── Time Tracking ────────────────────────────────────────────────
    companyProjectIds.length > 0
      ? prisma.timeEntry.aggregate({
          where: {
            task: { projectId: { in: companyProjectIds } },
            startedAt: { gte: weekStart, lte: weekEnd },
          },
          _sum: { durationMin: true },
          _count: { id: true },
        })
      : Promise.resolve({ _sum: { durationMin: 0 }, _count: { id: 0 } }),

    // ── Upcoming Tasks ───────────────────────────────────────────────
    companyProjectIds.length > 0
      ? prisma.task.findMany({
          where: {
            projectId: { in: companyProjectIds },
            status: { in: OPEN_TASK_STATUSES },
            dueDate: { gte: now, lte: upcomingCutoff },
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            priority: true,
            projectId: true,
          },
          orderBy: { dueDate: "asc" },
          take: 10,
        })
      : Promise.resolve([]),

    // ── Upcoming Milestones ──────────────────────────────────────────
    companyProjectIds.length > 0
      ? prisma.milestone.findMany({
          where: {
            projectId: { in: companyProjectIds },
            isCompleted: false,
            dueDate: { gte: now, lte: upcomingCutoff },
          },
          select: { id: true, name: true, dueDate: true, projectId: true },
          orderBy: { dueDate: "asc" },
          take: 10,
        })
      : Promise.resolve([]),

    // ── Recent Activity ──────────────────────────────────────────────
    prisma.activityLog.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        action: true,
        createdAt: true,
        meta: true,
        employee: {
          select: {
            id: true,
            position: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        project: { select: { id: true, name: true } },
        task: { select: { id: true, title: true } },
      },
    }),
  ]);

  // ── Shape Responses ───────────────────────────────────────────────

  const shapeGroupBy = (rows, key) => {
    const map = {};
    for (const row of rows) {
      map[row[key]] = row._count[key];
    }
    return map;
  };

  return {
    projects: {
      total: totalProjects,
      byStatus: shapeGroupBy(projectsByStatus, "status"),
      topActiveProjects,
    },
    tasks: {
      total: totalTasks,
      byStatus: shapeGroupBy(tasksByStatus, "status"),
      byPriority: shapeGroupBy(tasksByPriority, "priority"),
      openCount: openTaskCount,
      overdueCount: overdueTaskCount,
    },
    employees: {
      totalActive: totalActiveEmployees,
      byDepartment: employeesByDept,
    },
    meetings: {
      thisWeek: meetingsThisWeek,
    },
    documents: {
      total: totalDocuments,
    },
    clients: {
      total: totalClients,
      active: activeClients,
    },
    vendors: {
      total: totalVendors,
      active: activeVendors,
    },
    timeTracking: {
      totalMinutesThisWeek: timeEntriesThisWeek._sum?.durationMin ?? 0,
      totalEntriesThisWeek: timeEntriesThisWeek._count?.id ?? 0,
    },
    upcomingDeadlines: {
      tasks: upcomingTasks,
      milestones: upcomingMilestones,
    },
    recentActivity,
  };
};
