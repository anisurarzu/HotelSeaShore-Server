// controllers/dailySummaryController.js
const DailySummary = require("../models/DailySummary");

// Create or update daily summary
exports.createOrUpdateDailySummary = async (req, res) => {
  try {
    const {
      date,
      openingBalance,
      totalBalance,
      dailyExpenses,
      closingBalance,
    } = req.body;

    const existingSummary = await DailySummary.findOne({ date });

    if (existingSummary) {
      // Update existing summary
      existingSummary.openingBalance = openingBalance;
      //   existingSummary.dailyIncome = dailyIncome;
      existingSummary.totalBalance = totalBalance;
      existingSummary.dailyExpenses = dailyExpenses;
      existingSummary.closingBalance = closingBalance;

      await existingSummary.save();
      return res.status(200).json(existingSummary);
    } else {
      // Create new summary
      const newSummary = new DailySummary({
        date,
        openingBalance,
        totalBalance,
        dailyExpenses,
        closingBalance,
      });

      await newSummary.save();
      return res.status(201).json(newSummary);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get daily summary by date
exports.getDailySummary = async (req, res) => {
  try {
    const { date } = req.params;
    const summary = await DailySummary.findOne({ date });

    if (!summary) {
      return res
        .status(404)
        .json({ message: "No summary found for this date" });
    }

    res.status(200).json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get previous day's closing balance
exports.getPreviousDayClosingBalance = async (req, res) => {
  try {
    const { date } = req.params;
    const prevDate = new Date(date);
    prevDate.setDate(prevDate.getDate() - 1);

    const prevSummary = await DailySummary.findOne({ date: prevDate });

    if (!prevSummary) {
      return res.status(200).json({ closingBalance: 0 });
    }

    res.status(200).json({ closingBalance: prevSummary.closingBalance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
