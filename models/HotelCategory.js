const mongoose = require("mongoose");

// Auto-increment for sequential ID
const autoIncrement = require("mongoose-sequence")(mongoose);

const HotelCategorySchema = new mongoose.Schema(
  {
    id: {
      type: Number,
      unique: true, // Ensure that the ID is unique
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    createTime: {
      type: Date,
      default: Date.now, // Automatically set the creation time
    },
  },
  { timestamps: true }
);

// Add auto-increment to the categoryID field
HotelCategorySchema.plugin(autoIncrement, {
  inc_field: "categoryID",
  start_seq: 1,
});

module.exports = mongoose.model("HotelCategory", HotelCategorySchema);
