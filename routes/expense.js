const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const { protect } = require("../middleware/authMiddleware");

// CRUD routes
// @desc Create a new expense
// @route POST /api/expenses
router.post("/", protect, expenseController.createExpense);

// @desc Get all expenses
// @route GET /api/expenses
router.get("/", protect, expenseController.getAllExpenses);

// New route for daily expense sum (must come before /:id route)
// @desc Get daily expense sum
// @route GET /api/expenses/sum/daily
router.get("/sum/daily", protect, expenseController.getDailyExpenseSum);

// @desc Get a single expense by ID
// @route GET /api/expenses/:id
router.get("/:id", protect, expenseController.getExpense);

// @desc Update an existing expense
// @route PUT /api/expenses/:id
router.put("/:id", protect, expenseController.updateExpense);

// @desc Delete an expense
// @route DELETE /api/expenses/:id
router.delete("/:id", protect, expenseController.deleteExpense);

module.exports = router;
