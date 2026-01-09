const { body, validationResult, query, param } = require("express-validator");

const validateRegister = [
  body("username").not().isEmpty().withMessage("Username is required"),
  body("email").isEmail().withMessage("Please include a valid email"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

// Booking validation middleware
const validateBooking = [
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),
  
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage("Please provide a valid phone number"),
  
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  
  body("hotelName")
    .trim()
    .notEmpty()
    .withMessage("Hotel name is required"),
  
  body("hotelID")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Hotel ID must be a valid number"),
  
  body("roomCategoryID")
    .trim()
    .notEmpty()
    .withMessage("Room category ID is required"),
  
  body("roomCategoryName")
    .trim()
    .notEmpty()
    .withMessage("Room category name is required"),
  
  body("roomNumberID")
    .trim()
    .notEmpty()
    .withMessage("Room number ID is required"),
  
  body("roomNumberName")
    .trim()
    .notEmpty()
    .withMessage("Room number name is required"),
  
  body("roomPrice")
    .isFloat({ min: 0 })
    .withMessage("Room price must be a positive number"),
  
  body("checkInDate")
    .notEmpty()
    .withMessage("Check-in date is required")
    .isISO8601()
    .withMessage("Check-in date must be a valid date")
    .custom((value) => {
      const checkIn = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (checkIn < today) {
        throw new Error("Check-in date cannot be in the past");
      }
      return true;
    }),
  
  body("checkOutDate")
    .notEmpty()
    .withMessage("Check-out date is required")
    .isISO8601()
    .withMessage("Check-out date must be a valid date")
    .custom((value, { req }) => {
      const checkOut = new Date(value);
      const checkIn = new Date(req.body.checkInDate);
      if (checkOut <= checkIn) {
        throw new Error("Check-out date must be after check-in date");
      }
      return true;
    }),
  
  body("nights")
    .isInt({ min: 1 })
    .withMessage("Nights must be a positive integer"),
  
  body("adults")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Adults must be a positive integer"),
  
  body("children")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Children must be a non-negative integer"),
  
  body("totalBill")
    .isFloat({ min: 0 })
    .withMessage("Total bill must be a positive number"),
  
  body("advancePayment")
    .isFloat({ min: 0 })
    .withMessage("Advance payment must be a positive number")
    .custom((value, { req }) => {
      if (value > req.body.totalBill) {
        throw new Error("Advance payment cannot exceed total bill");
      }
      return true;
    }),
  
  body("duePayment")
    .isFloat({ min: 0 })
    .withMessage("Due payment must be a positive number"),
  
  body("transactionId")
    .trim()
    .notEmpty()
    .withMessage("Transaction ID is required"),
  
  body("bookedBy")
    .trim()
    .notEmpty()
    .withMessage("Booked by is required"),
  
  body("bookedByID")
    .trim()
    .notEmpty()
    .withMessage("Booked by ID is required"),
  
  body("bookingID")
    .trim()
    .notEmpty()
    .withMessage("Booking ID is required"),
  
  body("isKitchen")
    .optional()
    .isBoolean()
    .withMessage("isKitchen must be a boolean"),
  
  body("extraBed")
    .optional()
    .isBoolean()
    .withMessage("extraBed must be a boolean"),
  
  body("kitchenTotalBill")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Kitchen total bill must be a positive number"),
  
  body("extraBedTotalBill")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Extra bed total bill must be a positive number"),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

// Update booking validation (more lenient)
const validateBookingUpdate = [
  body("fullName")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage("Full name must be between 2 and 100 characters"),
  
  body("phone")
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage("Please provide a valid phone number"),
  
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  
  body("checkInDate")
    .optional()
    .isISO8601()
    .withMessage("Check-in date must be a valid date"),
  
  body("checkOutDate")
    .optional()
    .isISO8601()
    .withMessage("Check-out date must be a valid date")
    .custom((value, { req }) => {
      if (req.body.checkInDate && value) {
        const checkOut = new Date(value);
        const checkIn = new Date(req.body.checkInDate);
        if (checkOut <= checkIn) {
          throw new Error("Check-out date must be after check-in date");
        }
      }
      return true;
    }),
  
  body("roomPrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Room price must be a positive number"),
  
  body("totalBill")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Total bill must be a positive number"),
  
  body("advancePayment")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Advance payment must be a positive number"),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

// Query parameter validation
const validateBookingQuery = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  
  query("sortBy")
    .optional()
    .isIn(["createdAt", "checkInDate", "checkOutDate", "totalBill", "bookingNo"])
    .withMessage("Invalid sort field"),
  
  query("sortOrder")
    .optional()
    .isIn(["asc", "desc"])
    .withMessage("Sort order must be 'asc' or 'desc'"),
  
  query("statusID")
    .optional()
    .isInt()
    .withMessage("Status ID must be a number"),
  
  query("hotelID")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Hotel ID must be a valid number"),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: errors.array(),
      });
    }
    next();
  },
];

// ID parameter validation
const validateMongoId = [
  param("id")
    .notEmpty()
    .withMessage("ID is required")
    .isMongoId()
    .withMessage("Invalid ID format"),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

// Hotel validation middleware
const validateHotel = [
  body("hotelName")
    .trim()
    .notEmpty()
    .withMessage("Hotel name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Hotel name must be between 2 and 100 characters"),
  
  body("hotelDescription")
    .trim()
    .notEmpty()
    .withMessage("Hotel description is required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Hotel description must be between 10 and 1000 characters"),
  
  body("address.street")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Street address must be less than 200 characters"),
  
  body("contact.email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  
  body("contact.phone")
    .optional()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage("Please provide a valid phone number"),
  
  body("status")
    .optional()
    .isIn(["active", "inactive", "maintenance"])
    .withMessage("Status must be active, inactive, or maintenance"),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

// Hotel category validation
const validateHotelCategory = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Category name must be between 2 and 50 characters"),
  
  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Description must be less than 500 characters"),
  
  body("basePrice")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Base price must be a positive number"),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

// Room validation
const validateRoom = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Room name is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("Room name must be between 1 and 50 characters"),
  
  body("status")
    .optional()
    .isIn(["available", "occupied", "maintenance", "reserved"])
    .withMessage("Status must be available, occupied, maintenance, or reserved"),
  
  body("price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  
  body("capacity.adults")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Adults capacity must be at least 1"),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }
    next();
  },
];

module.exports = {
  validateRegister,
  validateBooking,
  validateBookingUpdate,
  validateBookingQuery,
  validateMongoId,
  validateHotel,
  validateHotelCategory,
  validateRoom,
};
