import SubjectFolder from "../models/SubjectFolder.model.js";
import Material from "../models/Material.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

const MANAGER_ROLES = ["CR", "Teacher", "Admin", "SuperAdmin"];

export const getFolders = catchAsync(async (req, res, next) => {
  const { dept, level, term } = req.query;

  if (!dept || !level || !term) {
    return next(new AppError("dept, level, and term are required.", 400));
  }

  const folders = await SubjectFolder.find({
    dept: dept.toUpperCase(),
    level: Number(level),
    term: Number(term),
    isActive: true,
  })
    .populate("createdBy", "name role")
    .sort({ isPinned: -1, courseCode: 1 })
    .lean();

  // Attach live material counts
  const counts = await Material.aggregate([
    {
      $match: {
        dept: dept.toUpperCase(),
        level: Number(level),
        term: Number(term),
        isDeleted: false,
        courseCode: { $in: folders.map((f) => f.courseCode) },
      },
    },
    { $group: { _id: "$courseCode", count: { $sum: 1 } } },
  ]);

  const countMap = {};
  counts.forEach((c) => { countMap[c._id] = c.count; });

  const enriched = folders.map((f) => ({
    ...f,
    materialCount: countMap[f.courseCode] || 0,
  }));

  res.status(200).json({
    success: true,
    count: enriched.length,
    data: enriched,
  });
});

export const getAllFoldersByDept = catchAsync(async (req, res, next) => {
  const { dept } = req.query;
  if (!dept) return next(new AppError("dept is required.", 400));

  const folders = await SubjectFolder.find({
    dept: dept.toUpperCase(),
    isActive: true,
  })
    .sort({ level: 1, term: 1, courseCode: 1 })
    .lean();

  // Group by level/term for the filter panel
  const grouped = {};
  folders.forEach((f) => {
    const key = `L${f.level}T${f.term}`;
    if (!grouped[key]) {
      grouped[key] = { level: f.level, term: f.term, label: key, folders: [] };
    }
    grouped[key].folders.push(f);
  });

  res.status(200).json({
    success: true,
    data: {
      flat: folders,
      grouped: Object.values(grouped).sort(
        (a, b) => a.level - b.level || a.term - b.term
      ),
    },
  });
});

export const createFolder = catchAsync(async (req, res, next) => {
  if (!MANAGER_ROLES.includes(req.user.role)) {
    return next(new AppError("Only CRs, Teachers, and Admins can create folders.", 403));
  }

  const {
    courseCode, courseName, courseDescription,
    dept, level, term, creditHours, courseType,
  } = req.body;

  if (!courseCode || !courseName || !dept || !level || !term) {
    return next(
      new AppError("courseCode, courseName, dept, level, and term are required.", 400)
    );
  }

  // CRs can only create folders for their own section
  if (req.user.role === "CR") {
    if (
      dept.toUpperCase() !== req.user.dept ||
      Number(level) !== req.user.level ||
      Number(term) !== req.user.term
    ) {
      return next(
        new AppError("CRs can only create folders for their own dept/level/term.", 403)
      );
    }
  }

  const folder = await SubjectFolder.create({
    courseCode: courseCode.toUpperCase(),
    courseName,
    courseDescription: courseDescription || "",
    dept: dept.toUpperCase(),
    level: Number(level),
    term: Number(term),
    creditHours: creditHours || 3,
    courseType: courseType || "Theory",
    createdBy: req.user._id,
    creatorRole: req.user.role,
  });

  await folder.populate("createdBy", "name role");

  res.status(201).json({
    success: true,
    message: "Subject folder created.",
    data: folder,
  });
});

export const updateFolder = catchAsync(async (req, res, next) => {
  if (!MANAGER_ROLES.includes(req.user.role)) {
    return next(new AppError("Permission denied.", 403));
  }

  const allowed = ["courseName", "courseDescription", "creditHours", "courseType", "isPinned", "isActive"];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const folder = await SubjectFolder.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  ).populate("createdBy", "name role");

  if (!folder) return next(new AppError("Folder not found.", 404));

  res.status(200).json({ success: true, data: folder });
});


export const deleteFolder = catchAsync(async (req, res, next) => {
  if (!MANAGER_ROLES.includes(req.user.role)) {
    return next(new AppError("Permission denied.", 403));
  }

  const folder = await SubjectFolder.findById(req.params.id);
  if (!folder) return next(new AppError("Folder not found.", 404));

  // Only CRs and Teachers can delete folders they created
  if (
  ["CR", "Teacher"].includes(req.user.role) &&
  folder.createdBy.toString() !== req.user._id.toString()
) {
  return next(new AppError("You can only delete folders you created.", 403));
}

  if (req.user.role === "SuperAdmin" && req.query.hard === "true") {
    await folder.deleteOne();
    return res.status(204).json({ success: true, data: null });
  }

  folder.isActive = false;
  await folder.save();

  res.status(200).json({ success: true, message: "Folder deactivated." });
});

export const getFolderById = catchAsync(async (req, res, next) => {
  const folder = await SubjectFolder.findById(req.params.id)
    .populate("createdBy", "name role")
    .lean();

  if (!folder) return next(new AppError("Folder not found.", 404));

  res.status(200).json({ success: true, data: folder });
});
