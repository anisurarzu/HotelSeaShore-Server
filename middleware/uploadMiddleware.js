const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Create upload directories if they don't exist
const uploadDirs = {
  hotels: "uploads/hotels",
  categories: "uploads/categories",
  rooms: "uploads/rooms",
};

Object.values(uploadDirs).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage with dynamic path
const createStorage = (uploadPath) => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      // Generate unique filename: timestamp-random-originalname
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      const name = path.basename(file.originalname, ext);
      cb(null, `${name}-${uniqueSuffix}${ext}`);
    },
  });
};

// File filter - only images
const fileFilter = (req, file, cb) => {
  // Allowed image types
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error("Only image files (jpeg, jpg, png, gif, webp) are allowed!"), false);
  }
};

// Configure multer with specific storage paths
const uploadHotel = multer({
  storage: createStorage(uploadDirs.hotels),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: fileFilter,
});

const uploadCategory = multer({
  storage: createStorage(uploadDirs.categories),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: fileFilter,
});

const uploadRoom = multer({
  storage: createStorage(uploadDirs.rooms),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: fileFilter,
});

// Middleware for hotel images (max 3)
const uploadHotelImages = uploadHotel.array("images", 3);

// Middleware for category images (max 3)
const uploadCategoryImages = uploadCategory.array("images", 3);

// Middleware for room images (max 3)
const uploadRoomImages = uploadRoom.array("images", 3);

// Error handler middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum size is 5MB.",
        timestamp: new Date().toISOString(),
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum 3 images allowed.",
        timestamp: new Date().toISOString(),
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        success: false,
        message: "Unexpected file field. Use 'images' field for file uploads.",
        timestamp: new Date().toISOString(),
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
      timestamp: new Date().toISOString(),
    });
  }
  next();
};

// Helper function to get image URLs
const getImageUrls = (req, baseUrl = "") => {
  if (!req.files || req.files.length === 0) {
    return [];
  }
  
  const base = baseUrl || process.env.BASE_URL || "http://localhost:8000";
  return req.files.map((file) => {
    // Get relative path from uploads directory
    let relativePath = file.path.replace(/\\/g, "/"); // Convert backslashes to forward slashes
    
    // Ensure path starts with uploads/
    if (!relativePath.startsWith("uploads/")) {
      // Extract the path after uploads directory
      const uploadsIndex = relativePath.indexOf("uploads/");
      if (uploadsIndex !== -1) {
        relativePath = relativePath.substring(uploadsIndex);
      } else {
        // If uploads not in path, add it
        const pathParts = relativePath.split("/");
        const uploadsIndex = pathParts.findIndex((part) => part === "uploads");
        if (uploadsIndex !== -1) {
          relativePath = pathParts.slice(uploadsIndex).join("/");
        } else {
          relativePath = `uploads/${relativePath}`;
        }
      }
    }
    
    return `${base}/${relativePath}`;
  });
};

// Helper function to delete old images
const deleteImages = (imagePaths) => {
  if (!Array.isArray(imagePaths)) return;
  
  imagePaths.forEach((imagePath) => {
    // Extract file path from URL if it's a URL
    let filePath = imagePath;
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      const url = new URL(imagePath);
      filePath = url.pathname.startsWith("/") ? url.pathname.substring(1) : url.pathname;
    } else if (imagePath.startsWith("/")) {
      filePath = imagePath.substring(1);
    }
    
    // Delete file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
};

module.exports = {
  uploadHotelImages,
  uploadCategoryImages,
  uploadRoomImages,
  handleUploadError,
  getImageUrls,
  deleteImages,
};

