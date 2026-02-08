const Dashboard = require("../models/Dashboard");
const mongoose = require("mongoose");

// ============================================
// HELPER FUNCTIONS
// ============================================

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
const emitDashboardEvent = (req, event, data) => {
  if (req.io) {
    req.io.emit(`dashboard:${event}`, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
};

// ============================================
// DASHBOARD CRUD OPERATIONS
// ============================================

/**
 * @desc    Create a new dashboard configuration
 * @route   POST /api/dashboard
 * @access  Private
 */
const createDashboard = async (req, res) => {
  try {
    const dashboardData = req.body;
    const userId = req.user?.id || null;

    // If userId is provided in body, use it; otherwise use authenticated user
    const finalUserId = dashboardData.userId || userId;

    // Check if user already has a dashboard configuration
    if (finalUserId) {
      const existingDashboard = await Dashboard.findOne({ userId: finalUserId });
      if (existingDashboard) {
        return sendErrorResponse(
          res,
          409,
          "Dashboard configuration already exists for this user. Use update instead."
        );
      }
      dashboardData.userId = finalUserId;
    } else {
      // Global dashboard - check if default already exists
      if (dashboardData.isDefault) {
        const existingDefault = await Dashboard.findOne({ isDefault: true, userId: null });
        if (existingDefault) {
          return sendErrorResponse(
            res,
            409,
            "A default dashboard configuration already exists. Use update instead."
          );
        }
      }
      dashboardData.userId = null;
    }

    // Create dashboard
    const dashboard = await Dashboard.create(dashboardData);

    // Emit real-time event
    emitDashboardEvent(req, "created", {
      dashboard,
      message: "Dashboard configuration created",
    });

    return sendSuccessResponse(
      res,
      201,
      "Dashboard configuration created successfully",
      dashboard
    );
  } catch (error) {
    console.error("Create dashboard error:", error);

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
      error.message || "Failed to create dashboard configuration"
    );
  }
};

/**
 * @desc    Get dashboard configuration
 * @route   GET /api/dashboard
 * @access  Private
 */
const getDashboard = async (req, res) => {
  try {
    const userId = req.user?.id || null;

    let dashboard;

    if (userId) {
      // Try to get user-specific dashboard first
      dashboard = await Dashboard.findOne({ userId });
      
      // If no user-specific dashboard, get default
      if (!dashboard) {
        dashboard = await Dashboard.findOne({ isDefault: true, userId: null });
      }
    } else {
      // Get default dashboard
      dashboard = await Dashboard.findOne({ isDefault: true, userId: null });
    }

    // If still no dashboard, create a default one
    if (!dashboard) {
      dashboard = await Dashboard.create({
        userId: null,
        isDefault: true,
      });
    }

    return sendSuccessResponse(
      res,
      200,
      "Dashboard configuration retrieved successfully",
      dashboard
    );
  } catch (error) {
    console.error("Get dashboard error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve dashboard configuration");
  }
};

/**
 * @desc    Get dashboard by ID
 * @route   GET /api/dashboard/:id
 * @access  Private
 */
const getDashboardById = async (req, res) => {
  try {
    const { id } = req.params;

    let dashboard;
    if (mongoose.Types.ObjectId.isValid(id)) {
      dashboard = await Dashboard.findById(id);
    } else {
      return sendErrorResponse(res, 400, "Invalid dashboard ID");
    }

    if (!dashboard) {
      return sendErrorResponse(res, 404, "Dashboard configuration not found");
    }

    return sendSuccessResponse(
      res,
      200,
      "Dashboard configuration retrieved successfully",
      dashboard
    );
  } catch (error) {
    console.error("Get dashboard by ID error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve dashboard configuration");
  }
};

/**
 * @desc    Get all dashboard configurations (admin)
 * @route   GET /api/dashboard/all
 * @access  Private
 */
const getAllDashboards = async (req, res) => {
  try {
    const dashboards = await Dashboard.find().sort({ createdAt: -1 });

    return sendSuccessResponse(
      res,
      200,
      "Dashboard configurations retrieved successfully",
      { dashboards, count: dashboards.length }
    );
  } catch (error) {
    console.error("Get all dashboards error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve dashboard configurations");
  }
};

/**
 * @desc    Update dashboard configuration
 * @route   PUT /api/dashboard/:id
 * @access  Private
 */
const updateDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Find dashboard
    let dashboard;
    if (mongoose.Types.ObjectId.isValid(id)) {
      dashboard = await Dashboard.findById(id);
    } else {
      return sendErrorResponse(res, 400, "Invalid dashboard ID");
    }

    if (!dashboard) {
      return sendErrorResponse(res, 404, "Dashboard configuration not found");
    }

    // Handle isDefault flag
    if (updateData.isDefault && !dashboard.userId) {
      // Unset other defaults if setting this as default
      await Dashboard.updateMany(
        { isDefault: true, userId: null, _id: { $ne: dashboard._id } },
        { isDefault: false }
      );
    }

    // Update dashboard
    Object.assign(dashboard, updateData);
    await dashboard.save();

    // Emit real-time event
    emitDashboardEvent(req, "updated", {
      dashboard,
      message: "Dashboard configuration updated",
    });

    return sendSuccessResponse(
      res,
      200,
      "Dashboard configuration updated successfully",
      dashboard
    );
  } catch (error) {
    console.error("Update dashboard error:", error);

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
      error.message || "Failed to update dashboard configuration"
    );
  }
};

