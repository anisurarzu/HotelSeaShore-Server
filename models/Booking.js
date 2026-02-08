const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    nidPassport: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    hotelName: {
      type: String,
      required: [true, "Hotel name is required"],
      trim: true,
    },
    hotelID: {
      type: Number,
      required: [true, "Hotel ID is required"],
    },
    roomCategoryID: {
      type: String,
      required: [true, "Room category ID is required"],
    },
    roomCategoryName: {
      type: String,
      required: [true, "Room category name is required"],
      trim: true,
    },
    roomNumberID: {
      type: String,
      required: [true, "Room number ID is required"],
    },
    roomNumberName: {
      type: String,
      required: [true, "Room number name is required"],
      trim: true,
    },
    roomPrice: {
      type: Number,
      required: [true, "Room price is required"],
      min: [0, "Room price cannot be negative"],
    },
    checkInDate: {
      type: Date,
      required: [true, "Check-in date is required"],
    },
    checkOutDate: {
      type: Date,
      required: [true, "Check-out date is required"],
      validate: {
        validator: function(value) {
          return value > this.checkInDate;
        },
        message: "Check-out date must be after check-in date",
      },
    },
    nights: {
      type: Number,
      required: [true, "Number of nights is required"],
      min: [1, "Minimum 1 night is required"],
    },
    adults: {
      type: Number,
      default: 1,
      min: [1, "Minimum 1 adult is required"],
    },
    children: {
      type: Number,
      default: 0,
      min: [0, "Number of children cannot be negative"],
    },
    totalBill: {
      type: Number,
      required: [true, "Total bill is required"],
      min: [0, "Total bill cannot be negative"],
    },
    advancePayment: {
      type: Number,
      required: [true, "Advance payment is required"],
      min: [0, "Advance payment cannot be negative"],
      validate: {
        validator: function(value) {
          return value <= this.totalBill;
        },
        message: "Advance payment cannot exceed total bill",
      },
    },
    duePayment: {
      type: Number,
      required: [true, "Due payment is required"],
      min: [0, "Due payment cannot be negative"],
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "BKASH", "NAGAD", "BANK", "CARD", "OTHER"],
      default: "CASH",
    },
    transactionId: {
      type: String,
      trim: true,
    },
    note: {
      type: String,
      trim: true,
    },
    isKitchen: {
      type: Boolean,
      default: false,
    },
    extraBed: {
      type: Boolean,
      default: false,
    },
    bookedBy: {
      type: String,
      required: [true, "Booked by is required"],
      trim: true,
    },
    bookedByID: {
      type: String,
      required: [true, "Booked by ID is required"],
    },
    updatedByID: {
      type: String,
    },
    bookingID: {
      type: String,
      unique: true,
      sparse: true,
    },
    bookingNo: {
      type: String,
      required: [true, "Booking number is required"],
      unique: true,
      trim: true,
    },
    serialNo: {
      type: Number,
      unique: true,
      sparse: true,
    },
    kitchenTotalBill: {
      type: Number,
      default: 0,
      min: [0, "Kitchen bill cannot be negative"],
    },
    extraBedTotalBill: {
      type: Number,
      default: 0,
      min: [0, "Extra bed bill cannot be negative"],
    },
    reference: {
      type: String,
      trim: true,
    },
    invoiceNo: {
      type: String,
      trim: true,
      index: true,
    },
    statusID: {
      type: Number,
      default: 1,
      enum: [1, 2, 3, 255], // Example: 1=Confirmed, 2=Checked-in, 3=Checked-out, 255=Cancelled
    },
    canceledBy: {
      type: String,
    },
    reason: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Add index for better query performance
BookingSchema.index({ hotelID: 1, statusID: 1 });
BookingSchema.index({ checkInDate: 1 });
BookingSchema.index({ bookingNo: 1 });
BookingSchema.index({ invoiceNo: 1 });
BookingSchema.index({ statusID: 1 });

// Pre-save hook to calculate due payment
BookingSchema.pre("save", function(next) {
  if (this.isModified("totalBill") || this.isModified("advancePayment")) {
    this.duePayment = Math.max(0, this.totalBill - this.advancePayment);
  }
  next();
});

module.exports = mongoose.model("Booking", BookingSchema);