const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const DashboardController = require("../controllers/dashboardController");

// ============================================
// DASHBOARD ROUTES
// ============================================

/**
 * @route   POST /api/dashboard
 * @desc    Create a new dashboard configuration
 * @access  Private
 * @body    { theme: {...}, cardStyle: {...}, userId?: ObjectId, isDefault?: boolean }
 */
router.post("/dashboard", protect, DashboardController.createDashboard);

/**
 * @route   GET /api/dashboard
 * @desc    Get current user's dashboard configuration (or default)
 * @access  Private
 */
router.get("/dashboard", protect, DashboardController.getDashboard);

/**
 * @route   GET /api/dashboard/all
 * @desc    Get all dashboard configurations (admin)
 * @access  Private
 */
router.get("/dashboard/all", protect, DashboardController.getAllDashboards);

/**
 * @route   GET /api/dashboard/:id
 * @desc    Get dashboard configuration by ID
 * @access  Private
 */
router.get("/dashboard/:id", protect, DashboardController.getDashboardById);

/**
 * @route   PUT /api/dashboard
 * @desc    Update current user's dashboard configuration (or create if doesn't exist)
 * @access  Private
 * @body    { theme: {...}, cardStyle: {...} }
 */
router.put("/dashboard", protect, DashboardController.updateMyDashboard);

/**
 * @route   PUT /api/dashboard/:id
 * @desc    Update dashboard configuration by ID
 * @access  Private
 * @body    { theme: {...}, cardStyle: {...}, isDefault?: boolean }
 */
router.put("/dashboard/:id", protect, DashboardController.updateDashboard);

/**
 * @route   DELETE /api/dashboard/:id
 * @desc    Delete dashboard configuration
 * @access  Private
 */
router.delete("/dashboard/:id", protect, DashboardController.deleteDashboard);

/**
 * @route   POST /api/dashboard/reset
 * @desc    Reset current user's dashboard to default
 * @access  Private
 */
router.post("/dashboard/reset", protect, DashboardController.resetDashboard);

module.exports = router;
