import mongoose from "mongoose";

export const FOLDER_CATEGORIES = [
  "Notice",
  "Mid",
  "Final",
  "RIB",
  "Lab",
  "Slides",
  "Assignment",
  "Routine",
  "Other",
];

const materialSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Material title is required"],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    supabaseUrl: {
      type: String,
      required: [true, "Supabase file URL is required"],
    },
    supabasePath: {
      type: String,
      required: true,
      // e.g. "cse/l3t1/mid/filename.pdf"
    },
    supabaseBucket: {
      type: String,
      required: true,
      default: "academic-materials",
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    mimeType: {
      type: String,
      default: "application/pdf",
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    courseCode: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
      // e.g. "CSE-301", "EEE-205"
    },
    courseName: {
      type: String,
      trim: true,
      default: "",
    },
    dept: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    term: {
      type: Number,
      required: true,
      min: 1,
      max: 2,
    },
    session: {
      type: String,
      default: null,
    },
    year: {
      type: Number,
      default: () => new Date().getFullYear(),
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    uploaderRole: {
      type: String,
      enum: ["CR", "Teacher", "Admin", "SuperAdmin"],
      required: true,
    },

    isPinned: {
      type: Boolean,
      default: false,
      index: true,
    },
    pinnedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    pinnedAt: {
      type: Date,
      default: null,
    },
    isVisible: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    deletedAt: Date,

    forwardedTo: [
      {
        dept: String,
        level: Number,
        term: Number,
        forwardedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        forwardedAt: { type: Date, default: Date.now },
      },
    ],
    isForwarded: {
      type: Boolean,
      default: false,
    },
    originalMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Material",
      default: null,
    },

    downloadCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },

    tags: [{ type: String, trim: true, lowercase: true }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

materialSchema.index({ dept: 1, level: 1, term: 1, category: 1 });
materialSchema.index({ courseCode: 1, category: 1 });
materialSchema.index({ isPinned: -1, createdAt: -1 });
materialSchema.index({ isDeleted: 1, isVisible: 1 });

materialSchema.virtual("folderLabel").get(function () {
  return `${this.dept}/L${this.level}T${this.term}/${this.category}`;
});

// materialSchema.pre(/^find/, function (next) {
//   if (!this.getOptions()._includeDeleted) {
//     this.where({ isDeleted: false });
//   }
//   next();
// });

materialSchema.pre(/^find/, function () {
  // Use 'this' directly; modern Mongoose handles this synchronously
  // if you don't declare 'next' in the arguments.
  const options = this.getOptions();
  if (!options || !options._includeDeleted) {
    this.where({ isDeleted: false });
  }
})

const Material = mongoose.model("Material", materialSchema);
export default Material;