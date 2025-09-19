const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Initialize Google Cloud Storage
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE || './gcs-key.json'
});

const bucketName = process.env.GCS_BUCKET_NAME || 'choyang-cloud-storage-bucket';
const bucket = storage.bucket(bucketName);

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload endpoint
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileName = `${Date.now()}-${req.file.originalname}`;
    const file = bucket.file(fileName);

    const stream = file.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
      public: true,
    });

    stream.on('error', (err) => {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Upload failed' });
    });

    stream.on('finish', async () => {
      // Make the file public
      await file.makePublic();
      
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
      
      res.json({
        message: 'Upload successful',
        fileName: fileName,
        url: publicUrl
      });
    });

    stream.end(req.file.buffer);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Get all images endpoint
app.get('/images', async (req, res) => {
  try {
    const [files] = await bucket.getFiles();
    
    const imageFiles = files
      .filter(file => {
        const metadata = file.metadata;
        return metadata.contentType && metadata.contentType.startsWith('image/');
      })
      .map(file => ({
        name: file.name,
        url: `https://storage.googleapis.com/${bucketName}/${file.name}`,
        uploadTime: file.metadata.timeCreated
      }))
      .sort((a, b) => new Date(b.uploadTime) - new Date(a.uploadTime));

    res.json(imageFiles);
  } catch (error) {
    console.error('Error fetching images:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// Delete image endpoint
app.delete('/images/:fileName', async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const file = bucket.file(fileName);
    
    await file.delete();
    
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Visit: http://localhost:${PORT}`);
});
