const Expense = require("../models/Expense");
const dayjs = require("dayjs");

// Create a new expense
exports.createExpense = async (req, res) => {
  try {
    const { expenseCategory, expenseReason, expenseAmount, expenseDate, createdAt } = req.body;

    const newExpense = new Expense({
      expenseCategory,
      expenseReason,
      expenseAmount,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      createdAt: createdAt ? new Date(createdAt) : new Date(),
    });

    const savedExpense = await newExpense.save();
    res.status(200).json(savedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get all expenses
exports.getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find().sort({ createdAt: -1 });
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single expense
exports.getExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) return res.status(404).json({ message: "Expense not found" });
    res.json(expense);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update expense
exports.updateExpense = async (req, res) => {
  try {
    const { expenseCategory, expenseReason, expenseAmount, expenseDate, createdAt } = req.body;

    const updateData = {
      expenseCategory,
      expenseReason,
      expenseAmount,
    };

    if (expenseDate) {
      updateData.expenseDate = new Date(expenseDate);
    }

    if (createdAt) {
      updateData.createdAt = new Date(createdAt);
    }

    const updatedExpense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedExpense)
      return res.status(404).json({ message: "Expense not found" });
    res.status(200).json(updatedExpense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete expense
exports.deleteExpense = async (req, res) => {
  try {
    const deletedExpense = await Expense.findByIdAndDelete(req.params.id);
    if (!deletedExpense)
      return res.status(404).json({ message: "Expense not found" });
    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get daily expense sum (using MongoDB aggregation for better performance)
exports.getDailyExpenseSum = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res
        .status(400)
        .json({ message: "Date parameter is required (format: YYYY-MM-DD)" });
    }

    // Validate date format
    if (!dayjs(date, "YYYY-MM-DD", true).isValid()) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Please use YYYY-MM-DD" });
    }

    const startOfDay = dayjs(date).startOf("day");
    const endOfDay = dayjs(date).endOf("day");

    const result = await Expense.aggregate([
      {
        $match: {
          expenseDate: {
            $gte: startOfDay.toDate(),
            $lte: endOfDay.toDate(),
          },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$expenseAmount" },
          count: { $sum: 1 },
          expenses: { $push: "$$ROOT" }, // Optional: include all expense documents
        },
      },
    ]);

    // If no expenses found for the day, return empty response
    if (result.length === 0) {
      return res.json({
        date: startOfDay.format("YYYY-MM-DD"),
        totalAmount: 0,
        expenseCount: 0,
        expenses: [],
      });
    }

    res.json({
      date: startOfDay.format("YYYY-MM-DD"),
      totalAmount: result[0].totalAmount,
      expenseCount: result[0].count,
      expenses: result[0].expenses, // Optional: remove if you don't need individual expenses
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
