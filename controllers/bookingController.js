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

const PAYMENT_METHODS = ["CASH", "BKASH", "NAGAD", "BANK", "CARD", "OTHER"];

// Normalize date to UTC date-only (00:00:00.000Z) to avoid timezone day-shift
function toUTCDateOnly(dateInput) {
  if (dateInput == null) return null;
  const str = typeof dateInput === "string" ? dateInput.trim() : null;
  // Handle "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm..." reliably
  if (str && /^\d{4}-\d{2}-\d{2}(T|$)/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function normalizePayments(payments, defaultCreatedAt) {
  if (!Array.isArray(payments)) return [];
  const fallback = toUTCDateOnly(defaultCreatedAt) || new Date();
  return payments.map((item) => ({
    paymentMethod: PAYMENT_METHODS.includes(item.paymentMethod) ? item.paymentMethod : "CASH",
    amount: typeof item.amount === "number" ? item.amount : Number(item.amount) || 0,
    transactionId: item.transactionId != null ? String(item.transactionId).trim() : "",
    // IMPORTANT: normalize to UTC date-only to avoid day shifting (e.g. 12 -> 11)
    createdAt: toUTCDateOnly(item.createdAt) || fallback,
  }));
}

// dailyAmounts / invoiceDetails theke CASH payment entries; per date ses value (last wins)
// createdAtOverride dile, sob entries er createdAt oi date hobe (e.g. checkInDate)
function dailyAmountsToPayments(items, createdAtOverride) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const byDate = new Map();
  const now = new Date();
  const createdAt = toUTCDateOnly(createdAtOverride);
  items.forEach((item) => {
    const date = toUTCDateOnly(item.date) || now;
    const dateKey = new Date(date).toISOString().slice(0, 10);
    const amount = typeof item.dailyAmount === "number" ? item.dailyAmount : Number(item.dailyAmount) || 0;
    byDate.set(dateKey, { date, amount });
  });
  return Array.from(byDate.values()).map(({ date, amount }) => ({
    paymentMethod: "CASH",
    amount,
    transactionId: "",
    createdAt: createdAt || date,
  }));
}

// Each (date, paymentMethod) e ekta single entry – last value thakbe (CASH daily + normal CASH + other methods same)
function collapsePaymentsByDateAndMethod(payments) {
  if (!Array.isArray(payments) || payments.length === 0) return [];
  const byKey = new Map();
  payments.forEach((p) => {
    const dateStr = p.createdAt ? new Date(p.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const method = PAYMENT_METHODS.includes(p.paymentMethod) ? p.paymentMethod : "CASH";
    const key = `${dateStr}:${method}`;
    byKey.set(key, { ...p, paymentMethod: method });
  });
  return Array.from(byKey.values()).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

// payments array theke date-wise totalPaid array banabo: [{ date, totalPaid }]
function buildPaidAmountsByDate(payments) {
  if (!Array.isArray(payments) || payments.length === 0) return [];
  const totalsByDate = new Map();
  const now = new Date();
  payments.forEach((p) => {
    const dt = p.createdAt ? new Date(p.createdAt) : now;
    const dateKey = dt.toISOString().slice(0, 10); // YYYY-MM-DD
    const amount = typeof p.amount === "number" ? p.amount : Number(p.amount) || 0;
    totalsByDate.set(dateKey, (totalsByDate.get(dateKey) || 0) + amount);
  });
  return Array.from(totalsByDate.entries())
    .map(([dateStr, totalPaid]) => ({
      date: new Date(`${dateStr}T00:00:00.000Z`),
      totalPaid,
    }))
    .sort((a, b) => a.date - b.date);
}

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

    // All payments (initial theke) payments array er vetorei thakbe
    if (Array.isArray(bookingData.payments) && bookingData.payments.length > 0) {
      bookingData.payments = normalizePayments(bookingData.payments, bookingData.checkInDate);
    } else if (bookingData.advancePayment != null || bookingData.paymentMethod || bookingData.transactionId) {
      bookingData.payments = normalizePayments(
        [
        {
          paymentMethod: bookingData.paymentMethod || "CASH",
          amount: Number(bookingData.advancePayment) || 0,
          transactionId: bookingData.transactionId || "",
        },
        ],
        bookingData.checkInDate
      );
    } else {
      bookingData.payments = [];
    }

    // dailyAmounts / invoiceDetails (CASH) + normal payments – sob eki array te; per (date, method) ses value thakbe
    // invoice theke jodi paid insert/update hoy, oi paid date = checkInDate
    const dailyPayments = dailyAmountsToPayments(
      bookingData.invoiceDetails || bookingData.dailyAmounts,
      bookingData.checkInDate
    );
    if (dailyPayments.length > 0) {
      bookingData.payments = [...bookingData.payments, ...dailyPayments];
    }
    bookingData.payments = collapsePaymentsByDateAndMethod(bookingData.payments);

    if (bookingData.paymentMethod !== undefined) {
      const pm = String(bookingData.paymentMethod).trim();
      bookingData.paymentMethod = PAYMENT_METHODS.includes(pm) ? pm : "";
    }

    // Date-wise total paid, based on payments[]
    bookingData.paidAmountsByDate = buildPaidAmountsByDate(bookingData.payments);

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
  const bookingData = { ...req.body };

  if (Array.isArray(req.body.invoiceDetails)) {
    bookingData.invoiceDetails = req.body.invoiceDetails.map((item) => ({
      date: item.date ? new Date(item.date) : item.date,
      dailyAmount: typeof item.dailyAmount === "number" ? item.dailyAmount : Number(item.dailyAmount) || 0,
    }));
  }
  // payments: (1) body theke explicit entries (2) invoiceDetails = daily amount – per date ses value thakbe, ager vad
  const hasInvoiceDetails = Array.isArray(bookingData.invoiceDetails) && bookingData.invoiceDetails.length > 0;
  // Note: fromDaily checkInDate override will be finalized after we load existingBooking
  const fromDaily = hasInvoiceDetails ? dailyAmountsToPayments(bookingData.invoiceDetails, bookingData.checkInDate) : [];
  // fromBody will be normalized after we load existingBooking (to get fallback checkInDate)
  const rawBodyPayments = Array.isArray(req.body.payments) ? req.body.payments : null;
  if ((rawBodyPayments && rawBodyPayments.length > 0) || fromDaily.length > 0) delete bookingData.payments;

  // Top-level paymentMethod optional; payments array is the source of truth
  if (bookingData.paymentMethod !== undefined) {
    const pm = String(bookingData.paymentMethod).trim();
    bookingData.paymentMethod = PAYMENT_METHODS.includes(pm) ? pm : "";
  }

  try {
    const existingBooking = await Booking.findById(id);
    if (!existingBooking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const fromBody =
      rawBodyPayments && rawBodyPayments.length > 0
        ? normalizePayments(rawBodyPayments, bookingData.checkInDate || existingBooking.checkInDate)
        : [];
    const effectiveFromDaily = hasInvoiceDetails
      ? dailyAmountsToPayments(bookingData.invoiceDetails, bookingData.checkInDate || existingBooking.checkInDate)
      : [];

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

    const keysToUpdate = Object.keys(bookingData);
    for (const key of keysToUpdate) {
      if (bookingData[key] !== undefined && key in existingBooking.schema.paths) {
        existingBooking[key] = bookingData[key];
      }
    }
    // payments: existing + fromDaily + fromBody merge kore, then per (date, paymentMethod) ekta single entry – last value
    if (fromBody.length > 0 || effectiveFromDaily.length > 0) {
      let existing = Array.isArray(existingBooking.payments) ? existingBooking.payments : [];
      const datesInInvoice = new Set(
        (bookingData.invoiceDetails || []).map((item) => (item.date ? new Date(item.date).toISOString().slice(0, 10) : ""))
      );
      if (effectiveFromDaily.length > 0 && datesInInvoice.size > 0) {
        existing = existing.filter((p) => {
          if (p.paymentMethod === "CASH" && p.createdAt) {
            const d = new Date(p.createdAt).toISOString().slice(0, 10);
            return !datesInInvoice.has(d);
          }
          return true;
        });
      }
      const merged = [...existing, ...effectiveFromDaily, ...fromBody];
      existingBooking.payments = collapsePaymentsByDateAndMethod(merged);
    }

    // Update date-wise total paid array from final payments[]
    existingBooking.paidAmountsByDate = buildPaidAmountsByDate(existingBooking.payments);
    const booking = await existingBooking.save();

    res.status(200).json({ message: "Booking updated successfully", booking });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(", ") });
    }
    res.status(400).json({ error: error.message });
  }
};

