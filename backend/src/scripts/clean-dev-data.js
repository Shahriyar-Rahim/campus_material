import "dotenv/config";
import mongoose from "mongoose";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { global: { fetch } }
);

const BUCKET = process.env.SUPABASE_BUCKET || "materials";

await mongoose.connect(process.env.MONGO_URI);
console.log("✅ MongoDB connected");

// ── 1. Get all file paths stored in MongoDB ───────────────────────────────────
const Material = mongoose.model("Material", new mongoose.Schema({
  supabasePath: String,
  supabaseBucket: String,
}));

const materials = await Material.find({}).lean();
console.log(`Found ${materials.length} material documents`);

// ── 2. Delete files from Supabase Storage ─────────────────────────────────────
if (materials.length > 0) {
  const paths = materials
    .filter((m) => m.supabasePath)
    .map((m) => m.supabasePath);

  // Supabase delete accepts max 1000 paths at once — batch it
  const BATCH_SIZE = 100;
  for (let i = 0; i < paths.length; i += BATCH_SIZE) {
    const batch = paths.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      console.error(`❌ Supabase batch ${i / BATCH_SIZE + 1} failed:`, error.message);
    } else {
      console.log(`✅ Deleted Supabase batch ${i / BATCH_SIZE + 1} (${batch.length} files)`);
    }
  }
}

// ── 3. Wipe MongoDB collections ───────────────────────────────────────────────
const db = mongoose.connection.db;

const collections = [
  "materials",
  "subjectfolders",
  "materialrequests",
  "planners",
];

for (const col of collections) {
  const result = await db.collection(col).deleteMany({});
  console.log(`🗑  Cleared "${col}" — ${result.deletedCount} documents removed`);
}

// ── 4. Optional: also wipe the Supabase bucket entirely ──────────────────────
// Lists ALL files in bucket and deletes them (catches orphaned files too)
console.log("\n🔍 Scanning Supabase bucket for orphaned files...");
const { data: bucketFiles, error: listErr } = await supabase.storage
  .from(BUCKET)
  .list("", { limit: 1000, offset: 0 });

if (listErr) {
  console.error("❌ Could not list bucket:", listErr.message);
} else if (bucketFiles && bucketFiles.length > 0) {
  const orphanPaths = bucketFiles.map((f) => f.name);
  const { error: delErr } = await supabase.storage.from(BUCKET).remove(orphanPaths);
  if (delErr) {
    console.error("❌ Orphan delete failed:", delErr.message);
  } else {
    console.log(`✅ Removed ${orphanPaths.length} orphaned file(s) from bucket root`);
  }
} else {
  console.log("✅ No orphaned files in bucket root");
}

console.log("\n✅ All done. Database and storage are clean.");
await mongoose.disconnect();