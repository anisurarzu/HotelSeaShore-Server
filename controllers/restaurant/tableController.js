const Table = require("../../models/restaurant/Table");
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

// Add new table
const addTable = async (req, res) => {
  try {
    const { tableNumber, capacity, location, status, notes } = req.body;

    // Validate required fields
    if (!tableNumber || !capacity) {
      return sendErrorResponse(res, 400, "Missing required fields: tableNumber and capacity are required");
    }

    // Validate capacity
    if (typeof capacity !== "number" || capacity < 1) {
      return sendErrorResponse(res, 400, "Capacity must be a positive number greater than 0");
    }

    // Validate status if provided
    const validStatuses = ["available", "occupied", "reserved", "maintenance"];
    if (status && !validStatuses.includes(status)) {
      return sendErrorResponse(res, 400, `Status must be one of: ${validStatuses.join(", ")}`);
    }

    const table = await Table.create({
      tableNumber: tableNumber.trim(),
      capacity: Number(capacity),
      location: location ? location.trim() : "",
      status: status || "available",
      notes: notes ? notes.trim() : "",
    });

    sendSuccessResponse(res, 201, "Table added successfully", {
      table: {
        id: table._id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        location: table.location,
        status: table.status,
        notes: table.notes,
        statusID: table.statusID,
        createdAt: table.createdAt,
      },
    });
  } catch (error) {
    console.error("Add table error:", error);
    if (error.code === 11000) {
      return sendErrorResponse(res, 400, "Table number already exists");
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendErrorResponse(res, 400, "Validation failed", errors);
    }
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Get all tables
const getTables = async (req, res) => {
  try {
    const { status, statusID, capacity } = req.query;

    // Build query
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (capacity) {
      query.capacity = Number(capacity);
    }
    
    if (statusID !== undefined) {
      query.statusID = Number(statusID);
    } else {
      query.statusID = { $ne: 255 }; // Get active tables by default
    }

    const tables = await Table.find(query).sort({ tableNumber: 1 });

    sendSuccessResponse(res, 200, "Tables retrieved successfully", {
      tables: tables.map((table) => ({
        id: table._id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        location: table.location,
        status: table.status,
        notes: table.notes,
        statusID: table.statusID,
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
      })),
      count: tables.length,
    });
  } catch (error) {
    console.error("Get tables error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Get table by ID
const getTableById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(res, 400, "Invalid table ID");
    }

    const table = await Table.findById(id);

    if (!table) {
      return sendErrorResponse(res, 404, "Table not found");
    }

    sendSuccessResponse(res, 200, "Table retrieved successfully", {
      table: {
        id: table._id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        location: table.location,
        status: table.status,
        notes: table.notes,
        statusID: table.statusID,
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get table error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Get table by table number
const getTableByNumber = async (req, res) => {
  try {
    const { tableNumber } = req.params;

    if (!tableNumber) {
      return sendErrorResponse(res, 400, "Table number is required");
    }

    const table = await Table.findOne({ tableNumber: tableNumber.trim() });

    if (!table) {
      return sendErrorResponse(res, 404, "Table not found");
    }

    sendSuccessResponse(res, 200, "Table retrieved successfully", {
      table: {
        id: table._id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        location: table.location,
        status: table.status,
        notes: table.notes,
        statusID: table.statusID,
        createdAt: table.createdAt,
        updatedAt: table.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get table by number error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Update table
const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const { tableNumber, capacity, location, status, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(res, 400, "Invalid table ID");
    }

    const updateData = {};

    if (tableNumber !== undefined) updateData.tableNumber = tableNumber.trim();
    if (capacity !== undefined) {
      if (typeof capacity !== "number" || capacity < 1) {
        return sendErrorResponse(res, 400, "Capacity must be a positive number greater than 0");
      }
      updateData.capacity = Number(capacity);
    }
    if (location !== undefined) updateData.location = location.trim();
    if (status !== undefined) {
      const validStatuses = ["available", "occupied", "reserved", "maintenance"];
      if (!validStatuses.includes(status)) {
        return sendErrorResponse(res, 400, `Status must be one of: ${validStatuses.join(", ")}`);
      }
      updateData.status = status;
    }
    if (notes !== undefined) updateData.notes = notes.trim();

    const table = await Table.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!table) {
      return sendErrorResponse(res, 404, "Table not found");
    }

    sendSuccessResponse(res, 200, "Table updated successfully", {
      table: {
        id: table._id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        location: table.location,
        status: table.status,
        notes: table.notes,
        statusID: table.statusID,
        updatedAt: table.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update table error:", error);
    if (error.code === 11000) {
      return sendErrorResponse(res, 400, "Table number already exists");
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendErrorResponse(res, 400, "Validation failed", errors);
    }
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Delete table (soft delete - set statusID to 255)
const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(res, 400, "Invalid table ID");
    }

    const table = await Table.findByIdAndUpdate(
      id,
      { statusID: 255 },
      { new: true }
    );

    if (!table) {
      return sendErrorResponse(res, 404, "Table not found");
    }

    sendSuccessResponse(res, 200, "Table deleted successfully", {
      table: {
        id: table._id,
        tableNumber: table.tableNumber,
        statusID: table.statusID,
      },
    });
  } catch (error) {
    console.error("Delete table error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Get available tables
const getAvailableTables = async (req, res) => {
  try {
    const { capacity } = req.query;

    const query = {
      status: "available",
      statusID: { $ne: 255 },
    };

    if (capacity) {
      query.capacity = { $gte: Number(capacity) };
    }

    const tables = await Table.find(query).sort({ capacity: 1, tableNumber: 1 });

    sendSuccessResponse(res, 200, "Available tables retrieved successfully", {
      tables: tables.map((table) => ({
        id: table._id,
        tableNumber: table.tableNumber,
        capacity: table.capacity,
        location: table.location,
        status: table.status,
        notes: table.notes,
      })),
      count: tables.length,
    });
  } catch (error) {
    console.error("Get available tables error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

module.exports = {
  addTable,
  getTables,
  getTableById,
  getTableByNumber,
  updateTable,
  deleteTable,
  getAvailableTables,
};
