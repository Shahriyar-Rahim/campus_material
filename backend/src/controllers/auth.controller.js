import jwt from "jsonwebtoken";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
import nodemailer from "nodemailer"
import User from "../models/user.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { sendWelcomeEmail, sendPasswordChangeEmail } from "../services/email.service.js";
import crypto,{ createHash } from "crypto";

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

  if (!studentId || !email || !name || !dept || !level || !term || !batch || !password) { //!session ||
    return next(new AppError("All fields are required for registration.", 400));
  }

  const existing = await User.findOne({ $or: [{ studentId }, { email }] });
  if (existing) {
    const field = existing.studentId === studentId ? "Student ID" : "Email";
    return next(new AppError(`${field} is already registered.`, 409));
  }

  let assignedSession = session || null;
  if (!assignedSession) {
    const Session = (await import("../models/Session.model.js")).default;
    const activeSession = await Session.findOne({
      isActive: true,
      sections: {
        $elemMatch: {
          dept:  dept.toUpperCase(),
          level: Number(level),
          term:  Number(term),
        },
      },
    }).sort({ createdAt: -1 }).lean();

    assignedSession = activeSession?.name || null;
  }

  const user = await User.create({
    studentId,
    email,
    name,
    dept,
    level: Number(level),
    term: Number(term),
    session: assignedSession,
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
    session : assignedSession,
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

// Helper to generate verification block pointers
const generateChainPointer = (previousPointer, newPasswordHash) => {
  return createHash("sha256") // 👈 Used directly now
    .update(`${previousPointer || "GENESIS_BLOCK"}-${newPasswordHash}`)
    .digest("hex");
};

export const changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new AppError("Current password and new password are required.", 400));
  }

  if (newPassword.length < 8) {
    return next(new AppError("New password must be at least 8 characters.", 400));
  }

  // Fetch password and existing historical chain tracking structures
  const user = await User.findById(req.user._id).select("+password +passwordChain");

  if (!(await user.comparePassword(currentPassword))) {
    return next(new AppError("Your current password is incorrect.", 401));
  }

  // Fetch current master trace pointer if it exists
  const lastLink = user.passwordChain && user.passwordChain.length > 0 
    ? user.passwordChain[user.passwordChain.length - 1].hashPointer 
    : "";

  // Set the clean password string (Triggering standard pre-save bcrypt routines inside model)
  user.password = newPassword;
  
  // Calculate historical cryptographic tracing pointers
  const nextPointer = generateChainPointer(lastLink, user.password);
  
  // Push modification footprint into database index records
  user.passwordChain.push({ hashPointer: nextPointer });
  
  await user.save();

  // Fire security trace broadcast using Nodemailer setup
  await sendPasswordChangeEmail(user.email, user.name);

  const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

  const token = signToken(user._id);
  res.cookie("jwt", token, {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  });

  user.password = undefined;
  user.passwordChain = undefined; // Hide array matrix out of baseline payload returns

  res.status(200).json({
    success: true,
    token,
    data: { user },
  });
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  const { studentId, email } = req.body;
  if (!studentId && !email) {
    return next(new AppError("Provide your Student ID or email.", 400));
  }

  const user = await User.findOne(
    studentId ? { studentId } : { email: email.toLowerCase() }
  );

  // Always respond OK — don't leak whether user exists
  if (!user) {
    return res.status(200).json({
      success: true,
      message: "If that account exists, a reset link has been sent.",
    });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken   = crypto.createHash("sha256").update(resetToken).digest("hex");
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });

  try {
    await transporter.sendMail({
      from: `"Campus Portal" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: "Password Reset — Campus Materials Portal",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#1d4ed8">Reset Your Password</h2>
          <p>Hi ${user.name},</p>
          <p>Click the button below to reset your password. This link expires in <strong>10 minutes</strong>.</p>
          <p style="margin:24px 0">
            <a href="${resetUrl}"
               style="background:#1d4ed8;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
              Reset Password
            </a>
          </p>
          <p style="color:#6b7280;font-size:12px">
            If you didn't request this, ignore this email. Your password won't change.
          </p>
          <p style="color:#9ca3af;font-size:11px;margin-top:16px">
            Link: ${resetUrl}
          </p>
        </div>
      `,
    });
  } catch (err) {
    user.passwordResetToken   = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError("Failed to send reset email. Try again later.", 500));
  }

  res.status(200).json({
    success: true,
    message: "If that account exists, a reset link has been sent.",
  });
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken:   hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new AppError("Token is invalid or has expired.", 400));
  }

  const { password } = req.body;
  if (!password || password.length < 8) {
    return next(new AppError("Password must be at least 8 characters.", 400));
  }

  user.password             = password;
  user.passwordResetToken   = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  sendPasswordChangeEmail(user.email, user.name)
    .catch((err) => console.error("[Email] Reset confirmation email failed:", err.message));

  createSendToken(user, 200, res);
});

export const updateProfile = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.role) {
    return next(new AppError("Use /change-password to update password. Role changes require admin.", 400));
  }

  // Support 'session' properties inside permitted payload attributes whitelist
  const allowedUpdates = ["name", "level", "term", "session", "sessionDuration"];
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

  res.status(200).json({
    success: true,
    data: { user: updatedUser },
  });
});