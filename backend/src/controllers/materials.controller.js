import Material from "../models/Material.model.js";
import User from "../models/user.model.js";
import SubjectFolder from "../models/SubjectFolder.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { uploadToSupabase } from "../middleware/rateLimiter.js";
import supabase from "../config/supabase.js";
import { v4 as uuidv4 } from "uuid";

const MANAGER_ROLES = ["CR", "Teacher", "Admin", "SuperAdmin"];
const canManage = (role) => MANAGER_ROLES.includes(role);

export const getMaterials = catchAsync(async (req, res, next) => {
  const {
    dept,
    level,
    term,
    category,
    courseCode,
    page = 1,
    limit = 20,
  } = req.query;

  if (!dept || !level || !term) {
    return next(
      new AppError("dept, level, and term are required query params.", 400),
    );
  }

  const filter = {
    dept: dept.toUpperCase(),
    level: Number(level),
    term: Number(term),
    isVisible: true,
    isDeleted: false,
  };
  if (category) filter.category = category;
  if (courseCode)
    filter.courseCode = decodeURIComponent(courseCode).toUpperCase();

  const skip = (Number(page) - 1) * Number(limit);

  const [materials, total] = await Promise.all([
    Material.find(filter)
      .populate("uploadedBy", "name role studentId")
      .populate("pinnedBy", "name role")
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Material.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: materials.length,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: materials,
  });
});

export const uploadMaterial = catchAsync(async (req, res, next) => {
  if (!canManage(req.user.role)) {
    return next(
      new AppError("Only CRs, Teachers, and Admins can upload materials.", 403),
    );
  }

  if (!req.file) {
    return next(new AppError("No file uploaded. Please attach a file.", 400));
  }

  const {
    title,
    category,
    courseCode,
    courseName,
    dept,
    level,
    term,
    session,
    year,
    description,
  } = req.body;

  if (!title || !category || !courseCode || !dept || !level || !term) {
    return next(
      new AppError(
        "title, category, courseCode, dept, level, term are required.",
        400,
      ),
    );
  }

  const { publicUrl, path: storagePath } = await uploadToSupabase(req.file, {
    dept: dept.toUpperCase(),
    level: Number(level),
    term: Number(term),
    category,
  });

  const material = await Material.create({
    title,
    description: description || "",
    supabaseUrl: publicUrl,
    supabasePath: storagePath,
    supabaseBucket: process.env.SUPABASE_BUCKET || "academic-materials",
    fileName: req.file.originalname,
    fileSize: req.file.size,
    mimeType: req.file.mimetype,
    category,
    courseCode: courseCode.toUpperCase(),
    courseName: courseName || "",
    dept: dept.toUpperCase(),
    level: Number(level),
    term: Number(term),
    session: session || null,
    year: Number(year) || new Date().getFullYear(),
    uploadedBy: req.user._id,
    uploaderRole: req.user.role,
  });

  await material.populate("uploadedBy", "name role studentId");

  res.status(201).json({
    success: true,
    message: "Material uploaded successfully.",
    data: material,
  });
});

export const pinMaterial = catchAsync(async (req, res, next) => {
  const material = await Material.findById(req.params.id);
  if (!material) return next(new AppError("Material not found.", 404));

  if (req.user.role === "CR") {
    const isSameSection =
      material.dept === req.user.dept &&
      Number(material.level) === Number(req.user.level) &&
      Number(material.term) === Number(req.user.term);

    if (!isSameSection) {
      return next(
        new AppError("CRs can only pin materials for their own section.", 403),
      );
    }
  }

  material.isPinned = true;
  material.pinnedBy = req.user._id;
  material.pinnedAt = new Date();
  await material.save();

  res
    .status(200)
    .json({ success: true, message: "Material pinned.", data: material });
});

export const unpinMaterial = catchAsync(async (req, res, next) => {
  if (!canManage(req.user.role)) {
    return next(
      new AppError("You do not have permission to unpin materials.", 403),
    );
  }

  const material = await Material.findById(req.params.id);
  if (!material) return next(new AppError("Material not found.", 404));

  material.isPinned = false;
  material.pinnedBy = null;
  material.pinnedAt = null;
  await material.save();

  res
    .status(200)
    .json({ success: true, message: "Material unpinned.", data: material });
});

export const forwardMaterial = catchAsync(async (req, res, next) => {
  const adminRoles = ["Admin", "SuperAdmin"];
  if (!adminRoles.includes(req.user.role)) {
    return next(new AppError("Only Admins can forward materials.", 403));
  }

  const original = await Material.findById(req.params.id);
  if (!original) return next(new AppError("Material not found.", 404));

  const { targets } = req.body; // [{ dept, level, term }]
  if (!targets || !Array.isArray(targets) || targets.length === 0) {
    return next(
      new AppError(
        "Provide at least one forward target { dept, level, term }.",
        400,
      ),
    );
  }

  const newForwards = targets.filter((t) => {
    return !original.forwardedTo.some(
      (f) => f.dept === t.dept && f.level === t.level && f.term === t.term,
    );
  });

  if (newForwards.length === 0) {
    return res.status(200).json({
      success: true,
      message: "All targets already received this material.",
    });
  }

  const forwardedDocs = newForwards.map((t) => ({
    title: original.title,
    description: original.description,
    supabaseUrl: original.supabaseUrl,
    supabasePath: original.supabasePath,
    supabaseBucket: original.supabaseBucket,
    fileName: original.fileName,
    fileSize: original.fileSize,
    mimeType: original.mimeType,
    category: original.category,
    courseCode: original.courseCode,
    courseName: original.courseName,
    dept: t.dept.toUpperCase(),
    level: Number(t.level),
    term: Number(t.term),
    session: original.session,
    year: original.year,
    uploadedBy: req.user._id,
    uploaderRole: req.user.role,
    isForwarded: true,
    originalMaterial: original._id,
    tags: original.tags,
  }));

  await Material.insertMany(forwardedDocs);

  original.forwardedTo.push(
    ...newForwards.map((t) => ({
      dept: t.dept.toUpperCase(),
      level: Number(t.level),
      term: Number(t.term),
      forwardedBy: req.user._id,
    })),
  );
  await original.save();

  res.status(201).json({
    success: true,
    message: `Material forwarded to ${newForwards.length} target(s).`,
    forwarded: newForwards,
  });
});

