// controllers/dailySummaryController.js
const DailySummary = require("../models/DailySummary");

// Parse date as UTC date-only so "2026-03-15" always = 15th UTC (matches DB), not local
function toUTCDateOnly(dateInput) {
  const str = typeof dateInput === "string" ? dateInput.trim() : String(dateInput);
  // "2026-03-15" -> UTC midnight; avoid local-time parsing
  if (/^\d{4}-\d{2}-\d{2}(T|$)/.test(str)) {
    const [y, m, d] = str.slice(0, 10).split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }
  const d = new Date(dateInput);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

// Create or update daily summary
exports.createOrUpdateDailySummary = async (req, res) => {
  try {
    const {
      date,
      openingBalance, // optional from client, will be overridden by prev day's closing if available
      dailyIncome,
      totalBalance,
      dailyExpenses,
      closingBalance,
    } = req.body;

    // Current date as UTC midnight (e.g. 2026-03-15T00:00:00.000Z)
    const currentDate = toUTCDateOnly(date);

    // Porer diner opening = ager diner closing — so ager diner summary khojo (date < currentDate, last one)
    const prevSummary = await DailySummary.findOne({ date: { $lt: currentDate } })
      .sort({ date: -1 })
      .lean();

    const resolvedOpeningBalance =
      prevSummary != null && prevSummary.closingBalance != null
        ? prevSummary.closingBalance
        : openingBalance ?? 0;

    const existingSummary = await DailySummary.findOne({ date: currentDate });

    if (existingSummary) {
      // Update existing summary
      existingSummary.openingBalance = resolvedOpeningBalance;
      existingSummary.dailyIncome = dailyIncome;
      existingSummary.totalBalance = totalBalance;
      existingSummary.dailyExpenses = dailyExpenses;
      existingSummary.closingBalance = closingBalance;

      await existingSummary.save();
      return res.status(200).json(existingSummary);
    } else {
      // Create new summary
      const newSummary = new DailySummary({
        date: currentDate,
        openingBalance: resolvedOpeningBalance,
        dailyIncome,
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

// Get daily summary by date — na thakle initial format (opening = ager diner closing, baki 0)
exports.getDailySummary = async (req, res) => {
  try {
    const { date } = req.params;
    const currentDate = toUTCDateOnly(date);

    const summary = await DailySummary.findOne({ date: currentDate });

    if (summary) {
      return res.status(200).json(summary);
    }

    // DB te nai — initial format return: opening = ager diner closing, baki 0 (save korle ei format e save hobe)
    const prevSummary = await DailySummary.findOne({ date: { $lt: currentDate } })
      .sort({ date: -1 })
      .lean();

    const openingBalance =
      prevSummary != null && prevSummary.closingBalance != null
        ? prevSummary.closingBalance
        : 0;

    const initialSummary = {
      date: currentDate,
      openingBalance,
      dailyIncome: 0,
      totalBalance: 0,
      dailyExpenses: 0,
      closingBalance: 0,
    };

    res.status(200).json(initialSummary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get previous day's closing balance
exports.getPreviousDayClosingBalance = async (req, res) => {
  try {
    const { date } = req.params;
    const prevDate = new Date(date);
    prevDate.setUTCHours(0, 0, 0, 0);
    prevDate.setUTCDate(prevDate.getUTCDate() - 1);

    const prevSummary = await DailySummary.findOne({ date: prevDate });

    if (!prevSummary) {
      return res.status(200).json({ closingBalance: 0 });
    }

    res.status(200).json({ closingBalance: prevSummary.closingBalance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get full summary for all dates
exports.getAllDailySummaries = async (req, res) => {
  try {
    const summaries = await DailySummary.find().sort({ date: 1 });

    // Optionally group by date if needed later on frontend
    res.status(200).json(summaries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
