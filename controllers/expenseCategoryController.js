const ExpenseCategory = require("../models/ExpenseCategory");

// Create a new expense category
exports.createExpenseCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Check if category already exists
    const existingCategory = await ExpenseCategory.findOne({
      name: name.trim(),
    });

    if (existingCategory) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const newCategory = new ExpenseCategory({
      name: name.trim(),
    });

    const savedCategory = await newCategory.save();
    res.status(200).json(savedCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category already exists" });
    }
    res.status(400).json({ message: error.message });
  }
};

// Get all expense categories
exports.getAllExpenseCategories = async (req, res) => {
  try {
    const categories = await ExpenseCategory.find().sort({ name: 1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single expense category
exports.getExpenseCategory = async (req, res) => {
  try {
    const category = await ExpenseCategory.findById(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update expense category
exports.updateExpenseCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Category name is required" });
    }

    // Check if another category with the same name exists
    const existingCategory = await ExpenseCategory.findOne({
      name: name.trim(),
      _id: { $ne: req.params.id },
    });

    if (existingCategory) {
      return res.status(400).json({ message: "Category name already exists" });
    }

    const updatedCategory = await ExpenseCategory.findByIdAndUpdate(
      req.params.id,
      { name: name.trim(), updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!updatedCategory)
      return res.status(404).json({ message: "Category not found" });
    res.status(200).json(updatedCategory);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category name already exists" });
    }
    res.status(400).json({ message: error.message });
  }
};

// Delete expense category
exports.deleteExpenseCategory = async (req, res) => {
  try {
    const deletedCategory = await ExpenseCategory.findByIdAndDelete(
      req.params.id
    );
    if (!deletedCategory)
      return res.status(404).json({ message: "Category not found" });
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
