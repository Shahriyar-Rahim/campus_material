import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const coursePresence = new Map();

const addPresence = (courseCode, userInfo) => {
    if(!coursePresence.has(courseCode)) coursePresence.set(courseCode, new Map());
    coursePresence.get(courseCode).set(userInfo.userId, userInfo);
}

const removePresence = (courseCode, userId) => {
    coursePresence.get(courseCode)?.delete(userId);
    if(coursePresence.get(courseCode)?.size === 0) coursePresence.delete(courseCode);
};

const getPresence = (courseCode) => {
    return [...(coursePresence.get(courseCode)?.values() || [])];
};

const removeUserFromAllCourses = (userId) => {
    for(const [code, users] of coursePresence.entries()) {
        users.delete(userId);
        if(users.size === 0) coursePresence.delete(code);
    }
};

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) return next(new Error("Authentication required."));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("name role dept level term studentId profilePicture");
      if (!user) return next(new Error("User not found."));

      socket.user = {
        userId: user._id.toString(),
        name: user.name,
        role: user.role,
        dept: user.dept,
        level: user.level,
        term: user.term,
        studentId: user.studentId,
        avatar: user.profilePicture?.url || null,
      };

      next();
    } catch (err) {
      next(new Error("Invalid token."));
    }
  });

  io.on("connection", async (socket) => {
    const { userId } = socket.user;

    // Mark user online in DB (fire-and-forget)
    User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() }).exec();

    socket.on("join_course", ({ courseCode }) => {
      if (!courseCode) return;

      const room = `course:${courseCode}`;
      socket.join(room);
      socket.currentCourse = courseCode;

      addPresence(courseCode, { ...socket.user, joinedAt: new Date().toISOString() });

      // Broadcast updated presence list to everyone in the room
      io.to(room).emit("presence_update", {
        courseCode,
        users: getPresence(courseCode),
      });

      User.findByIdAndUpdate(userId, { currentCourse: courseCode }).exec();
    });

    socket.on("leave_course", ({ courseCode }) => {
      if (!courseCode) return;
      const room = `course:${courseCode}`;
      socket.leave(room);
      socket.currentCourse = null;

      removePresence(courseCode, userId);
      io.to(room).emit("presence_update", {
        courseCode,
        users: getPresence(courseCode),
      });

      User.findByIdAndUpdate(userId, { currentCourse: null }).exec();
    });

    socket.on("nudge", ({ targetUserId, courseCode, message }) => {
      const targetSocket = [...io.sockets.sockets.values()].find(
        (s) => s.user?.userId === targetUserId
      );

      const nudgePayload = {
        from: {
          userId: socket.user.userId,
          name: socket.user.name,
          avatar: socket.user.avatar,
        },
        courseCode,
        message: message || `${socket.user.name} is studying ${courseCode} and wants you to join!`,
        timestamp: new Date().toISOString(),
      };

      if (targetSocket) {
        targetSocket.emit("nudge_received", nudgePayload);
      } else {
        io.to(`user:${targetUserId}`).emit("nudge_received", nudgePayload);
      }
    });

    socket.on("get_presence", ({ courseCode }, callback) => {
      if (typeof callback === "function") {
        callback({ courseCode, users: getPresence(courseCode) });
      }
    });

    socket.on("disconnect", () => {
      removeUserFromAllCourses(userId);

      if (socket.currentCourse) {
        const room = `course:${socket.currentCourse}`;
        io.to(room).emit("presence_update", {
          courseCode: socket.currentCourse,
          users: getPresence(socket.currentCourse),
        });
      }

      User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: new Date(),
        currentCourse: null,
      }).exec();
    });
  });

  return io;
};
