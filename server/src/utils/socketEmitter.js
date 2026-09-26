import { getIo } from "../config/socket.js";
import logger from "../config/logger.js";

/**
 * Centralized Socket.IO event emitter.
 *
 * Why a utility module instead of calling getIo() everywhere:
 * - Single place to add logging, throttling, or payload validation.
 * - Callers never import socket.io or getIo directly — they just call emit*.
 * - Easy to mock in tests.
 *
 * Room naming conventions:
 *   user:<userId>         — private, per-user notifications
 *   company:<companyId>   — company-wide broadcasts
 *   project:<projectId>   — project-scoped events (opt-in)
 */

/**
 * Emit to a specific user's personal room.
 * @param {string} userId
 * @param {string} event  - e.g. "notification:new"
 * @param {object} payload
 */
export const emitToUser = (userId, event, payload) => {
  try {
    getIo().to(`user:${userId}`).emit(event, payload);
    logger.debug({ userId, event }, "Socket event emitted to user");
  } catch (err) {
    logger.error({ err, userId, event }, "Failed to emit socket event to user");
  }
};

/**
 * Emit to all sockets in a company room.
 * @param {string} companyId
 * @param {string} event
 * @param {object} payload
 */
export const emitToCompany = (companyId, event, payload) => {
  try {
    getIo().to(`company:${companyId}`).emit(event, payload);
    logger.debug({ companyId, event }, "Socket event emitted to company");
  } catch (err) {
    logger.error(
      { err, companyId, event },
      "Failed to emit socket event to company",
    );
  }
};

/**
 * Emit to all sockets in a project room.
 * Only sockets that previously sent `subscribe:project` will receive this.
 * @param {string} projectId
 * @param {string} event
 * @param {object} payload
 */
export const emitToProject = (projectId, event, payload) => {
  try {
    getIo().to(`project:${projectId}`).emit(event, payload);
    logger.debug({ projectId, event }, "Socket event emitted to project");
  } catch (err) {
    logger.error(
      { err, projectId, event },
      "Failed to emit socket event to project",
    );
  }
};
