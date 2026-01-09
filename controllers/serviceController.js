const Service = require("../models/Service");

// @desc Create a new service

// @route POST /api/services
const createService = async (req, res) => {
  const { image, title, packages } = req.body;

  try {
    const service = await Service.create({ image, title, packages });
    res.status(201).json(service);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// @desc Get all services
// @route GET /api/services
const getService = async (req, res) => {
  try {
    const services = await Service.find();
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Update a service
// @route PUT /api/services/:id
const updateService = async (req, res) => {
  const { id } = req.params;

  try {
    const service = await Service.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Delete a service
// @route DELETE /api/services/:id
const deleteService = async (req, res) => {
  const { id } = req.params;

  try {
    const service = await Service.findByIdAndDelete(id);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    res.status(200).json({ message: "Service deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createService,
  getService,
  updateService,
  deleteService,
};
