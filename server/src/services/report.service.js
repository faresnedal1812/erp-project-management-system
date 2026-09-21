import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";

// ── Helpers ─────────────────────────────────────────────────────

/** Build optional date-range filter for Prisma where clauses. */
const dateFilter = (from, to) => {
  if (!from && !to) return undefined;
  return {
    ...(from && { gte: new Date(from) }),
    ...(to && { lte: new Date(to) }),
  };
};

/** Count tasks matching a specific status (or array of statuses). */
const countByStatus = (tasks, status) =>
  Array.isArray(status)
    ? tasks.filter((t) => status.includes(t.status)).length
    : tasks.filter((t) => t.status === status).length;

const now = () => new Date();

// ── 1. Project Progress Report ───────────────────────────────────

export const getProjectProgressReport = async (
  companyId,
  projectId,
  { from, to } = {},
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      status: true,
      companyId: true,
      startDate: true,
      endDate: true,
      client: { select: { name: true } },
      milestones: {
        select: {
          id: true,
          name: true,
          dueDate: true,
          isCompleted: true,
        },
        orderBy: { dueDate: "asc" },
      },
      tasks: {
        where: from || to ? { createdAt: dateFilter(from, to) } : undefined,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          completedAt: true,
          assignments: {
            select: {
              employee: {
                select: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!project) throw ApiError.notFound("Project not found");
  if (project.companyId !== companyId)
    throw ApiError.forbidden("Access denied");

  const total = project.tasks.length;
  const completed = countByStatus(project.tasks, "DONE");
  const cancelled = countByStatus(project.tasks, "CANCELLED");
  const overdue = project.tasks.filter(
    (t) =>
      !["DONE", "CANCELLED"].includes(t.status) &&
      t.dueDate &&
      t.dueDate < now(),
  ).length;
  const pending = total - completed - cancelled;
  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    project: {
      id: project.id,
      name: project.name,
      status: project.status,
      client: project.client?.name ?? null,
      startDate: project.startDate,
      endDate: project.endDate,
    },
    summary: { total, completed, pending, overdue, cancelled, progressPct },
    milestones: project.milestones,
    tasks: project.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      completedAt: t.completedAt,
      assignees: t.assignments.map(
        (a) => `${a.employee.user.firstName} ${a.employee.user.lastName}`,
      ),
    })),
  };
};

// ── 2. Employee Workload Report ──────────────────────────────────

export const getEmployeeWorkloadReport = async (
  companyId,
  { from, to, employeeId } = {},
) => {
  // Resolve all employees in this company (or a specific one)
  const empWhere = {
    department: { branch: { companyId } },
    ...(employeeId && { id: employeeId }),
  };

  const employees = await prisma.employee.findMany({
    where: empWhere,
    select: {
      id: true,
      position: true,
      employmentStatus: true,
      user: { select: { firstName: true, lastName: true, email: true } },
      taskAssignments: {
        where:
          from || to
            ? { task: { createdAt: dateFilter(from, to) } }
            : undefined,
        select: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              dueDate: true,
              completedAt: true,
              project: { select: { id: true, name: true } },
            },
          },
        },
      },
      timeEntries: {
        where: {
          endedAt: { not: null }, // only completed entries
          ...(from || to ? { startedAt: dateFilter(from, to) } : {}),
        },
        select: { durationMin: true },
      },
    },
    orderBy: { user: { lastName: "asc" } },
  });

  if (employeeId && employees.length === 0) {
    throw ApiError.notFound("Employee not found in this company");
  }

  return employees.map((emp) => {
    const tasks = emp.taskAssignments.map((a) => a.task);
    const completedTasks = tasks.filter((t) => t.status === "DONE");
    const openTasks = tasks.filter(
      (t) => !["DONE", "CANCELLED"].includes(t.status),
    );
    const overdueTasks = openTasks.filter(
      (t) => t.dueDate && t.dueDate < now(),
    );
    const totalMinutes = emp.timeEntries.reduce(
      (sum, te) => sum + (te.durationMin ?? 0),
      0,
    );

    return {
      employeeId: emp.id,
      name: `${emp.user.firstName} ${emp.user.lastName}`,
      email: emp.user.email,
      position: emp.position,
      status: emp.employmentStatus,
      totalTasksAssigned: tasks.length,
      totalTasksCompleted: completedTasks.length,
      totalOpenTasks: openTasks.length,
      totalOverdueTasks: overdueTasks.length,
      loggedMinutes: totalMinutes,
      loggedHours: +(totalMinutes / 60).toFixed(2),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        project: t.project.name,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
      })),
    };
  });
};

// ── 3. Time Tracking Report ──────────────────────────────────────

