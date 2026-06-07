import { Router } from "express";
import {
  getMyRoutine,
  getRoutine,
  createOrUpdateRoutine,
  upsertScheduleEntry,
  deleteScheduleEntry,
  deactivateRoutine,
  getMyCourses, // Ensure this is imported
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

// Administrative Routine Management
router.post("/", restrictTo("Admin", "SuperAdmin"), createOrUpdateRoutine);
router.patch("/:id/entry", restrictTo("Admin", "SuperAdmin"), upsertScheduleEntry);
router.delete("/:id/entry/:entryId", restrictTo("Admin", "SuperAdmin"), deleteScheduleEntry);
router.patch("/:id/deactivate", restrictTo("Admin", "SuperAdmin"), deactivateRoutine);

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