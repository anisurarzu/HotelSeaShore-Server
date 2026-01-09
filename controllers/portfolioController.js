const Portfolio = require("../models/Portfolio");

// @desc Create a new slider
// @route POST /api/sliders
const createPortfolio = async (req, res) => {
  const { image, title, details } = req.body;

  try {
    const portfolio = await Portfolio.create({ image, title, details });
    res.status(201).json(portfolio);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// @desc Get all sliders
// @route GET /api/sliders
const getPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.find();
    res.status(200).json(portfolio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Update a slider
// @route PUT /api/sliders/:id
const updatePortfolio = async (req, res) => {
  const { id } = req.params;

  try {
    const portfolio = await Portfolio.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!portfolio) {
      return res.status(404).json({ error: "Portfolio not found" });
    }
    res.status(200).json(portfolio);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Delete a slider
// @route DELETE /api/sliders/:id
const deletePortfolio = async (req, res) => {
  const { id } = req.params;

  try {
    const portfolio = await Portfolio.findByIdAndDelete(id);
    if (!portfolio) {
      return res.status(404).json({ error: "Portfolio not found" });
    }
    res.status(200).json({ message: "Portfolio deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createPortfolio,
  getPortfolio,
  updatePortfolio,
  deletePortfolio,
};
