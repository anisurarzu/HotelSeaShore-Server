// routes/dailySummary.js
const express = require("express");
const router = express.Router();
const dailySummaryController = require("../controllers/dailySummaryController");

// Save daily summary
router.post(
  "/daily-summary",
  dailySummaryController.createOrUpdateDailySummary
);

// Get daily summary by date
router.get("/daily-summary/:date", dailySummaryController.getDailySummary);

// Get previous day's closing balance
router.get(
  "/daily-summary/previous-day/:date",
  dailySummaryController.getPreviousDayClosingBalance
);

module.exports = router;
