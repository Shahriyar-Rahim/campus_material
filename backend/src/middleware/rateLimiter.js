import rateLimit from "express-rate-limit";
import multer from "multer";
import supabase from "../config/supabase.js";

const rateLimitHandler = (req, res) => {
  const retryAfter = Math.ceil(req.rateLimit.resetTime / 1000 - Date.now() / 1000);
  res.status(429).json({
    success: false,
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests. Please slow down.",
    retryAfterSeconds: retryAfter > 0 ? retryAfter : 60,
    limit: req.rateLimit.limit,
    current: req.rateLimit.current,
    resetAt: new Date(req.rateLimit.resetTime).toISOString(),
  });
};

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: rateLimitHandler,
  skip: (req) => req.path === "/health",
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      code: "AUTH_RATE_LIMIT",
      message: "Too many login attempts. Please wait 15 minutes before trying again.",
      retryAfterSeconds: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000),
    });
  },
});


export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,

  keyGenerator: (req) => {
    const userId = req.user?._id?.toString();
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";
    return userId ? `user:${userId}` : `ip:${ip}`;
  },

  skip: (req) => {
    const role = req.user?.role;
    return role === "Admin" || role === "SuperAdmin";
  },

  handler: (req, res) => {
    const windowMinutes = 15;
    const resetAt = new Date(req.rateLimit.resetTime);
    res.status(429).json({
      success: false,
      code: "UPLOAD_RATE_LIMIT",
      message: `Upload limit reached. You can upload up to 5 files every ${windowMinutes} minutes.`,
      limit: req.rateLimit.limit,
      used: req.rateLimit.current,
      remaining: req.rateLimit.remaining,
      resetAt: resetAt.toISOString(),
      retryAfterSeconds: Math.max(0, Math.ceil((resetAt - Date.now()) / 1000)),
    });
  },
});

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  
  // Images
  "image/jpeg",
  "image/png",
  "image/webp",

  // Programming Files (C, C++, Python)
  "application/octet-stream", // Essential for .c, .cpp, .py on many browsers
  "text/plain",               // Some browsers treat code as plain text
  "text/x-csrc",
  "text/x-c++src",

  // Media
  "audio/mpeg", // mp3
  "video/mp4",  // mp4

  // Archives (for "Folders")
  "application/zip",
  "application/x-7z-compressed"
];

const MAX_FILE_SIZE_MB = 200;

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type not allowed: ${file.mimetype}. Allowed types: ${ALLOWED_MIME_TYPES.join(
          ", "
        )}`
      ),
      false
    );
  }
};

export const multerUpload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    files: 100,
  },
});

//ekhane supabase upload er utility ace karon
export const uploadToSupabase = async (file, { dept, level, term, category }) => {
  const timestamp = Date.now();
  const safeFilename = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const storagePath = `${dept.toLowerCase()}/l${level}t${term}/${category.toLowerCase()}/${timestamp}_${safeFilename}`;

  const { data, error } = await supabase.storage
    .from(process.env.SUPABASE_BUCKET || "materials")
    .upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

  if (error) throw new Error(`Supabase upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(process.env.SUPABASE_BUCKET || "materials")
    .getPublicUrl(storagePath);

  return {
    publicUrl: urlData.publicUrl,
    path: storagePath,
  };
};

export const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        code: "FILE_TOO_LARGE",
        message: `File exceeds the ${MAX_FILE_SIZE_MB} MB size limit.`,
      });
    }
    return res.status(400).json({
      success: false,
      code: "UPLOAD_ERROR",
      message: err.message,
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      code: "UPLOAD_VALIDATION_ERROR",
      message: err.message,
    });
  }
  next();
};
