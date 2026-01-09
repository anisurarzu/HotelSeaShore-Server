const Hotel = require("../models/Hotel");
const mongoose = require("mongoose");
const { getImageUrls, deleteImages } = require("../middleware/uploadMiddleware");

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Generate next hotel ID
 */
const getNextHotelID = async () => {
  try {
    const lastHotel = await Hotel.findOne().sort({ hotelID: -1 }).select("hotelID").lean();
    return lastHotel?.hotelID ? lastHotel.hotelID + 1 : 1;
  } catch (error) {
    console.error("Error generating hotel ID:", error);
    throw new Error("Could not generate hotel ID");
  }
};

/**
 * Standardized success response
 */
const sendSuccessResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message,
    ...(data && { data }),
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

/**
 * Standardized error response
 */
const sendErrorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

/**
 * Emit real-time event if Socket.io is available
 */
const emitHotelEvent = (req, event, data) => {
  if (req.io) {
    req.io.emit(`hotel:${event}`, {
      ...data,
      timestamp: new Date().toISOString(),
    });
    // Also emit to hotel-specific room
    if (data.hotelID) {
      req.io.to(`hotel:${data.hotelID}`).emit(`hotel:${event}`, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  }
};

// ============================================
// HOTEL CRUD OPERATIONS
// ============================================

/**
 * @desc    Create a new hotel
 * @route   POST /api/hotels
 * @access  Private
 */
const createHotel = async (req, res) => {
  try {
    const hotelData = req.body;

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const imageUrls = getImageUrls(req);
      hotelData.images = imageUrls;
    } else if (req.body.images) {
      // If images are provided as URLs in body (for backward compatibility)
      hotelData.images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    }

    // Generate hotel ID
    const hotelID = await getNextHotelID();

    // Create hotel
    const hotel = await Hotel.create({
      ...hotelData,
      hotelID,
    });

    // Emit real-time event
    emitHotelEvent(req, "created", {
      hotel,
      hotelID: hotel.hotelID,
      message: "New hotel created",
    });

    return sendSuccessResponse(
      res,
      201,
      "Hotel created successfully",
      hotel
    );
  } catch (error) {
    console.error("Create hotel error:", error);

    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      deleteImages(req.files.map((file) => file.path));
    }

    if (error.code === 11000) {
      return sendErrorResponse(
        res,
        409,
        "Hotel with this identifier already exists"
      );
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return sendErrorResponse(res, 400, "Validation failed", errors);
    }

    return sendErrorResponse(
      res,
      500,
      error.message || "Failed to create hotel"
    );
  }
};

/**
 * @desc    Get all hotels with filtering, pagination, and sorting
 * @route   GET /api/hotels
 * @access  Private
 */
const getHotels = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      sortOrder = "desc",
      status,
      search,
    } = req.query;

    // Build filter
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { hotelName: { $regex: search, $options: "i" } },
        { hotelDescription: { $regex: search, $options: "i" } },
        { "address.city": { $regex: search, $options: "i" } },
      ];
    }

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Sorting
    const sort = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Execute query
    const [hotels, total] = await Promise.all([
      Hotel.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
      Hotel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    return sendSuccessResponse(res, 200, "Hotels retrieved successfully", {
      hotels,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Get hotels error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve hotels");
  }
};

/**
 * @desc    Get hotel by ID
 * @route   GET /api/hotels/:id
 * @access  Private
 */
const getHotelById = async (req, res) => {
  try {
    const { id } = req.params;

    // Try to find by MongoDB _id first, then by hotelID
    let hotel;
    if (mongoose.Types.ObjectId.isValid(id)) {
      hotel = await Hotel.findById(id);
    } else {
      hotel = await Hotel.findOne({ hotelID: parseInt(id) });
    }

    if (!hotel) {
      return sendErrorResponse(res, 404, "Hotel not found");
    }

    return sendSuccessResponse(res, 200, "Hotel retrieved successfully", hotel);
  } catch (error) {
    console.error("Get hotel by ID error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve hotel");
  }
};

/**
 * @desc    Update hotel
 * @route   PUT /api/hotels/:id
 * @access  Private
 */
const updateHotel = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find hotel
    let hotel;
    if (mongoose.Types.ObjectId.isValid(id)) {
      hotel = await Hotel.findById(id);
    } else {
      hotel = await Hotel.findOne({ hotelID: parseInt(id) });
    }

    if (!hotel) {
      // Clean up uploaded files if hotel not found
      if (req.files && req.files.length > 0) {
        deleteImages(req.files.map((file) => file.path));
      }
      return sendErrorResponse(res, 404, "Hotel not found");
    }

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const imageUrls = getImageUrls(req);
      // Merge with existing images (max 3 total)
      const existingImages = hotel.images || [];
      const newImages = [...existingImages, ...imageUrls].slice(0, 3); // Keep max 3
      updateData.images = newImages;
    } else if (req.body.images) {
      // If images are provided as URLs in body
      updateData.images = Array.isArray(req.body.images) ? req.body.images.slice(0, 3) : [req.body.images];
    }

    // Update hotel
    Object.assign(hotel, updateData);
    await hotel.save();

    // Emit real-time event
    emitHotelEvent(req, "updated", {
      hotel,
      hotelID: hotel.hotelID,
      message: "Hotel updated",
    });

    return sendSuccessResponse(res, 200, "Hotel updated successfully", hotel);
  } catch (error) {
    console.error("Update hotel error:", error);

    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      deleteImages(req.files.map((file) => file.path));
    }

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return sendErrorResponse(res, 400, "Validation failed", errors);
    }

    return sendErrorResponse(res, 500, error.message || "Failed to update hotel");
  }
};

