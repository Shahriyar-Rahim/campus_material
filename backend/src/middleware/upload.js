import multer from 'multer';

const storage = multer.memoryStorage(); // Store files in RAM for quick relay to Supabase
const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 } // Limit: 20MB per file
});

// 'files' refers to the key name in the FormData you send from React
export const uploadMiddleware = upload.array('files', 10);