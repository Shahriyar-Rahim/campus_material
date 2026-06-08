import { Router } from "express";
import {
  createRequest,
  getMyRequests,
  getRequests,
  updateRequestStatus,
  replyToRequest,
  deleteRequest,
} from "../controllers/materialRequest.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";

const router = Router();
router.use(protect);

router.post("/",        createRequest);          // any authenticated user
router.get("/my",       getMyRequests);          // student sees their own
router.get("/",         restrictTo("CR", "Admin", "SuperAdmin"), getRequests);
router.patch("/:id/status", restrictTo("CR", "Admin", "SuperAdmin"), updateRequestStatus);
router.patch("/:id/reply",  restrictTo("CR", "Admin", "SuperAdmin"), replyToRequest);
router.delete("/:id",       restrictTo("Admin", "SuperAdmin"), deleteRequest);

export default router;