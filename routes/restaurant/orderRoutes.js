const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const orderController = require("../../controllers/restaurant/orderController");

/**
 * @route   POST /api/restaurant/order
 * @desc    Create a new order
 * @access  Private
 * @body    invoiceNo (optional), customerName, customerPhone, customerEmail, tableNumber, orderType, items[], tax, discount, notes
 */
router.post("/restaurant/order", protect, orderController.createOrder);

/**
 * @route   GET /api/restaurant/order
 * @desc    Get all orders
 * @access  Private
 * @query   invoiceNo, orderStatus, paymentStatus, orderType, statusID, startDate, endDate
 */
router.get("/restaurant/order", protect, orderController.getOrders);

/**
 * @route   GET /api/restaurant/order/item/:id
 * @desc    Get order by ID
 * @access  Private
 */
router.get("/restaurant/order/item/:id", protect, orderController.getOrderById);

/**
 * @route   PUT /api/restaurant/order/:id
 * @desc    Update order
 * @access  Private
 * @body    invoiceNo, customerName, customerPhone, customerEmail, tableNumber, orderType, items[], tax, discount, paymentStatus, paymentMethod, orderStatus, notes
 */
router.put("/restaurant/order/:id", protect, orderController.updateOrder);

/**
 * @route   DELETE /api/restaurant/order/:id
 * @desc    Delete order (soft delete)
 * @access  Private
 */
router.delete("/restaurant/order/:id", protect, orderController.deleteOrder);

/**
 * @route   GET /api/restaurant/order/statistics
 * @desc    Get order statistics
 * @access  Private
 * @query   invoiceNo, startDate, endDate
 */
router.get("/restaurant/order/statistics", protect, orderController.getOrderStatistics);

/**
 * @route   GET /api/restaurant/booking/:invoiceNo
 * @desc    Get booking information by invoice number
 * @access  Private
 */
router.get("/restaurant/booking/:invoiceNo", protect, orderController.getBookingByInvoiceNo);

module.exports = router;
