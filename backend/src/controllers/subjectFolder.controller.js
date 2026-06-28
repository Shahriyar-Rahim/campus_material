import SubjectFolder from "../models/SubjectFolder.model.js";
import Material from "../models/Material.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

const MANAGER_ROLES = ["CR", "Teacher", "Admin", "SuperAdmin"];

export const getFolders = catchAsync(async (req, res, next) => {
  const { dept, level, term, session } = req.query;

  if (!dept || !level || !term) {
    return next(new AppError("dept, level, and term are required.", 400));
  }

  // If no session provided, use the requesting user's session
  const targetSession = session || req.user?.session;

  const filter = {
    dept: dept.toUpperCase(),
    level: Number(level),
    term:  Number(term),
    isActive: true,
    isRootFolder: true,
    // Session isolation: only show this session's folders
    ...(targetSession && { session: targetSession }),
  };

  const folders = await SubjectFolder.find(filter)
    .populate("createdBy", "name role")
    .sort({ isPinned: -1, courseCode: 1 })
    .lean();

  // Attach live material counts in one aggregation
  const counts = await Material.aggregate([
    {
      $match: {
        dept: dept.toUpperCase(),
        level: Number(level),
        term:  Number(term),
        session: targetSession || { $exists: true },
        isDeleted: false,
        courseCode: { $in: folders.map((f) => f.courseCode) },
      },
    },
    { $group: { _id: "$courseCode", count: { $sum: 1 } } },
  ]);

  const countMap = {};
  counts.forEach((c) => { countMap[c._id] = c.count; });

  res.status(200).json({
    success: true,
    count: folders.length,
    data: folders.map((f) => ({ ...f, materialCount: countMap[f.courseCode] || 0 })),
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
    return next(new AppError("Permission denied.", 403));
  }

  const {
    courseCode, courseName, courseDescription,
    dept, level, term, session,
    creditHours, courseType,
  } = req.body;

  if (!courseCode || !courseName || !dept || !level || !term || !session) {
    return next(new AppError("courseCode, courseName, dept, level, term, session are required.", 400));
  }

  // CRs locked to their own section AND session
  if (req.user.role === "CR") {
    if (
      dept.toUpperCase() !== req.user.dept ||
      Number(level) !== req.user.level ||
      Number(term)  !== req.user.term  ||
      session       !== req.user.session
    ) {
      return next(new AppError("CRs can only create folders for their own section and session.", 403));
    }
  }

  const folder = await SubjectFolder.create({
    courseCode: courseCode.toUpperCase(),
    courseName,
    courseDescription: courseDescription || "",
    dept: dept.toUpperCase(),
    level: Number(level),
    term:  Number(term),
    session,
    creditHours:  creditHours  || 3,
    courseType:   courseType   || "Theory",
    createdBy:    req.user._id,
    creatorRole:  req.user.role,
  });

  await folder.populate("createdBy", "name role");

  res.status(201).json({ success: true, data: folder });
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

// ── GET /api/folders/:id/children — get direct children of a folder
export const getFolderChildren = catchAsync(async (req, res, next) => {
  const children = await SubjectFolder.find({
    parentFolder: req.params.id,
    isActive: true,
  })
    .populate("createdBy", "name role")
    .sort({ isPinned: -1, courseName: 1 })
    .lean();

  // Attach material counts for each child
  const counts = await Material.aggregate([
    {
      $match: {
        isDeleted: false,
        courseCode: { $in: children.map((c) => c.courseCode) },
        dept: children[0]?.dept,
        level: children[0]?.level,
        term: children[0]?.term,
      },
    },
    { $group: { _id: "$courseCode", count: { $sum: 1 } } },
  ]);

  const countMap = {};
  counts.forEach((c) => { countMap[c._id] = c.count; });

  res.status(200).json({
    success: true,
    data: children.map((c) => ({
      ...c,
      materialCount: countMap[c.courseCode] || 0,
    })),
  });
});

// ── POST /api/folders/:id/subfolder — create a subfolder inside a folder
export const createSubFolder = catchAsync(async (req, res, next) => {
  if (!MANAGER_ROLES.includes(req.user.role)) {
    return next(new AppError("Permission denied.", 403));
  }

  const parentFolder = await SubjectFolder.findById(req.params.id);
  if (!parentFolder) return next(new AppError("Parent folder not found.", 404));

  if (parentFolder.depth >= 3) {
    return next(new AppError("Maximum folder depth (3) reached.", 400));
  }

  const { folderName, description } = req.body;
  if (!folderName) return next(new AppError("folderName is required.", 400));

  // Subfolders use a generated courseCode to satisfy the unique index
  const subCode = `${parentFolder.courseCode}-${folderName.toUpperCase().replace(/\s+/g, "-").slice(0, 10)}`;
  const newPath = parentFolder.parentPath
    ? `${parentFolder.parentPath}/${folderName}`
    : `${parentFolder.courseCode}/${folderName}`;

  const subfolder = await SubjectFolder.create({
    courseCode:    subCode,
    courseName:    folderName,
    courseDescription: description || "",
    dept:          parentFolder.dept,
    level:         parentFolder.level,
    term:          parentFolder.term,
    creditHours:   0,
    courseType:    parentFolder.courseType,
    createdBy:     req.user._id,
    creatorRole:   req.user.role,
    parentFolder:  parentFolder._id,
    parentPath:    newPath,
    isRootFolder:  false,
    depth:         parentFolder.depth + 1,
  });

  await subfolder.populate("createdBy", "name role");

  res.status(201).json({
    success: true,
    message: "Subfolder created.",
    data: subfolder,
  });
});

// ── GET /api/folders/:id/breadcrumb — full path from root to this folder
export const getFolderBreadcrumb = catchAsync(async (req, res, next) => {
  const breadcrumb = [];
  let current = await SubjectFolder.findById(req.params.id).lean();

  if (!current) return next(new AppError("Folder not found.", 404));

  breadcrumb.unshift(current);

  while (current.parentFolder) {
    current = await SubjectFolder.findById(current.parentFolder).lean();
    if (!current) break;
    breadcrumb.unshift(current);
  }

  res.status(200).json({ success: true, data: breadcrumb });
});