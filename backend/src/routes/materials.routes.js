import { Router } from "express";
import {
  getMaterials,
  uploadMaterial,
  pinMaterial,
  unpinMaterial,
  forwardMaterial,
  deleteMaterial,
  updateMaterialMeta,
  getMaterialStats,
} from "../controllers/materials.controller.js";
import { protect, restrictTo } from "../middleware/auth.middleware.js";
import {
  uploadLimiter,
  multerUpload,
  handleMulterError,
} from "../middleware/rateLimiter.js";

const router = Router();

router.use(protect);

router.get("/",      getMaterials);
router.get("/stats", restrictTo("Admin", "SuperAdmin"), getMaterialStats);

router.post(
  "/upload",
  restrictTo("CR", "Teacher", "Admin", "SuperAdmin"),
  uploadLimiter,
  multerUpload.single("file"),
  handleMulterError,
  uploadMaterial
);

router.patch("/:id",        restrictTo("CR", "Teacher", "Admin", "SuperAdmin"), updateMaterialMeta);
router.patch("/:id/pin",    restrictTo("CR", "Teacher", "Admin", "SuperAdmin"), pinMaterial);
router.patch("/:id/unpin",  restrictTo("CR", "Teacher", "Admin", "SuperAdmin"), unpinMaterial);
router.post( "/:id/forward",restrictTo("Admin", "SuperAdmin"), forwardMaterial);
router.delete("/:id",       restrictTo("CR", "Teacher", "Admin", "SuperAdmin"), deleteMaterial);

export default router;
