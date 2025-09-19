#!/bin/bash

# CHOYANG Cloud Storage Setup Script
# This script helps set up Google Cloud Storage for the application

echo "🚀 CHOYANG Cloud Storage Setup"
echo "================================"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Google Cloud CLI not found. Please install it first:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Get project ID
echo "📋 Current GCP Project:"
gcloud config get-value project

read -p "🔄 Do you want to use this project? (y/n): " use_current
if [[ $use_current != "y" ]]; then
    read -p "📝 Enter your GCP Project ID: " project_id
    gcloud config set project $project_id
else
    project_id=$(gcloud config get-value project)
fi

# Set bucket name
bucket_name="choyang-cloud-storage-bucket-$(date +%s)"
echo "🪣 Creating bucket: $bucket_name"

# Create bucket
gcloud storage buckets create gs://$bucket_name --location=us-central1

# Make bucket public for image serving
echo "🌐 Making bucket publicly readable..."
gcloud storage buckets add-iam-policy-binding gs://$bucket_name \
    --member=allUsers \
    --role=roles/storage.objectViewer

# Create service account
sa_name="choyang-storage-sa"
echo "👤 Creating service account: $sa_name"

gcloud iam service-accounts create $sa_name \
    --description="Service account for CHOYANG storage app" \
    --display-name="CHOYANG Storage SA"

# Grant permissions
echo "🔑 Granting storage permissions..."
gcloud projects add-iam-policy-binding $project_id \
    --member="serviceAccount:$sa_name@$project_id.iam.gserviceaccount.com" \
    --role="roles/storage.admin"

# Create service account key
echo "🗝️  Creating service account key..."
gcloud iam service-accounts keys create service-account-key.json \
    --iam-account=$sa_name@$project_id.iam.gserviceaccount.com

# Create .env file
echo "📄 Creating .env file..."
cat > .env << EOF
# Google Cloud Storage Configuration
GOOGLE_CLOUD_PROJECT_ID=$project_id
GCS_BUCKET_NAME=$bucket_name
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json

# App Configuration
PORT=3000
NODE_ENV=development
EOF

# Convert key to base64 for Render deployment
echo "🔄 Converting key to base64 for Render..."
base64_key=$(base64 -i service-account-key.json)
echo "📋 Base64 encoded key for Render (copy this):"
echo "=================================="
echo $base64_key
echo "=================================="

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📝 Next Steps:"
echo "1. Copy the base64 key above"
echo "2. Set environment variables in Render:"
echo "   - GOOGLE_CLOUD_PROJECT_ID=$project_id"
echo "   - GCS_BUCKET_NAME=$bucket_name"
echo "   - GOOGLE_APPLICATION_CREDENTIALS=<paste-base64-key>"
echo "3. Deploy to Render"
echo ""
echo "🧪 To test locally:"
echo "   npm start"
echo ""
echo "🌐 Your bucket: gs://$bucket_name"
echo "🔗 Console: https://console.cloud.google.com/storage/browser/$bucket_name"
