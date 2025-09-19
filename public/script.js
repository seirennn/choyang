// Global variables
let currentImageName = '';

// DOM elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const galleryGrid = document.getElementById('galleryGrid');
const loadingSpinner = document.getElementById('loadingSpinner');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const deleteBtn = document.getElementById('deleteBtn');
const infoModal = document.getElementById('infoModal');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadImages();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // Modal close events
    window.addEventListener('click', function(event) {
        if (event.target === imageModal) {
            closeModal();
        }
        if (event.target === infoModal) {
            closeInfoModal();
        }
    });
}

// Handle file selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        uploadFile(file);
    }
}

// Handle drag over
function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('drag-over');
}

// Handle drag leave
function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('drag-over');
}

// Handle drop
function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
        uploadFile(files[0]);
    } else {
        showMessage('Please drop an image file.', 'error');
    }
}

// Upload file
async function uploadFile(file) {
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
        showMessage('File size must be less than 5MB.', 'error');
        return;
    }
    
    // Show progress
    uploadProgress.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Preparing upload...';
    
    const formData = new FormData();
    formData.append('image', file);
    
    try {
        // Simulate progress
        animateProgress();
        
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            progressFill.style.width = '100%';
            progressText.textContent = 'Upload complete!';
            
            setTimeout(() => {
                uploadProgress.style.display = 'none';
                showMessage('Image uploaded successfully!', 'success');
                loadImages();
                fileInput.value = ''; // Reset file input
            }, 1000);
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error) {
        console.error('Upload error:', error);
        uploadProgress.style.display = 'none';
        showMessage(`Upload failed: ${error.message}`, 'error');
    }
}

// Animate progress bar
function animateProgress() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 90) {
            clearInterval(interval);
            progress = 90;
        }
        progressFill.style.width = progress + '%';
        progressText.textContent = `Uploading... ${Math.round(progress)}%`;
    }, 200);
}

// Load images from server
async function loadImages() {
    loadingSpinner.style.display = 'block';
    
    try {
        const response = await fetch('/images');
        const images = await response.json();
        
        displayImages(images);
    } catch (error) {
        console.error('Error loading images:', error);
        showMessage('Failed to load images.', 'error');
        galleryGrid.innerHTML = '<div class="loading-spinner"><i class="fas fa-exclamation-triangle"></i><p>Failed to load images</p></div>';
    }
}

// Display images in gallery
function displayImages(images) {
    loadingSpinner.style.display = 'none';
    
    if (images.length === 0) {
        galleryGrid.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-images"></i>
                <p>No images uploaded yet</p>
                <p style="font-size: 0.9rem; color: #999; margin-top: 10px;">Upload your first image to get started!</p>
            </div>
        `;
        return;
    }
    
    galleryGrid.innerHTML = images.map(image => `
        <div class="image-card" onclick="openModal('${image.url}', '${image.name}')">
            <img src="${image.url}" alt="${image.name}" loading="lazy">
            <div class="image-info">
                <h4>${image.name}</h4>
                <p>${formatDate(image.uploadTime)}</p>
            </div>
        </div>
    `).join('');
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Open image modal
function openModal(imageUrl, imageName) {
    currentImageName = imageName;
    modalImage.src = imageUrl;
    imageModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close image modal
function closeModal() {
    imageModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentImageName = '';
}

// Delete image
async function deleteImage() {
    if (!currentImageName) return;
    
    if (!confirm('Are you sure you want to delete this image?')) return;
    
    try {
        const response = await fetch(`/images/${encodeURIComponent(currentImageName)}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (response.ok) {
            closeModal();
            showMessage('Image deleted successfully!', 'success');
            loadImages();
        } else {
            throw new Error(result.error || 'Delete failed');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showMessage(`Delete failed: ${error.message}`, 'error');
    }
}

// Show info modal
function showInfo() {
    infoModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close info modal
function closeInfoModal() {
    infoModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Show message
function showMessage(text, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-triangle'}"></i> ${text}`;
    
    // Insert after upload card
    const uploadCard = document.querySelector('.upload-card');
    uploadCard.parentNode.insertBefore(message, uploadCard.nextSibling);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (message.parentNode) {
            message.remove();
        }
    }, 5000);
}

// Add some interactive effects
document.addEventListener('DOMContentLoaded', function() {
    // Add hover effect to tech badges
    const techBadges = document.querySelectorAll('.tech-badge');
    techBadges.forEach(badge => {
        badge.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        badge.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
    
    // Add loading animation to refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', function() {
        const icon = this.querySelector('i');
        icon.style.animation = 'spin 1s linear';
        setTimeout(() => {
            icon.style.animation = '';
        }, 1000);
    });
});

// Add CSS animation for spin
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
