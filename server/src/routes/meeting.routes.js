import { Router } from "express";
import {
  getAllMeetings,
  getCalendar,
  getMeetingById,
  createMeeting,
  updateMeeting,
  deleteMeeting,
  addAttendee,
  removeAttendee,
} from "../controllers/meeting.controller.js";
import {
  createMeetingSchema,
  updateMeetingSchema,
  meetingIdParamSchema,
  attendeeParamSchema,
  meetingQuerySchema,
  calendarQuerySchema,
  addAttendeeSchema,
} from "../validators/meeting.validator.js";
import asyncHandler from "../utils/asyncHandler.js";
import validate from "../middlewares/validate.js";
import protect from "../middlewares/auth.middleware.js";
import requireCompany from "../middlewares/requireCompany.js";
import requirePermission from "../middlewares/requirePermission.js";

const router = Router();

router.use(protect);
router.use(requireCompany);

/**
 * @swagger
 * tags:
 *   name: Meetings
 *   description: Meeting scheduling and calendar management
 */

/**
 * @swagger
 * /meetings:
 *   post:
 *     summary: Schedule a new meeting
 *     tags: [Meetings]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, startTime, endTime]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ONLINE, IN_PERSON, HYBRID]
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *               meetingUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Meeting scheduled successfully
 */
router.post(
  "/",
  validate(createMeetingSchema),
  requirePermission("CREATE", "MEETINGS"),
  asyncHandler(createMeeting),
);

/**
 * @swagger
 * /meetings:
 *   get:
 *     summary: List all meetings (paginated)
 *     tags: [Meetings]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED]
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [ONLINE, IN_PERSON, HYBRID]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated list of meetings
 */
router.get(
  "/",
  validate(meetingQuerySchema),
  requirePermission("READ", "MEETINGS"),
  asyncHandler(getAllMeetings),
);

/**
 * @swagger
 * /meetings/calendar:
 *   get:
 *     summary: Get meetings for a date range (calendar view)
 *     tags: [Meetings]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "Start of the calendar range (ISO 8601)"
 *       - in: query
 *         name: to
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: "End of the calendar range (ISO 8601)"
 *     responses:
 *       200:
 *         description: List of non-cancelled meetings within the specified range
 */
router.get(
  "/calendar",
  validate(calendarQuerySchema),
  requirePermission("READ", "MEETINGS"),
  asyncHandler(getCalendar),
);

/**
 * @swagger
 * /meetings/{id}:
 *   get:
 *     summary: Get meeting details with full attendee list
 *     tags: [Meetings]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Meeting details
 *       404:
 *         description: Meeting not found
 */
router.get(
  "/:id",
  validate(meetingIdParamSchema),
  requirePermission("READ", "MEETINGS"),
  asyncHandler(getMeetingById),
);

/**
 * @swagger
 * /meetings/{id}:
 *   put:
 *     summary: Update meeting details or status
 *     tags: [Meetings]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [ONLINE, IN_PERSON, HYBRID]
 *               status:
 *                 type: string
 *                 enum: [SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED]
 *                 description: "Only the organizer can set CANCELLED or COMPLETED"
 *               startTime:
 *                 type: string
 *                 format: date-time
 *               endTime:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *                 nullable: true
 *               meetingUrl:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Meeting updated successfully
 *       403:
 *         description: Only the organizer can cancel or complete the meeting
 */
router.put(
  "/:id",
  validate(updateMeetingSchema),
  requirePermission("UPDATE", "MEETINGS"),
  asyncHandler(updateMeeting),
);

/**
 * @swagger
 * /meetings/{id}:
 *   delete:
 *     summary: Cancel a meeting (organizer only)
 *     tags: [Meetings]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Meeting cancelled
 *       403:
 *         description: Only the organizer can cancel this meeting
 */
router.delete(
  "/:id",
  validate(meetingIdParamSchema),
  requirePermission("DELETE", "MEETINGS"),
  asyncHandler(deleteMeeting),
);

/**
 * @swagger
 * /meetings/{id}/attendees:
 *   post:
 *     summary: Add an attendee to a meeting
 *     tags: [Meetings]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [EMPLOYEE, CLIENT, VENDOR]
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *                 description: "Required when type is EMPLOYEE"
 *               clientId:
 *                 type: string
 *                 format: uuid
 *                 description: "Required when type is CLIENT"
 *               vendorId:
 *                 type: string
 *                 format: uuid
 *                 description: "Required when type is VENDOR"
 *     responses:
 *       201:
 *         description: Attendee added successfully
 *       409:
 *         description: Attendee already in meeting
 */
router.post(
  "/:id/attendees",
  validate(addAttendeeSchema),
  requirePermission("UPDATE", "MEETINGS"),
  asyncHandler(addAttendee),
);

/**
 * @swagger
 * /meetings/{id}/attendees/{attendeeId}:
 *   delete:
 *     summary: Remove an attendee from a meeting
 *     tags: [Meetings]
 *     security:
 *       - BearerAuth: []
 *         CompanyIdAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: attendeeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Attendee removed
 *       404:
 *         description: Attendee not found in this meeting
 */
router.delete(
  "/:id/attendees/:attendeeId",
  validate(attendeeParamSchema),
  requirePermission("UPDATE", "MEETINGS"),
  asyncHandler(removeAttendee),
);

export default router;
