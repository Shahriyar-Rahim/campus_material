import nodemailer from "nodemailer";

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.MAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

export const sendWelcomeEmail = async ({
  to,
  name,
  studentId,
  password,
  dept,
  level,
  term,
  batch,
  session,
  role,
}) => {
  const transporter = createTransporter();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f6f9; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    .header { background: #1a1a2e; padding: 32px 40px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: 600; }
    .header p  { color: #a0aec0; margin: 6px 0 0; font-size: 13px; }
    .body   { padding: 32px 40px; }
    .body p { color: #4a5568; line-height: 1.7; }
    .cred-box { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px 24px; margin: 20px 0; }
    .cred-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #edf2f7; font-size: 14px; }
    .cred-row:last-child { border-bottom: none; }
    .cred-label { color: #718096; font-weight: 500; }
    .cred-value { color: #2d3748; font-weight: 600; }
    .password-val { font-family: monospace; background: #ebf8ff; color: #2b6cb0; padding: 2px 6px; border-radius: 4px; }
    .footer { background: #f7fafc; padding: 20px 40px; text-align: center; color: #a0aec0; font-size: 12px; }
    .btn { display: inline-block; background: #3182ce; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin: 16px 0; }
    .warning { background: #fff5f5; border-left: 4px solid #fc8181; border-radius: 4px; padding: 12px 16px; margin-top: 16px; font-size: 13px; color: #c53030; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Campus Materials Portal</h1>
      <p>BAUST — Bangladesh Army University of Science and Technology</p>
    </div>
    <div class="body">
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your account has been created. Here are your login credentials:</p>

      <div class="cred-box">
        <div class="cred-row">
          <span class="cred-label">Student ID: </span>
          <span class="cred-value">${studentId}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Password: </span>
          <span class="cred-value password-val">${password}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Department: </span>
          <span class="cred-value">${dept}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Level / Term: </span>
          <span class="cred-value">L${level} T${term}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Batch: </span>
          <span class="cred-value">${batch}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Session: </span>
          <span class="cred-value">${session}</span>
        </div>
        <div class="cred-row">
          <span class="cred-label">Role: </span>
          <span class="cred-value">${role}</span>
        </div>
      </div>

      <a href="${process.env.CLIENT_URL}/login" class="btn">Sign In Now</a>

      <div class="warning">
        ⚠ Please do not share your password with anyone. If you have any questions, please contact your department admin.
      </div>
    </div>
    <div class="footer">
      This is an automated message from Campus Materials Portal.<br>
      If you did not expect this email, please contact your department admin.
    </div>
  </div>
</body>
</html>
  `.trim();

  await transporter.sendMail({
    from: `"Campus Materials Portal" <${process.env.MAIL_USER}>`,
    to,
    subject: `Your Campus Portal Account — ${studentId}`,
    html,
  });
};

export const sendNudgeEmail = async ({ to, senderName, courseCode }) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Campus Materials Portal" <${process.env.MAIL_USER}>`,
    to,
    subject: `${senderName} nudged you — ${courseCode}`,
    html: `
      <p>Hey there!</p>
      <p><strong>${senderName}</strong> is studying <strong>${courseCode}</strong> right now and sent you a nudge.</p>
      <p><a href="${process.env.CLIENT_URL}/materials/${courseCode}">Join them on Campus Portal →</a></p>
    `,
  });
};

export const sendPasswordChangeEmail = async (toEmail, userName) => {
  const mailOptions = {
    from: `"Campus Portal Security" <shahriyarbaust@gmail.com>`,
    to: toEmail,
    subject: "⚠️ Alert: Your Campus Portal Password Was Changed",
    html: `
      <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; rounded-lg: 8px;">
        <h2 style="color: #dc2626;">Password Security Alert</h2>
        <p>Hello <strong>${userName}</strong>,</p>
        <p>This is a confirmation notification that the password for your Campus Portal account was recently updated.</p>
        <p style="background-color: #f8fafc; padding: 12px; border-left: 4px solid #3b82f6; font-size: 13px; color: #475569;">
          <strong>Security Note:</strong> We have compiled a unique identity chain signature for this modification event. If you did not perform this change, please contact your System Admin immediately to initiate a Rescue Chain Recovery sequence.
        </p>
        <p>Best regards,<br/>Campus Portal Security Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`🔒 Security alert email dispatched to: ${toEmail}`);
  } catch (error) {
    console.error("❌ Failed to dispatch security alert email:", error.message);
  }
};