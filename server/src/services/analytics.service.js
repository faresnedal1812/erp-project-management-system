import prisma from "../config/database.js";
import { DateTime } from "luxon";
import { Prisma } from "@prisma/client";

/**
 * Maps granularity to Luxon format strings for Javascript padding
 */
const luxonFormatOptions = {
  day: "yyyy-MM-dd",
  week: "kkkk-'W'WW", // ISO week year and week
  month: "yyyy-MM",
};

/**
 * Maps granularity to PostgreSQL `to_char` format strings
 */
const pgFormatOptions = {
  day: "YYYY-MM-DD",
  week: 'IYYY-"W"IW',
  month: "YYYY-MM",
};

/**
 * Generate a continuous timeline of periods (zero-padded)
 */

// [
//   { period: "2026/9/15" }
//   { period: "2026/9/16" }
//            .
//            .
//            .
//   { period: "2026/9/20" }
// ]
const generateTimeBuckets = (from, to, granularity, timezone) => {
  const fromDt = DateTime.fromJSDate(from)
    .setZone(timezone)
    .startOf(granularity);
  const toDt = DateTime.fromJSDate(to).setZone(timezone).endOf(granularity);
  const format = luxonFormatOptions[granularity];

  let buckets = [];
  let current = fromDt;
  while (current <= toDt) {
    buckets.push({ period: current.toFormat(format) });
    current = current.plus({ [granularity + "s"]: 1 }).startOf(granularity);
  }

  return buckets;
};

/**
 * Helper to get the company timezone
 */
const getCompanyTimezone = async (companyId) => {
  const settings = await prisma.companySettings.findUnique({
    where: { companyId },
    select: { timezone: true },
  });

  return settings?.timezone || "UTC";
};

// ── Analytics Handlers ──────────────────────────────────────────

export const getTasksAnalytics = async (companyId, from, to, granularity) => {
  const timezone = await getCompanyTimezone(companyId);
  const buckets = generateTimeBuckets(from, to, granularity, timezone);
  const pgFormat = pgFormatOptions[granularity];

  // [
  //   {period: "2026/9/18", count: 6}
  //   {period: "2026/9/19", count: 3}
  // ]

  // Get tasks created per period
  // Get tasks completed per period (using actual completedAt)
  const [createdRows, completedRows] = await Promise.all([
    prisma.$queryRaw`
      SELECT 
        to_char(date_trunc(${granularity}, t."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone}),${pgFormat}) as period,
        COUNT(t.id)::int as count
      FROM tasks t
      JOIN projects p ON t."projectId" = p.id
      WHERE p."companyId" = ${companyId}
        AND t."createdAt" >= ${from}
        AND t."createdAt" <= ${to}
      GROUP BY period
    `,
    prisma.$queryRaw`
      SELECT
        to_char(date_trunc(${granularity}, t."completedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone}), ${pgFormat}) as period,
        COUNT(t.id)::int as count
      FROM tasks t
      JOIN projects p ON t."projectId" = p.id
      WHERE p."companyId" = ${companyId}
        AND t.status = 'DONE'
        AND t."completedAt" IS NOT null
        AND t."completedAt" >= ${from}
        AND t."completedAt" <= ${to}
      GROUP BY period
    `,
  ]);

  // const createdMap = new Map( createdRows.map((r) => [r.period, r.count])));

  const createdMap = Object.fromEntries(
    createdRows.map((r) => [r.period, r.count]),
  );

  const completedMap = Object.fromEntries(
    completedRows.map((r) => [r.period, r.count]),
  );

  let cumulativeCreated = 0;
  let cumulativeCompleted = 0;

  const chartData = buckets.map((b) => {
    const created = createdMap[b.period] || 0;
    const completed = completedMap[b.period] || 0;
    cumulativeCreated += created;
    cumulativeCompleted += completed;

    return {
      period: b.period,
      createdTasks: created,
      completedTasks: completed,
      cumulativeCreatedTasks: cumulativeCreated,
      cumulativeCompletedTasks: cumulativeCompleted,
    };
  });

  return chartData;
};

