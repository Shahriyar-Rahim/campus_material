import { useEffect, useRef, useCallback } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { selectToken, selectIsAuth } from "../redux/features/authSlice";

let socketInstance = null; 

export const useSocket = () => {
  const token = useSelector(selectToken);
  const isAuth = useSelector(selectIsAuth);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuth || !token) {
      if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
      }
      return;
    }

    // Reuse existing connection if token hasn't changed
    if (socketInstance?.connected) {
      socketRef.current = socketInstance;
      return;
    }

    const socket = io(import.meta.env.VITE_WS_URL || "http://localhost:5000", {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketInstance = socket;
    socketRef.current = socket;

    socket.on("connect_error", (err) => {
      console.warn("[Socket] Connection error:", err.message);
    });

    return () => {
      // Don't disconnect on re-render; only disconnect on actual logout
    };
  }, [isAuth, token]);

  const sendNudge = useCallback((targetUserId, courseCode, message) => {
    socketRef.current?.emit("nudge", { targetUserId, courseCode, message });
  }, []);

  return { socket: socketRef.current, sendNudge };
};
