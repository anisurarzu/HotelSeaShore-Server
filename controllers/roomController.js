const Room = require("../models/Room");

// Function to get the next sequential categoryID
const getNextCategoryID = async () => {
  const lastRoom = await Room.findOne().sort({ id: -1 });
  return lastRoom ? lastRoom.id + 1 : 0; // If no category found, start from 0
};

// @desc Create a new hotel category
// @route POST /api/categories
const createRoom = async (req, res) => {
  const { name, description } = req.body;

  try {
    // Get the next categoryID
    const id = await getNextCategoryID();

    // Create the new category with createTime and categoryID
    const room = await Room.create({
      id,
      name,
      description,
      createTime: new Date(), // Set the current time as createTime
    });

    res.status(200).json(room);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// @desc Get all categories
// @route GET /api/categories
const getRoom = async (req, res) => {
  try {
    const room = await Room.find();
    res.status(200).json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Update a category
// @route PUT /api/categories/:id
const updateRoom = async (req, res) => {
  const { id } = req.params;

  try {
    const room = await Room.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!room) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.status(200).json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc Delete a category
// @route DELETE /api/categories/:id
const deleteRoom = async (req, res) => {
  const { id } = req.params;

  try {
    const room = await Room.findByIdAndDelete(id);
    if (!room) {
      return res.status(404).json({ error: "Category not found" });
    }
    res.status(200).json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createRoom,
  getRoom,
  updateRoom,
  deleteRoom,
};
