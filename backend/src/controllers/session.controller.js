import Session from "../models/Session.model.js";
import User from "../models/user.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import SubjectFolder from "../models/SubjectFolder.model.js";
import Material from "../models/Material.model.js";

// GET /api/sessions — list all sessions (for the browser dropdown)
export const getSessions = catchAsync(async (req, res) => {
  const sessions = await Session.find({ isActive: true })
    .sort({ year: -1, type: 1 })
    .lean();

  res.status(200).json({ success: true, data: sessions });
});

// GET /api/sessions/current — get the most recent active session
export const getCurrentSession = catchAsync(async (req, res) => {
  const session = await Session.findOne({ isActive: true })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, data: session });
});

// GET /api/sessions/:id/content
// Returns all folders and material counts for a session, grouped by dept/level/term
export const getSessionContent = catchAsync(async (req, res, next) => {
  const session = await Session.findById(req.params.id).lean();
  if (!session) return next(new AppError("Session not found.", 404));

  // All root folders for this session
  const folders = await SubjectFolder.find({
    session:      session.name,
    isRootFolder: true,
    isActive:     true,
  })
    .select("courseCode courseName dept level term creditHours courseType materialCount")
    .sort({ dept: 1, level: 1, term: 1, courseCode: 1 })
    .lean();

  // Material counts per folder
  const materialCounts = await Material.aggregate([
    { $match: { session: session.name, isDeleted: false } },
    { $group: { _id: "$courseCode", count: { $sum: 1 }, totalSize: { $sum: "$fileSize" } } },
  ]);

  const countMap = {};
  materialCounts.forEach((m) => { countMap[m._id] = { count: m.count, size: m.totalSize }; });

  // Group folders by dept → level → term
  const grouped = {};
  folders.forEach((folder) => {
    const deptKey  = folder.dept;
    const sectionKey = `L${folder.level}T${folder.term}`;

    if (!grouped[deptKey]) grouped[deptKey] = {};
    if (!grouped[deptKey][sectionKey]) {
      grouped[deptKey][sectionKey] = {
        level: folder.level,
        term:  folder.term,
        folders: [],
      };
    }

    grouped[deptKey][sectionKey].folders.push({
      ...folder,
      materialCount: countMap[folder.courseCode]?.count  || 0,
      totalSizeKB:   Math.round((countMap[folder.courseCode]?.size || 0) / 1024),
    });
  });

  // Summary stats
  const totalFolders   = folders.length;
  const totalMaterials = materialCounts.reduce((acc, m) => acc + m.count, 0);
  const totalSizeKB    = Math.round(
    materialCounts.reduce((acc, m) => acc + (m.totalSize || 0), 0) / 1024
  );

  // Unique depts and sections covered
  const depts    = [...new Set(folders.map((f) => f.dept))];
  const sections = [...new Set(folders.map((f) => `${f.dept} L${f.level}T${f.term}`))];

  res.status(200).json({
    success: true,
    data: {
      session,
      grouped,      // { CSE: { L1T1: { level, term, folders[] } } }
      summary: {
        totalFolders,
        totalMaterials,
        totalSizeKB,
        depts,
        sections,
      },
    },
  });
});

// POST /api/sessions — Admin/SuperAdmin creates a new session
export const createSession = catchAsync(async (req, res, next) => {
  const { name, type, year, startDate, endDate } = req.body;

  if (!name || !type || !year) {
    return next(new AppError("name, type, and year are required.", 400));
  }

  const existing = await Session.findOne({ name });
  if (existing) {
    return next(new AppError(`Session "${name}" already exists.`, 409));
  }

  const session = await Session.create({
    name,
    type,
    year:      Number(year),
    startDate: startDate || null,
    endDate:   endDate   || null,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: session });
});
// PATCH /api/sessions/:id/assign
// Body: { sections: [{ dept, level, term }], overwrite: true/false }
export const assignSessionToUsers = catchAsync(async (req, res, next) => {
  const session = await Session.findById(req.params.id);
  if (!session) return next(new AppError("Session not found.", 404));

  const { sections, overwrite = false } = req.body;

  if (!sections || !sections.length) {
    return next(new AppError("Provide at least one section { dept, level, term }.", 400));
  }

  const sectionFilter = {
    $or: sections.map(({ dept, level, term }) => ({
      dept:  dept.toUpperCase(),
      level: Number(level),
      term:  Number(term),
    })),
    isActive: true,
  };

  // If overwrite=false, only assign users who have no session yet
  if (!overwrite) {
    sectionFilter.session = { $in: [null, "", undefined] };
  }

  const result = await User.updateMany(sectionFilter, {
    $set: { session: session.name },
  });

  // Also update the session's sections list
  const newSections = sections.filter(
    (s) => !session.sections.some(
      (ex) => ex.dept === s.dept.toUpperCase() &&
               ex.level === Number(s.level) &&
               ex.term  === Number(s.term)
    )
  );

  if (newSections.length > 0) {
    session.sections.push(...newSections.map((s) => ({
      dept:  s.dept.toUpperCase(),
      level: Number(s.level),
      term:  Number(s.term),
    })));
    await session.save();
  }

  res.status(200).json({
    success: true,
    message: `${result.modifiedCount} user(s) assigned to "${session.name}".`,
    modifiedCount: result.modifiedCount,
    data: session,
  });
});

// PATCH /api/sessions/:id
export const updateSession = catchAsync(async (req, res, next) => {
  const allowed = ["name", "type", "year", "startDate", "endDate", "sections", "isActive"];
  const updates = {};
  allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

  const oldSession = await Session.findById(req.params.id);
  if (!oldSession) return next(new AppError("Session not found.", 404));

  // If the name is changing, update all users who had the old name
  if (updates.name && updates.name !== oldSession.name) {
    await User.updateMany(
      { session: oldSession.name },
      { $set: { session: updates.name } }
    );
  }

  const session = await Session.findByIdAndUpdate(
    req.params.id,
    updates,
    { new: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: session });
});

// DELETE /api/sessions/:id
export const deleteSession = catchAsync(async (req, res, next) => {
  const session = await Session.findByIdAndDelete(req.params.id);
  if (!session) return next(new AppError("Session not found.", 404));
  res.status(204).json({ success: true });
});