// @desc Remove a specific payment by payment _id from a booking
// @route DELETE /api/bookings/booking/:id/payments/:paymentId
const clearBookingPayments = async (req, res) => {
  const { id, paymentId } = req.params;
  try {
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    if (!paymentId) {
      return res.status(400).json({ error: "paymentId is required" });
    }

    const previousLength = Array.isArray(booking.payments) ? booking.payments.length : 0;
    booking.payments = (booking.payments || []).filter(
      (p) => String(p._id) !== String(paymentId)
    );

    if (booking.payments.length === previousLength) {
      return res.status(404).json({ error: "Payment not found in this booking" });
    }

    booking.paidAmountsByDate = buildPaidAmountsByDate(booking.payments);
    booking.totalPaid = (booking.payments || []).reduce(
      (sum, p) => sum + (typeof p.amount === "number" ? p.amount : Number(p.amount) || 0),
      0
    );

    await booking.save();
    return res.status(200).json({
      message: "Booking payment removed successfully",
      booking,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

const LIGHT_BOOKING_FIELDS =
  "_id fullName bookingNo phone hotelID hotelName roomCategoryID roomCategoryName roomNumberID roomNumberName roomPrice checkInDate checkOutDate nights totalBill advancePayment duePayment totalPaid statusID bookedBy bookedByID paymentMethod payments paidAmountsByDate createdAt updatedAt";

const BOOKINGS_HARD_MAX_LIMIT = 500;
const BOOKINGS_DEFAULT_LIMIT = 200;
const BOOKINGS_DATE_SCOPED_DEFAULT_LIMIT = 500;

function parseDhakaYmd(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return { y: get("year"), m: get("month"), d: get("day") };
}

function utcDateOnly(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function shiftYmd({ y, m, d }, days) {
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  };
}

function endOfUtcDay(date) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function buildValidBookingMatch(extra = {}) {
  return {
    fullName: { $exists: true, $ne: null, $ne: "" },
    bookingNo: { $exists: true, $ne: null, $ne: "" },
    ...extra,
  };
}

function roomKeyFromBooking(booking) {
  if (!booking) return null;
  const candidates = [
    booking.roomNumberID,
    booking.roomNumberId,
    booking.roomID,
    booking.roomId,
    booking.roomNumberName,
    booking.roomNumber,
  ];
  for (const c of candidates) {
    if (c === undefined || c === null) continue;
    const s = String(c).trim();
    if (s !== "") return s;
  }
  return null;
}

function parseYmdQuery(raw) {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [yy, mm, dd] = raw.slice(0, 10).split("-").map(Number);
    return utcDateOnly(yy, mm, dd);
  }
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return utcDateOnly(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Shared list filter builder for GET /bookings and GET /bookings/count.
 * Returns { filter, error, hasDateRange, mode }.
 */
function buildBookingsListFilter(query = {}) {
  const {
    hotelID,
    startDate,
    endDate,
    mode = "checkIn",
    excludeCancelled,
    bookedByID,
    statusID,
    minDue,
  } = query;

  const filter = buildValidBookingMatch();
  const hasDateRange =
    (startDate != null && String(startDate).trim() !== "") ||
    (endDate != null && String(endDate).trim() !== "");

  if (hotelID != null && String(hotelID).trim() !== "") {
    const numericHotelID = Number(hotelID);
    if (Number.isNaN(numericHotelID)) {
      return { error: { status: 400, body: { error: "Invalid hotelID. Must be a number." } } };
    }
    filter.hotelID = numericHotelID;
  }

  // Default: exclude cancelled unless explicitly excludeCancelled=0/false
  const includeCancelled =
    excludeCancelled === "0" ||
    excludeCancelled === "false" ||
    excludeCancelled === false;
  if (!includeCancelled) {
    filter.statusID = { $ne: 255 };
  }

  if (statusID != null && String(statusID).trim() !== "") {
    filter.statusID = Number(statusID);
  }

  if (bookedByID) {
    filter.$or = [{ bookedByID: String(bookedByID) }, { bookedBy: String(bookedByID) }];
  }

  if (minDue != null && String(minDue).trim() !== "") {
    const due = Number(minDue);
    if (!Number.isNaN(due)) {
      filter.duePayment = { $gt: due };
    }
  }

  if (hasDateRange) {
    const ymdStart = parseYmdQuery(startDate);
    const ymdEndRaw = parseYmdQuery(endDate);
    if ((startDate && !ymdStart) || (endDate && !ymdEndRaw)) {
      return {
        error: {
          status: 400,
          body: { error: "Invalid startDate/endDate. Use YYYY-MM-DD." },
        },
      };
    }
    const ymdEnd = ymdEndRaw ? endOfUtcDay(ymdEndRaw) : null;

    if (mode === "overlap") {
      if (ymdEnd) filter.checkInDate = { ...(filter.checkInDate || {}), $lte: ymdEnd };
      if (ymdStart) filter.checkOutDate = { ...(filter.checkOutDate || {}), $gt: ymdStart };
    } else if (mode === "checkOut") {
      filter.checkOutDate = {};
      if (ymdStart) filter.checkOutDate.$gte = ymdStart;
      if (ymdEnd) filter.checkOutDate.$lte = ymdEnd;
    } else {
      filter.checkInDate = {};
      if (ymdStart) filter.checkInDate.$gte = ymdStart;
      if (ymdEnd) filter.checkInDate.$lte = ymdEnd;
    }
  }

  return { filter, hasDateRange, mode };
}

function resolveBookingsLimit(query = {}, { hasDateRange } = {}) {
  const raw = query.limit;
  const parsed = raw != null && String(raw).trim() !== "" ? parseInt(raw, 10) : NaN;
  const fallback = hasDateRange
    ? BOOKINGS_DATE_SCOPED_DEFAULT_LIMIT
    : BOOKINGS_DEFAULT_LIMIT;
  const requested = Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  return Math.min(BOOKINGS_HARD_MAX_LIMIT, requested);
}

// @desc Get bookings (requires date range OR pagination — no full dumps)
// @route GET /api/bookings
// Query: hotelID, startDate, endDate, mode=overlap|checkIn|checkOut,
//        excludeCancelled=1|0, fields=light|full, page, limit, bookedByID, statusID, minDue
const getBookings = async (req, res) => {
  try {
    const { fields, page, limit } = req.query;
    const built = buildBookingsListFilter(req.query);
    if (built.error) {
      return res.status(built.error.status).json(built.error.body);
    }

    const { filter, hasDateRange } = built;
    const hasPage =
      page != null && String(page).trim() !== "" && !Number.isNaN(parseInt(page, 10));
    const hasLimit =
      limit != null && String(limit).trim() !== "" && !Number.isNaN(parseInt(limit, 10));

    // Guard: bare / weakly filtered calls cannot dump full history
    if (!hasDateRange && !hasPage && !hasLimit) {
      return res.status(400).json({
        error:
          "Unbounded booking list is not allowed. Provide startDate and endDate, or page and limit.",
        hint: "/bookings?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&mode=overlap&fields=light&limit=200",
        alternatives: [
          "GET /bookings/dashboard?hotelID=...",
          "GET /bookings/count?hotelID=...&startDate=...&endDate=...",
        ],
      });
    }

    // fields=full still requires a date scope + stays paginated
    const useFull = fields === "full";
    if (useFull && !hasDateRange) {
      return res.status(400).json({
        error: "fields=full requires startDate and endDate (and is still paginated).",
        hint: "/bookings?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&fields=full&page=1&limit=100",
      });
    }

    const pageNum = hasPage ? Math.max(1, parseInt(page, 10) || 1) : 1;
    const limitNum = resolveBookingsLimit(req.query, { hasDateRange });
    const skip = (pageNum - 1) * limitNum;

    if (useFull || limitNum >= BOOKINGS_HARD_MAX_LIMIT) {
      console.warn(
        `[bookings] heavy list request fields=${useFull ? "full" : "light"} limit=${limitNum} page=${pageNum} hotelID=${req.query.hotelID || "-"} ip=${req.ip}`
      );
    }

    let query = Booking.find(filter).sort({ createdAt: -1 });
    if (!useFull) {
      query = query.select(LIGHT_BOOKING_FIELDS);
    }

    const [total, bookings] = await Promise.all([
      Booking.countDocuments(filter),
      query.skip(skip).limit(limitNum).lean(),
    ]);

    return res.status(200).json({
      data: bookings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 0,
        hasMore: skip + bookings.length < total,
      },
      meta: {
        fields: useFull ? "full" : "light",
        excludeCancelled: filter.statusID && filter.statusID.$ne === 255,
        mode: built.mode || "checkIn",
        dateScoped: hasDateRange,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Count bookings for current filters (no document dump)
// @route GET /api/bookings/count
const getBookingsCount = async (req, res) => {
  try {
    const built = buildBookingsListFilter(req.query);
    if (built.error) {
      return res.status(built.error.status).json(built.error.body);
    }
    const total = await Booking.countDocuments(built.filter);
    return res.status(200).json({
      total,
      filters: {
        hotelID: req.query.hotelID != null ? Number(req.query.hotelID) : null,
        startDate: req.query.startDate || null,
        endDate: req.query.endDate || null,
        mode: built.mode || "checkIn",
        excludeCancelled: !(
          req.query.excludeCancelled === "0" ||
          req.query.excludeCancelled === "false"
        ),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Compact dashboard metrics (no full booking dump)
// @route GET /api/bookings/dashboard?hotelID=
const getDashboardSummary = async (req, res) => {
  try {
    const hotelIDRaw = req.query.hotelID;
    const hotelID =
      hotelIDRaw != null && String(hotelIDRaw).trim() !== ""
        ? Number(hotelIDRaw)
        : null;

    const baseMatch = buildValidBookingMatch({ statusID: { $ne: 255 } });
    if (Number.isFinite(hotelID) && hotelID > 0) {
      baseMatch.hotelID = hotelID;
    }

    const todayYmd = parseDhakaYmd();
    const todayStart = utcDateOnly(todayYmd.y, todayYmd.m, todayYmd.d);
    const todayEnd = endOfUtcDay(todayStart);
    const tomorrowYmd = shiftYmd(todayYmd, 1);
    const tomorrowStart = utcDateOnly(tomorrowYmd.y, tomorrowYmd.m, tomorrowYmd.d);
    const monthStart = utcDateOnly(todayYmd.y, todayYmd.m, 1);
    // Day 0 of next month = last day of current month
    const monthEndStart = utcDateOnly(todayYmd.y, todayYmd.m + 1, 0);
    const monthEndFinal = endOfUtcDay(monthEndStart);
    const last7Ymd = shiftYmd(todayYmd, -6);
    const last30Ymd = shiftYmd(todayYmd, -29);
    const last7Start = utcDateOnly(last7Ymd.y, last7Ymd.m, last7Ymd.d);
    const last30Start = utcDateOnly(last30Ymd.y, last30Ymd.m, last30Ymd.d);

    const daysInMonth = monthEndStart.getUTCDate();

    const bookedByExpr = {
      $trim: {
        input: {
          $toString: {
            $ifNull: ["$bookedByID", { $ifNull: ["$bookedBy", "UNKNOWN"] }],
          },
        },
      },
    };

    const [
      totalsAgg,
      statusCounts,
      checkInTodayAgg,
      checkOutTodayAgg,
      checkInMonthAgg,
      last7Agg,
      last30Agg,
      userOverall,
      userToday,
      user7,
      user30,
      occupancyDocs,
      hotelDoc,
    ] = await Promise.all([
      Booking.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            totalRevenue: { $sum: { $ifNull: ["$totalBill", 0] } },
            totalAdvance: { $sum: { $ifNull: ["$advancePayment", 0] } },
            totalDue: { $sum: { $ifNull: ["$duePayment", 0] } },
            totalNights: { $sum: { $ifNull: ["$nights", 1] } },
          },
        },
      ]),
      Booking.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: null,
            active: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lte: ["$checkInDate", todayEnd] },
                      { $gte: ["$checkOutDate", todayStart] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            upcoming: {
              $sum: {
                $cond: [{ $gt: ["$checkInDate", todayEnd] }, 1, 0],
              },
            },
            completed: {
              $sum: {
                $cond: [{ $lt: ["$checkOutDate", todayStart] }, 1, 0],
              },
            },
          },
        },
      ]),
      Booking.aggregate([
        {
          $match: {
            ...baseMatch,
            checkInDate: { $gte: todayStart, $lte: todayEnd },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: { $ifNull: ["$totalBill", 0] } },
            ftbCount: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: bookedByExpr,
                      regex: "FTB",
                      options: "i",
                    },
                  },
                  1,
                  0,
                ],
              },
            },
            ftbAmount: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: bookedByExpr,
                      regex: "FTB",
                      options: "i",
                    },
                  },
                  { $ifNull: ["$totalBill", 0] },
                  0,
                ],
              },
            },
          },
        },
      ]),
      Booking.countDocuments({
        ...baseMatch,
        checkOutDate: { $gte: todayStart, $lte: todayEnd },
      }),
      Booking.aggregate([
        {
          $match: {
            ...baseMatch,
            checkInDate: { $gte: monthStart, $lte: monthEndFinal },
          },
        },
        {
          $group: {
            _id: null,
            amount: { $sum: { $ifNull: ["$totalBill", 0] } },
            count: { $sum: 1 },
          },
        },
      ]),
      Booking.aggregate([
        {
          $match: {
            ...baseMatch,
            checkInDate: { $gte: last7Start, $lte: todayEnd },
          },
        },
        {
          $group: {
            _id: null,
            amount: { $sum: { $ifNull: ["$totalBill", 0] } },
            count: { $sum: 1 },
          },
        },
      ]),
      Booking.aggregate([
        {
          $match: {
            ...baseMatch,
            checkInDate: { $gte: last30Start, $lte: todayEnd },
          },
        },
        {
          $group: {
            _id: null,
            amount: { $sum: { $ifNull: ["$totalBill", 0] } },
            count: { $sum: 1 },
            ftbCount: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: bookedByExpr,
                      regex: "FTB",
                      options: "i",
                    },
                  },
                  1,
                  0,
                ],
              },
            },
            ftbAmount: {
              $sum: {
                $cond: [
                  {
                    $regexMatch: {
                      input: bookedByExpr,
                      regex: "FTB",
                      options: "i",
                    },
                  },
                  { $ifNull: ["$totalBill", 0] },
                  0,
                ],
              },
            },
          },
        },
      ]),
      Booking.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id: bookedByExpr,
            overallAmount: { $sum: { $ifNull: ["$totalBill", 0] } },
            overallCount: { $sum: 1 },
          },
        },
        { $sort: { overallAmount: -1 } },
        { $limit: 200 },
      ]),
      Booking.aggregate([
        {
          $match: {
            ...baseMatch,
            checkInDate: { $gte: todayStart, $lte: todayEnd },
          },
        },
        {
          $group: {
            _id: bookedByExpr,
            amount: { $sum: { $ifNull: ["$totalBill", 0] } },
            count: { $sum: 1 },
          },
        },
      ]),
      Booking.aggregate([
        {
          $match: {
            ...baseMatch,
            checkInDate: { $gte: last7Start, $lte: todayEnd },
          },
        },
        {
          $group: {
            _id: bookedByExpr,
            amount: { $sum: { $ifNull: ["$totalBill", 0] } },
            count: { $sum: 1 },
          },
        },
      ]),
      Booking.aggregate([
        {
          $match: {
            ...baseMatch,
            checkInDate: { $gte: last30Start, $lte: todayEnd },
          },
        },
        {
          $group: {
            _id: bookedByExpr,
            amount: { $sum: { $ifNull: ["$totalBill", 0] } },
            count: { $sum: 1 },
          },
        },
      ]),
      // Only stays overlapping current month (+ tomorrow) — tiny vs full history
      Booking.find({
        ...baseMatch,
        checkInDate: { $lte: endOfUtcDay(tomorrowStart) },
        checkOutDate: { $gt: monthStart },
      })
        .select(
          "checkInDate checkOutDate roomNumberID roomNumberName roomNumber totalBill bookedBy bookedByID"
        )
        .lean(),
      Number.isFinite(hotelID) && hotelID > 0
        ? Hotel.findOne({ hotelID })
            .select("hotelID totalRooms roomCategories")
            .lean()
        : Promise.resolve(null),
    ]);

    const totals = totalsAgg[0] || {
      totalBookings: 0,
      totalRevenue: 0,
      totalAdvance: 0,
      totalDue: 0,
      totalNights: 0,
    };
    const status = statusCounts[0] || { active: 0, upcoming: 0, completed: 0 };
    const todayIn = checkInTodayAgg[0] || {
      count: 0,
      amount: 0,
      ftbCount: 0,
      ftbAmount: 0,
    };
    const monthIn = checkInMonthAgg[0] || { amount: 0, count: 0 };
    const weekIn = last7Agg[0] || { amount: 0, count: 0 };
    const thirtyIn = last30Agg[0] || {
      amount: 0,
      count: 0,
      ftbCount: 0,
      ftbAmount: 0,
    };

    // Occupancy (exclusive checkout): active if checkIn <= day && checkOut > day
    const todayActiveRooms = new Set();
    const todayActiveNames = new Set();
    const tomorrowActiveRooms = new Set();
    const tomorrowActiveNames = new Set();
    const monthActiveRoomsSets = Array.from({ length: daysInMonth }, () => new Set());

    for (const booking of occupancyDocs) {
      const checkIn = booking.checkInDate ? new Date(booking.checkInDate) : null;
      const checkOut = booking.checkOutDate ? new Date(booking.checkOutDate) : null;
      if (!checkIn || !checkOut || Number.isNaN(checkIn) || Number.isNaN(checkOut)) continue;

      const checkInDay = utcDateOnly(
        checkIn.getUTCFullYear(),
        checkIn.getUTCMonth() + 1,
        checkIn.getUTCDate()
      );
      const checkOutDay = utcDateOnly(
        checkOut.getUTCFullYear(),
        checkOut.getUTCMonth() + 1,
        checkOut.getUTCDate()
      );
      const rk = roomKeyFromBooking(booking);
      const rn = booking.roomNumberName || booking.roomNumber || "";

      if (checkInDay <= todayStart && checkOutDay > todayStart && rk) {
        todayActiveRooms.add(rk);
        if (rn) todayActiveNames.add(String(rn));
      }
      if (checkInDay <= tomorrowStart && checkOutDay > tomorrowStart && rk) {
        tomorrowActiveRooms.add(rk);
        if (rn) tomorrowActiveNames.add(String(rn));
      }

      if (!rk) continue;
      if (checkInDay > monthEndStart || checkOutDay <= monthStart) continue;

      const startIndex = Math.max(
        0,
        Math.floor((checkInDay - monthStart) / 86400000)
      );
      const endIndex = Math.min(
        daysInMonth - 1,
        Math.floor((checkOutDay - monthStart) / 86400000) - 1
      );
      for (let i = startIndex; i <= endIndex; i++) {
        monthActiveRoomsSets[i].add(rk);
      }
    }

    let totalRooms = Number(hotelDoc?.totalRooms) || 0;
    if (!totalRooms && hotelDoc?.roomCategories) {
      const ids = new Set();
      for (const c of hotelDoc.roomCategories) {
        const rooms = c?.roomNumbers || c?.rooms || [];
        for (const r of rooms) {
          const id = r?._id ?? r?.roomId ?? r?.id ?? r?.name ?? r?.roomNumberID;
          if (id != null && String(id).trim() !== "") ids.add(String(id));
        }
      }
      totalRooms = ids.size;
    }

    const maxRooms = totalRooms || 0;
    const todayOccupied = todayActiveRooms.size;
    const tomorrowOccupied = tomorrowActiveRooms.size;
    let sumActiveByDay = 0;
    for (const set of monthActiveRoomsSets) sumActiveByDay += set.size;
    const todayOccupancyRate =
      maxRooms > 0 ? Math.min(100, Math.round((todayOccupied / maxRooms) * 100)) : 0;
    const tomorrowOccupancyRate =
      maxRooms > 0
        ? Math.min(100, Math.round((tomorrowOccupied / maxRooms) * 100))
        : 0;
    const currentMonthOccupancyRate =
      maxRooms > 0 && daysInMonth > 0
        ? Math.min(
            100,
            Math.round((sumActiveByDay / (maxRooms * daysInMonth)) * 100)
          )
        : 0;

    const todayMap = Object.fromEntries(
      (userToday || []).map((u) => [u._id || "UNKNOWN", u])
    );
    const sevenMap = Object.fromEntries(
      (user7 || []).map((u) => [u._id || "UNKNOWN", u])
    );
    const thirtyMap = Object.fromEntries(
      (user30 || []).map((u) => [u._id || "UNKNOWN", u])
    );

    const userBreakdown = (userOverall || []).map((u) => {
      const id = u._id || "UNKNOWN";
      return {
        userId: id,
        todayAmount: todayMap[id]?.amount || 0,
        sevenAmount: sevenMap[id]?.amount || 0,
        thirtyAmount: thirtyMap[id]?.amount || 0,
        overallAmount: u.overallAmount || 0,
        overallCount: u.overallCount || 0,
      };
    });

    // Include users who only appear in recent windows
    for (const map of [todayMap, sevenMap, thirtyMap]) {
      for (const id of Object.keys(map)) {
        if (userBreakdown.some((r) => r.userId === id)) continue;
        userBreakdown.push({
          userId: id,
          todayAmount: todayMap[id]?.amount || 0,
          sevenAmount: sevenMap[id]?.amount || 0,
          thirtyAmount: thirtyMap[id]?.amount || 0,
          overallAmount: 0,
          overallCount: 0,
        });
      }
    }
    userBreakdown.sort((a, b) => b.overallAmount - a.overallAmount);

    res.status(200).json({
      timezone: "Asia/Dhaka",
      hotelID: Number.isFinite(hotelID) && hotelID > 0 ? hotelID : null,
      totalRooms: maxRooms,
      kpis: {
        todayBookingAmount: Math.round((todayIn.amount || 0) * 100) / 100,
        currentMonthBookingAmount: Math.round((monthIn.amount || 0) * 100) / 100,
        todayCheckIns: todayIn.count || 0,
        todayCheckOuts: checkOutTodayAgg || 0,
        todayOccupancyRate,
        todayOccupiedRoomsCount: todayOccupied,
        todayOccupiedRoomNames: [...todayActiveNames],
        tomorrowOccupancyRate,
        tomorrowOccupiedRoomsCount: tomorrowOccupied,
        tomorrowOccupiedRoomNames: [...tomorrowActiveNames],
        currentMonthOccupancyRate,
      },
      periodSummary: {
        todayAll: {
          amount: Math.round((todayIn.amount || 0) * 100) / 100,
          count: todayIn.count || 0,
        },
        todayFtb: {
          amount: Math.round((todayIn.ftbAmount || 0) * 100) / 100,
          count: todayIn.ftbCount || 0,
        },
        last7: {
          amount: Math.round((weekIn.amount || 0) * 100) / 100,
          count: weekIn.count || 0,
        },
        last30: {
          amount: Math.round((thirtyIn.amount || 0) * 100) / 100,
          count: thirtyIn.count || 0,
        },
        last30Ftb: {
          amount: Math.round((thirtyIn.ftbAmount || 0) * 100) / 100,
          count: thirtyIn.ftbCount || 0,
        },
      },
      totals: {
        totalBookings: totals.totalBookings || 0,
        totalRevenue: Math.round((totals.totalRevenue || 0) * 100) / 100,
        totalAdvance: Math.round((totals.totalAdvance || 0) * 100) / 100,
        totalDue: Math.round((totals.totalDue || 0) * 100) / 100,
        totalNights: totals.totalNights || 0,
        active: status.active || 0,
        upcoming: status.upcoming || 0,
        completed: status.completed || 0,
      },
      userBreakdown,
    });
  } catch (error) {
    console.error("Get dashboard summary error:", error);
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
      fullName: { $exists: true, $ne: null, $ne: "" },
      bookingNo: { $exists: true, $ne: null, $ne: "" },
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

// @desc Get bookings by check-in date
// @route GET /api/bookings/checkIn?checkInDate=YYYY-MM-DD
const getBookingsByCheckInDate = async (req, res) => {
  const { checkInDate } = req.query;

  try {
    if (!checkInDate) {
      return res.status(400).json({ error: "checkInDate query parameter is required (e.g. ?checkInDate=2025-03-01)" });
    }

    const date = new Date(checkInDate);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: "Invalid checkInDate format. Use YYYY-MM-DD." });
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      checkInDate: { $gte: startOfDay, $lte: endOfDay },
      fullName: { $exists: true, $ne: null, $ne: "" },
      bookingNo: { $exists: true, $ne: null, $ne: "" },
    })
      .sort({ checkInDate: 1, createdAt: -1 })
      .lean();

    const validBookings = bookings.filter(
      (booking) =>
        booking &&
        booking._id &&
        booking.fullName &&
        booking.bookingNo
    );

    // Include dailyAmounts (date-wise invoice details) on each booking
    const bookingsWithInvoiceDetails = validBookings.map((booking) => ({
      ...booking,
      dailyAmounts: Array.isArray(booking.dailyAmounts) ? booking.dailyAmounts : [],
    }));

    res.status(200).json(bookingsWithInvoiceDetails);
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

    // Fetch full hotel data including address and details
    const hotels = await Hotel.find({ hotelID: { $in: hotelIDs } })
      .select(
        "hotelID hotelName hotelDescription address contact location amenities images rating status totalRooms availableRooms createTime checkInTime checkOutTime termsAndConditions"
      )
      .lean();

    // Create a map of hotelID to full hotel information for quick lookup
    const hotelMap = {};
    hotels.forEach(hotel => {
      hotelMap[hotel.hotelID] = {
        hotelID: hotel.hotelID,
        hotelName: hotel.hotelName,
        hotelDescription: hotel.hotelDescription,
        address: hotel.address || {},
        contact: hotel.contact || {},
        location: hotel.location || {},
        amenities: hotel.amenities || [],
        images: hotel.images || [],
        hotelLogo: hotel.images && hotel.images.length > 0 ? hotel.images[0] : null,
        rating: hotel.rating,
        status: hotel.status,
        totalRooms: hotel.totalRooms,
        availableRooms: hotel.availableRooms,
        createTime: hotel.createTime,
        checkInTime: hotel.checkInTime || "",
        checkOutTime: hotel.checkOutTime || "",
        termsAndConditions: Array.isArray(hotel.termsAndConditions) ? hotel.termsAndConditions : [],
      };
    });

    // Add full hotelInformation (and legacy hotelLogo/hotelImages) to each booking
    const bookingsWithHotelInfo = bookings.map(booking => {
      const hotelInfo = hotelMap[booking.hotelID] || {};
      return {
        ...booking,
        hotelLogo: hotelInfo.hotelLogo || null,
        hotelImages: hotelInfo.images || [],
        hotelInformation: hotelInfo.hotelID
          ? {
              hotelID: hotelInfo.hotelID,
              hotelName: hotelInfo.hotelName,
              hotelDescription: hotelInfo.hotelDescription,
              address: hotelInfo.address,
              contact: hotelInfo.contact,
              location: hotelInfo.location,
              amenities: hotelInfo.amenities,
              images: hotelInfo.images,
              hotelLogo: hotelInfo.hotelLogo,
              rating: hotelInfo.rating,
              status: hotelInfo.status,
              totalRooms: hotelInfo.totalRooms,
              availableRooms: hotelInfo.availableRooms,
              createTime: hotelInfo.createTime,
              checkInTime: hotelInfo.checkInTime,
              checkOutTime: hotelInfo.checkOutTime,
              termsAndConditions: hotelInfo.termsAndConditions,
            }
          : null,
      };
    });

    res.status(200).json(bookingsWithHotelInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Get a single booking
// @route GET /api/bookings/:id
const getBookingById = async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await Booking.findById(id).lean();
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Attach hotel info (checkInTime, checkOutTime, termsAndConditions)
    const hotel = booking.hotelID
      ? await Hotel.findOne({ hotelID: booking.hotelID })
          .select(
            "hotelID hotelName hotelDescription address contact location amenities images rating status totalRooms availableRooms createTime checkInTime checkOutTime termsAndConditions"
          )
          .lean()
      : null;

    const hotelLogo = hotel?.images && hotel.images.length > 0 ? hotel.images[0] : null;
    const hotelInformation = hotel?.hotelID
      ? {
          hotelID: hotel.hotelID,
          hotelName: hotel.hotelName,
          hotelDescription: hotel.hotelDescription,
          address: hotel.address || {},
          contact: hotel.contact || {},
          location: hotel.location || {},
          amenities: hotel.amenities || [],
          images: hotel.images || [],
          hotelLogo,
          rating: hotel.rating,
          status: hotel.status,
          totalRooms: hotel.totalRooms,
          availableRooms: hotel.availableRooms,
          createTime: hotel.createTime,
          checkInTime: hotel.checkInTime || "",
          checkOutTime: hotel.checkOutTime || "",
          termsAndConditions: Array.isArray(hotel.termsAndConditions) ? hotel.termsAndConditions : [],
        }
      : null;

    return res.status(200).json({
      ...booking,
      hotelLogo,
      hotelImages: hotel?.images || [],
      hotelInformation,
      // alias (frontend naming mismatch)
      hotelInformations: hotelInformation,
    });
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

// @desc Soft delete a booking (set statusID = 255)
// @route DELETE /api/booking/soft/:id
const softDeleteBooking = async (req, res) => {
  const { id } = req.params;
  const { canceledBy, reason } = req.body || {};

  try {
    const booking = await Booking.findByIdAndUpdate(
      id,
      { statusID: 255, ...(canceledBy != null && { canceledBy }), ...(reason != null && { reason }) },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }
    res.status(200).json({ message: "Booking deleted successfully", booking });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Delete a booking – HARD DELETE (permanently remove from database)
// @route DELETE /api/booking/:id
const deleteBooking = async (req, res) => {
  const { id } = req.params;

  try {
    const booking = await Booking.findByIdAndDelete(id); // Hard delete – document removed from DB
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
  getBookingsCount,
  getDashboardSummary,
  getBookingsByHotelId,
  getBookingsByCheckInDate,
  getBookingById,
  deleteBooking,
  getBookingsByBookingNo,
  updateStatusID,
  softDeleteBooking,
  getBookingStats,
  clearBookingPayments,
};