/**
 * @desc    Delete hotel
 * @route   DELETE /api/hotels/:id
 * @access  Private
 */
const deleteHotel = async (req, res) => {
  try {
  const { id } = req.params;

    // Find and delete hotel
    let hotel;
    if (mongoose.Types.ObjectId.isValid(id)) {
      hotel = await Hotel.findByIdAndDelete(id);
    } else {
      hotel = await Hotel.findOneAndDelete({ hotelID: parseInt(id) });
    }

    if (!hotel) {
      return sendErrorResponse(res, 404, "Hotel not found");
    }

    // Emit real-time event
    emitHotelEvent(req, "deleted", {
      hotelID: hotel.hotelID,
      message: "Hotel deleted",
    });

    return sendSuccessResponse(res, 200, "Hotel deleted successfully");
  } catch (error) {
    console.error("Delete hotel error:", error);
    return sendErrorResponse(res, 500, "Failed to delete hotel");
  }
};

// ============================================
// CATEGORY OPERATIONS
// ============================================

/**
 * @desc    Add category to hotel
 * @route   POST /api/hotels/:hotelId/categories
 * @access  Private
 */
const addCategory = async (req, res) => {
  try {
    const { hotelId } = req.params;
    const categoryData = req.body;

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const imageUrls = getImageUrls(req);
      categoryData.images = imageUrls;
    } else if (req.body.images) {
      categoryData.images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    }

    // Find hotel
    let hotel;
    if (mongoose.Types.ObjectId.isValid(hotelId)) {
      hotel = await Hotel.findById(hotelId);
    } else {
      hotel = await Hotel.findOne({ hotelID: parseInt(hotelId) });
    }

    if (!hotel) {
      // Clean up uploaded files if hotel not found
      if (req.files && req.files.length > 0) {
        deleteImages(req.files.map((file) => file.path));
      }
      return sendErrorResponse(res, 404, "Hotel not found");
    }

    // Check if category name already exists
    const existingCategory = hotel.roomCategories.find(
      (cat) => cat.name === categoryData.name
    );

    if (existingCategory) {
      // Clean up uploaded files if category exists
      if (req.files && req.files.length > 0) {
        deleteImages(req.files.map((file) => file.path));
      }
      return sendErrorResponse(
        res,
        409,
        "Category with this name already exists in this hotel"
      );
    }

    // Add category
    hotel.roomCategories.push(categoryData);
    await hotel.save();

    const addedCategory = hotel.roomCategories[hotel.roomCategories.length - 1];

    // Emit real-time event
    emitHotelEvent(req, "category:added", {
      hotelID: hotel.hotelID,
      category: addedCategory,
      message: "Category added to hotel",
    });

    return sendSuccessResponse(
      res,
      201,
      "Category added successfully",
      addedCategory
    );
  } catch (error) {
    console.error("Add category error:", error);
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      deleteImages(req.files.map((file) => file.path));
    }
    return sendErrorResponse(res, 500, "Failed to add category");
  }
};

