# Image Upload Guide

## Overview
The Hotel API supports image uploads for hotels, categories, and rooms. Each entity can have up to 3 images.

## Features
- ✅ Maximum 3 images per entity (hotel, category, room)
- ✅ Supported formats: JPEG, JPG, PNG, GIF, WEBP
- ✅ Maximum file size: 5MB per image
- ✅ Automatic file naming with unique identifiers
- ✅ Automatic cleanup on errors
- ✅ Static file serving for image access

## Upload Directories
Images are stored in the following directories:
- `uploads/hotels/` - Hotel images
- `uploads/categories/` - Category images
- `uploads/rooms/` - Room images

## API Endpoints with Image Upload

### 1. Create Hotel with Images
```http
POST /api/hotels
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- hotelName: "Grand Hotel"
- hotelDescription: "A luxurious hotel"
- images: [File] (max 3 files)
- address[street]: "123 Main St"
- address[city]: "New York"
- contact[phone]: "+1234567890"
- contact[email]: "info@hotel.com"
- status: "active"
```

### 2. Update Hotel with Images
```http
PUT /api/hotels/:id
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- hotelName: "Updated Hotel Name"
- images: [File] (max 3 files, will be merged with existing)
```

### 3. Add Category with Images
```http
POST /api/hotels/:hotelId/categories
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- name: "Deluxe Suite"
- description: "Spacious rooms"
- basePrice: 299.99
- images: [File] (max 3 files)
```

### 4. Update Category with Images
```http
PUT /api/hotels/:hotelId/categories/:categoryId
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- name: "Updated Category"
- images: [File] (max 3 files, will be merged with existing)
```

### 5. Add Room with Images
```http
POST /api/hotels/:hotelId/categories/:categoryId/rooms
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- name: "101"
- status: "available"
- price: 299.99
- images: [File] (max 3 files)
```

### 6. Update Room with Images
```http
PUT /api/hotels/:hotelId/categories/:categoryId/rooms/:roomId
Authorization: Bearer <token>
Content-Type: multipart/form-data

Form Data:
- status: "occupied"
- images: [File] (max 3 files, will be merged with existing)
```

## Client-Side Examples

### JavaScript (Fetch API)
```javascript
const formData = new FormData();
formData.append('hotelName', 'Grand Hotel');
formData.append('hotelDescription', 'A luxurious hotel');

// Add up to 3 images
const imageFiles = document.getElementById('imageInput').files;
for (let i = 0; i < Math.min(imageFiles.length, 3); i++) {
  formData.append('images', imageFiles[i]);
}

fetch('/api/hotels', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
    // Don't set Content-Type header, browser will set it with boundary
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Hotel created:', data);
  console.log('Image URLs:', data.data.images);
});
```

### React Example
```javascript
import React, { useState } from 'react';

function HotelForm() {
  const [images, setImages] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('hotelName', 'Grand Hotel');
    formData.append('hotelDescription', 'A luxurious hotel');
    
    // Add images (max 3)
    images.slice(0, 3).forEach((image) => {
      formData.append('images', image);
    });

    try {
      const response = await fetch('/api/hotels', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      console.log('Hotel created:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).slice(0, 3);
    setImages(files);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleImageChange}
        max={3}
      />
      <button type="submit">Create Hotel</button>
    </form>
  );
}
```

### Axios Example
```javascript
import axios from 'axios';

const formData = new FormData();
formData.append('hotelName', 'Grand Hotel');
formData.append('hotelDescription', 'A luxurious hotel');

// Add images
const imageFiles = document.getElementById('imageInput').files;
for (let i = 0; i < Math.min(imageFiles.length, 3); i++) {
  formData.append('images', imageFiles[i]);
}

axios.post('/api/hotels', formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data'
  }
})
.then(response => {
  console.log('Hotel created:', response.data);
  console.log('Image URLs:', response.data.data.images);
})
.catch(error => {
  console.error('Error:', error.response.data);
});
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Hotel created successfully",
  "data": {
    "hotelID": 1,
    "hotelName": "Grand Hotel",
    "images": [
      "http://localhost:8000/uploads/hotels/image-1234567890-123456789.jpg",
      "http://localhost:8000/uploads/hotels/image-1234567891-123456790.png"
    ],
    ...
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Too many files. Maximum 3 images allowed.",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Handling

### Common Errors

1. **Too Many Files**
   - Error: "Too many files. Maximum 3 images allowed."
   - Solution: Upload maximum 3 images

2. **File Size Too Large**
   - Error: "File size too large. Maximum size is 5MB."
   - Solution: Compress images before uploading

3. **Invalid File Type**
   - Error: "Only image files (jpeg, jpg, png, gif, webp) are allowed!"
   - Solution: Use supported image formats

4. **Unexpected File Field**
   - Error: "Unexpected file field. Use 'images' field for file uploads."
   - Solution: Use field name "images" for file uploads

## Image URL Format

Images are accessible via:
```
http://localhost:8000/uploads/{type}/{filename}
```

Where `{type}` is:
- `hotels` - for hotel images
- `categories` - for category images
- `rooms` - for room images

Example:
```
http://localhost:8000/uploads/hotels/image-1234567890-123456789.jpg
```

## Environment Variables

Add to `.env`:
```env
BASE_URL=http://localhost:8000
# or for production:
BASE_URL=https://yourdomain.com
```

## Image Management

### Viewing Images
Images are automatically served as static files. Access them directly via URL:
```
GET http://localhost:8000/uploads/hotels/{filename}
```

### Updating Images
When updating, new images are merged with existing ones (max 3 total):
- If you have 2 existing images and upload 2 new ones, you'll have 4 total
- The system keeps only the first 3 images

### Deleting Images
To remove images, send an update request with the `images` field containing only the URLs you want to keep:
```javascript
// Keep only first image
formData.append('images', JSON.stringify([
  'http://localhost:8000/uploads/hotels/image1.jpg'
]));
```

## Best Practices

1. **Image Optimization**
   - Compress images before uploading
   - Use appropriate image formats (JPEG for photos, PNG for graphics)
   - Recommended dimensions: 1200x800px for hotels/categories, 800x600px for rooms

2. **File Naming**
   - Files are automatically renamed with unique identifiers
   - Original filenames are preserved in the database

3. **Error Handling**
   - Always handle upload errors gracefully
   - Show user-friendly error messages
   - Validate file types and sizes on client side before upload

4. **Security**
   - Images are validated server-side
   - Only authenticated users can upload images
   - File types are restricted to images only

## Testing with Postman

1. Create a new POST request to `/api/hotels`
2. Go to the "Body" tab
3. Select "form-data"
4. Add fields:
   - `hotelName`: "Test Hotel"
   - `hotelDescription`: "Test Description"
   - `images`: Select "File" type, then choose up to 3 image files
5. Add Authorization header: `Bearer <your-token>`
6. Send request

## Notes

- Images are stored locally in the `uploads` directory
- For production, consider using cloud storage (AWS S3, Cloudinary, etc.)
- The `uploads` directory should be added to `.gitignore`
- Images are automatically cleaned up if upload fails




