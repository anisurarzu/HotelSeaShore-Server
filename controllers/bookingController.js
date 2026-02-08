const Booking = require("../models/Booking");
const Hotel = require("../models/Hotel");

// Helper function to check for overlapping bookings
// Two date ranges overlap if: startA < endB && startB < endA
const checkBookingOverlap = async (hotelID, roomNumberID, roomCategoryID, checkInDate, checkOutDate, excludeBookingId = null) => {
  try {
    const newCheckIn = new Date(checkInDate);
    const newCheckOut = new Date(checkOutDate);

    // Build filter for same hotel, room, and category
    const filter = {
      hotelID: hotelID,
      roomNumberID: roomNumberID,
      roomCategoryID: roomCategoryID,
      statusID: { $ne: 255 }, // Exclude cancelled bookings
      // Check for date overlap: existing.checkInDate < newCheckOut AND newCheckIn < existing.checkOutDate
      checkInDate: { $lt: newCheckOut },
      checkOutDate: { $gt: newCheckIn },
    };

    // Exclude current booking if updating
    if (excludeBookingId) {
      filter._id = { $ne: excludeBookingId };
    }

    const overlappingBooking = await Booking.findOne(filter);

    return overlappingBooking;
  } catch (error) {
    console.error("Error checking booking overlap:", error);
    throw error;
  }
};

// Helper function to generate a serial number for today's bookings
const generateSerialNo = async () => {
  try {
    // Find the last booking by insertion order (using `_id` in descending order)
    const lastBooking = await Booking.findOne().sort({ _id: -1 });

    // Increment serial number based on the last serialNo, or start at 1 if no previous booking exists
    const newSerialNo = lastBooking ? lastBooking.serialNo + 1 : 1;

    return newSerialNo;
  } catch (error) {
    console.error("Error generating serial number:", error);
    throw new Error("Could not generate serial number");
  }
};

const generateBookingNo = async () => {
  const currentDate = new Date();

  // Get current year, month, and day
  const year = currentDate.getFullYear().toString().slice(-2); // Last two digits of the year
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0"); // Month, zero-padded
  const day = currentDate.getDate().toString().padStart(2, "0"); // Day, zero-padded

  // Generate the prefix for the booking number
  const datePrefix = `${year}${month}${day}`;

  // Fetch all booking numbers that match the current date prefix
  const bookings = await Booking.find(
    { bookingNo: { $regex: `^${datePrefix}` } }, // Match bookings with the same date prefix
    { bookingNo: 1 }
  );

  // Determine the maximum serial number for today's bookings
  let maxSerialNo = 0;
  bookings.forEach((booking) => {
    if (booking.bookingNo) {
      // Extract the serial number from the bookingNo
      const serialNo = parseInt(booking.bookingNo.slice(-2), 10); // Last 2 digits for serial
      if (serialNo > maxSerialNo) {
        maxSerialNo = serialNo;
      }
    }
  });

  // Increment the maximum serial number to generate the new booking number
  const newSerialNo = (maxSerialNo + 1).toString().padStart(2, "0"); // Zero-padded
  const newBookingNo = `${datePrefix}${newSerialNo}`;

  return newBookingNo;
};

