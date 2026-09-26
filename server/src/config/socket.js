import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import env from "./env.js";
import prisma from "./database.js";
import logger from "./logger.js";

let io;

/**
 * Initializes and attaches a Socket.IO server to the Node HTTP server.
 *
 * Security:
 * - JWT authentication is enforced on every handshake via the `use` middleware.
 *   Token is read from `socket.handshake.auth.token` (preferred) and falls
 *   back to the Authorization header for REST-style clients.
 * - CORS mirrors the same origin allowed for the REST API.
 * - Each authenticated socket is placed into exactly two rooms:
 *     `user:<userId>`    – for per-user private notifications
 *     `company:<companyId>` – for company-wide broadcasts
 * - Sockets are also optionally subscribed to `project:<projectId>` rooms
 *   on demand via a client-emitted event.
 *
 * @param {import("http").Server} httpServer - The raw Node HTTP server.
 */
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin,
      credentials: true,
    },
    // Tune transport: prefer WebSocket, fall back to polling
    transports: ["websocket", "polling"],
    // Disconnect clients that fail to authenticate within 5 s
    connectTimeout: 5000,
  });

  // ── Authentication Middleware ──────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("AUTH_MISSING_TOKEN"));
      }

      let decoded;
      try {
        decoded = jwt.verify(token, env.jwtAccessSecret);
      } catch {
        return next(new Error("AUTH_INVALID_TOKEN"));
      }

      // Re-fetch user from DB to confirm the account still exists and is active.
      // This matches the same security guarantee as the REST auth middleware.
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          isActive: true,
          companyMembers: {
            select: { companyId: true },
          },
        },
      });

      if (!user) return next(new Error("AUTH_USER_NOT_FOUND"));
      if (!user.isActive) return next(new Error("AUTH_USER_INACTIVE"));

      // Attach verified identity to the socket for downstream use
      socket.user = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        companyIds: user.companyMembers.map((cm) => cm.companyId),
      };

      next();
    } catch (err) {
      logger.error({ err }, "Socket authentication error");
      next(new Error("AUTH_INTERNAL_ERROR"));
    }
  });

  // ── Connection Handler ─────────────────────────────────────
  io.on("connection", (socket) => {
    const { id: userId, companyIds } = socket.user;

    logger.info({ socketId: socket.id, userId }, "Socket connected");

    // Join personal room for targeted notifications
    socket.join(`user:${userId}`);

    // Join all company rooms the user is a member of
    for (const companyId of companyIds) {
      socket.join(`company:${companyId}`);
      logger.debug(
        { socketId: socket.id, userId, companyId },
        "Joined company room",
      );
    }

    // ── Client-driven room subscriptions ──────────────────
    /**
     * Subscribe to a project room.
     * The client sends { projectId } and the server validates
     * that the user is a member of that project before joining.
     */
    socket.on("subscribe:project", async ({ projectId }) => {
      try {
        if (!projectId || typeof projectId !== "string") return;

        const member = await prisma.projectMember.findFirst({
          where: { projectId, employee: { userId } },
          select: { id: true },
        });

        if (!member) {
          socket.emit("error", {
            code: "FORBIDDEN",
            message: "Not a project member",
          });
          return;
        }

        socket.join(`project:${projectId}`);
        logger.debug(
          { socketId: socket.id, userId, projectId },
          "Joined project room",
        );
      } catch (err) {
        logger.error({ err, socketId: socket.id }, "subscribe:project error");
      }
    });

    /**
     * Unsubscribe from a project room.
     */
    socket.on("unsubscribe:project", ({ projectId }) => {
      if (projectId && typeof projectId === "string") {
        socket.leave(`project:${projectId}`);
      }
    });

    socket.on("disconnect", (reason) => {
      logger.info(
        { socketId: socket.id, userId, reason },
        "Socket disconnected",
      );
    });

    socket.on("error", (err) => {
      logger.error({ err, socketId: socket.id, userId }, "Socket error");
    });
  });

  logger.info("Socket.IO server initialized");
  return io;
};

/**
 * Returns the initialized Socket.IO server instance.
 * Must be called after `initSocket`.
 */
export const getIo = () => {
  if (!io) throw new Error("Socket.IO not initialized — call initSocket first");
  return io;
};
