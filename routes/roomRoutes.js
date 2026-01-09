const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const RoomController = require("../controllers/roomController");

// @desc Create a new slider
// @route POST /api/sliders
router.post("/hotelRoom", protect, RoomController.createRoom);

// @desc Get all sliders
// @route GET /api/sliders
router.get("/hotelRoom", RoomController.getRoom);

// @desc Update a slider
// @route PUT /api/sliders/:id
router.put("/hotelRoom/:id", protect, RoomController.updateRoom);

// @desc Delete a slider
// @route DELETE /api/sliders/:id
router.delete("/hotelRoom/:id", protect, RoomController.deleteRoom);

module.exports = router;
