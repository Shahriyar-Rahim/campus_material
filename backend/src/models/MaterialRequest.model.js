import mongoose from "mongoose";

const materialRequestSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseCode: { type: String, trim: true, uppercase: true, default: "" },
    courseName: { type: String, trim: true, default: "" },
    category: {
      type: String,
      enum: ["Mid", "Final", "Slides", "Lab", "Assignment", "RIB", "Notice", "Other"],
      default: "Other",
    },
    description: {
      type: String,
      required: [true, "Please describe what you need."],
      trim: true,
      maxlength: 500,
    },
    dept:  { type: String, uppercase: true, required: true },
    level: { type: Number, required: true },
    term:  { type: Number, required: true },

    status: {
      type: String,
      enum: ["Pending", "InProgress", "Fulfilled", "Declined"],
      default: "Pending",
      index: true,
    },

    // CR/Admin reply
    reply: { type: String, trim: true, maxlength: 1000, default: "" },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    repliedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

materialRequestSchema.index({ dept: 1, level: 1, term: 1, status: 1 });

const MaterialRequest = mongoose.model("MaterialRequest", materialRequestSchema);
export default MaterialRequest;