const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const BookingController = require("../controllers/bookingController");

// @desc Create a new booking
// @route POST /api/bookings
router.post("/booking", protect, BookingController.createBooking);

// @desc Get all bookings
// @route GET /api/bookings
router.get("/bookings", protect, BookingController.getBookings);

// @desc Get a single booking by ID
// @route GET /api/bookings/:id
router.get("/booking/:id", protect, BookingController.getBookingById);

// @route GET /api/bookings/bookingNo/:bookingNo
router.get(
  "/bookings/bookingNo/:bookingNo",
  protect,
  BookingController.getBookingsByBookingNo
);
// get booking by hotelID

router.post(
  "/getBookingByHotelID",
  protect,
  BookingController.getBookingsByHotelId
);

// @desc Update an existing booking
// @route PUT /api/bookings/:id
router.put("/booking/:id", protect, BookingController.updateBooking);
// @route PUT /api/bookings/:id
router.put("/booking/soft/:id", protect, BookingController.updateStatusID);

// @desc Delete a booking

// @route DELETE /api/bookings/:id
router.delete("/booking/:id", protect, BookingController.deleteBooking);

module.exports = router;