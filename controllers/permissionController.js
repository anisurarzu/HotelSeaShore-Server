const Permission = require("../models/Permission");

// @desc    Create new permission group
// @route   POST /api/permission
// @access  Private
exports.createPermission = async (req, res) => {
  try {
    const { permissionName } = req.body;

    // Check if permission group exists
    const permissionExists = await Permission.findOne({ permissionName });
    if (permissionExists) {
      return res.status(400).json({ error: "Permission group already exists" });
    }

    const permission = await Permission.create(req.body);
    res.status(201).json(permission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get all permission groups
// @route   GET /api/permission
// @access  Private
exports.getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find();
    res.status(200).json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get single permission group
// @route   GET /api/permission/:id
// @access  Private
exports.getPermission = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id);
    if (!permission) {
      return res.status(404).json({ error: "Permission group not found" });
    }
    res.status(200).json(permission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update permission group
// @route   PUT /api/permission/:id
// @access  Private
exports.updatePermission = async (req, res) => {
  try {
    const permission = await Permission.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!permission) {
      return res.status(404).json({ error: "Permission group not found" });
    }
    res.status(200).json(permission);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete permission group
// @route   DELETE /api/permission/:id
// @access  Private
exports.deletePermission = async (req, res) => {
  try {
    const permission = await Permission.findByIdAndDelete(req.params.id);
    if (!permission) {
      return res.status(404).json({ error: "Permission group not found" });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