/**
 * @desc    Get all categories of a hotel
 * @route   GET /api/hotels/:hotelId/categories
 * @access  Private
 */
const getCategories = async (req, res) => {
  try {
    const { hotelId } = req.params;

    // Find hotel
    let hotel;
    if (mongoose.Types.ObjectId.isValid(hotelId)) {
      hotel = await Hotel.findById(hotelId).select("roomCategories hotelID hotelName");
    } else {
      hotel = await Hotel.findOne({ hotelID: parseInt(hotelId) }).select("roomCategories hotelID hotelName");
    }

    if (!hotel) {
      return sendErrorResponse(res, 404, "Hotel not found");
    }

    return sendSuccessResponse(res, 200, "Categories retrieved successfully", {
      hotelID: hotel.hotelID,
      hotelName: hotel.hotelName,
      categories: hotel.roomCategories,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve categories");
  }
};

/**
 * @desc    Update category in hotel
 * @route   PUT /api/hotels/:hotelId/categories/:categoryId
 * @access  Private
 */
const updateCategory = async (req, res) => {
  try {
    const { hotelId, categoryId } = req.params;
    const updateData = req.body;

    // Find hotel
    let hotel;
    if (mongoose.Types.ObjectId.isValid(hotelId)) {
      hotel = await Hotel.findById(hotelId);
    } else {
      hotel = await Hotel.findOne({ hotelID: parseInt(hotelId) });
    }

    if (!hotel) {
      // Clean up uploaded files if hotel not found
      if (req.files && req.files.length > 0) {
        deleteImages(req.files.map((file) => file.path));
      }
      return sendErrorResponse(res, 404, "Hotel not found");
    }

    // Find category
    const category = hotel.roomCategories.id(categoryId);
    if (!category) {
      // Clean up uploaded files if category not found
      if (req.files && req.files.length > 0) {
        deleteImages(req.files.map((file) => file.path));
      }
      return sendErrorResponse(res, 404, "Category not found");
    }

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const imageUrls = getImageUrls(req);
      // Merge with existing images (max 3 total)
      const existingImages = category.images || [];
      const newImages = [...existingImages, ...imageUrls].slice(0, 3); // Keep max 3
      updateData.images = newImages;
    } else if (req.body.images) {
      updateData.images = Array.isArray(req.body.images) ? req.body.images.slice(0, 3) : [req.body.images];
    }

    // Update category
    Object.assign(category, updateData);
    await hotel.save();

    // Emit real-time event
    emitHotelEvent(req, "category:updated", {
      hotelID: hotel.hotelID,
      category,
      message: "Category updated",
    });

    return sendSuccessResponse(res, 200, "Category updated successfully", category);
  } catch (error) {
    console.error("Update category error:", error);
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      deleteImages(req.files.map((file) => file.path));
    }
    return sendErrorResponse(res, 500, "Failed to update category");
  }
};

/**
 * @desc    Delete category from hotel
 * @route   DELETE /api/hotels/:hotelId/categories/:categoryId
 * @access  Private
 */
const deleteCategory = async (req, res) => {
  try {
    const { hotelId, categoryId } = req.params;

    // Find hotel
    let hotel;
    if (mongoose.Types.ObjectId.isValid(hotelId)) {
      hotel = await Hotel.findById(hotelId);
    } else {
      hotel = await Hotel.findOne({ hotelID: parseInt(hotelId) });
    }

    if (!hotel) {
      return sendErrorResponse(res, 404, "Hotel not found");
    }

    // Find and remove category
    const category = hotel.roomCategories.id(categoryId);
    if (!category) {
      return sendErrorResponse(res, 404, "Category not found");
    }

    const categoryName = category.name;
    category.remove();
    await hotel.save();

    // Emit real-time event
    emitHotelEvent(req, "category:deleted", {
      hotelID: hotel.hotelID,
      categoryName,
      message: "Category deleted",
    });

    return sendSuccessResponse(res, 200, "Category deleted successfully");
  } catch (error) {
    console.error("Delete category error:", error);
    return sendErrorResponse(res, 500, "Failed to delete category");
  }
};

