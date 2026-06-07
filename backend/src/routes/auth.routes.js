import { Router } from "express";
import {
  register,
  login,
  logout,
  getMe,
  changePassword,
  updateProfile,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { authLimiter, multerUpload, handleMulterError } from "../middleware/rateLimiter.js";

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login",    authLimiter, login);
router.post("/logout",   protect, logout);
router.get( "/me",       protect, getMe);
router.patch("/change-password", protect, changePassword);
router.patch(
  "/update-profile",
  protect,
  multerUpload.single("profilePicture"),
  handleMulterError,
  updateProfile
);

export default router;
