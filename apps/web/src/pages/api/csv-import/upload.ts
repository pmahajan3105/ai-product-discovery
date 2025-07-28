import { NextApiRequest, NextApiResponse } from 'next';
import multer from 'multer';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `csv-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname) === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

const uploadMiddleware = promisify(upload.single('csvFile'));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await uploadMiddleware(req as any, res as any);
    
    const file = (req as any).file;
    const { mapping } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!mapping) {
      return res.status(400).json({ error: 'Field mapping is required' });
    }

    // Create import task
    const taskId = `task-${Date.now()}`;
    
    // In a real implementation, you would:
    // 1. Save the task to database
    // 2. Queue the import job
    // 3. Process CSV in background
    // 4. Update progress via SSE/WebSocket
    
    // For now, return the task ID
    res.status(200).json({
      result: {
        id: taskId,
        status: 'queued',
        filePath: file.path,
        mapping: JSON.parse(mapping),
      }
    });

  } catch (error: any) {
    console.error('CSV upload error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to upload CSV file' 
    });
  }
}

export const config = {
  api: {
    bodyParser: false,
  },
};