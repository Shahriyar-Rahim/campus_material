import mongoose from "mongoose";

const subjectFolderSchema = new mongoose.Schema(
  {
    courseCode: {
      type: String,
      required: [true, "Course code is required"],
      uppercase: true,
      trim: true,
      // e.g. "CSE-1101", "EEE-1163"
    },
    courseName: {
      type: String,
      required: [true, "Course name is required"],
      trim: true,
      maxlength: 150,
    },
    courseDescription: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    dept: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
      index: true,
    },
    term: {
      type: Number,
      required: true,
      min: 1,
      max: 2,
      index: true,
    },
    session: {
      type: String,
      required: [true, "Session is required"],
      trim: true,
      index: true,
      // e.g. "Winter 2026", "Summer 2026"
    },
    creditHours: {
      type: Number,
      default: 3,
      min: 0,
      max: 6,
    },
    courseType: {
      type: String,
      enum: ["Theory", "Lab", "Theory+Lab"],
      default: "Theory",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    creatorRole: {
      type: String,
      enum: ["CR", "Teacher", "Admin", "SuperAdmin"],
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },

    materialCount: {
      type: Number,
      default: 0,
    },
    parentPath: {
      type: String, // e.g., "CSE-1101/Mid"
      default: null,
      index: true,
    },
    parentFolder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubjectFolder",
      default: null, // null = root level folder (the course folder)
    },
    isRootFolder: {
      type: Boolean,
      default: true, // false for subfolders
    },
    depth: {
      type: Number,
      default: 0, // 0=course, 1=subfolder, 2=nested subfolder
      max: 3, // max 3 levels deep
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

subjectFolderSchema.index(
  { courseCode: 1, dept: 1, level: 1, term: 1, session: 1, parentFolder: 1 },
  { unique: true },
);

subjectFolderSchema.index({ dept: 1, level: 1, term: 1, session: 1, isActive: 1 });

subjectFolderSchema.virtual("folderLabel").get(function () {
  return `${this.dept} L${this.level}T${this.term} — ${this.courseCode}`;
});

const SubjectFolder = mongoose.model("SubjectFolder", subjectFolderSchema);
export default SubjectFolder;