export const getTimeTrackingReport = async (
  companyId,
  { from, to, projectId, employeeId, groupBy = "project" } = {},
) => {
  // If a specific project is requested, verify company ownership
  if (projectId) {
    const proj = await prisma.project.findUnique({
      where: { id: projectId },
      select: { companyId: true },
    });
    if (!proj || proj.companyId !== companyId)
      throw ApiError.forbidden("Access denied");
  }

  // If a specific employee is requested, verify they belong to this company
  if (employeeId) {
    const emp = await prisma.employee.findFirst({
      where: { id: employeeId, department: { branch: { companyId } } },
      select: { id: true },
    });
    if (!emp)
      throw ApiError.forbidden("Employee does not belong to this company");
  }

  const entries = await prisma.timeEntry.findMany({
    where: {
      endedAt: { not: null }, // only completed entries
      ...(from || to ? { startedAt: dateFilter(from, to) } : {}),
      ...(employeeId
        ? { employeeId }
        : {
            employee: { department: { branch: { companyId } } },
          }),
      ...(projectId
        ? { task: { projectId } }
        : { task: { project: { companyId } } }),
    },
    select: {
      id: true,
      description: true,
      startedAt: true,
      endedAt: true,
      durationMin: true,
      employee: {
        select: {
          id: true,
          user: { select: { firstName: true, lastName: true } },
        },
      },
      task: {
        select: {
          id: true,
          title: true,
          project: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { startedAt: "asc" },
  });

  const flat = entries.map((e) => ({
    entryId: e.id,
    employeeId: e.employee.id,
    employee: `${e.employee.user.firstName} ${e.employee.user.lastName}`,
    projectId: e.task.project.id,
    project: e.task.project.name,
    taskId: e.task.id,
    task: e.task.title,
    description: e.description ?? "",
    startedAt: e.startedAt,
    endedAt: e.endedAt,
    durationMin: e.durationMin ?? 0,
    durationHours: +((e.durationMin ?? 0) / 60).toFixed(2),
  }));

  // Group the results
  const grouped = {};
  const groupKey = groupBy === "employee" ? "employeeId" : "projectId";
  const groupLabel = groupBy === "employee" ? "employee" : "project";

  flat.forEach((row) => {
    const key = row[groupKey];
    if (!grouped[key]) {
      grouped[key] = {
        id: key,
        label: row[groupLabel],
        totalMinutes: 0,
        entries: [],
      };
    }
    grouped[key].totalMinutes += row.durationMin;
    grouped[key].entries.push(row);
  });

  return Object.values(grouped).map((g) => ({
    ...g,
    totalHours: +(g.totalMinutes / 60).toFixed(2),
  }));
};

// ── 4. Client Activity Report ────────────────────────────────────

export const getClientActivityReport = async (
  companyId,
  clientId,
  { from, to } = {},
) => {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      companyId: true,
      contactName: true,
      email: true,
      phone: true,
      status: true,
      projects: {
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
          _count: { select: { tasks: true } },
        },
      },
      documents: {
        where: from || to ? { createdAt: dateFilter(from, to) } : undefined,
        select: {
          id: true,
          title: true,
          category: true,
          scope: true,
          fileName: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      meetingAttendances: {
        where: {
          meeting: {
            companyId,
            status: { not: "CANCELLED" },
            ...(from || to ? { startTime: dateFilter(from, to) } : {}),
          },
        },
        select: {
          meeting: {
            select: {
              id: true,
              title: true,
              type: true,
              status: true,
              startTime: true,
              endTime: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) throw ApiError.notFound("Client not found");
  if (client.companyId !== companyId) throw ApiError.forbidden("Access denied");

  return {
    client: {
      id: client.id,
      name: client.name,
      contactName: client.contactName,
      email: client.email,
      phone: client.phone,
      status: client.status,
    },
    summary: {
      totalProjects: client.projects.length,
      totalDocuments: client.documents.length,
      totalMeetings: client.meetingAttendances.length,
    },
    projects: client.projects,
    documents: client.documents,
    meetings: client.meetingAttendances.map((a) => a.meeting),
  };
};

// ── 5. Vendor Agreements Report ──────────────────────────────────

export const getVendorAgreementsReport = async (
  companyId,
  vendorId,
  { from, to } = {},
) => {
  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      name: true,
      companyId: true,
      type: true,
      contactName: true,
      email: true,
      phone: true,
      taxId: true,
      paymentTerms: true,
      status: true,
      notes: true,
      documents: {
        where: from || to ? { createdAt: dateFilter(from, to) } : undefined,
        select: {
          id: true,
          title: true,
          category: true,
          scope: true,
          fileName: true,
          fileUrl: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
          uploader: {
            select: { user: { select: { firstName: true, lastName: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      meetingAttendances: {
        where: {
          meeting: {
            companyId,
            status: { not: "CANCELLED" },
            ...(from || to ? { startTime: dateFilter(from, to) } : {}),
          },
        },
        select: {
          meeting: {
            select: {
              id: true,
              title: true,
              status: true,
              startTime: true,
              endTime: true,
            },
          },
        },
      },
    },
  });

  if (!vendor) throw ApiError.notFound("Vendor not found");
  if (vendor.companyId !== companyId) throw ApiError.forbidden("Access denied");

  const agreements = vendor.documents.filter(
    (d) => d.category === "AGREEMENT" || d.category === "CONTRACT",
  );
  const otherDocs = vendor.documents.filter(
    (d) => !["AGREEMENT", "CONTRACT"].includes(d.category),
  );

  return {
    vendor: {
      id: vendor.id,
      name: vendor.name,
      type: vendor.type,
      contactName: vendor.contactName,
      email: vendor.email,
      phone: vendor.phone,
      taxId: vendor.taxId,
      paymentTerms: vendor.paymentTerms,
      status: vendor.status,
      notes: vendor.notes,
    },
    summary: {
      totalAgreements: agreements.length,
      totalDocuments: vendor.documents.length,
      totalMeetings: vendor.meetingAttendances.length,
    },
    agreements: agreements.map((d) => ({
      ...d,
      uploadedBy: `${d.uploader.user.firstName} ${d.uploader.user.lastName}`,
      uploader: undefined,
    })),
    otherDocuments: otherDocs.map((d) => ({
      ...d,
      uploadedBy: `${d.uploader.user.firstName} ${d.uploader.user.lastName}`,
      uploader: undefined,
    })),
    meetings: vendor.meetingAttendances.map((a) => a.meeting),
  };
};
