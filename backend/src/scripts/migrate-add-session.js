// Run once: backend/src/scripts/migrate-add-session.js
import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URI);

// Add default session to existing documents
const DEFAULT_SESSION = "Legacy";

await mongoose.connection.collection("subjectfolders").updateMany(
  { session: { $exists: false } },
  { $set: { session: DEFAULT_SESSION } }
);

await mongoose.connection.collection("materials").updateMany(
  { session: { $exists: false } },
  { $set: { session: DEFAULT_SESSION } }
);

console.log("Migration complete.");
await mongoose.disconnect();