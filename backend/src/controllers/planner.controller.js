import { Planner, Routine } from "../models/Planner.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";

const timeToMinutes = (timeStr) => {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const getDayName = (date) => DAYS[date.getDay()];


export const getDailyPlanner = catchAsync(async (req, res, next) => {
  const user = req.user;
  const targetDateStr = req.query.date || new Date().toISOString().split("T")[0];
  const targetDate = new Date(targetDateStr);

  if (isNaN(targetDate.getTime())) {
    return next(new AppError("Invalid date format. Use YYYY-MM-DD.", 400));
  }

  const dayName = getDayName(targetDate);

  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const [todayTasks, overdueTasks] = await Promise.all([
    Planner.find({
      owner: user._id,
      deadline: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("buddyId", "name profilePicture.url studentId")
      .sort({ priority: -1, order: 1 })
      .lean(),

    Planner.find({
      owner: user._id,
      status: { $in: ["Pending", "InProgress"] },
      deadline: { $lt: startOfDay },
    })
      .populate("buddyId", "name profilePicture.url studentId")
      .sort({ deadline: 1 })
      .lean(),
  ]);

  const routine = await Routine.findOne({
    dept: user.dept,
    level: user.level,
    term: user.term,
    isActive: true,
  }).lean();

  const todayClasses = routine
    ? routine.schedule
        .filter((entry) => entry.day === dayName)
        .map((entry) => ({
          ...entry,
          _id: entry._id,
          type: "class",
          status: "Scheduled",
          startMinutes: timeToMinutes(entry.startTime),
          endMinutes: timeToMinutes(entry.endTime),
        }))
        .sort((a, b) => a.startMinutes - b.startMinutes)
    : [];

  const normalisedTasks = todayTasks.map((task) => ({
    ...task,
    type: "task",
    startMinutes: task.deadline
      ? timeToMinutes(
          `${new Date(task.deadline).getHours().toString().padStart(2, "0")}:${new Date(task.deadline).getMinutes().toString().padStart(2, "0")}`
        )
      : 23 * 60 + 59,
  }));

  const merged = [...todayClasses, ...normalisedTasks].sort(
    (a, b) => a.startMinutes - b.startMinutes
  );

  const totalTasks = todayTasks.length;
  const doneTasks = todayTasks.filter((t) => t.status === "Done").length;
  const progressPercent =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  res.status(200).json({
    success: true,
    data: {
      date: targetDateStr,
      dayName,
      timeline: merged,
      overdueTasks,
      summary: {
        totalTasks,
        doneTasks,
        pendingTasks: totalTasks - doneTasks,
        progressPercent,
        totalClasses: todayClasses.length,
        hasRoutine: !!routine,
      },
    },
  });
});


export const getWeeklyPlanner = catchAsync(async (req, res, next) => {
  const user = req.user;
  const startDateStr = req.query.startDate || new Date().toISOString().split("T")[0];
  const startDate = new Date(startDateStr);

  if (isNaN(startDate.getTime())) {
    return next(new AppError("Invalid startDate. Use YYYY-MM-DD.", 400));
  }

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  const [weekTasks, routine] = await Promise.all([
    Planner.find({
      owner: user._id,
      deadline: { $gte: startDate, $lte: endDate },
    })
      .populate("buddyId", "name profilePicture.url")
      .sort({ deadline: 1 })
      .lean(),

    Routine.findOne({ dept: user.dept, level: user.level, term: user.term, isActive: true }).lean(),
  ]);

  // Build a map: dayName → { tasks[], classes[] }
  const weekMap = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const dayName = getDayName(d);
    weekMap[d.toISOString().split("T")[0]] = {
      date: d.toISOString().split("T")[0],
      dayName,
      tasks: weekTasks.filter(
        (t) => new Date(t.deadline).toISOString().split("T")[0] === d.toISOString().split("T")[0]
      ),
      classes: routine
        ? routine.schedule.filter((e) => e.day === dayName).sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
        : [],
    };
  }

  res.status(200).json({
    success: true,
    data: {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      week: Object.values(weekMap),
    },
  });
});

export const createTask = catchAsync(async (req, res, next) => {
  const { taskName, description, category, deadline, priority, courseCode, buddyId } = req.body;

  if (!taskName || !deadline) {
    return next(new AppError("taskName and deadline are required.", 400));
  }

  const task = await Planner.create({
    owner: req.user._id,
    taskName,
    description,
    category: category || "Academic",
    deadline: new Date(deadline),
    priority: priority || "Medium",
    courseCode,
    buddyId: buddyId || null,
    isShared: !!buddyId,
    sharedAt: buddyId ? new Date() : undefined,
  });

  res.status(201).json({ success: true, data: task });
});

export const updateTask = catchAsync(async (req, res, next) => {
  const task = await Planner.findOne({ _id: req.params.id, owner: req.user._id });

  if (!task) {
    return next(new AppError("Task not found or not owned by you.", 404));
  }

  const allowedFields = ["taskName", "description", "status", "progress", "priority", "deadline", "order", "category", "courseCode", "reminderAt"];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) task[field] = req.body[field];
  });

  if (req.body.status === "Done" && !task.completedAt) {
    task.completedAt = new Date();
    task.progress = 100;
  }

  await task.save();
  res.status(200).json({ success: true, data: task });
});

export const reorderTasks = catchAsync(async (req, res) => {
  const updates = req.body; // array of { id, order }

  const ops = updates.map(({ id, order }) => ({
    updateOne: {
      filter: { _id: id, owner: req.user._id },
      update: { $set: { order } },
    },
  }));

  await Planner.bulkWrite(ops);
  res.status(200).json({ success: true, message: "Tasks reordered." });
});

export const deleteTask = catchAsync(async (req, res, next) => {
  const task = await Planner.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!task) return next(new AppError("Task not found.", 404));
  res.status(204).json({ success: true, data: null });
});
