import * as notificationService from "../services/notification.service.js";
import ApiResponse from "../utils/ApiResponse.js";

export const getNotifications = async (req, res) => {
  const result = await notificationService.getNotifications(
    req.user.id,
    req.validated?.query ?? {},
  );
  ApiResponse.ok(res, "Notifications retrieved successfully", result);
};

export const getUnreadCount = async (req, res) => {
  const result = await notificationService.getUnreadCount(req.user.id);
  ApiResponse.ok(res, "Unread count retrieved successfully", result);
};

export const markAsRead = async (req, res) => {
  const notification = await notificationService.markAsRead(
    req.validated.params.id,
    req.user.id,
  );
  ApiResponse.ok(res, "Notification marked as read", notification);
};

export const markAllAsRead = async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.id);
  ApiResponse.ok(res, "All notifications marked as read", result);
};

export const deleteNotification = async (req, res) => {
  await notificationService.deleteNotification(
    req.validated.params.id,
    req.user.id,
  );
  ApiResponse.noContent(res);
};
