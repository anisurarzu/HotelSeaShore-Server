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

// @desc Get bookings by check-in date
// @route GET /api/bookings/checkIn?checkInDate=YYYY-MM-DD
router.get("/bookings/checkIn", protect, BookingController.getBookingsByCheckInDate);

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
// @route DELETE /api/bookings/booking/:id/payments/:paymentId
router.delete(
  "/bookings/booking/:id/payments/:paymentId",
  protect,
  BookingController.clearBookingPayments
);
// @route DELETE /api/booking/:id/payments/:paymentId (alias)
router.delete(
  "/booking/:id/payments/:paymentId",
  protect,
  BookingController.clearBookingPayments
);
// @route PUT /api/booking/soft/:id – set statusID = 255 (body: canceledBy, reason)
router.put("/booking/soft/:id", protect, BookingController.updateStatusID);

// @desc Soft delete booking (set statusID = 255)
// @route DELETE /api/booking/soft/:id
router.delete("/booking/soft/:id", protect, BookingController.softDeleteBooking);

// @desc Hard delete booking (remove from database)
// @route DELETE /api/booking/:id
router.delete("/booking/:id", protect, BookingController.deleteBooking);

module.exports = router;