// @desc Create a new booking
// @route POST /api/bookings
const createBooking = async (req, res) => {
  const bookingData = req.body;

  try {
    // Validate required fields for overlap check
    if (!bookingData.hotelID || !bookingData.roomNumberID || !bookingData.roomCategoryID) {
      return res.status(400).json({
        error: "hotelID, roomNumberID, and roomCategoryID are required to check for conflicts",
      });
    }

    if (!bookingData.checkInDate || !bookingData.checkOutDate) {
      return res.status(400).json({
        error: "checkInDate and checkOutDate are required",
      });
    }

    // Check for overlapping bookings
    const overlappingBooking = await checkBookingOverlap(
      bookingData.hotelID,
      bookingData.roomNumberID,
      bookingData.roomCategoryID,
      bookingData.checkInDate,
      bookingData.checkOutDate
    );

    if (overlappingBooking) {
      return res.status(409).json({
        error: "Room is already booked for the selected dates",
        details: {
          existingBooking: {
            bookingNo: overlappingBooking.bookingNo,
            checkInDate: overlappingBooking.checkInDate,
            checkOutDate: overlappingBooking.checkOutDate,
            guestName: overlappingBooking.fullName,
          },
          requestedDates: {
            checkInDate: bookingData.checkInDate,
            checkOutDate: bookingData.checkOutDate,
          },
        },
      });
    }

    let bookingNo;
    const serialNo = await generateSerialNo();

    // Check if the reference exists (i.e., the booking is associated with an existing bookingNo)
    if (bookingData.reference) {
      const referenceBooking = await Booking.findOne({
        bookingNo: bookingData.reference,
      });

      if (referenceBooking) {
        // Use the existing bookingNo from the reference
        bookingNo = referenceBooking.bookingNo;
      } else {
        // If the reference bookingNo does not exist, generate a new booking number
        bookingNo = await generateBookingNo();
      }
    } else {
      // Generate a new booking number if no reference is provided
      bookingNo = await generateBookingNo();
    }

    // Create the new booking with either the referenced or new bookingNo
    const booking = await Booking.create({
      ...bookingData,
      bookingNo,
      serialNo,
    });

    res.status(200).json({ message: "Booking created successfully", booking });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// @desc Update an existing booking
// @route PUT /api/bookings/:id
const updateBooking = async (req, res) => {
  const { id } = req.params;
  const bookingData = req.body;

  try {
    // Get existing booking to check if dates or room are being changed
    const existingBooking = await Booking.findById(id);
    if (!existingBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Check if dates or room details are being updated
    const datesChanged =
      bookingData.checkInDate || bookingData.checkOutDate;
    const roomChanged =
      bookingData.hotelID ||
      bookingData.roomNumberID ||
      bookingData.roomCategoryID;

    // If dates or room are being changed, check for overlaps
    if (datesChanged || roomChanged) {
      const hotelID = bookingData.hotelID || existingBooking.hotelID;
      const roomNumberID =
        bookingData.roomNumberID || existingBooking.roomNumberID;
      const roomCategoryID =
        bookingData.roomCategoryID || existingBooking.roomCategoryID;
      const checkInDate =
        bookingData.checkInDate || existingBooking.checkInDate;
      const checkOutDate =
        bookingData.checkOutDate || existingBooking.checkOutDate;

      // Validate dates
      if (!checkInDate || !checkOutDate) {
        return res.status(400).json({
          error: "checkInDate and checkOutDate are required",
        });
      }

      // Check for overlapping bookings (excluding current booking)
      const overlappingBooking = await checkBookingOverlap(
        hotelID,
        roomNumberID,
        roomCategoryID,
        checkInDate,
        checkOutDate,
        id // Exclude current booking
      );

      if (overlappingBooking) {
        return res.status(409).json({
          error: "Room is already booked for the selected dates",
          details: {
            existingBooking: {
              bookingNo: overlappingBooking.bookingNo,
              checkInDate: overlappingBooking.checkInDate,
              checkOutDate: overlappingBooking.checkOutDate,
              guestName: overlappingBooking.fullName,
            },
            requestedDates: {
              checkInDate: checkInDate,
              checkOutDate: checkOutDate,
            },
          },
        });
      }
    }

    // Update the booking
    const booking = await Booking.findByIdAndUpdate(id, bookingData, {
      new: true,
      runValidators: true,
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.status(200).json({ message: "Booking updated successfully", booking });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// @desc Get all bookings
// @route GET /api/bookings
const getBookings = async (req, res) => {
  try {
    // Fetch bookings excluding cancelled ones and filter out null/invalid entries
    const bookings = await Booking.find({ 
      statusID: { $ne: 255 },
      fullName: { $exists: true, $ne: null, $ne: "" },
      bookingNo: { $exists: true, $ne: null, $ne: "" }
    })
    .sort({ createdAt: -1 })
    .lean();

    // Filter out any remaining invalid bookings
    const validBookings = bookings.filter(booking => 
      booking && 
      booking._id && 
      booking.fullName && 
      booking.bookingNo
    );

    // Respond with valid bookings array
    res.status(200).json(validBookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// @desc Get bookings by hotelID
// @route GET /api/bookings/hotel/:hotelID
// @desc Get bookings by hotelID (string version)
// @route GET /api/bookings/hotel/:hotelID
// @desc Get bookings by hotelID
// @route GET /api/bookings/hotel/:hotelID
const getBookingsByHotelId = async (req, res) => {
  const { hotelID } = req.body; // Extract hotelID from the body instead of params

  try {
    // Convert hotelID from string to number, since hotelID is a number in your schema
    const numericHotelID = Number(hotelID);

    // Check if the conversion was successful (not NaN)
    if (isNaN(numericHotelID)) {
      return res
        .status(400)
        .json({ error: "Invalid hotelID. Must be a number." });
    }

    // Find all bookings associated with the given hotelID, exclude cancelled, and filter invalid
    const bookings = await Booking.find({ 
      hotelID: numericHotelID,
      statusID: { $ne: 255 },
      fullName: { $exists: true, $ne: null, $ne: "" },
      bookingNo: { $exists: true, $ne: null, $ne: "" }
    })
    .sort({ createdAt: -1 })
    .lean();

    // Filter out any remaining invalid bookings
    const validBookings = bookings.filter(booking => 
      booking && 
      booking._id && 
      booking.fullName && 
      booking.bookingNo
    );

    if (validBookings.length === 0) {
      return res
        .status(404)
        .json({ error: "No bookings found for this hotel ID" });
    }

    res.status(200).json(validBookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Get multiple bookings by bookingNo
const getBookingsByBookingNo = async (req, res) => {
  const { bookingNo } = req.params;

  try {
    // Find all bookings that have the same bookingNo
    const bookings = await Booking.find({ bookingNo: bookingNo }).lean();

    if (bookings.length === 0) {
      return res
        .status(404)
        .json({ error: "No bookings found for this booking number" });
    }

    // Get unique hotel IDs from bookings
    const hotelIDs = [...new Set(bookings.map(booking => booking.hotelID).filter(Boolean))];

    // Fetch hotels data
    const hotels = await Hotel.find({ hotelID: { $in: hotelIDs } })
      .select("hotelID images hotelName")
      .lean();

    // Create a map of hotelID to hotel data for quick lookup
    const hotelMap = {};
    hotels.forEach(hotel => {
      hotelMap[hotel.hotelID] = {
        hotelName: hotel.hotelName,
        hotelLogo: hotel.images && hotel.images.length > 0 ? hotel.images[0] : null, // First image as logo
        hotelImages: hotel.images || []
      };
    });

    // Add hotel logo to each booking
    const bookingsWithHotelLogo = bookings.map(booking => {
      const hotelData = hotelMap[booking.hotelID] || {};
      return {
        ...booking,
        hotelLogo: hotelData.hotelLogo || null,
        hotelImages: hotelData.hotelImages || []
      };
    });

    res.status(200).json(bookingsWithHotelLogo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Get a single booking
// @route GET /api/bookings/:id
const getBookingById = async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* -------------- soft delete----- */

const updateStatusID = async (req, res) => {
  const { id } = req.params;
  const { canceledBy, reason } = req.body; // Get both canceledBy and reason from the request body

  try {
    // Use runValidators to enforce schema validation on updates
    const booking = await Booking.findByIdAndUpdate(
      id,
      {
        statusID: 255,
        canceledBy, // Update the canceledBy field
        reason, // Update the reason field as well
      },
      { new: true, runValidators: true }
    );

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    res.status(200).json({
      message: "Booking status updated to 255, canceledBy and reason updated.",
      updatedBooking: booking, // Optionally include the updated booking object for debugging
    });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
};

// @desc Delete a booking
// @route DELETE /api/bookings/:id
const deleteBooking = async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await Booking.findByIdAndDelete(id);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Get booking statistics for dashboard
// @route GET /api/bookings/stats
const getBookingStats = async (req, res) => {
  try {
    const { hotelID, startDate, endDate, statusID } = req.query;

    // Build filter - exclude cancelled bookings by default
    const filter = { statusID: { $ne: 255 } };

    // Filter by hotelID if provided
    if (hotelID) {
      filter.hotelID = parseInt(hotelID);
    }

    // Filter by statusID if provided
    if (statusID !== undefined) {
      filter.statusID = parseInt(statusID);
    }

    // Filter by date range if provided
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Get all bookings matching the filter
    const bookings = await Booking.find(filter).lean();

    // Calculate statistics
    const stats = {
      totalBookings: bookings.length,
      totalRevenue: 0,
      totalAdvancePayment: 0,
      totalDuePayment: 0,
      averageBill: 0,
      todayBookings: 0,
      todayRevenue: 0,
      statusBreakdown: {},
    };

    // Calculate today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Process each booking
    bookings.forEach((booking) => {
      // Total revenue
      stats.totalRevenue += booking.totalBill || 0;
      stats.totalAdvancePayment += booking.advancePayment || 0;
      stats.totalDuePayment += booking.duePayment || 0;

      // Today's bookings and revenue
      const bookingDate = new Date(booking.createdAt);
      if (bookingDate >= today && bookingDate < tomorrow) {
        stats.todayBookings += 1;
        stats.todayRevenue += booking.totalBill || 0;
      }

      // Status breakdown
      const status = booking.statusID || 1;
      stats.statusBreakdown[status] = (stats.statusBreakdown[status] || 0) + 1;
    });

    // Calculate average bill
    if (bookings.length > 0) {
      stats.averageBill = stats.totalRevenue / bookings.length;
    }

    // Round to 2 decimal places
    stats.totalRevenue = Math.round(stats.totalRevenue * 100) / 100;
    stats.totalAdvancePayment = Math.round(stats.totalAdvancePayment * 100) / 100;
    stats.totalDuePayment = Math.round(stats.totalDuePayment * 100) / 100;
    stats.averageBill = Math.round(stats.averageBill * 100) / 100;
    stats.todayRevenue = Math.round(stats.todayRevenue * 100) / 100;

    res.status(200).json(stats);
  } catch (error) {
    console.error("Get booking stats error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createBooking,
  updateBooking,
  getBookings,
  getBookingsByHotelId,
  getBookingById,
  deleteBooking,
  getBookingsByBookingNo,
  updateStatusID,
  getBookingStats,
};