export const deleteMaterial = catchAsync(async (req, res, next) => {
  if (!canManage(req.user.role)) {
    return next(
      new AppError("You do not have permission to delete materials.", 403),
    );
  }

  const material = await Material.findById(req.params.id);
  if (!material) return next(new AppError("Material not found.", 404));

  if (
    req.user.role === "CR" &&
    material.uploadedBy.toString() !== req.user._id.toString()
  ) {
    return next(new AppError("CRs can only delete their own uploads.", 403));
  }
  // Teachers restricted to their own dept's materials
  if (req.user.role === "Teacher" && material.dept !== req.user.dept) {
    return next(
      new AppError(
        "Teachers can only delete materials in their own department.",
        403,
      ),
    );
  }

  if (req.user.role === "SuperAdmin" && req.query.hard === "true") {
    await supabase.storage
      .from(material.supabaseBucket)
      .remove([material.supabasePath]);
    await material.deleteOne();
    return res.status(204).json({ success: true, data: null });
  }

  material.isDeleted = true;
  material.isVisible = false;
  material.deletedBy = req.user._id;
  material.deletedAt = new Date();
  await material.save();

  res
    .status(200)
    .json({ success: true, message: "Material deleted.", data: null });
});

export const updateMaterialMeta = catchAsync(async (req, res, next) => {
  if (!canManage(req.user.role)) {
    return next(new AppError("Permission denied.", 403));
  }

  const allowedUpdates = [
    "title",
    "description",
    "category",
    "courseName",
    "courseCode",
    "tags",
    "isVisible",
    "year",
    "session",
  ];
  const updates = {};
  allowedUpdates.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const material = await Material.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!material) return next(new AppError("Material not found.", 404));

  res.status(200).json({ success: true, data: material });
});

export const getMaterialStats = catchAsync(async (req, res) => {
  const [totalFiles, byCategory, recentUploads] = await Promise.all([
    Material.countDocuments({ isDeleted: false }),
    Material.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Material.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("uploadedBy", "name role")
      .lean(),
  ]);

  res.status(200).json({
    success: true,
    data: { totalFiles, byCategory, recentUploads },
  });
});

export const bulkUploadMaterials = catchAsync(async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next(new AppError("No files selected.", 400));
  }

  const { dept, level, term, courseCode, category, folderId } = req.body;

  if (!dept || !level || !term || !courseCode || !category) {
    return next(
      new AppError(
        "dept, level, term, courseCode, category are required.",
        400,
      ),
    );
  }

  // If folderId provided, get the subfolder path
  let basePath = `${dept.toLowerCase()}/l${level}t${term}/${courseCode.toLowerCase()}/${category.toLowerCase()}`;

  if (folderId) {
    const folder = await SubjectFolder.findById(folderId).lean();
    if (folder?.parentPath) {
      basePath = `${dept.toLowerCase()}/l${level}t${term}/${folder.parentPath.toLowerCase()}`;
    }
  }

  // Upload all files in parallel
  const results = await Promise.allSettled(
    req.files.map(async (file) => {
      const timestamp = Date.now();

      // 1. Fix the Multer Encoding (Convert broken Latin1 back to perfect Bangla UTF-8)
      const cleanBanglaName = Buffer.from(file.originalname, "latin1").toString(
        "utf8",
      );

      // 2. Extract the file extension safely (e.g., "pdf", "docx")
      const fileExtension = file.originalname.split(".").pop();

      // 3. Create a unique, safe filename for Supabase (e.g., "17808568_a1b2c3d4.pdf")
      const secureStorageName = `${timestamp}_${uuidv4()}.${fileExtension}`;

      const safeFilename = file.originalname.replace(
        /[^\p{L}\p{N}.\-_]/gu,
        "_",
      );
      const fullPath = `${basePath}/${Date.now()}_${secureStorageName}`;

      const { error: uploadError } = await supabase.storage
        .from(process.env.SUPABASE_BUCKET || "materials")
        .upload(fullPath, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError)
        throw new Error(`${file.originalname}: ${uploadError.message}`);

      const { data: urlData } = supabase.storage
        .from(process.env.SUPABASE_BUCKET || "materials")
        .getPublicUrl(fullPath);

      return Material.create({
        title: cleanBanglaName, // strip extension
        fileName: cleanBanglaName,
        supabaseUrl: urlData.publicUrl,
        supabasePath: fullPath,
        supabaseBucket: process.env.SUPABASE_BUCKET || "materials",
        category,
        courseCode: courseCode.toUpperCase(),
        dept: dept.toUpperCase(),
        level: Number(level),
        term: Number(term),
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedBy: req.user._id,
        uploaderRole: req.user.role,
      });
    }),
  );

  const succeeded = results
    .filter((r) => r.status === "fulfilled")
    .map((r) => r.value);
  const failed = results
    .filter((r) => r.status === "rejected")
    .map((r) => r.reason?.message);

  res.status(201).json({
    success: true,
    message: `${succeeded.length} file(s) uploaded${failed.length ? `, ${failed.length} failed` : ""}.`,
    uploaded: succeeded.length,
    failed: failed.length,
    errors: failed,
    data: succeeded,
  });
});
