import * as meetingService from "../services/meeting.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getAllMeetings = async (req, res) => {
  const result = await meetingService.getAllMeetings(
    req.companyId,
    req.validated.query,
    req.user.id,
  );
  ApiResponse.ok(res, "Meetings retrieved successfully", result);
};

export const getCalendar = async (req, res) => {
  const meetings = await meetingService.getCalendar(
    req.companyId,
    req.validated.query,
    req.user.id,
  );
  ApiResponse.ok(res, "Calendar retrieved successfully", meetings);
};

export const getMeetingById = async (req, res) => {
  const meeting = await meetingService.getMeetingById(
    req.companyId,
    req.validated.params.id,
    req.user.id,
  );
  ApiResponse.ok(res, "Meeting retrieved successfully", meeting);
};

export const createMeeting = async (req, res) => {
  const meeting = await meetingService.createMeeting(
    req.companyId,
    req.validated.body,
    req.user.id,
  );
  ApiResponse.created(res, "Meeting scheduled successfully", meeting);
};

export const updateMeeting = async (req, res) => {
  const meeting = await meetingService.updateMeeting(
    req.companyId,
    req.validated.params.id,
    req.validated.body,
    req.user.id,
  );
  ApiResponse.ok(res, "Meeting updated successfully", meeting);
};

export const deleteMeeting = async (req, res) => {
  await meetingService.deleteMeeting(
    req.companyId,
    req.validated.params.id,
    req.user.id,
  );
  ApiResponse.noContent(res);
};

export const addAttendee = async (req, res) => {
  const attendee = await meetingService.addAttendee(
    req.companyId,
    req.validated.params.id,
    req.validated.body,
    req.user.id,
  );
  ApiResponse.created(res, "Attendee added successfully", attendee);
};

export const removeAttendee = async (req, res) => {
  await meetingService.removeAttendee(
    req.companyId,
    req.validated.params.id,
    req.validated.params.attendeeId,
    req.user.id,
  );
  ApiResponse.noContent(res);
};
