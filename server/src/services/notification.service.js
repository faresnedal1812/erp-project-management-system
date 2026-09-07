import prisma from "../config/database.js";
import ApiError from "../utils/ApiError.js";
import logger from "../config/logger.js";

// ── Fire-and-forget notification helpers ────────────────────────

/**
 * Create a single notification.
 *
 * Fire-and-forget: errors are logged but never thrown,
 * so the calling service's main operation is never blocked.
 *
 * @param {{ userId: string, type: string, title: string, body?: string, meta?: object }} data
 */
export const notify = (data) => {
  prisma.notification
    .create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body ?? null,
        meta: data.meta ?? undefined,
      },
    })
    .then((n) =>
      logger.debug(
        { notificationId: n.id, userId: data.userId, type: data.type },
        "Notification created",
      ),
    )
    .catch((err) =>
      logger.warn(
        { err, userId: data.userId, type: data.type },
        "Failed to create notification — swallowed to protect main operation",
      ),
    );
};

/**
 * Create notifications for multiple users at once.
 *
 * Uses `createMany` for efficiency. Fire-and-forget.
 *
 * @param {{ userId: string, type: string, title: string, body?: string, meta?: object }[]} entries
 */
export const notifyMany = (entries) => {
  if (!entries.length) return;

  prisma.notification
    .createMany({
      data: entries.map((e) => ({
        userId: e.userId,
        type: e.type,
        title: e.title,
        body: e.body ?? null,
        meta: e.meta ?? undefined,
      })),
      skipDuplicates: true,
    })
    .then((result) =>
      logger.debug(
        { count: result.count, type: entries[0]?.type },
        "Batch notifications created",
      ),
    )
    .catch((err) =>
      logger.warn(
        { err, count: entries.length },
        "Failed to create batch notifications — swallowed",
      ),
    );
};

// ── Read operations ─────────────────────────────────────────────

/**
 * List notifications for the authenticated user with filtering + pagination.
 */
export const getNotifications = async (userId, filters = {}) => {
  const { type, isRead, page = 1, limit = 20 } = filters;
  const take = Math.min(limit, 100);
  const skip = (page - 1) * take;

  const where = { userId };
  if (type) where.type = type;
  if (isRead !== undefined) where.isRead = isRead;

  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      skip,
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit: take,
      total,
      totalPages: Math.ceil(total / take),
    },
  };
};

/**
 * Count unread notifications for the authenticated user.
 */
export const getUnreadCount = async (userId) => {
  const count = await prisma.notification.count({
    where: { userId, isRead: false },
  });
  return { unreadCount: count };
};

// ── Mutations ───────────────────────────────────────────────────

/**
 * Mark a single notification as read.
 * Enforces ownership — users can only mark their own notifications.
 */
export const markAsRead = async (notificationId, userId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) throw ApiError.notFound("Notification not found");
  if (notification.userId !== userId) {
    throw ApiError.forbidden("You can only manage your own notifications.");
  }

  if (notification.isRead) return notification; // Already read — idempotent

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true, readAt: new Date() },
  });
};

/**
 * Mark ALL unread notifications as read for the authenticated user.
 */
export const markAllAsRead = async (userId) => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

  logger.info(
    { userId, count: result.count },
    "All notifications marked as read",
  );
  return { markedCount: result.count };
};

/**
 * Delete a single notification.
 * Enforces ownership — users can only delete their own notifications.
 */
export const deleteNotification = async (notificationId, userId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) throw ApiError.notFound("Notification not found");
  if (notification.userId !== userId) {
    throw ApiError.forbidden("You can only delete your own notifications.");
  }

  await prisma.notification.delete({ where: { id: notificationId } });
  logger.info({ notificationId, userId }, "Notification deleted");
};
