import * as timeEntryService from "../services/timeEntry.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getTimeEntries = async (req, res) => {
  const entries = await timeEntryService.getTimeEntries(
    req.validated.params.id,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Time entries retrieved successfully", entries);
};

export const startTimer = async (req, res) => {
  const entry = await timeEntryService.startTimer(
    req.validated.params.id,
    req.validated.body,
    req.companyId,
    req.user.id,
  );
  ApiResponse.created(res, "Timer started successfully", entry);
};

export const stopTimer = async (req, res) => {
  const entry = await timeEntryService.stopTimer(
    req.validated.params.id,
    req.validated.params.entryId,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Timer stopped successfully", entry);
};

export const updateTimeEntry = async (req, res) => {
  const entry = await timeEntryService.updateTimeEntry(
    req.validated.params.id,
    req.validated.params.entryId,
    req.validated.body,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Time entry updated successfully", entry);
};

export const deleteTimeEntry = async (req, res) => {
  await timeEntryService.deleteTimeEntry(
    req.validated.params.id,
    req.validated.params.entryId,
    req.companyId,
    req.user.id,
  );
  ApiResponse.noContent(res);
};

export const getProjectTimeReport = async (req, res) => {
  const report = await timeEntryService.getProjectTimeReport(
    req.validated.params.id,
    req.companyId,
    req.user.id,
  );
  ApiResponse.ok(res, "Project time report retrieved successfully", report);
};
