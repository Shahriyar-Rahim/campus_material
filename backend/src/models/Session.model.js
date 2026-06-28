/**
 * Session Model
 * Tracks all academic sessions. Used as the source of truth
 * for what sessions exist and which is "current" per dept/level/term.
 *
 * Example sessions: "Winter 2026", "Summer 2026", "Fall 2025"
 */
import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      // e.g. "Winter 2026", "Summer 2026", "Fall 2025"
    },
    type: {
      type: String,
      enum: ["Summer", "Winter", "Fall", "Spring"],
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    startDate: { type: Date },
    endDate:   { type: Date },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Which level/term combinations this session covers
    // A session may cover multiple sections
    sections: [
      {
        dept:  { type: String, uppercase: true },
        level: { type: Number, min: 1, max: 4 },
        term:  { type: Number, min: 1, max: 2 },
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

sessionSchema.index({ year: -1, type: 1 });
sessionSchema.index({ isActive: 1 });

const Session = mongoose.model("Session", sessionSchema);
export default Session;