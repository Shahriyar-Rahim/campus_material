import { Router } from "express";
import {
  getMyRoutine,
  getRoutine,
  createOrUpdateRoutine,
  upsertScheduleEntry,
  deleteScheduleEntry,
  deactivateRoutine,
  getMyCourses,
  getFormattedRoutine
} from "../controllers/routine.controller.js";
import {
  getDashboardStats,
  getUsers,
  updateUserRole,
  deactivateUser,
  adminRegisterUser,
   adminDeleteMaterial,   // ← add
  adminDeleteFolder,     // ← add
  adminGetMaterials,     // ← add
} from "../controllers/admin.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

// --- ROUTINE ROUTER (Student & General Access) ---
const router = Router();

router.get("/my-courses", getMyCourses);
router.use(protect);

// Accessible by all authenticated users
router.get("/my", getMyRoutine);
router.get("/", getRoutine);
router.get("/formatted", protect, getFormattedRoutine);

// Administrative Routine Management
router.post(
  "/",
  restrictTo("Admin", "SuperAdmin", "Teacher", "CR"),
  createOrUpdateRoutine,
);
router.patch(
  "/:id/entry",
  restrictTo("Admin", "SuperAdmin", "Teacher", "CR"),
  upsertScheduleEntry,
);
router.delete(
  "/:id/entry/:entryId",
  restrictTo("Admin", "SuperAdmin", "Teacher", "CR"),
  deleteScheduleEntry,
);
router.patch(
  "/:id/deactivate",
  restrictTo("Admin", "SuperAdmin", "Teacher", "CR"),
  deactivateRoutine,
);

// --- ADMIN ROUTER (System & User Management) ---
const adminRouter = Router();
adminRouter.use(protect);
adminRouter.use(restrictTo("Admin", "SuperAdmin"));

adminRouter.get("/dashboard", getDashboardStats);
adminRouter.get("/users", getUsers);
adminRouter.post("/users/register", adminRegisterUser);
adminRouter.patch("/users/:id/role", updateUserRole);
adminRouter.patch("/users/:id/deactivate", deactivateUser);
adminRouter.get("/materials",           adminGetMaterials);
adminRouter.delete("/materials/:id",    adminDeleteMaterial);
adminRouter.delete("/folders/:id",      adminDeleteFolder);

// Export both routers
export default router; 
export { adminRouter };