// ============================================
// ROOM OPERATIONS
// ============================================

/**
 * @desc    Add room to category
 * @route   POST /api/hotels/:hotelId/categories/:categoryId/rooms
 * @access  Private
 */
const addRoom = async (req, res) => {
  try {
    const { hotelId, categoryId } = req.params;
    const roomData = req.body;

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const imageUrls = getImageUrls(req);
      roomData.images = imageUrls;
    } else if (req.body.images) {
      roomData.images = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    }

    // Find hotel
    let hotel;
    if (mongoose.Types.ObjectId.isValid(hotelId)) {
      hotel = await Hotel.findById(hotelId);
    } else {
      hotel = await Hotel.findOne({ hotelID: parseInt(hotelId) });
    }

    if (!hotel) {
      // Clean up uploaded files if hotel not found
      if (req.files && req.files.length > 0) {
        deleteImages(req.files.map((file) => file.path));
      }
      return sendErrorResponse(res, 404, "Hotel not found");
    }

    // Find category
    const category = hotel.roomCategories.id(categoryId);
    if (!category) {
      // Clean up uploaded files if category not found
      if (req.files && req.files.length > 0) {
        deleteImages(req.files.map((file) => file.path));
      }
      return sendErrorResponse(res, 404, "Category not found");
    }

    // Check if room name already exists in this category
    const existingRoom = category.roomNumbers.find(
      (room) => room.name === roomData.name
    );

    if (existingRoom) {
      // Clean up uploaded files if room exists
      if (req.files && req.files.length > 0) {
        deleteImages(req.files.map((file) => file.path));
      }
      return sendErrorResponse(
        res,
        409,
        "Room with this name already exists in this category"
      );
    }

    // Add room
    category.roomNumbers.push(roomData);
    await hotel.save();

    const addedRoom = category.roomNumbers[category.roomNumbers.length - 1];

    // Emit real-time event
    emitHotelEvent(req, "room:added", {
      hotelID: hotel.hotelID,
      categoryId: category._id,
      categoryName: category.name,
      room: addedRoom,
      message: "Room added to category",
    });

    return sendSuccessResponse(res, 201, "Room added successfully", addedRoom);
  } catch (error) {
    console.error("Add room error:", error);
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      deleteImages(req.files.map((file) => file.path));
    }
    return sendErrorResponse(res, 500, "Failed to add room");
  }
};

/**
 * @desc    Get all rooms in a category
 * @route   GET /api/hotels/:hotelId/categories/:categoryId/rooms
 * @access  Private
 */
const getRooms = async (req, res) => {
  try {
    const { hotelId, categoryId } = req.params;

    // Find hotel
    let hotel;
    if (mongoose.Types.ObjectId.isValid(hotelId)) {
      hotel = await Hotel.findById(hotelId);
    } else {
      hotel = await Hotel.findOne({ hotelID: parseInt(hotelId) });
    }

    if (!hotel) {
      return sendErrorResponse(res, 404, "Hotel not found");
    }

    // Find category
    const category = hotel.roomCategories.id(categoryId);
    if (!category) {
      return sendErrorResponse(res, 404, "Category not found");
    }

    return sendSuccessResponse(res, 200, "Rooms retrieved successfully", {
      hotelID: hotel.hotelID,
      category: {
        id: category._id,
        name: category.name,
      },
      rooms: category.roomNumbers,
    });
  } catch (error) {
    console.error("Get rooms error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve rooms");
  }
};

/**
 * @desc    Update room in category
 * @route   PUT /api/hotels/:hotelId/categories/:categoryId/rooms/:roomId
 * @access  Private
 */
