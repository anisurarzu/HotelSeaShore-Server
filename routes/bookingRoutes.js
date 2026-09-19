const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const BookingController = require("../controllers/bookingController");

// @desc Create a new booking
// @route POST /api/bookings
router.post("/booking", protect, BookingController.createBooking);

// @desc Compact dashboard metrics (must be before /bookings/:id-style routes)
// @route GET /api/bookings/dashboard?hotelID=
router.get("/bookings/dashboard", protect, BookingController.getDashboardSummary);

// @desc Count bookings for filters (no document dump)
// @route GET /api/bookings/count
router.get("/bookings/count", protect, BookingController.getBookingsCount);

// @desc Get bookings (requires startDate+endDate OR page/limit — no full dumps)
// @route GET /api/bookings
router.get("/bookings", protect, BookingController.getBookings);

// @desc Get booking stats (legacy)
// @route GET /api/bookings/stats
router.get("/bookings/stats", protect, BookingController.getBookingStats);

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
// @route PUT /api/booking/soft/:id – cancel booking (statusID = 4)
router.put("/booking/soft/:id", protect, BookingController.updateStatusID);

// @desc Cancel booking (statusID = 4, still visible as Cancelled)
// @route DELETE /api/booking/soft/:id
router.delete("/booking/soft/:id", protect, BookingController.softDeleteBooking);

// @desc Soft-hide booking (statusID = 255, hidden from UI, kept in DB)
// @route DELETE /api/booking/:id
router.delete("/booking/:id", protect, BookingController.deleteBooking);

module.exports = router;