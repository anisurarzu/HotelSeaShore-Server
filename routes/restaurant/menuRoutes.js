const express = require("express");
const router = express.Router();
const { protect } = require("../../middleware/authMiddleware");
const menuController = require("../../controllers/restaurant/menuController");

/**
 * @route   POST /api/restaurant/menu
 * @desc    Add a new menu item
 * @access  Private
 * @body    itemName, categoryID, price, availability, description, image (string URL)
 */
router.post(
  "/restaurant/menu",
  protect,
  menuController.addMenuItem
);

/**
 * @route   GET /api/restaurant/menu
 * @desc    Get all menu items
 * @access  Private
 * @query   categoryID, availability, statusID
 */
router.get("/restaurant/menu", protect, menuController.getMenuItems);

/**
 * @route   GET /api/restaurant/menu/item/:id
 * @desc    Get menu item by ID
 * @access  Private
 */
router.get("/restaurant/menu/item/:id", protect, menuController.getMenuItemById);

/**
 * @route   PUT /api/restaurant/menu/:id
 * @desc    Update menu item
 * @access  Private
 * @body    itemName, categoryID, price, availability, description, image (string URL)
 */
router.put(
  "/restaurant/menu/:id",
  protect,
  menuController.updateMenuItem
);

/**
 * @route   DELETE /api/restaurant/menu/:id
 * @desc    Delete menu item (soft delete)
 * @access  Private
 */
router.delete("/restaurant/menu/:id", protect, menuController.deleteMenuItem);

/**
 * @route   GET /api/restaurant/menu/categories
 * @desc    Get all menu category IDs
 * @access  Private
 */
router.get("/restaurant/menu/categories", protect, menuController.getMenuCategories);

module.exports = router;