const updateRoom = async (req, res) => {
  try {
    const { hotelId, categoryId, roomId } = req.params;
    const updateData = req.body;

    // Find hotel
    let hotel;
    if (mongoose.Types.ObjectId.isValid(hotelId)) {
      hotel = await Hotel.findById(hotelId);
    } else {
      hotel = await Hotel.findOne({ hotelID: parseInt(hotelId) });
    }

    if (!hotel) {
      // Clean up uploaded files if hotel not found
      if (req.files && req.files.length > 0) {
        deleteImages(req.files.map((file) => file.path));
      }
      return sendErrorResponse(res, 404, "Hotel not found");
    }

    // Find category
    const category = hotel.roomCategories.id(categoryId);
    if (!category) {
      // Clean up uploaded files if category not found
      if (req.files && req.files.length > 0) {
        deleteImages(req.files.map((file) => file.path));
      }
      return sendErrorResponse(res, 404, "Category not found");
    }

    // Find room
    const room = category.roomNumbers.id(roomId);
    if (!room) {
      // Clean up uploaded files if room not found
      if (req.files && req.files.length > 0) {
        deleteImages(req.files.map((file) => file.path));
      }
      return sendErrorResponse(res, 404, "Room not found");
    }

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      const imageUrls = getImageUrls(req);
      // Merge with existing images (max 3 total)
      const existingImages = room.images || [];
      const newImages = [...existingImages, ...imageUrls].slice(0, 3); // Keep max 3
      updateData.images = newImages;
    } else if (req.body.images) {
      updateData.images = Array.isArray(req.body.images) ? req.body.images.slice(0, 3) : [req.body.images];
    }

    // Update room
    Object.assign(room, updateData);
    await hotel.save();

    // Emit real-time event
    emitHotelEvent(req, "room:updated", {
      hotelID: hotel.hotelID,
      categoryId: category._id,
      categoryName: category.name,
      room,
      message: "Room updated",
    });

    return sendSuccessResponse(res, 200, "Room updated successfully", room);
  } catch (error) {
    console.error("Update room error:", error);
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      deleteImages(req.files.map((file) => file.path));
    }
    return sendErrorResponse(res, 500, "Failed to update room");
  }
};

/**
 * @desc    Delete room from category
 * @route   DELETE /api/hotels/:hotelId/categories/:categoryId/rooms/:roomId
 * @access  Private
 */
const deleteRoom = async (req, res) => {
  try {
    const { hotelId, categoryId, roomId } = req.params;

    // Find hotel
    let hotel;
    if (mongoose.Types.ObjectId.isValid(hotelId)) {
      hotel = await Hotel.findById(hotelId);
    } else {
      hotel = await Hotel.findOne({ hotelID: parseInt(hotelId) });
    }

    if (!hotel) {
      return sendErrorResponse(res, 404, "Hotel not found");
    }

    // Find category
    const category = hotel.roomCategories.id(categoryId);
    if (!category) {
      return sendErrorResponse(res, 404, "Category not found");
    }

    // Find and remove room
    const room = category.roomNumbers.id(roomId);
    if (!room) {
      return sendErrorResponse(res, 404, "Room not found");
    }

    const roomName = room.name;
    room.remove();
    await hotel.save();

    // Emit real-time event
    emitHotelEvent(req, "room:deleted", {
      hotelID: hotel.hotelID,
      categoryId: category._id,
      categoryName: category.name,
      roomName,
      message: "Room deleted",
    });

    return sendSuccessResponse(res, 200, "Room deleted successfully");
  } catch (error) {
    console.error("Delete room error:", error);
    return sendErrorResponse(res, 500, "Failed to delete room");
  }
};

// ============================================
// LEGACY METHODS (for backward compatibility)
// ============================================

/**
 * @desc    Update booking in room (legacy method)
 * @route   PUT /api/hotels/room/updateBooking
 * @access  Private
 */
const updateBooking = async (req, res) => {
  try {
    const { hotelID, categoryName, roomName, booking } = req.body;

    const hotel = await Hotel.findOne({ hotelID });
    if (!hotel) {
      return sendErrorResponse(res, 404, "Hotel not found");
    }

    const category = hotel.findCategoryByName(categoryName);
    if (!category) {
      return sendErrorResponse(res, 404, "Room category not found");
    }

    const room = hotel.findRoomInCategory(categoryName, roomName);
    if (!room) {
      return sendErrorResponse(res, 404, "Room not found");
    }

    // Add booking to the room's bookings array
    if (booking?.bookings?.[0]) {
      room.bookings.push(booking.bookings[0]);
    }

    // Update the bookedDates array
    if (booking?.bookedDates) {
      room.bookedDates.push(...booking.bookedDates);
    }

    await hotel.save();

    // Emit real-time event
    emitHotelEvent(req, "booking:updated", {
      hotelID: hotel.hotelID,
      categoryName,
      roomName,
      message: "Booking updated in room",
    });

    return sendSuccessResponse(res, 200, "Booking updated successfully", hotel);
  } catch (error) {
    console.error("Update booking error:", error);
    return sendErrorResponse(res, 500, "Failed to update booking");
  }
};

