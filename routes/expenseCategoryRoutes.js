const express = require("express");
const router = express.Router();
const expenseCategoryController = require("../controllers/expenseCategoryController");
const { protect } = require("../middleware/authMiddleware");

// CRUD routes for expense categories
// @desc Create a new expense category
// @route POST /api/expense-categories
router.post("/expense-categories", protect, expenseCategoryController.createExpenseCategory);

// @desc Get all expense categories
// @route GET /api/expense-categories
router.get("/expense-categories", protect, expenseCategoryController.getAllExpenseCategories);

// @desc Get a single expense category by ID
// @route GET /api/expense-categories/:id
router.get("/expense-categories/:id", protect, expenseCategoryController.getExpenseCategory);

// @desc Update an existing expense category
// @route PUT /api/expense-categories/:id
router.put("/expense-categories/:id", protect, expenseCategoryController.updateExpenseCategory);

// @desc Delete an expense category
// @route DELETE /api/expense-categories/:id
router.delete("/expense-categories/:id", protect, expenseCategoryController.deleteExpenseCategory);

module.exports = router;
