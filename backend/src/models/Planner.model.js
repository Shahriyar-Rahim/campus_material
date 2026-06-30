import mongoose from "mongoose";

const plannerSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    taskName: {
      type: String,
      required: [true, "Task name is required"],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    category: {
      type: String,
      enum: ["Academic", "Personal"],
      required: true,
      default: "Academic",
      index: true,
    },

    deadline: {
      type: Date,
      required: [true, "Deadline is required"],
      index: true,
    },
    reminderAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["Pending", "InProgress", "Done", "Overdue"],
      default: "Pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    order: {
      type: Number,
      default: 0,
    },

    buddyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
    sharedAt: Date,

    courseCode: {
      type: String,
      uppercase: true,
      trim: true,
      default: null,
    },

    routineRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Routine",
      default: null,
    },
    isRoutineDerived: {
      type: Boolean,
      default: false,
    },

    completedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

plannerSchema.virtual("isOverdue").get(function () {
  return this.status !== "Done" && this.deadline < new Date();
});

plannerSchema.index({ owner: 1, status: 1, deadline: 1 });
plannerSchema.index({ owner: 1, category: 1 });
plannerSchema.index({ buddyId: 1, isShared: 1 });

export const Planner = mongoose.model("Planner", plannerSchema);

const DAYS = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"];

const routineEntrySchema = new mongoose.Schema({
  day: { type: String, enum: DAYS, required: true },
  startTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ }, // "08:00"
  endTime:   { type: String, required: true, match: /^\d{2}:\d{2}$/ }, // "09:00"
  courseCode: { type: String, uppercase: true, trim: true, required: true },
  courseName: { type: String, trim: true, default: "" },
  teacherName: { type: String, trim: true, default: "" },
  room: { type: String, trim: true, default: "" },
  type: {
    type: String,
    enum: ["Theory", "Lab", "Tutorial"],
    default: "Theory",
  },
});

const routineSchema = new mongoose.Schema(
  {
    dept:    { type: String, required: true, uppercase: true, index: true },
    level:   { type: Number, required: true, min: 1, max: 4, index: true },
    term:    { type: Number, required: true, min: 1, max: 2, index: true },
    session: { type: String, required: true },
    batch:   { type: String, uppercase: true, trim: true },

    // ── Timeline ──────────────────────────────────────────────────────────────
    startDate: {
      type: Date,
      required: [true, "Routine start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "Routine end date is required"],
    },

    // ── Weekly pattern (unchanged) ────────────────────────────────────────────
    schedule: [routineEntrySchema],

    // ── Exam / Holiday overrides ───────────────────────────────────────────────
    // Dates where the routine is suspended (exam week, public holidays, etc.)
    suspendedDates: [
      {
        date:   { type: Date, required: true },
        reason: { type: String, default: "Holiday" },
      },
    ],

    // ── Extra one-time classes ─────────────────────────────────────────────────
    // Classes added on a specific date that override or supplement the pattern
    extraClasses: [
      {
        date:        { type: Date, required: true },
        courseCode:  { type: String, uppercase: true, trim: true },
        courseName:  { type: String, default: "" },
        teacherName: { type: String, default: "" },
        teacherShortForm: { type: String, default: "" },
        room:        { type: String, default: "" },
        startTime:   { type: String, required: true },
        endTime:     { type: String, required: true },
        type:        { type: String, enum: ["Theory","Lab","Tutorial"], default: "Theory" },
        note:        { type: String, default: "" },
      },
    ],

    isActive: { type: Boolean, default: true },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

routineSchema.index({ dept: 1, level: 1, term: 1, session: 1 }, { unique: true });

export const Routine = mongoose.model("Routine", routineSchema);
