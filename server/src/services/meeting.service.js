import prisma from "../config/database.js";
import logger from "../config/logger.js";
import ApiError from "../utils/ApiError.js";
import {
  logActivity,
  ActivityAction,
} from "../services/activityLog.service.js";

// ── Private Helpers ───────────────────────────────────────────────

const MEETING_INCLUDE = {
  organizer: {
    select: {
      id: true,
      position: true,
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  },
  attendees: {
    include: {
      employee: {
        select: {
          id: true,
          position: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      client: { select: { id: true, name: true, email: true } },
      vendor: { select: { id: true, name: true, email: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
  },
};

const getActiveEmployeeId = async (userId, companyId) => {
  const employee = await prisma.employee.findFirst({
    where: {
      userId,
      department: { branch: { companyId } },
    },
    select: { id: true, employmentStatus: true },
  });

  if (!employee) throw ApiError.forbidden("Only employees can manage meetings");
  if (employee.employmentStatus !== "ACTIVE")
    throw ApiError.forbidden("Your employment status is inactive");

  return employee.id;
};

const getMeetingScoped = async (meetingId, companyId) => {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: MEETING_INCLUDE,
  });

  if (!meeting || meeting.companyId !== companyId)
    throw ApiError.notFound("Meeting not found");

  return meeting;
};

const checkIsOrganizer = async (meetingId, employeeId, companyId) => {
  const meeting = await getMeetingScoped(meetingId, companyId);
  return { isOrganizer: meeting.organizerId === employeeId, meeting };
};

// ── GET ALL ───────────────────────────────────────────────────────

export const getAllMeetings = async (companyId, queryParams, userId) => {
  await getActiveEmployeeId(userId, companyId);

  const { type, status, search, limit, page } = queryParams;
  const skip = (page - 1) * limit;

  const where = { companyId };

  if (type) where.type = type;
  if (status) where.status = status;
  if (search) where.title = { contains: search, mode: "insensitive" };

  const [data, total] = await Promise.all([
    prisma.meeting.findMany({
      where,
      take: limit,
      skip,
      include: {
        organizer: {
          select: {
            id: true,
            position: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
        _count: { select: { attendees: true } },
      },

      orderBy: [{ startTime: "asc" }, { id: "asc" }],
    }),

    prisma.meeting.count({ where }),
  ]);

  return {
    data,
    meta: {
      total,
      limit,
      page,
      totalPages: Math.ceil(total / limit),
    },
  };
};

// ── CALENDAR QUERY ────────────────────────────────────────────────

export const getCalendar = async (companyId, { from, to }, userId) => {
  await getActiveEmployeeId(userId, companyId);

  const meetings = await prisma.meeting.findMany({
    where: {
      companyId,
      startTime: { gte: new Date(from) },
      endTime: { lte: new Date(to) },
      status: { not: "CANCELLED" },
    },
    orderBy: [{ startTime: "asc" }, { id: "asc" }],
    include: {
      organizer: {
        select: {
          id: true,
          position: true,
          user: { select: { firstName: true, lastName: true, email: true } },
        },
      },
      _count: { select: { attendees: true } },
    },
  });

  return meetings;
};

// ── GET BY ID ─────────────────────────────────────────────────────

export const getMeetingById = async (companyId, meetingId, userId) => {
  await getActiveEmployeeId(userId, companyId);
  return getMeetingScoped(meetingId, companyId);
};

// ── CREATE ────────────────────────────────────────────────────────

export const createMeeting = async (companyId, data, userId) => {
  const organizerId = await getActiveEmployeeId(userId, companyId);

  const safeData = { ...data };
  if (safeData.meetingUrl === "") safeData.meetingUrl = null;

  const meeting = await prisma.meeting.create({
    data: {
      companyId,
      organizerId,
      ...safeData,
    },
    include: MEETING_INCLUDE,
  });

  logger.info({ meetingId: meeting.id, companyId }, "Meeting scheduled");

  logActivity({
    companyId,
    employeeId: organizerId,
    action: ActivityAction.MEETING_SCHEDULED,
    meta: { meetingId: meeting.id, title: meeting.title },
  });

  return meeting;
};

// ── UPDATE ────────────────────────────────────────────────────────

export const updateMeeting = async (companyId, meetingId, data, userId) => {
  const employeeId = await getActiveEmployeeId(userId, companyId);
  const { meeting, isOrganizer } = await checkIsOrganizer(
    meetingId,
    employeeId,
    companyId,
  );

  if (!isOrganizer)
    throw ApiError.forbidden(
      "Only the meeting organizer can update meeting information",
    );

  if (meeting.status === "CANCELLED")
    throw ApiError.badRequest("Cannot update a cancelled meeting");

  const safeData = { ...data };
  if (safeData.meetingUrl === "") safeData.meetingUrl = null;

  // Determine effective values after the update
  if (data.startTime || data.endTime) {
    const effectiveStartTime = safeData.startTime ?? meeting.startTime;
    const effectiveEndTime = safeData.endTime ?? meeting.endTime;

    if (effectiveEndTime <= effectiveStartTime) {
      throw ApiError.badRequest("End time must be after start time.");
    }

    safeData.startTime = effectiveStartTime;
    safeData.endTime = effectiveEndTime;
  }

  const updated = await prisma.meeting.update({
    where: { id: meetingId },
    data: safeData,
    include: {
      ...MEETING_INCLUDE,
      _count: {
        select: { attendees: true },
      },
    },
  });

  logger.info({ meetingId, companyId }, "Meeting updated");

  logActivity({
    companyId,
    employeeId,
    action: ActivityAction.MEETING_UPDATED,
    meta: { meetingId, updatedFields: Object.keys(data) },
  });

  return updated;
};

// ── DELETE / CANCEL ───────────────────────────────────────────────

export const deleteMeeting = async (companyId, meetingId, userId) => {
  const employeeId = await getActiveEmployeeId(userId, companyId);
  const { meeting, isOrganizer } = await checkIsOrganizer(
    meetingId,
    employeeId,
    companyId,
  );

  if (!isOrganizer)
    throw ApiError.forbidden(
      "Only the meeting organizer can cancel this meeting",
    );

  if (meeting.status === "CANCELLED")
    throw ApiError.badRequest("Meeting is already cancelled");

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: "CANCELLED" },
  });

  logger.info({ meetingId }, "Meeting cancelled");

  logActivity({
    companyId,
    employeeId,
    action: ActivityAction.MEETING_CANCELLED,
    meta: { meetingId },
  });
};

// ── ADD ATTENDEE ──────────────────────────────────────────────────

export const addAttendee = async (companyId, meetingId, data, userId) => {
  const employeeId = await getActiveEmployeeId(userId, companyId);
  const { isOrganizer, meeting } = await checkIsOrganizer(
    meetingId,
    employeeId,
    companyId,
  );

  if (!isOrganizer)
    throw ApiError.forbidden("Only the meeting organizer can add an attendees");

  if (meeting.status === "CANCELLED")
    throw ApiError.badRequest("Cannot add attendees to a cancelled meeting");

  if (data.employeeId) {
    const employee = await prisma.employee.findFirst({
      where: { id: data.employeeId, department: { branch: { companyId } } },
    });
    if (!employee)
      throw ApiError.notFound("Employee not found in this company");
  }

  // Validate that the referenced entity belongs to this company
  if (data.clientId) {
    const client = await prisma.client.findFirst({
      where: { id: data.clientId, companyId },
    });
    if (!client) throw ApiError.notFound("Client not found in this company");
  }

  if (data.vendorId) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: data.vendorId, companyId },
    });
    if (!vendor) throw ApiError.notFound("Vendor not found in this company");
  }

  // Build the attendee record
  const attendeeData = { meetingId, type: data.type };
  if (data.type === "EMPLOYEE") attendeeData.employeeId = data.employeeId;
  if (data.type === "CLIENT") attendeeData.clientId = data.clientId;
  if (data.type === "VENDOR") attendeeData.vendorId = data.vendorId;

  let attendee;
  try {
    attendee = await prisma.meetingAttendee.create({
      data: attendeeData,
    });
  } catch (error) {
    if (error.code === "P2002")
      throw ApiError.conflict("This attendee is already added to the meeting");
    throw error;
  }

  logger.info({ meetingId, attendeeId: attendee.id }, "Attendee added");

  logActivity({
    companyId,
    employeeId,
    action: ActivityAction.MEETING_ATTENDEE_ADDED,
    meta: { meetingId, attendeeId: attendee.id, type: data.type },
  });

  return attendee;
};

// ── REMOVE ATTENDEE ───────────────────────────────────────────────

export const removeAttendee = async (
  companyId,
  meetingId,
  attendeeId,
  userId,
) => {
  const employeeId = await getActiveEmployeeId(userId, companyId);
  const { isOrganizer, meeting } = await checkIsOrganizer(
    meetingId,
    employeeId,
    companyId,
  );

  if (!isOrganizer)
    throw ApiError.forbidden(
      "Only the meeting organizer can remove an attendees",
    );

  if (meeting.status === "CANCELLED")
    throw ApiError.badRequest(
      "Cannot remove attendees from a cancelled meeting",
    );

  const attendee = await prisma.meetingAttendee.findUnique({
    where: { id: attendeeId },
    select: { meetingId: true, type: true },
  });

  if (!attendee || attendee.meetingId !== meetingId)
    throw ApiError.notFound("Attendee not found in this meeting");

  await prisma.meetingAttendee.delete({
    where: { id: attendeeId },
  });

  logger.info({ meetingId, attendeeId }, "Attendee removed");

  logActivity({
    companyId,
    employeeId,
    action: ActivityAction.MEETING_ATTENDEE_REMOVED,
    meta: { meetingId, attendeeId, type: attendee.type },
  });
};
