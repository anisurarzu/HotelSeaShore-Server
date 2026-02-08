const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const HotelController = require("../controllers/hotelController");
const {
  validateHotel,
  validateHotelCategory,
  validateRoom,
  validateMongoId,
} = require("../utils/validators");

// ============================================
// HOTEL ROUTES
// ============================================

/**
 * @route   POST /api/hotels
 * @desc    Create a new hotel
 * @access  Private
 * @body    images: Array of image URLs (strings) from imgbb
 */
router.post(
  "/hotels",
  protect,
  validateHotel,
  HotelController.createHotel
);

/**
 * @route   GET /api/hotels
 * @desc    Get all hotels with filtering, pagination, and sorting
 * @access  Private
 * @query   page, limit, sortBy, sortOrder, status, search
 */
router.get("/hotels", protect, HotelController.getHotels);

/**
 * @route   GET /api/hotels/:id
 * @desc    Get hotel by ID (MongoDB _id or hotelID)
 * @access  Private
 */
router.get("/hotels/:id", protect, HotelController.getHotelById);

/**
 * @route   PUT /api/hotels/:id
 * @desc    Update hotel
 * @access  Private
 * @body    images: Array of image URLs (strings) from imgbb
 */
router.put(
  "/hotels/:id",
  protect,
  validateHotel,
  HotelController.updateHotel
);

/**
 * @route   DELETE /api/hotels/:id
 * @desc    Delete hotel
 * @access  Private
 */
router.delete("/hotels/:id", protect, HotelController.deleteHotel);

// ============================================
// CATEGORY ROUTES
// ============================================

/**
 * @route   POST /api/hotels/:hotelId/categories
 * @desc    Add category to hotel
 * @access  Private
 * @body    images: Array of image URLs (strings) from imgbb
 */
router.post(
  "/hotels/:hotelId/categories",
  protect,
  validateHotelCategory,
  HotelController.addCategory
);

/**
 * @route   GET /api/hotels/:hotelId/categories
 * @desc    Get all categories of a hotel
 * @access  Private
 */
router.get(
  "/hotels/:hotelId/categories",
  protect,
  HotelController.getCategories
);

/**
 * @route   PUT /api/hotels/:hotelId/categories/:categoryId
 * @desc    Update category in hotel
 * @access  Private
 * @body    images: Array of image URLs (strings) from imgbb
 */
router.put(
  "/hotels/:hotelId/categories/:categoryId",
  protect,
  validateHotelCategory,
  HotelController.updateCategory
);

/**
 * @route   DELETE /api/hotels/:hotelId/categories/:categoryId
 * @desc    Delete category from hotel
 * @access  Private
 */
router.delete(
  "/hotels/:hotelId/categories/:categoryId",
  protect,
  HotelController.deleteCategory
);

// ============================================
// ROOM ROUTES
// ============================================

/**
 * @route   POST /api/hotels/:hotelId/categories/:categoryId/rooms
 * @desc    Add room to category
 * @access  Private
 * @body    images: Array of image URLs (strings) from imgbb
 */
router.post(
  "/hotels/:hotelId/categories/:categoryId/rooms",
  protect,
  validateRoom,
  HotelController.addRoom
);

/**
 * @route   GET /api/hotels/:hotelId/categories/:categoryId/rooms
 * @desc    Get all rooms in a category
 * @access  Private
 */
router.get(
  "/hotels/:hotelId/categories/:categoryId/rooms",
  protect,
  HotelController.getRooms
);

/**
 * @route   PUT /api/hotels/:hotelId/categories/:categoryId/rooms/:roomId
 * @desc    Update room in category
 * @access  Private
 * @body    images: Array of image URLs (strings) from imgbb
 */
router.put(
  "/hotels/:hotelId/categories/:categoryId/rooms/:roomId",
  protect,
  validateRoom,
  HotelController.updateRoom
);

/**
 * @route   DELETE /api/hotels/:hotelId/categories/:categoryId/rooms/:roomId
 * @desc    Delete room from category
 * @access  Private
 */
router.delete(
  "/hotels/:hotelId/categories/:categoryId/rooms/:roomId",
  protect,
  HotelController.deleteRoom
);

// ============================================
// LEGACY ROUTES (for backward compatibility)
// ============================================

/**
 * @route   POST /api/hotel
 * @desc    Create hotel (legacy)
 * @access  Private
 * @body    images: Array of image URLs (strings) from imgbb
 */
router.post(
  "/hotel",
  protect,
  validateHotel,
  HotelController.createHotel
);

/**
 * @route   GET /api/hotel
 * @desc    Get all hotels (legacy)
 * @access  Private
 */
router.get("/hotel", protect, HotelController.getHotels);

/**
 * @route   PUT /api/hotel/:id
 * @desc    Update hotel (legacy)
 * @access  Private
 * @body    images: Array of image URLs (strings) from imgbb
 */
router.put(
  "/hotel/:id",
  protect,
  validateHotel,
  HotelController.updateHotel
);

/**
 * @route   DELETE /api/hotel/:id
 * @desc    Delete hotel (legacy)
 * @access  Private
 */
router.delete("/hotel/:id", protect, HotelController.deleteHotel);

/**
 * @route   PUT /api/hotels/room/updateBooking
 * @desc    Update booking in room (legacy)
 * @access  Private
 */
router.put(
  "/hotels/room/updateBooking",
  protect,
  HotelController.updateBooking
);

/**
 * @route   DELETE /api/hotels/bookings/delete
 * @desc    Delete booking details (legacy)
 * @access  Private
 */
router.delete(
  "/hotels/bookings/delete",
  protect,
  HotelController.deleteBookingDetails
);

/**
 * @route   PUT /api/hotels/:hotelID/roomCategories/:categoryID/roomStatus
 * @desc    Update room status (legacy)
 * @access  Private
 */
router.put(
  "/hotels/:hotelID/roomCategories/:categoryID/roomStatus",
  protect,
  HotelController.updateRoomStatus
);

module.exports = router;
