import { Router } from "express";
import {
  getDailyPlanner,
  getWeeklyPlanner,
  createTask,
  updateTask,
  reorderTasks,
  deleteTask,
} from "../controllers/planner.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();
router.use(protect);

router.get("/daily",  getDailyPlanner);
router.get("/week",   getWeeklyPlanner);
router.post("/",      createTask);
router.patch("/reorder", reorderTasks);
router.patch("/:id",  updateTask);
router.delete("/:id", deleteTask);

export default router;
