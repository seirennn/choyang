const express = require('express');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configure Google Cloud Storage
console.log('Configuring Google Cloud Storage...');
console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
console.log('Key file path:', process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account-key.json');
console.log('Bucket name:', process.env.GCS_BUCKET_NAME);

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account-key.json'
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);

// Middleware
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

// Function to fetch all images from GCS bucket
async function fetchImagesFromBucket() {
  try {
    console.log('Fetching images from GCS bucket...');
    
    // List all files in the uploads/ directory
    const [files] = await bucket.getFiles({
      prefix: 'uploads/',
      delimiter: '/'
    });
    
    // Filter only image files and create image objects
    const imageFiles = files.filter(file => {
      const fileName = file.name.toLowerCase();
      return fileName.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i);
    });
    
    // Get metadata for each image file
    const images = await Promise.all(
      imageFiles.map(async (file) => {
        try {
          const [metadata] = await file.getMetadata();
          return {
            id: file.name.replace(/[^a-zA-Z0-9]/g, ''), // Create unique ID from filename
            originalName: path.basename(file.name),
            fileName: file.name,
            name: file.name,
            url: `/image/${file.name}`,
            uploadTime: metadata.timeCreated || new Date().toISOString(),
            uploadDate: metadata.timeCreated || new Date().toISOString(),
            size: metadata.size || 0,
            contentType: metadata.contentType || 'image/jpeg'
          };
        } catch (error) {
          console.error(`Error getting metadata for ${file.name}:`, error);
          return null;
        }
      })
    );
    
    // Filter out null results and sort by upload date (newest first)
    const validImages = images
      .filter(img => img !== null)
      .sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    
    console.log(`Found ${validImages.length} images in bucket`);
    return validImages;
    
  } catch (error) {
    console.error('Error fetching images from bucket:', error);
    return [];
  }
}

// Routes
app.get('/', async (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select an image file' });
    }

    console.log('Starting upload process...');
    console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    console.log('Bucket Name:', process.env.GCS_BUCKET_NAME);
    console.log('File:', req.file.originalname, 'Size:', req.file.size);

    // Generate unique filename with uploads/ prefix
    const fileName = `uploads/${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
    
    // Create a file in the bucket
    const file = bucket.file(fileName);
    
    // Upload using save method - no ACL operations for uniform bucket-level access
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      },
      validation: 'md5'
    });

    // File uploaded successfully - generate URL through our server
    const publicUrl = `/image/${fileName}`;
    
    console.log('Upload successful! Internal URL:', publicUrl);
    console.log('Image uploaded to GCS:', fileName);
    
    res.json({
      message: 'Upload successful',
      fileName: fileName,
      url: publicUrl
    });

  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error details:', error.message);
    
    res.status(500).json({ 
      error: `Failed to upload image to Google Cloud Storage: ${error.message}`
    });
  }
});

// Serve images through our server as proxy (more secure than public bucket)
app.get('/image/:folder/:filename', async (req, res) => {
  try {
    // Reconstruct the full path from parameters
    const filename = `${req.params.folder}/${req.params.filename}`;
    console.log('Serving image:', filename);
    
    const file = bucket.file(filename);
    
    // Check if file exists
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Get file metadata to set proper content type
    const [metadata] = await file.getMetadata();
    
    // Set appropriate headers
    res.set({
      'Content-Type': metadata.contentType || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    });
    
    // Stream the file from GCS to the response
    const stream = file.createReadStream();
    
    stream.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to load image' });
      }
    });
    
    stream.pipe(res);
    
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all images endpoint
app.get('/images', async (req, res) => {
  try {
    const images = await fetchImagesFromBucket();
    res.json(images);
  } catch (error) {
    console.error('Error fetching images for API:', error);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

// API endpoint to get images as JSON
app.get('/api/images', async (req, res) => {
  try {
    const images = await fetchImagesFromBucket();
    res.json(images);
  } catch (error) {
    console.error('Error fetching images for API:', error);
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
app.use(async (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
  }
  
  res.status(500).json({ error: error.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
