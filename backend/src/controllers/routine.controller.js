import { Routine } from "../models/Planner.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import SubjectFolder from "../models/SubjectFolder.model.js";

const ACADEMIC_CURRICULUM = {
  CSE: {
    "1": {
      "1": [
        { code: "CSE-1101", name: "Computer Fundamentals" },
        { code: "EEE-1163", name: "Electrical Circuit Analysis" }
      ],
      "2": [
        { code: "CSE-1203", name: "Object Oriented Programming" },
        { code: "MATH-1219", name: "Coordinate Geometry" }
      ]
    },
    "2": {
      "2": [
        { code: "CSE-2201", name: "Computer Architecture" },
        { code: "CSE-2203", name: "Microprocessors & Interfacing" },
        { code: "CSE-2205", name: "Design & Analysis of Algorithms" },
        { code: "CSE-2207", name: "Numerical Methods" }
      ]
    }
    // Add other levels/terms as needed
  }
};

export const getMyCourses = catchAsync(async (req, res) => {
  const { dept, level, term } = req.query;

  const normalizedDept = dept?.toUpperCase();

  if (!normalizedDept || !level || !term) {
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  const folders = await SubjectFolder.find({
    dept: normalizedDept,
    level: Number(level),
    term: Number(term),
    isActive: true,
  })
    .select("courseCode courseName courseType creditHours")
    .sort({ courseCode: 1 })
    .lean();

  // Shape matches what DashboardPage expects: { code, name }
  const courses = folders.map((f) => ({
    code: f.courseCode,
    name: f.courseName,
    type: f.courseType,
    credits: f.creditHours,
  }));

  res.status(200).json({ success: true, count: courses.length, data: courses });
});

export const getMyRoutine = catchAsync(async (req, res, next) => {
  const { dept, level, term } = req.user;

  const routine = await Routine.findOne({ dept, level, term, isActive: true }).lean();

  if (!routine) {
    return res.status(200).json({
      success: true,
      data: null,
      message: "No routine published for your section yet.",
    });
  }

  

  const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];
  const scheduleByDay = DAYS.reduce((acc, day) => {
    acc[day] = routine.schedule
      .filter((e) => e.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {});

  res.status(200).json({ success: true, data: { ...routine, scheduleByDay } });
});



export const getRoutine = catchAsync(async (req, res, next) => {
  const { dept, level, term } = req.query;
  if (!dept || !level || !term) {
    return next(new AppError("dept, level, and term are required.", 400));
  }

  const routine = await Routine.findOne({
    dept: dept.toUpperCase(),
    level: Number(level),
    term: Number(term),
    isActive: true,
  }).lean();

  res.status(200).json({ success: true, data: routine || null });
});

export const createOrUpdateRoutine = catchAsync(async (req, res, next) => {
  const { dept, level, term, session, batch, schedule } = req.body;

  if (!dept || !level || !term || !session || !Array.isArray(schedule)) {
    return next(new AppError("dept, level, term, session, and schedule[] are required.", 400));
  }

  const filter = { dept: dept.toUpperCase(), level: Number(level), term: Number(term) };

  const routine = await Routine.findOneAndUpdate(
    filter,
    {
      ...filter,
      session,
      batch: batch?.toUpperCase(),
      schedule,
      isActive: true,
      publishedBy: req.user._id,
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  res.status(200).json({
    success: true,
    message: "Routine published successfully.",
    data: routine,
  });
});


export const upsertScheduleEntry = catchAsync(async (req, res, next) => {
  const { entryId, day, startTime, endTime, courseCode, courseName, teacherName, room, type } = req.body;

  const routine = await Routine.findById(req.params.id);
  if (!routine) return next(new AppError("Routine not found.", 404));

  if (entryId) {

    const entry = routine.schedule.id(entryId);
    if (!entry) return next(new AppError("Schedule entry not found.", 404));
    Object.assign(entry, { day, startTime, endTime, courseCode, courseName, teacherName, room, type });
  } else {

    routine.schedule.push({ day, startTime, endTime, courseCode, courseName, teacherName, room, type });
  }

  await routine.save();
  res.status(200).json({ success: true, data: routine });
});

export const deleteScheduleEntry = catchAsync(async (req, res, next) => {
  const routine = await Routine.findById(req.params.id);
  if (!routine) return next(new AppError("Routine not found.", 404));

  routine.schedule = routine.schedule.filter(
    (e) => e._id.toString() !== req.params.entryId
  );
  await routine.save();

  res.status(200).json({ success: true, message: "Entry removed.", data: routine });
});

export const deactivateRoutine = catchAsync(async (req, res, next) => {
  const routine = await Routine.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!routine) return next(new AppError("Routine not found.", 404));
  res.status(200).json({ success: true, message: "Routine deactivated.", data: routine });
});
