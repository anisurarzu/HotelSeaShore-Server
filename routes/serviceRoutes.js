const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const ServiceController = require("../controllers/serviceController");

// @desc Create a new service
// @route POST /api/services
router.post("/service", protect, ServiceController.createService);

// @desc Get all services
// @route GET /api/services
router.get("/services", ServiceController.getService);

// @desc Update a service
// @route PUT /api/services/:id
router.put("/service/:id", protect, ServiceController.updateService);

// @desc Delete a service
// @route DELETE /api/services/:id
router.delete("/service/:id", protect, ServiceController.deleteService);

module.exports = router;
