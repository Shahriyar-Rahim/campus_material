import User from "../models/user.model.js";
import Material from "../models/Material.model.js";
import { Planner } from "../models/Planner.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import { sendWelcomeEmail } from "../services/email.service.js";
import SubjectFolder from "../models/SubjectFolder.model.js";
import supabase from "../config/supabase.js";

const requireAdmin = (req, res, next) => {
  if (!["Admin", "SuperAdmin"].includes(req.user.role)) {
    next(new AppError("Access denied. Admins only.", 403));
    return false; // signal to caller to stop
  }
  return true;
};

export const getDashboardStats = catchAsync(async (req, res, next) => {
  requireAdmin(req, next);
  if (!requireAdmin(req, res, next)) return;

  const [
    totalStudents,
    totalCRs,
    totalTeachers,
    totalFiles,
    filesByCategory,
    filesByDept,
    recentFiles,
    crBlock,
    activeUsers,
    totalFolders,
    foldersByDept,
  ] = await Promise.all([
    // 1-4: Basic Counts
    User.countDocuments({ role: "Student", isActive: true }),
    User.countDocuments({ role: "CR", isActive: true }),
    User.countDocuments({ role: "Teacher", isActive: true }),
    Material.countDocuments({ isDeleted: false }),

    // 5: filesByCategory (Groups by category, counts them, and sums file size)
    Material.aggregate([
      { $match: { isDeleted: false } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          totalSize: { $sum: "$fileSize" },
        },
      },
    ]),

    // 6: filesByDept (Groups materials by department)
    Material.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$dept", count: { $sum: 1 } } },
    ]),

    // 7: recentFiles (Fetches the 5 newest files)
    Material.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(5).lean(),

    // 8: crBlock (Fetches a preview of 5 CRs)
    User.find({ role: "CR", isActive: true })
      .select("name studentId dept email")
      .limit(5)
      .lean(),

    // 9: activeUsers (Counts users seen in the last 15 minutes)
    User.countDocuments({
      lastSeen: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    }),

    // 10-11: Folders
    SubjectFolder.countDocuments({ isActive: true }),
    SubjectFolder.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$dept", count: { $sum: 1 } } },
    ]),
  ]);

  const totalStorageBytes = filesByCategory.reduce(
    (acc, c) => acc + (c.totalSize || 0),
    0,
  );
  const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(2);

  res.status(200).json({
    success: true,
    data: {
      users: {
        totalStudents,
        totalCRs,
        totalTeachers,
        activeUsers,
      },
      materials: {
        totalFiles,
        totalStorageMB: Number(totalStorageMB),
        byCategory: filesByCategory,
        byDept: filesByDept,
        recentFiles,
      },
      crBlock: {
        preview: crBlock,
        viewAllUrl: "/api/admin/users?role=CR",
      },
      folders: {
        totalFolders,
        byDept: foldersByDept,
      },
    },
  });
});

export const getUsers = catchAsync(async (req, res, next) => {
  requireAdmin(req, next);

  const {
    role,
    dept,
    level,
    term,
    batch,
    page = 1,
    limit = 20,
    search,
  } = req.query;
  const filter = { isActive: true };

  if (role) filter.role = role;
  if (dept) filter.dept = dept.toUpperCase();
  if (level) filter.level = Number(level);
  if (term) filter.term = Number(term);
  if (batch) filter.batch = batch.toUpperCase();
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { studentId: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: users,
  });
});

export const updateUserRole = catchAsync(async (req, res, next) => {
  requireAdmin(req, next);

  const { role: newRole } = req.body;
  const VALID_ROLES = ["Student", "CR", "Teacher", "Admin", "SuperAdmin"];

  if (!VALID_ROLES.includes(newRole)) {
    return next(
      new AppError(`Invalid role. Valid roles: ${VALID_ROLES.join(", ")}`, 400),
    );
  }

  // Admins cannot promote to Admin / SuperAdmin
  if (req.user.role === "Admin" && ["Admin", "SuperAdmin"].includes(newRole)) {
    return next(
      new AppError(
        "Only SuperAdmins can assign Admin or SuperAdmin roles.",
        403,
      ),
    );
  }

  if (newRole === "SuperAdmin" && req.user.role !== "SuperAdmin") {
    return next(
      new AppError("Only SuperAdmins can assign the SuperAdmin role.", 403),
    );
  }
  if (newRole === "Admin" && req.user.role === "Admin") {
    return next(
      new AppError(
        "Admins cannot promote others to Admin. Only SuperAdmin can.",
        403,
      ),
    );
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role: newRole },
    { new: true, runValidators: true },
  );

  if (!user) return next(new AppError("User not found.", 404));

  res
    .status(200)
    .json({
      success: true,
      message: `User role updated to ${newRole}.`,
      data: user,
    });
});

