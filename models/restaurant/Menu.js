const mongoose = require("mongoose");

const MenuSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    categoryID: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    availability: {
      type: String,
      enum: ["available", "unavailable", "out_of_stock"],
      default: "available",
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
    },
    statusID: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
MenuSchema.index({ categoryID: 1, availability: 1 });
MenuSchema.index({ categoryID: 1, statusID: 1 });
MenuSchema.index({ itemName: "text", description: "text" });

module.exports = mongoose.model("Menu", MenuSchema);
