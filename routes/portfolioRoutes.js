const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const PortfolioController = require("../controllers/portfolioController");

// @desc Create a new slider
// @route POST /api/sliders
router.post("/portfolio", protect, PortfolioController.createPortfolio);

// @desc Get all sliders
// @route GET /api/sliders
router.get("/portfolios", PortfolioController.getPortfolio);

// @desc Update a slider
// @route PUT /api/sliders/:id
router.put("/portfolio/:id", protect, PortfolioController.updatePortfolio);

// @desc Delete a slider
// @route DELETE /api/sliders/:id
router.delete("/portfolio/:id", protect, PortfolioController.deletePortfolio);

module.exports = router;
