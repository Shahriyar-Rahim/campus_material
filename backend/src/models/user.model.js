import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const ROLES = ["Student", "CR", "Teacher", "Admin", "SuperAdmin"];
const DEPT = ["CSE", "EEE", "ME", "CE", "ICT", "BBA", "ENG"];

const userSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: [true, "Student ID is required"],
    unique: true,
    uppercase: true,
    index: true,
    trim: true,
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
      "Please provide a valid email",
    ],
    index: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    trim: true,
    minlength: [8, "Password must be at least 8 characters"],
    select: false,
  },
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    maxlength: [50, "Name cannot be more than 50 characters"],
  },
  profilePicture: {
    url: {
      type: String,
      default: null,
    },
    public_id: {
      type: String,
      default: null,
    },
  },
  dept: {
    type: String,
    required: [true, "Department is required"],
    enum: DEPT,
    uppercase: true,
  },
  level: {
    type: Number,
    required: [true, "Level is required"],
    min: 1,
    max: 4,
  },
  term: {
    type: String,
    required: [true, "Term is required"],
    uppercase: true,
  },
  session: {
    type: String,
    required: true,
    uppercase: true, // Automatically converts "summer 2026" to "SUMMER 2026"
    trim: true,
    match: [
      /^(SUMMER|WINTER)\s\d{4}$/,
      "Session must be in format 'SEASON YYYY' (e.g., SUMMER 2026)",
    ],
  },
  batch: {
    type: String,
    required: [true, "Batch is required"],
    trim: true,
    uppercase: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ROLES,
    default: "Student",
  },

  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  },
  currentCourse: {
    type: String,
    default: null,
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  }
},
{ timestamps: true , toJSON: { virtuals: true }, toObject: { virtuals: true } }
);


userSchema.index({dept: 1, level: 1, term: 1});
userSchema.index({role: 1});
userSchema.index({ batch: 1, dept: 1});

userSchema.virtual("academicLabel").get(function() {
    return `${this.dept} L${this.level}T${this.term} — ${this.batch} Batch`;
});

userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 12);
    if(!this.isNew) this.passwordChangedAt = Date.now() - 1000;
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimestamp = parseInt(
            this.passwordChangedAt.getTime() / 1000,
            10
        );
        return JWTTimestamp < changedTimestamp;
    }
    return false;
};

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;