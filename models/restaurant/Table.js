const mongoose = require("mongoose");

const TableSchema = new mongoose.Schema(
  {
    tableNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    location: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["available", "occupied", "reserved", "maintenance"],
      default: "available",
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    statusID: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
TableSchema.index({ tableNumber: 1 });
TableSchema.index({ status: 1 });
TableSchema.index({ statusID: 1 });
TableSchema.index({ capacity: 1 });

module.exports = mongoose.model("Table", TableSchema);
