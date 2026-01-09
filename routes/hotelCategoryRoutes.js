const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const HotelCategoryController = require("../controllers/hotelCategoryController");

// @desc Create a new slider
// @route POST /api/sliders
router.post(
  "/hotelCategory",
  protect,
  HotelCategoryController.createHotelCategory
);

// @desc Get all sliders
// @route GET /api/sliders
router.get("/hotelCategory", HotelCategoryController.getHotelCategory);

// @desc Update a slider
// @route PUT /api/sliders/:id
router.put(
  "/hotelCategory/:id",
  protect,
  HotelCategoryController.updateHotelCategory
);

// @desc Delete a slider
// @route DELETE /api/sliders/:id
router.delete(
  "/hotelCategory/:id",
  protect,
  HotelCategoryController.deleteHotelCategory
);

module.exports = router;
