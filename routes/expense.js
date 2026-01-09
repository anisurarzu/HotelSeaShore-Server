const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");

// CRUD routes
router.post("/", expenseController.createExpense);
router.get("/", expenseController.getAllExpenses);
router.get("/:id", expenseController.getExpense);
router.put("/:id", expenseController.updateExpense);
router.delete("/:id", expenseController.deleteExpense);

// New route for daily expense sum
router.get("/sum/daily", expenseController.getDailyExpenseSum);

module.exports = router;