/**
 * @desc    Update current user's dashboard or create if doesn't exist
 * @route   PUT /api/dashboard
 * @access  Private
 */
const updateMyDashboard = async (req, res) => {
  try {
    const userId = req.user?.id;
    const updateData = req.body;

    if (!userId) {
      return sendErrorResponse(res, 401, "User not authenticated");
    }

    // Find or create user's dashboard
    let dashboard = await Dashboard.findOne({ userId });

    if (!dashboard) {
      // Create new dashboard for user
      dashboard = await Dashboard.create({
        userId,
        ...updateData,
      });

      emitDashboardEvent(req, "created", {
        dashboard,
        message: "Dashboard configuration created",
      });

      return sendSuccessResponse(
        res,
        201,
        "Dashboard configuration created successfully",
        dashboard
      );
    }

    // Update existing dashboard
    Object.assign(dashboard, updateData);
    await dashboard.save();

    // Emit real-time event
    emitDashboardEvent(req, "updated", {
      dashboard,
      message: "Dashboard configuration updated",
    });

    return sendSuccessResponse(
      res,
      200,
      "Dashboard configuration updated successfully",
      dashboard
    );
  } catch (error) {
    console.error("Update my dashboard error:", error);

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
      error.message || "Failed to update dashboard configuration"
    );
  }
};

/**
 * @desc    Delete dashboard configuration
 * @route   DELETE /api/dashboard/:id
 * @access  Private
 */
const deleteDashboard = async (req, res) => {
  try {
    const { id } = req.params;

    // Find and delete dashboard
    let dashboard;
    if (mongoose.Types.ObjectId.isValid(id)) {
      dashboard = await Dashboard.findByIdAndDelete(id);
    } else {
      return sendErrorResponse(res, 400, "Invalid dashboard ID");
    }

    if (!dashboard) {
      return sendErrorResponse(res, 404, "Dashboard configuration not found");
    }

    // Emit real-time event
    emitDashboardEvent(req, "deleted", {
      dashboardId: id,
      message: "Dashboard configuration deleted",
    });

    return sendSuccessResponse(res, 200, "Dashboard configuration deleted successfully");
  } catch (error) {
    console.error("Delete dashboard error:", error);
    return sendErrorResponse(res, 500, "Failed to delete dashboard configuration");
  }
};

/**
 * @desc    Reset dashboard to default
 * @route   POST /api/dashboard/reset
 * @access  Private
 */
const resetDashboard = async (req, res) => {
  try {
    const userId = req.user?.id || null;

    let dashboard;

    if (userId) {
      dashboard = await Dashboard.findOne({ userId });
      if (!dashboard) {
        // Get default dashboard and create a copy for user
        const defaultDashboard = await Dashboard.findOne({ isDefault: true, userId: null });
        if (defaultDashboard) {
          const defaultData = defaultDashboard.toObject();
          delete defaultData._id;
          delete defaultData.userId;
          delete defaultData.isDefault;
          delete defaultData.createdAt;
          delete defaultData.updatedAt;
          
          dashboard = await Dashboard.create({
            userId,
            ...defaultData,
          });
        } else {
          // Create new default dashboard
          dashboard = await Dashboard.create({
            userId,
          });
        }
      } else {
        // Reset to default values
        const defaultDashboard = await Dashboard.findOne({ isDefault: true, userId: null });
        if (defaultDashboard) {
          const defaultData = defaultDashboard.toObject();
          delete defaultData._id;
          delete defaultData.userId;
          delete defaultData.isDefault;
          delete defaultData.createdAt;
          delete defaultData.updatedAt;
          
          Object.assign(dashboard, defaultData);
          await dashboard.save();
        } else {
          // Reset to schema defaults
          dashboard = await Dashboard.findByIdAndUpdate(
            dashboard._id,
            {
              $unset: {
                theme: "",
                cardStyle: "",
              },
            },
            { new: true }
          );
        }
      }
    } else {
      return sendErrorResponse(res, 400, "Cannot reset default dashboard. Use update instead.");
    }

    emitDashboardEvent(req, "reset", {
      dashboard,
      message: "Dashboard configuration reset to default",
    });

    return sendSuccessResponse(
      res,
      200,
      "Dashboard configuration reset successfully",
      dashboard
    );
  } catch (error) {
    console.error("Reset dashboard error:", error);
    return sendErrorResponse(res, 500, "Failed to reset dashboard configuration");
  }
};

module.exports = {
  createDashboard,
  getDashboard,
  getDashboardById,
  getAllDashboards,
  updateDashboard,
  updateMyDashboard,
  deleteDashboard,
  resetDashboard,
};
