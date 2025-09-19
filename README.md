# CHOYANG Cloud Storage App

A sleek web application demonstrating cloud storage integration for a Cloud Computing Practical Exam.

## 🚀 Features

- **Drag & Drop Upload**: Intuitive image upload interface
- **Real-time Gallery**: Live image gallery with automatic updates
- **Cloud Storage**: Integration with Google Cloud Storage
- **Responsive Design**: Works on desktop and mobile devices
- **Image Management**: Preview and delete uploaded images
- **Modern UI/UX**: Clean, professional interface

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Node.js with Express
- **Cloud Storage**: Google Cloud Storage
- **Deployment**: Render Platform
- **File Upload**: Multer middleware

## 📋 Prerequisites

- Node.js (v18 or higher)
- Google Cloud Platform account
- Google Cloud Storage bucket

## ⚙️ Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd choyang-cloud-storage-app
npm install
```

### 2. Google Cloud Storage Setup

1. Create a GCP project
2. Enable the Cloud Storage API
3. Create a storage bucket
4. Create a service account with Storage Admin permissions
5. Download the service account key JSON file

### 3. Environment Configuration

1. Copy `env.example` to `.env`
2. Update the following variables:

```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_KEY_FILE=./gcs-key.json
GCS_BUCKET_NAME=your-bucket-name
PORT=3000
```

3. Place your GCS service account key file as `gcs-key.json` in the root directory

### 4. Run the Application

```bash
# Development
npm run dev

# Production
npm start
```

Visit `http://localhost:3000` to see the application.

## 🌐 Deployment

### Render Deployment

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Set the following:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add all variables from `.env`

4. For the GCS key file, either:
   - Upload as a secret file, or
   - Set `GOOGLE_CLOUD_KEY_FILE` to the base64-encoded content

## 📁 Project Structure

```
choyang-cloud-storage-app/
├── public/
│   ├── index.html      # Main HTML file
│   ├── styles.css      # CSS styles
│   └── script.js       # Frontend JavaScript
├── server.js           # Express server
├── package.json        # Dependencies
├── env.example         # Environment template
└── README.md          # This file
```

## 🔧 API Endpoints

- `GET /` - Serve the main application
- `POST /upload` - Upload image to GCS
- `GET /images` - Get list of uploaded images
- `DELETE /images/:fileName` - Delete specific image
- `GET /health` - Health check endpoint

## 🎨 Features Showcase

### Upload Interface
- Drag & drop functionality
- File type validation
- Progress indication
- Real-time feedback

### Gallery
- Grid layout with responsive design
- Image preview modal
- Delete functionality
- Upload timestamp display

### UI/UX
- Modern glassmorphism design
- Smooth animations and transitions
- Mobile-responsive layout
- Intuitive navigation

## 🔒 Security Features

- File type validation
- File size limits (5MB)
- CORS protection
- Error handling

## 👨‍💻 Author

**CHOYANG** - Cloud Computing Practical Exam

## 📄 License

MIT License
