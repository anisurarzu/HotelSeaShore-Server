const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: false,
      index: true,
    },
    invoiceNo: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    customerPhone: {
      type: String,
      required: false,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: false,
      trim: true,
    },
    tableNumber: {
      type: String,
      required: false,
      trim: true,
    },
    orderType: {
      type: String,
      enum: ["dine_in", "takeaway", "delivery"],
      default: "dine_in",
    },
    items: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Menu",
      required: true,
      validate: {
        validator: function(v) {
          return v && v.length > 0;
        },
        message: "Order must have at least one item",
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "partially_paid", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "mobile_banking", "online"],
      required: false,
    },
    orderStatus: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "ready", "served", "cancelled"],
      default: "pending",
    },
    notes: {
      type: String,
      trim: true,
    },
    orderedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    statusID: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

// Generate order number before saving
OrderSchema.pre("save", async function (next) {
  if (!this.orderNumber) {
    try {
      // Get count of orders created today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const count = await mongoose.model("Order").countDocuments({
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      });
      
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
      this.orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(4, "0")}`;
    } catch (error) {
      // Fallback if count fails
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
      const timestamp = Date.now();
      this.orderNumber = `ORD-${dateStr}-${String(timestamp).slice(-4)}`;
    }
  }
  next();
});

// Indexes for better query performance
OrderSchema.index({ invoiceNo: 1, orderStatus: 1 });
OrderSchema.index({ invoiceNo: 1, paymentStatus: 1 });
OrderSchema.index({ invoiceNo: 1, createdAt: -1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ orderNumber: 1 });
OrderSchema.index({ statusID: 1 });

module.exports = mongoose.model("Order", OrderSchema);
