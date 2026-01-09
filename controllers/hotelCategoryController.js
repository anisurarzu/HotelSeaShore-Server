const HotelCategory = require("../models/HotelCategory");

// Function to get the next sequential categoryID
const getNextCategoryID = async () => {
  const lastCategory = await HotelCategory.findOne().sort({ id: -1 });
  return lastCategory ? lastCategory.id + 1 : 0; // If no category found, start from 0
};

// @desc Create a new hotel category
// @route POST /api/categories
const createHotelCategory = async (req, res) => {
  const { name, description } = req.body;

  try {
    // Get the next categoryID
    const id = await getNextCategoryID();

    // Create the new category with createTime and categoryID
    const hotelCategory = await HotelCategory.create({
      id,
      name,
      description,
      createTime: new Date(), // Set the current time as createTime
    });

    res.status(200).json(hotelCategory);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// @desc Get all categories
// @route GET /api/categories
const getHotelCategory = async (req, res) => {
  try {
    const hotelCategory = await HotelCategory.find();
    res.status(200).json(hotelCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Update a category
// @route PUT /api/categories/:id
const updateHotelCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const hotelCategory = await HotelCategory.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!hotelCategory) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.status(200).json(hotelCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Delete a category
// @route DELETE /api/categories/:id
const deleteHotelCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const hotelCategory = await HotelCategory.findByIdAndDelete(id);
    if (!hotelCategory) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createHotelCategory,
  getHotelCategory,
  updateHotelCategory,
  deleteHotelCategory,
};