export const getProjectVelocity = async (
  companyId,
  from,
  to,
  granularity,
  projectId = null,
) => {
  const timezone = await getCompanyTimezone(companyId);
  const buckets = generateTimeBuckets(from, to, granularity, timezone);
  const pgFormat = pgFormatOptions[granularity];

  // If projectId is provided, must enforce array or single constraint securely
  const projectCondition = projectId
    ? Prisma.sql`AND p.id = ${projectId}`
    : Prisma.empty;

  // [
  //   { period: "2026/9/15", count: 6, completed_points: 15 },
  //   { period: "2026/9/16", count: 8, completed_points: 8 },
  //   { period: "2026/9/17", count: 3, completed_points: 12 },
  // ];

  const completedRows = await prisma.$queryRaw`
      SELECT
        to_char(date_trunc(${granularity}, t."completedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone}), ${pgFormat}) as period,
        COUNT(t.id)::int as completed_tasks,
        SUM(COALESCE(t."estimatedHours", 0))::float as completed_points
      FROM tasks t
      JOIN projects p ON t."projectId" = p.id
      WHERE p."companyId" = ${companyId}
            ${projectCondition}
        AND t.status = 'DONE'
        AND t."completedAt" IS NOT null
        AND t."completedAt" >= ${from}
        AND t."completedAt" <= ${to}
      GROUP BY period
    `;

  // {
  //   "2026/9/15": {
  //     period: "2026/9/15",
  //     count: 6,
  //     completed_points: 15,
  //   },
  // };
  const rowsMap = Object.fromEntries(completedRows.map((r) => [r.period, r]));

  const chartData = buckets.map((b) => {
    const row = rowsMap[b.period];
    return {
      period: b.period,
      completedTasks: row ? row.completed_tasks : 0,
      completedPoints: row ? row.completed_points : 0,
    };
  });

  return chartData;
};

export const getEmployeeProductivity = async (
  companyId,
  from,
  to,
  granularity,
  targetEmployeeId = null,
) => {
  const timezone = await getCompanyTimezone(companyId);
  const buckets = generateTimeBuckets(from, to, granularity, timezone);
  const pgFormat = pgFormatOptions[granularity];

  // Step 1: Resolve valid employees within company
  const employeeFilter = { department: { branch: { companyId } } };
  if (targetEmployeeId) {
    employeeFilter.id = targetEmployeeId;
  }

  const employees = await prisma.employee.findMany({
    where: employeeFilter,
    select: { id: true, user: { select: { firstName: true, lastName: true } } },
  });

  if (employees.length === 0) return [];

  const employeeIds = employees.map((e) => e.id);
  const empIdList = Prisma.join(employeeIds);

  // [
  //   { period: "2026/9/15", employeeId: "emp-1", count: 6 },
  //   { period: "2026/9/15", employeeId: "emp-2", count: 3 },
  //   { period: "2026/9/16", employeeId: "emp-2", count: 8 },
  // ];

  // Step 2: Fetch time-series stats concurrently for these employees
  const [tasksCompleted, timeTracked] = await Promise.all([
    // Tasks completed by employee
    // For each period, how many completed tasks are associated with each employee?
    prisma.$queryRaw`
      SELECT to_char(date_trunc(${granularity}, t."completedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone}), ${pgFormat}) as period,
      ta."employeeId",
      COUNT(t.id)::int as count
      FROM tasks t 
      JOIN task_assignments ta ON t.id = ta."taskId"
      WHERE ta."employeeId" IN (${empIdList})
        AND t.status = 'DONE'
        AND t."completedAt" IS NOT null
        AND t."completedAt" >= ${from}
        AND t."completedAt" <= ${to}
      GROUP By period, ta."employeeId"
    `,
    // Time tracked (Minutes)
    prisma.$queryRaw`
      SELECT to_char(date_trunc(${granularity}, te."startedAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone}), ${pgFormat}) as period,
      te."employeeId",
      SUM(COALESCE(te."durationMin", 0))::int as total_minutes
      FROM time_entries te
      WHERE te."employeeId" IN (${empIdList})
        AND te."startedAt" >= ${from}
        AND te."startedAt" <= ${to}
      GROUP By period, te."employeeId"
    `,
  ]);

  // find() performs a linear search for every employee in every bucket,
  // making this less efficient than using precomputed period/employee indexes.
  // Repeated search inside loops → Build an index/Map first.
  // If you are inside a Loop and need to search for an element inside another Array repeatedly, consider creating an Index/Map beforehand.

  // const result = buckets.map((b) => ({
  //   period: b.period,
  //   employees: employees.map((e) => ({
  //     employeeId: e.id,
  //     employeeName: `${e.user.firstName} ${e.user.lastName}`,
  //     tasksCompleted:
  //       tasksCompleted.find(
  //         (row) => row.period === b.period && row.employeeId === e.id,
  //       )?.count ?? 0,
  //     trackedMinutes:
  //       timeTracked.find(
  //         (row) => row.period === b.period && row.employeeId === e.id,
  //       )?.total_minutes ?? 0,
  //   })),
  // }));

  // Aggregate memory mappings
  const result = buckets.map((b) => ({
    period: b.period,
    employees: employees.map((e) => ({
      employeeId: e.id,
      employeeName: `${e.user.firstName} ${e.user.lastName}`,
      tasksCompleted: 0,
      trackedMinutes: 0,
    })),
  }));

  const periodIdx = Object.fromEntries(buckets.map((b, i) => [b.period, i]));
  const empIdx = Object.fromEntries(employees.map((e, i) => [e.id, i]));

  tasksCompleted.forEach((row) => {
    const pIdx = periodIdx[row.period];
    const eIdx = empIdx[row.employeeId];
    if (pIdx !== undefined && eIdx !== undefined) {
      result[pIdx].employees[eIdx].tasksCompleted = row.count;
    }
  });

  timeTracked.forEach((row) => {
    const pIdx = periodIdx[row.period];
    const eIdx = empIdx[row.employeeId];
    if (pIdx !== undefined && eIdx !== undefined) {
      result[pIdx].employees[eIdx].trackedMinutes = row.total_minutes;
    }
  });

  return result;
};

