const Menu = require("../../models/restaurant/Menu");
const mongoose = require("mongoose");

// Helper function for success response
const sendSuccessResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message,
    ...(data && { data }),
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

// Helper function for error response
const sendErrorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

// Add new menu item
const addMenuItem = async (req, res) => {
  try {
    const { itemName, categoryID, price, availability, description, image } = req.body;

    // Validate required fields
    if (!itemName || !categoryID || price === undefined) {
      return sendErrorResponse(res, 400, "Missing required fields: itemName, categoryID, and price are required");
    }

    // Validate price
    if (typeof price !== "number" || price < 0) {
      return sendErrorResponse(res, 400, "Price must be a positive number");
    }

    const menuItem = await Menu.create({
      itemName: itemName.trim(),
      categoryID: categoryID.trim(),
      price: Number(price),
      availability: availability || "available",
      description: description ? description.trim() : "",
      image: image || "",
    });

    sendSuccessResponse(res, 201, "Menu item added successfully", {
      menuItem: {
        id: menuItem._id,
        itemName: menuItem.itemName,
        categoryID: menuItem.categoryID,
        price: menuItem.price,
        availability: menuItem.availability,
        description: menuItem.description,
        image: menuItem.image,
        createdAt: menuItem.createdAt,
      },
    });
  } catch (error) {
    console.error("Add menu item error:", error);
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendErrorResponse(res, 400, "Validation failed", errors);
    }
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Get all menu items
const getMenuItems = async (req, res) => {
  try {
    const { categoryID, availability, statusID } = req.query;

    // Build query
    const query = {};
    
    if (categoryID) {
      query.categoryID = categoryID;
    }
    
    if (availability) {
      query.availability = availability;
    }
    
    if (statusID !== undefined) {
      query.statusID = Number(statusID);
    } else {
      query.statusID = { $ne: 255 }; // Get active items by default
    }

    const menuItems = await Menu.find(query).sort({ createdAt: -1 });

    sendSuccessResponse(res, 200, "Menu items retrieved successfully", {
      menuItems: menuItems.map((item) => ({
        id: item._id,
        itemName: item.itemName,
        categoryID: item.categoryID,
        price: item.price,
        availability: item.availability,
        description: item.description,
        image: item.image,
        statusID: item.statusID,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      count: menuItems.length,
    });
  } catch (error) {
    console.error("Get menu items error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Get menu item by ID
const getMenuItemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(res, 400, "Invalid menu item ID");
    }

    const menuItem = await Menu.findById(id);

    if (!menuItem) {
      return sendErrorResponse(res, 404, "Menu item not found");
    }

    sendSuccessResponse(res, 200, "Menu item retrieved successfully", {
      menuItem: {
        id: menuItem._id,
        itemName: menuItem.itemName,
        categoryID: menuItem.categoryID,
        price: menuItem.price,
        availability: menuItem.availability,
        description: menuItem.description,
        image: menuItem.image,
        statusID: menuItem.statusID,
        createdAt: menuItem.createdAt,
        updatedAt: menuItem.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get menu item error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Update menu item
const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemName, categoryID, price, availability, description, image } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(res, 400, "Invalid menu item ID");
    }

    const updateData = {};

    if (itemName !== undefined) updateData.itemName = itemName.trim();
    if (categoryID !== undefined) updateData.categoryID = categoryID.trim();
    if (price !== undefined) {
      if (typeof price !== "number" || price < 0) {
        return sendErrorResponse(res, 400, "Price must be a positive number");
      }
      updateData.price = Number(price);
    }
    if (availability !== undefined) updateData.availability = availability;
    if (description !== undefined) updateData.description = description.trim();
    if (image !== undefined) updateData.image = image;

    const menuItem = await Menu.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!menuItem) {
      return sendErrorResponse(res, 404, "Menu item not found");
    }

    sendSuccessResponse(res, 200, "Menu item updated successfully", {
      menuItem: {
        id: menuItem._id,
        itemName: menuItem.itemName,
        categoryID: menuItem.categoryID,
        price: menuItem.price,
        availability: menuItem.availability,
        description: menuItem.description,
        image: menuItem.image,
        statusID: menuItem.statusID,
        updatedAt: menuItem.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update menu item error:", error);
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendErrorResponse(res, 400, "Validation failed", errors);
    }
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Delete menu item (soft delete - set statusID to 255)
const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(res, 400, "Invalid menu item ID");
    }

    const menuItem = await Menu.findByIdAndUpdate(
      id,
      { statusID: 255 },
      { new: true }
    );

    if (!menuItem) {
      return sendErrorResponse(res, 404, "Menu item not found");
    }

    sendSuccessResponse(res, 200, "Menu item deleted successfully", {
      menuItem: {
        id: menuItem._id,
        itemName: menuItem.itemName,
        statusID: menuItem.statusID,
      },
    });
  } catch (error) {
    console.error("Delete menu item error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Get menu category IDs
const getMenuCategories = async (req, res) => {
  try {
    const categoryIDs = await Menu.distinct("categoryID", {
      statusID: { $ne: 255 },
    });

    sendSuccessResponse(res, 200, "Category IDs retrieved successfully", {
      categoryIDs,
      count: categoryIDs.length,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

module.exports = {
  addMenuItem,
  getMenuItems,
  getMenuItemById,
  updateMenuItem,
  deleteMenuItem,
  getMenuCategories,
};
