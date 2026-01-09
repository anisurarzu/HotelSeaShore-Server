// models/DailySummary.js
const mongoose = require("mongoose");

const DailySummarySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
    unique: true,
  },
  openingBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  dailyIncome: {
    type: Number,
    required: true,
    default: 0,
  },
  totalBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  dailyExpenses: {
    type: Number,
    required: true,
    default: 0,
  },
  closingBalance: {
    type: Number,
    required: true,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("DailySummary", DailySummarySchema);