/**
 * @desc    Delete booking details (legacy method)
 * @route   DELETE /api/hotels/bookings/delete
 * @access  Private
 */
const deleteBookingDetails = async (req, res) => {
  try {
    const { hotelID, categoryName, roomName, datesToDelete } = req.body;

    if (!datesToDelete || !Array.isArray(datesToDelete)) {
      return sendErrorResponse(res, 400, "datesToDelete must be an array");
    }

    const hotel = await Hotel.findOne({ hotelID });
    if (!hotel) {
      return sendErrorResponse(res, 404, "Hotel not found");
    }

    const category = hotel.findCategoryByName(categoryName);
    if (!category) {
      return sendErrorResponse(res, 404, "Room category not found");
    }

    const room = hotel.findRoomInCategory(categoryName, roomName);
    if (!room) {
      return sendErrorResponse(res, 404, "Room not found");
    }

    // Filter out bookings with check-in dates in datesToDelete
    room.bookings = room.bookings.filter((booking) => {
      const checkInDate =
        booking.checkIn instanceof Date
          ? booking.checkIn.toISOString().split("T")[0]
          : String(booking.checkIn).split("T")[0];
      return !datesToDelete.includes(checkInDate);
    });

    // Filter out dates in bookedDates
    room.bookedDates = room.bookedDates.filter(
      (date) => !datesToDelete.includes(date)
    );

    await hotel.save();

    // Emit real-time event
    emitHotelEvent(req, "booking:deleted", {
      hotelID: hotel.hotelID,
      categoryName,
      roomName,
      removedDates: datesToDelete,
      message: "Bookings deleted from room",
    });

    return sendSuccessResponse(res, 200, "Bookings deleted successfully", {
      removedDates: datesToDelete,
      hotel,
    });
  } catch (error) {
    console.error("Delete booking details error:", error);
    return sendErrorResponse(res, 500, "Failed to delete booking details");
  }
};

/**
 * @desc    Update room status (legacy method)
 * @route   PUT /api/hotels/:hotelID/roomCategories/:categoryID/roomStatus
 * @access  Private
 */
const updateRoomStatus = async (req, res) => {
  try {
    const { hotelID, categoryID } = req.params;
    const { roomStatuses } = req.body;

    if (!Array.isArray(roomStatuses)) {
      return sendErrorResponse(res, 400, "roomStatuses must be an array");
    }

    const hotel = await Hotel.findOne({ hotelID: parseInt(hotelID) });
    if (!hotel) {
      return sendErrorResponse(res, 404, "Hotel not found");
    }

    const category = hotel.findCategoryByName(categoryID);
    if (!category) {
      return sendErrorResponse(res, 404, "Room category not found");
    }

    // Update the status of each room
    roomStatuses.forEach(({ name, status }) => {
      const room = category.roomNumbers.find((room) => room.name === name);
      if (room) {
        room.status = status;
      }
    });

    await hotel.save();

    // Emit real-time event
    emitHotelEvent(req, "room:status:updated", {
      hotelID: hotel.hotelID,
      categoryID,
      message: "Room statuses updated",
    });

    return sendSuccessResponse(res, 200, "Room statuses updated successfully", hotel);
  } catch (error) {
    console.error("Update room status error:", error);
    return sendErrorResponse(res, 500, "Failed to update room statuses");
  }
};

module.exports = {
  // Hotel CRUD
  createHotel,
  getHotels,
  getHotelById,
  updateHotel,
  deleteHotel,
  // Category operations
  addCategory,
  getCategories,
  updateCategory,
  deleteCategory,
  // Room operations
  addRoom,
  getRooms,
  updateRoom,
  deleteRoom,
  // Legacy methods
  updateBooking,
  deleteBookingDetails,
  updateRoomStatus,
  // Alias for backward compatibility
  getHotel: getHotels,
};
