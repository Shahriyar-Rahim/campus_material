import { Routine } from "../models/Planner.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import SubjectFolder from "../models/SubjectFolder.model.js";

const ACADEMIC_CURRICULUM = {
  CSE: {
    1: {
      1: [
        { code: "CSE-1101", name: "Computer Fundamentals" },
        { code: "EEE-1163", name: "Electrical Circuit Analysis" },
      ],
      2: [
        { code: "CSE-1203", name: "Object Oriented Programming" },
        { code: "MATH-1219", name: "Coordinate Geometry" },
      ],
    },
    2: {
      2: [
        { code: "CSE-2201", name: "Computer Architecture" },
        { code: "CSE-2203", name: "Microprocessors & Interfacing" },
        { code: "CSE-2205", name: "Design & Analysis of Algorithms" },
        { code: "CSE-2207", name: "Numerical Methods" },
      ],
    },
    // Add other levels/terms as needed
  },
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

  const routine = await Routine.findOne({
    dept,
    level,
    term,
    isActive: true,
  }).lean();

  if (!routine) {
    return res.status(200).json({
      success: true,
      data: null,
      message: "No routine published for your section yet.",
    });
  }

  const DAYS = [
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
  ];
  const scheduleByDay = DAYS.reduce((acc, day) => {
    acc[day] = routine.schedule
      .filter((e) => e.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {});

  res.status(200).json({ success: true, data: { ...routine, scheduleByDay } });
});

export const getRoutine = catchAsync(async (req, res, next) => {
  const { dept, level, term, session } = req.query;
  if (!dept || !level || !term) {
    return next(new AppError("dept, level, and term are required.", 400));
  }

  const filter = {
    dept: dept.toUpperCase(),
    level: Number(level),
    term: Number(term),
    isActive: true,
  };

  if (session) filter.session = session;

  const routine = await Routine.findOne(filter).sort({ createdAt: -1 }).lean();

  res.status(200).json({ success: true, data: routine || null });
});

export const createOrUpdateRoutine = catchAsync(async (req, res, next) => {
  const { dept, level, term, session, batch, schedule, startDate, endDate } = req.body;

  if (!dept || !level || !term || !session || !Array.isArray(schedule)) {
    return next(new AppError("dept, level, term, session, and schedule[] are required.", 400));
  }

  if (!startDate || !endDate) {
    return next(new AppError("startDate and endDate are required.", 400));
  }

  if (new Date(startDate) >= new Date(endDate)) {
    return next(new AppError("endDate must be after startDate.", 400));
  }

  const filter = {
    dept:    dept.toUpperCase(),
    level:   Number(level),
    term:    Number(term),
    session,
  };

  const routine = await Routine.findOneAndUpdate(
    filter,
    {
      ...filter,
      batch:     batch?.toUpperCase(),
      schedule,
      startDate: new Date(startDate),
      endDate:   new Date(endDate),
      isActive:  true,
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

// GET /api/routine/timeline?dept=CSE&level=1&term=1&session=Winter 2026&from=2026-01-01&to=2026-03-31
export const getRoutineTimeline = catchAsync(async (req, res, next) => {
  const { dept, level, term, session, from, to } = req.query;

  if (!dept || !level || !term) {
    return next(new AppError("dept, level, term are required.", 400));
  }

  const filter = {
    dept:     dept.toUpperCase(),
    level:    Number(level),
    term:     Number(term),
    isActive: true,
  };
  if (session) filter.session = session;

  const routine = await Routine.findOne(filter).sort({ createdAt: -1 }).lean();
  if (!routine) {
    return res.status(200).json({ success: true, data: null, message: "No routine found." });
  }

  // Date range to expand — default to routine's own range
  const rangeStart = from ? new Date(from) : new Date(routine.startDate);
  const rangeEnd   = to   ? new Date(to)   : new Date(routine.endDate);

  // Clamp to routine's actual range
  const start = rangeStart < new Date(routine.startDate)
    ? new Date(routine.startDate) : rangeStart;
  const end = rangeEnd > new Date(routine.endDate)
    ? new Date(routine.endDate) : rangeEnd;

  // BAUST day name → JS getDay() value
  const DAY_TO_JS = {
    Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
    Thursday: 4, Saturday: 6,
    // Friday = 5 is a holiday — never in schedule
  };

  // Build suspended dates set for quick lookup
  const suspendedSet = new Set(
    (routine.suspendedDates || []).map((s) =>
      new Date(s.date).toISOString().split("T")[0]
    )
  );

  // Build extra classes map: dateStr → [entries]
  const extrasMap = {};
  (routine.extraClasses || []).forEach((ex) => {
    const key = new Date(ex.date).toISOString().split("T")[0];
    if (!extrasMap[key]) extrasMap[key] = [];
    extrasMap[key].push({ ...ex, isExtra: true });
  });

  // Expand weekly pattern into calendar dates
  const timeline = []; // { date, dateStr, dayName, classes[], isSuspended, isWeekend }
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    const dateStr = cursor.toISOString().split("T")[0];
    const jsDay   = cursor.getDay();

    // Map JS day to BAUST day name
    const BAUST_DAYS = {
      0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday",
      4: "Thursday", 5: null /* Friday = holiday */, 6: "Saturday",
    };
    const dayName = BAUST_DAYS[jsDay];

    const isFriday    = jsDay === 5;
    const isSuspended = suspendedSet.has(dateStr);
    const extras      = extrasMap[dateStr] || [];

    // Regular classes from weekly pattern for this day
    const regularClasses = (!isFriday && !isSuspended && dayName)
      ? routine.schedule
          .filter((e) => e.day === dayName)
          .map((e) => ({ ...e, isExtra: false, date: new Date(cursor) }))
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
      : [];

    // Combine regular + extras (extras always show even on suspended days)
    const classes = [
      ...regularClasses,
      ...extras.map((e) => ({ ...e, date: new Date(cursor) })),
    ].sort((a, b) => a.startTime.localeCompare(b.startTime));

    if (classes.length > 0 || extras.length > 0) {
      timeline.push({
        date:        new Date(cursor),
        dateStr,
        dayName:     dayName || "Friday",
        isFriday,
        isSuspended,
        hasExtras:   extras.length > 0,
        classes,
      });
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  // Summary
  const totalDays    = timeline.length;
  const totalClasses = timeline.reduce((acc, d) => acc + d.classes.length, 0);
  const uniqueCourses = [...new Set(
    timeline.flatMap((d) => d.classes.map((c) => c.courseCode))
  )];

  res.status(200).json({
    success: true,
    data: {
      routine: {
        _id:       routine._id,
        dept:      routine.dept,
        level:     routine.level,
        term:      routine.term,
        session:   routine.session,
        batch:     routine.batch,
        startDate: routine.startDate,
        endDate:   routine.endDate,
        isActive:  routine.isActive,
      },
      timeline,
      summary: {
        totalDays,
        totalClasses,
        uniqueCourses,
        rangeStart: start.toISOString().split("T")[0],
        rangeEnd:   end.toISOString().split("T")[0],
        suspendedDates: routine.suspendedDates || [],
      },
    },
  });
});

export const getFormattedRoutine = catchAsync(async (req, res, next) => {
  const { dept, level, term, session } = req.query;

  const targetSession = session || req.user?.session;

  const routine = await Routine.findOne({
    dept: (dept || req.user.dept).toUpperCase(),
    level: Number(level || req.user.level),
    term: Number(term || req.user.term),
    session: targetSession,
    isActive: true,
  }).lean();

  if (!routine) {
    return res
      .status(200)
      .json({
        success: true,
        data: null,
        message: "No routine published yet.",
      });
  }

  const DAYS = [
    "Saturday",
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
  ];

  const scheduleByDay = DAYS.reduce((acc, day) => {
    acc[day] = routine.schedule
      .filter((e) => e.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {});

  // Today's classes
  const TODAY =
    DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] || DAYS[0];
  const todayClasses = scheduleByDay[TODAY] || [];

  res.status(200).json({
    success: true,
    data: {
      ...routine,
      scheduleByDay,
      todayClasses,
      today: TODAY,
    },
  });
});

export const upsertScheduleEntry = catchAsync(async (req, res, next) => {
  const {
    entryId,
    day,
    startTime,
    endTime,
    courseCode,
    courseName,
    teacherName,
    room,
    type,
  } = req.body;

  const routine = await Routine.findById(req.params.id);
  if (!routine) return next(new AppError("Routine not found.", 404));

  if (entryId) {
    const entry = routine.schedule.id(entryId);
    if (!entry) return next(new AppError("Schedule entry not found.", 404));
    Object.assign(entry, {
      day,
      startTime,
      endTime,
      courseCode,
      courseName,
      teacherName,
      room,
      type,
    });
  } else {
    routine.schedule.push({
      day,
      startTime,
      endTime,
      courseCode,
      courseName,
      teacherName,
      room,
      type,
    });
  }

  await routine.save();
  res.status(200).json({ success: true, data: routine });
});

export const deleteScheduleEntry = catchAsync(async (req, res, next) => {
  const routine = await Routine.findById(req.params.id);
  if (!routine) return next(new AppError("Routine not found.", 404));

  routine.schedule = routine.schedule.filter(
    (e) => e._id.toString() !== req.params.entryId,
  );
  await routine.save();

  res
    .status(200)
    .json({ success: true, message: "Entry removed.", data: routine });
});

export const deactivateRoutine = catchAsync(async (req, res, next) => {
  const routine = await Routine.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true },
  );
  if (!routine) return next(new AppError("Routine not found.", 404));
  res
    .status(200)
    .json({ success: true, message: "Routine deactivated.", data: routine });
});

// PATCH /api/routine/:id/suspend — suspend specific dates (exams, holidays)
export const suspendDates = catchAsync(async (req, res, next) => {
  const { dates, reason } = req.body;
  // dates = ["2026-03-15", "2026-03-16"]

  if (!dates || !Array.isArray(dates) || dates.length === 0) {
    return next(new AppError("Provide dates[] to suspend.", 400));
  }

  const routine = await Routine.findById(req.params.id);
  if (!routine) return next(new AppError("Routine not found.", 404));

  dates.forEach((dateStr) => {
    const date = new Date(dateStr);
    const already = routine.suspendedDates.some(
      (s) => new Date(s.date).toISOString().split("T")[0] === dateStr
    );
    if (!already) {
      routine.suspendedDates.push({ date, reason: reason || "Holiday" });
    }
  });

  await routine.save();
  res.status(200).json({ success: true, message: "Dates suspended.", data: routine });
});

// PATCH /api/routine/:id/unsuspend — remove a suspended date
export const unsuspendDate = catchAsync(async (req, res, next) => {
  const { date } = req.body;

  const routine = await Routine.findById(req.params.id);
  if (!routine) return next(new AppError("Routine not found.", 404));

  routine.suspendedDates = routine.suspendedDates.filter(
    (s) => new Date(s.date).toISOString().split("T")[0] !== date
  );

  await routine.save();
  res.status(200).json({ success: true, message: "Date unsuspended.", data: routine });
});

// PATCH /api/routine/:id/extra — add a one-time extra class on a specific date
export const addExtraClass = catchAsync(async (req, res, next) => {
  const { date, courseCode, courseName, teacherName, teacherShortForm,
          room, startTime, endTime, type, note } = req.body;

  if (!date || !courseCode || !startTime || !endTime) {
    return next(new AppError("date, courseCode, startTime, endTime are required.", 400));
  }

  const routine = await Routine.findById(req.params.id);
  if (!routine) return next(new AppError("Routine not found.", 404));

  routine.extraClasses.push({
    date: new Date(date), courseCode, courseName: courseName || "",
    teacherName: teacherName || "", teacherShortForm: teacherShortForm || "",
    room: room || "", startTime, endTime, type: type || "Theory", note: note || "",
  });

  await routine.save();
  res.status(200).json({ success: true, message: "Extra class added.", data: routine });
});

// DELETE /api/routine/:id/extra/:extraId
export const removeExtraClass = catchAsync(async (req, res, next) => {
  const routine = await Routine.findById(req.params.id);
  if (!routine) return next(new AppError("Routine not found.", 404));

  routine.extraClasses = routine.extraClasses.filter(
    (e) => e._id.toString() !== req.params.extraId
  );

  await routine.save();
  res.status(200).json({ success: true, message: "Extra class removed.", data: routine });
});