const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const PermissionController = require("../controllers/permissionController");

// @desc Create a new permission
// @route POST /api/permission
router.post("/permission", protect, PermissionController.createPermission);

// @desc Get all permissions
// @route GET /api/permission
router.get("/permission", protect, PermissionController.getPermissions);

// @desc Get single permission
// @route GET /api/permission/:id
router.get("/permission/:id", protect, PermissionController.getPermission);

// @desc Update a permission
// @route PUT /api/permission/:id
router.put("/permission/:id", protect, PermissionController.updatePermission);

// @desc Delete a permission
// @route DELETE /api/permission/:id
router.delete(
  "/permission/:id",
  protect,
  PermissionController.deletePermission
);

module.exports = router;
