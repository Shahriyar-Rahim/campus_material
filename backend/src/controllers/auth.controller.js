import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import User from "../models/User.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { sendWelcomeEmail } from "../services/email.service.js";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  res.cookie("jwt", token, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  });

  user.password = undefined;

  res.status(statusCode).json({
    success: true,
    token,
    data: { user },
  });
};

const uploadToCloudinary = (buffer, publicId) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "campus-portal/profiles",
        public_id: publicId,
        overwrite: true,
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error) return reject(new Error(error.message));
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });


export const register = catchAsync(async (req, res, next) => {
  const { studentId, email, name, dept, level, term, session, batch, password } = req.body;

  if (!studentId || !email || !name || !dept || !level || !term || !session || !batch || !password) {
    return next(new AppError("All fields are required for registration.", 400));
  }

  const existing = await User.findOne({ $or: [{ studentId }, { email }] });
  if (existing) {
    const field = existing.studentId === studentId ? "Student ID" : "Email";
    return next(new AppError(`${field} is already registered.`, 409));
  }

  const user = await User.create({
    studentId,
    email,
    name,
    dept,
    level: Number(level),
    term: Number(term),
    session,
    batch,
    password,
    role: "Student",
    isVerified: false,
  });

  sendWelcomeEmail({
    to: email,
    name,
    studentId,
    password,
    dept,
    level,
    term,
    batch,
    session,
    role: "Student",
  }).catch((err) => console.error("[Email] Welcome email failed:", err.message));

  createSendToken(user, 201, res);
});

export const login = catchAsync(async (req, res, next) => {
  const { studentId, password } = req.body;

  if (!studentId || !password) {
    return next(new AppError("Student ID and password are required.", 400));
  }

  const user = await User.findOne({ studentId }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    return next(new AppError("Incorrect Student ID or password.", 401));
  }

  if (!user.isActive) {
    return next(new AppError("Your account is deactivated. Contact your admin.", 403));
  }

  user.isOnline = true;
  user.lastSeen = new Date();
  await user.save({ validateBeforeSave: false });

  createSendToken(user, 200, res);
});

export const logout = catchAsync(async (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });

  if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, {
      isOnline: false,
      lastSeen: new Date(),
      currentCourse: null,
    });
  }

  res.status(200).json({ success: true, message: "Logged out successfully." });
});


export const getMe = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  res.status(200).json({ success: true, data: { user } });
});

export const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new AppError("currentPassword and newPassword are required.", 400));
  }

  if (newPassword.length < 8) {
    return next(new AppError("New password must be at least 8 characters.", 400));
  }

  const user = await User.findById(req.user._id).select("+password");

  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError("Your current password is incorrect.", 401));
  }

  user.password = newPassword;
  await user.save();

  createSendToken(user, 200, res);
});

export const updateProfile = catchAsync(async (req, res, next) => {

  if (req.body.password || req.body.role) {
    return next(new AppError("Use /change-password to update password. Role changes require admin.", 400));
  }

const allowedUpdates = ["name", "level", "term"];
  const updates = {};
  allowedUpdates.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });


  if (req.file) {
    const user = await User.findById(req.user._id);

    if (user.profilePicture?.publicId) {
      await cloudinary.uploader.destroy(user.profilePicture.publicId).catch(() => {});
    }

    const publicId = `campus-portal/profiles/${req.user._id}`;
    const result = await uploadToCloudinary(req.file.buffer, publicId);

    updates.profilePicture = {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, data: { user: updatedUser } });
});
