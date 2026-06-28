import MaterialRequest from "../models/MaterialRequest.model.js";
import User from "../models/user.model.js";
import catchAsync from "../utils/catchAsync.js";
import AppError from "../utils/AppError.js";
import nodemailer from "nodemailer";

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
  });

// ── POST /api/requests — Student submits a request ────────────────────────────
export const createRequest = catchAsync(async (req, res, next) => {
  const { courseCode, courseName, category, description } = req.body;

  if (!description) return next(new AppError("Description is required.", 400));

  const request = await MaterialRequest.create({
    requestedBy: req.user._id,
    courseCode:  courseCode || "",
    courseName:  courseName || "",
    category:    category   || "Other",
    description,
    dept:  req.user.dept,
    level: req.user.level,
    term:  req.user.term,
    session: req.user.session || "Unassigned",
  });

  await request.populate("requestedBy", "name studentId dept level term email");

  // Find CRs of the same section + all Admins/SuperAdmins
  const [crs, admins] = await Promise.all([
    User.find({ role: "CR", dept: req.user.dept, level: req.user.level, term: req.user.term, isActive: true }).select("email name"),
    User.find({ role: { $in: ["Admin", "SuperAdmin"] }, isActive: true }).select("email name"),
  ]);

  const recipients = [...new Map(
    [...crs, ...admins].map((u) => [u.email, u])
  ).values()];

  // Send notification email (non-blocking)
  if (recipients.length > 0) {
    const transporter = createTransporter();
    const subject = `New Material Request — ${req.user.dept} L${req.user.level}T${req.user.term}`;
    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#1d4ed8">New Material Request</h2>
        <p><strong>From:</strong> ${req.user.name} (${req.user.studentId})</p>
        <p><strong>Section:</strong> ${req.user.dept} L${req.user.level} T${req.user.term}</p>
        <p><strong>Course:</strong> ${courseCode || "—"} ${courseName ? `— ${courseName}` : ""}</p>
        <p><strong>Category:</strong> ${category || "Other"}</p>
        <p><strong>Request:</strong></p>
        <blockquote style="border-left:4px solid #3b82f6;padding:8px 16px;color:#374151;background:#f0f9ff;border-radius:4px">
          ${description}
        </blockquote>
        <p style="margin-top:20px">
          <a href="${process.env.CLIENT_URL}/admin/requests" 
             style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px">
            View Request →
          </a>
        </p>
      </div>
    `;

    transporter.sendMail({
      from: `"Campus Portal" <${process.env.MAIL_USER}>`,
      to: recipients.map((r) => r.email).join(", "),
      subject,
      html,
    }).catch((err) => console.error("[Email] Request notification failed:", err.message));
  }

  res.status(201).json({ success: true, message: "Request submitted.", data: request });
});

// ── GET /api/requests/my — Student views their own requests ──────────────────
export const getMyRequests = catchAsync(async (req, res) => {
  const requests = await MaterialRequest.find({ requestedBy: req.user._id })
    .populate("repliedBy", "name role")
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({ success: true, data: requests });
});

// ── GET /api/requests — CR/Admin sees requests for their section ──────────────
export const getRequests = catchAsync(async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};

  // CRs only see their own section's requests
  if (req.user.role === "CR") {
    filter.dept  = req.user.dept;
    filter.level = req.user.level;
    filter.term  = req.user.term;
  }

  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [requests, total] = await Promise.all([
    MaterialRequest.find(filter)
      .populate("requestedBy", "name studentId dept level term email profilePicture")
      .populate("repliedBy",   "name role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    MaterialRequest.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: requests.length,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data: requests,
  });
});

// ── PATCH /api/requests/:id/status — CR/Admin updates status ─────────────────
export const updateRequestStatus = catchAsync(async (req, res, next) => {
  const { status } = req.body;
  const VALID = ["Pending", "InProgress", "Fulfilled", "Declined"];
  if (!VALID.includes(status)) return next(new AppError("Invalid status.", 400));

  const request = await MaterialRequest.findById(req.params.id)
    .populate("requestedBy", "name email");
  if (!request) return next(new AppError("Request not found.", 404));

  // CRs can only update their section
  if (req.user.role === "CR" &&
    (request.dept !== req.user.dept ||
     request.level !== req.user.level ||
     request.term  !== req.user.term)) {
    return next(new AppError("You can only manage requests from your own section.", 403));
  }

  request.status = status;
  await request.save();

  res.status(200).json({ success: true, data: request });
});

// ── PATCH /api/requests/:id/reply — CR/Admin sends a reply ───────────────────
export const replyToRequest = catchAsync(async (req, res, next) => {
  const { reply } = req.body;
  if (!reply?.trim()) return next(new AppError("Reply message is required.", 400));

  const request = await MaterialRequest.findById(req.params.id)
    .populate("requestedBy", "name email studentId");
  if (!request) return next(new AppError("Request not found.", 404));

  if (req.user.role === "CR" &&
    (request.dept !== req.user.dept ||
     request.level !== req.user.level ||
     request.term  !== req.user.term)) {
    return next(new AppError("Access denied.", 403));
  }

  request.reply     = reply.trim();
  request.repliedBy = req.user._id;
  request.repliedAt = new Date();
  if (request.status === "Pending") request.status = "InProgress";
  await request.save();

  // Email the student
  if (request.requestedBy?.email) {
    const transporter = createTransporter();
    transporter.sendMail({
      from: `"Campus Portal" <${process.env.MAIL_USER}>`,
      to: request.requestedBy.email,
      subject: `Reply to your material request — ${request.courseCode || "General"}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#1d4ed8">Your Request Has a Reply</h2>
          <p>Hi ${request.requestedBy.name},</p>
          <p>Your request about <strong>${request.courseCode || "general materials"}</strong> 
             (${request.category}) has been replied to:</p>
          <blockquote style="border-left:4px solid #3b82f6;padding:8px 16px;color:#374151;background:#f0f9ff;border-radius:4px">
            ${reply}
          </blockquote>
          <p><strong>Status:</strong> ${request.status}</p>
          <p style="margin-top:20px">
            <a href="${process.env.CLIENT_URL}/dashboard" 
               style="background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px">
              View on Campus Portal →
            </a>
          </p>
        </div>
      `,
    }).catch((err) => console.error("[Email] Reply email failed:", err.message));
  }

  res.status(200).json({ success: true, message: "Reply sent.", data: request });
});

// ── DELETE /api/requests/:id — Admin/SuperAdmin only ─────────────────────────
export const deleteRequest = catchAsync(async (req, res, next) => {
  if (!["Admin", "SuperAdmin"].includes(req.user.role)) {
    return next(new AppError("Admins only.", 403));
  }
  await MaterialRequest.findByIdAndDelete(req.params.id);
  res.status(204).json({ success: true });
});