export const getMeetingFrequency = async (companyId, from, to, granularity) => {
  const timezone = await getCompanyTimezone(companyId);
  const buckets = generateTimeBuckets(from, to, granularity, timezone);
  const pgFormat = pgFormatOptions[granularity];

  // [
  //   { period: "2026/9/15", count: 3, total_duration: 150 },
  //   { period: "2026/9/16", count: 2, total_duration: 180 },
  // ];
  const meetingsRows = await prisma.$queryRaw`
    SELECT
      to_char(date_trunc(${granularity}, m."startTime" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone}), ${pgFormat}) as period,
      COUNT(m.id)::int as count,
      SUM(EXTRACT(EPOCH FROM (m."endTime" - m."startTime")) / 60)::int as total_duration
    FROM meetings m
    WHERE m."companyId" = ${companyId}
      AND m."startTime" >= ${from}
      AND m."startTime" <= ${to}
      AND m.status != 'CANCELLED'
    GROUP BY period
  `;
  const rowsMap = Object.fromEntries(meetingsRows.map((r) => [r.period, r]));

  const chartData = buckets.map((b) => {
    const period = b.period;
    const row = rowsMap[period];
    const count = row ? row.count : 0;
    const totalDurationMinutes = row ? row.total_duration : 0;
    const averageDurationMinutes =
      count > 0 ? Math.round(totalDurationMinutes / count) : 0;

    return {
      period: b.period,
      meetingsCount: count,
      totalDurationMinutes,
      averageDurationMinutes,
    };
  });

  return chartData;
};

export const getOverview = async (companyId, from, to, granularity) => {
  const [tasks, velocity, employees, meetings] = await Promise.all([
    getTasksAnalytics(companyId, from, to, granularity),
    getProjectVelocity(companyId, from, to, granularity),
    getEmployeeProductivity(companyId, from, to, granularity),
    getMeetingFrequency(companyId, from, to, granularity),
  ]);

  return {
    dateRange: { from, to, granularity },
    tasks: { createdVsCompleted: tasks },
    velocity,
    employees: { productivity: employees },
    meetings: { frequency: meetings },
  };
};
