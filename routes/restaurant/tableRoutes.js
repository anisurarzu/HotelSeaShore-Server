const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const tableController = require("../../controllers/restaurant/tableController");

/**
 * @route   POST /api/restaurant/table
 * @desc    Add a new table
 * @access  Private
 * @body    tableNumber, capacity, location (optional), status, notes (optional)
 */
router.post(
  "/restaurant/table",
  protect,
  tableController.addTable
);

/**
 * @route   GET /api/restaurant/table
 * @desc    Get all tables
 * @access  Private
 * @query   status, statusID, capacity
 */
router.get("/restaurant/tables", protect, tableController.getTables);

/**
 * @route   GET /api/restaurant/table/available
 * @desc    Get all available tables
 * @access  Private
 * @query   capacity (optional - minimum capacity)
 */
router.get("/restaurant/table/available", protect, tableController.getAvailableTables);

/**
 * @route   GET /api/restaurant/table/item/:id
 * @desc    Get table by ID
 * @access  Private
 */
router.get("/restaurant/table/item/:id", protect, tableController.getTableById);

/**
 * @route   GET /api/restaurant/table/number/:tableNumber
 * @desc    Get table by table number
 * @access  Private
 */
router.get("/restaurant/table/number/:tableNumber", protect, tableController.getTableByNumber);

/**
 * @route   PUT /api/restaurant/table/:id
 * @desc    Update table
 * @access  Private
 * @body    tableNumber, capacity, location, status, notes
 */
router.put(
  "/restaurant/table/:id",
  protect,
  tableController.updateTable
);

/**
 * @route   DELETE /api/restaurant/table/:id
 * @desc    Delete table (soft delete)
 * @access  Private
 */
router.delete("/restaurant/table/:id", protect, tableController.deleteTable);

module.exports = router;