export const deactivateUser = catchAsync(async (req, res, next) => {
  requireAdmin(req, next);

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true },
  );
  if (!user) return next(new AppError("User not found.", 404));

  res
    .status(200)
    .json({ success: true, message: "User deactivated.", data: user });
});

export const adminRegisterUser = catchAsync(async (req, res, next) => {
  requireAdmin(req, next);

  const { studentId, email, name, dept, level, term, session, batch, role } =
    req.body;

  const rawPassword = `${studentId.slice(-4)}@Campus${Math.floor(Math.random() * 900 + 100)}`;

  const newUser = await User.create({
    studentId,
    email,
    name,
    dept,
    level,
    term,
    session,
    batch,
    role: role || "Student",
    password: rawPassword,
    registeredBy: req.user._id,
    isVerified: true,
  });

  await sendWelcomeEmail({
    to: email,
    name,
    studentId,
    password: rawPassword,
    dept,
    level,
    term,
    batch,
    session,
    role: role || "Student",
  });

  newUser.password = undefined;

  res.status(201).json({
    success: true,
    message: `Account created and credentials emailed to ${email}.`,
    data: newUser,
  });
});

// DELETE /api/admin/materials/:id
// Admin/SuperAdmin can hard-delete any file including from Supabase
export const adminDeleteMaterial = catchAsync(async (req, res, next) => {
  requireAdmin(req, next);

  const material = await Material.findById(req.params.id);
  if (!material) return next(new AppError("Material not found.", 404));

  // Hard delete from Supabase storage
  const { error: storageError } = await supabase.storage
    .from(material.supabaseBucket || process.env.SUPABASE_BUCKET)
    .remove([material.supabasePath]);

  if (storageError) {
    console.error("Supabase delete error:", storageError.message);
    // Don't block DB deletion if storage fails — log and continue
  }

  await material.deleteOne();

  res.status(200).json({
    success: true,
    message: "File permanently deleted.",
    data: null,
  });
});

// DELETE /api/admin/folders/:id
// Admin/SuperAdmin can hard-delete any subject folder
export const adminDeleteFolder = catchAsync(async (req, res, next) => {
  requireAdmin(req, next);

  const folder = await SubjectFolder.findById(req.params.id);
  if (!folder) return next(new AppError("Folder not found.", 404));

  // Check if folder has materials — warn but allow
  const materialCount = await Material.countDocuments({
    courseCode: folder.courseCode,
    dept: folder.dept,
    level: folder.level,
    term: folder.term,
    isDeleted: false,
  });

  if (materialCount > 0 && req.query.force !== "true") {
    return res.status(409).json({
      success: false,
      code: "FOLDER_HAS_FILES",
      message: `This folder has ${materialCount} file(s). Add ?force=true to delete anyway.`,
      materialCount,
    });
  }

  await folder.deleteOne();

  res.status(200).json({
    success: true,
    message: `Folder deleted.${materialCount > 0 ? ` Note: ${materialCount} uploaded file(s) still exist in storage.` : ""}`,
    data: null,
  });
});

// GET /api/admin/materials?dept=CSE&level=1&term=1&page=1
// Admin view of all materials with full details for management
export const adminGetMaterials = catchAsync(async (req, res, next) => {
  requireAdmin(req, next);

  const {
    dept,
    level,
    term,
    category,
    courseCode,
    page = 1,
    limit = 20,
    search,
  } = req.query;

  const filter = { isDeleted: false };
  if (dept) filter.dept = dept.toUpperCase();
  if (level) filter.level = Number(level);
  if (term) filter.term = Number(term);
  if (category) filter.category = category;
  if (courseCode) filter.courseCode = courseCode.toUpperCase();
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { courseCode: { $regex: search, $options: "i" } },
      { fileName: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [materials, total] = await Promise.all([
    Material.find(filter)
      .populate("uploadedBy", "name role studentId dept")
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
