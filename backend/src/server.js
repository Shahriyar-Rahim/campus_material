import "dotenv/config";
import http from "http";
import app from "./app.js";
import connectDB from "./config/mongodb.config.js";
import { initSocket } from "./config/socket.config.js";
import supabase from "./config/supabase.js";
import cloudinary from "./config/cloudinary.config.js";
import dns from 'dns'

dns.setServers(['8.8.8.8', '1.1.1.1'])

const PORT = process.env.PORT;

// const verifySupabase = async () => {
//   console.log("🔄 Verifying Supabase connection...");

//   const bucketName = process.env.SUPABASE_BUCKET || "materials";

//   const { data: buckets, error: listError } = await supabase.storage.listBuckets();

//   if (listError) {
//     console.error("❌ Supabase connection failed:", listError.message);
//     process.exit(1);
//   }

//   const exists = buckets.find((b) => b.name === bucketName);

//   if (!exists) {
//     console.log(`⚠  Bucket "${bucketName}" not found — creating it now...`);

//     const { error: createError } = await supabase.storage.createBucket(bucketName, {
//       public: true,           // files are publicly accessible via URL
//       fileSizeLimit: 20971520, // 20 MB — matches your multer limit
//       allowedMimeTypes: [
//         "application/pdf",
//         "application/msword",
//         "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
//         "application/vnd.ms-powerpoint",
//         "application/vnd.openxmlformats-officedocument.presentationml.presentation",
//         "image/jpeg",
//         "image/png",
//         "image/webp",
//       ],
//     });

//     if (createError) {
//       console.error("❌ Failed to create bucket:", createError.message);
//       process.exit(1);
//     }

//     console.log(`✅ Bucket "${bucketName}" created successfully`);
//   } else {
//     console.log(`✅ Supabase connected — bucket "${bucketName}" is ready`);
//   }
// };

const start = async () => {
  await connectDB();
  // await verifySupabase();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    console.log(`🔌 Socket.io attached`);
  });
};

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION 💥", err.name, err.message);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION 💥", err.name, err.message);
  process.exit(1);
});

start();