const mongoose = require("mongoose");

// Auto-increment for sequential ID
const autoIncrement = require("mongoose-sequence")(mongoose);

// Define Booking schema (embedded in rooms)
const BookingSchema = new mongoose.Schema({
  guestName: {
    type: String,
    required: false,
  },
  checkIn: {
    type: Date,
    required: false,
  },
  checkOut: {
    type: Date,
    required: false,
  },
  bookedBy: {
    type: String,
    required: false,
  },
  paymentDetails: {
    totalBill: {
      type: Number,
      required: false,
    },
    advancePayment: {
      type: Number,
      required: false,
    },
    duePayment: {
      type: Number,
      required: false,
    },
    paymentMethod: {
      type: String,
      required: false,
    },
    transactionId: {
      type: String,
      required: false,
    },
  },
}, { _id: false });

// Define RoomNumbers schema
const RoomNumberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  roomId: {
    type: String,
    required: false,
    trim: true,
  },
  status: {
    type: String,
    enum: ["available", "occupied", "maintenance", "reserved"],
    default: "available",
  },
  price: {
    type: Number,
    required: false,
    min: 0,
  },
  capacity: {
    adults: {
      type: Number,
      default: 2,
      min: 1,
    },
    children: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  amenities: {
    type: [String],
    default: [],
  },
  bookedDates: {
    type: [String], // Array of booked date strings (YYYY-MM-DD format)
    default: [],
  },
  bookings: {
    type: [BookingSchema],
    default: [],
  },
  description: {
    type: String,
    required: false,
  },
  images: {
    type: [String],
    default: [],
  },
}, { _id: true, timestamps: true });

// Define RoomCategories schema
const RoomCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  categoryId: {
    type: String,
    required: false,
    trim: true,
  },
  description: {
    type: String,
    required: false,
  },
  basePrice: {
    type: Number,
    required: false,
    min: 0,
  },
  maxOccupancy: {
    adults: {
      type: Number,
      default: 2,
      min: 1,
    },
    children: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  amenities: {
    type: [String],
    default: [],
  },
  images: {
    type: [String],
    default: [],
  },
  roomNumbers: {
    type: [RoomNumberSchema],
    default: [],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { _id: true, timestamps: true });

// Define Hotel schema
const HotelSchema = new mongoose.Schema(
  {
    hotelName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    hotelID: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    hotelDescription: {
      type: String,
      required: true,
    },
    address: {
      street: {
        type: String,
        required: false,
      },
      city: {
        type: String,
        required: false,
      },
      state: {
        type: String,
        required: false,
      },
      zipCode: {
        type: String,
        required: false,
      },
      country: {
        type: String,
        required: false,
      },
    },
    contact: {
      phone: {
        type: String,
        required: false,
      },
      email: {
        type: String,
        required: false,
      },
      website: {
        type: String,
        required: false,
      },
    },
    location: {
      latitude: {
        type: Number,
        required: false,
      },
      longitude: {
        type: Number,
        required: false,
      },
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance"],
      default: "active",
    },
    roomCategories: {
      type: [RoomCategorySchema],
      default: [],
    },
    totalRooms: {
      type: Number,
      default: 0,
    },
    availableRooms: {
      type: Number,
      default: 0,
    },
    createTime: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Add auto-increment to the hotelID field
HotelSchema.plugin(autoIncrement, {
  inc_field: "hotelID",
  start_seq: 1,
});

// Indexes for better query performance
HotelSchema.index({ hotelName: "text", hotelDescription: "text" });
HotelSchema.index({ status: 1 });
HotelSchema.index({ "roomCategories.name": 1 });

// Virtual to calculate total rooms
HotelSchema.virtual("calculatedTotalRooms").get(function () {
  return this.roomCategories.reduce((total, category) => {
    return total + (category.roomNumbers?.length || 0);
  }, 0);
});

// Virtual to calculate available rooms
HotelSchema.virtual("calculatedAvailableRooms").get(function () {
  return this.roomCategories.reduce((total, category) => {
    const availableInCategory = category.roomNumbers?.filter(
      (room) => room.status === "available"
    ).length || 0;
    return total + availableInCategory;
  }, 0);
});

// Pre-save middleware to update room counts
HotelSchema.pre("save", function (next) {
  this.totalRooms = this.calculatedTotalRooms;
  this.availableRooms = this.calculatedAvailableRooms;
  next();
});

// Method to find category by name
HotelSchema.methods.findCategoryByName = function (categoryName) {
  return this.roomCategories.find(
    (category) => category.name === categoryName
  );
};

// Method to find room by name in a category
HotelSchema.methods.findRoomInCategory = function (categoryName, roomName) {
  const category = this.findCategoryByName(categoryName);
  if (!category) return null;
  return category.roomNumbers.find((room) => room.name === roomName);
};

// Export the Hotel model
module.exports = mongoose.model("Hotel", HotelSchema);
