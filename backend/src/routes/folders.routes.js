import { Router } from "express";
import {
  getFolders,
  getAllFoldersByDept,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderById,
  getFolderChildren,   // new
  createSubFolder,     // new
  getFolderBreadcrumb, // new
} from "../controllers/subjectFolder.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = Router();

// All routes require auth
router.use(protect);

router.get("/",        getFolders);          // ?dept=CSE&level=1&term=1
router.get("/all",     getAllFoldersByDept);  // ?dept=CSE  — all levels/terms
router.get("/:id",     getFolderById);
router.get("/:id/children",   getFolderChildren);
router.get("/:id/breadcrumb", getFolderBreadcrumb);
router.post("/",       createFolder);
router.post("/:id/subfolder", createSubFolder);
router.patch("/:id",   updateFolder);
router.delete("/:id",  deleteFolder);

export default router;
