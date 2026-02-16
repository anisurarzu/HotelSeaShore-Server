const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
  expenseNo: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  expenseCategory: {
    type: String,
    required: false,
  },
  expenseReason: {
    type: String,
    required: true,
  },
  expenseAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  expenseDate: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Expense", expenseSchema);
