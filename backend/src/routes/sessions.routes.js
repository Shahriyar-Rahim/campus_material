import { Router } from "express";
import {
  getSessions, getCurrentSession,
  createSession, updateSession, deleteSession, assignSessionToUsers, 
  getSessionContent,
} from "../controllers/session.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/",        protect, getSessions);
router.get("/current", protect, getCurrentSession);

router.use(protect, restrictTo("Admin", "SuperAdmin"));
router.get("/:id/content", protect, restrictTo("Admin", "SuperAdmin"), getSessionContent);
router.post("/",      createSession);
router.post("/:id/assign",    assignSessionToUsers);
router.patch("/:id",  updateSession);
router.delete("/:id", deleteSession);

export default router;