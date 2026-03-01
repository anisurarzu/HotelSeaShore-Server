/**
 * Permission (Role) controller – for Role & Permission Management frontend.
 * Each document = one role: permissionName (role name) + permissions[] (page-wise view/insert/edit/delete).
 */
const Permission = require("../models/Permission");

// Normalize a single permission item from frontend (pageKey, pageName, viewAccess, insertAccess, editAccess, deleteAccess)
function normalizePermissionItem(p) {
  return {
    pageKey: p.pageKey != null ? String(p.pageKey).trim() || undefined : undefined,
    pageName: p.pageName != null ? String(p.pageName).trim() || undefined : undefined,
    viewAccess: Boolean(p.viewAccess),
    insertAccess: Boolean(p.insertAccess),
    editAccess: Boolean(p.editAccess),
    deleteAccess: Boolean(p.deleteAccess),
  };
}

// Deduplicate by pageKey (or pageName); merge access flags with OR so no duplicate-page validation error
function deduplicatePermissions(permissions) {
  const byKey = new Map();
  for (const p of permissions) {
    const key = (p.pageKey || p.pageName || "").toString().trim() || `_${byKey.size}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.viewAccess = existing.viewAccess || p.viewAccess;
      existing.insertAccess = existing.insertAccess || p.insertAccess;
      existing.editAccess = existing.editAccess || p.editAccess;
      existing.deleteAccess = existing.deleteAccess || p.deleteAccess;
    } else {
      byKey.set(key, { ...p });
    }
  }
  return Array.from(byKey.values());
}

// Ensure at least one page has at least one access (view/insert/edit/delete)
function hasAtLeastOneAccess(permissions) {
  return permissions.some(
    (p) => p.viewAccess || p.insertAccess || p.editAccess || p.deleteAccess
  );
}

// GET /api/permission – list all roles (for Role & Permission Management table)
const getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.find()
      .sort({ permissionName: 1 })
      .lean();
    res.status(200).json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message, message: error.message });
  }
};

// GET /api/permission/:id – get one role by id
const getPermission = async (req, res) => {
  try {
    const permission = await Permission.findById(req.params.id).lean();
    if (!permission) {
      return res.status(404).json({ error: "Permission group not found", message: "Permission group not found" });
    }
    res.status(200).json(permission);
  } catch (error) {
    res.status(500).json({ error: error.message, message: error.message });
  }
};

// POST /api/permission – create role
const createPermission = async (req, res) => {
  try {
    const permissionName = req.body.permissionName?.trim();
    if (!permissionName) {
      return res.status(400).json({
        error: "Permission name is required",
        message: "Please enter a role name.",
      });
    }

    const rawPermissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    const permissions = deduplicatePermissions(rawPermissions.map(normalizePermissionItem));

    if (!hasAtLeastOneAccess(permissions)) {
      return res.status(400).json({
        error: "Assign at least one page with View or other access",
        message: "Assign at least one page with View or other access.",
      });
    }

    const existing = await Permission.findOne({ permissionName });
    if (existing) {
      return res.status(400).json({
        error: "Permission group already exists",
        message: "A role with this name already exists.",
      });
    }

    const permission = await Permission.create({ permissionName, permissions });
    res.status(201).json(permission);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Permission group already exists",
        message: "A role with this name already exists.",
      });
    }
    res.status(500).json({
      error: error.message,
      message: error.response?.data?.message || error.message,
    });
  }
};

// PUT /api/permission/:id – update role
const updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const permissionName = req.body.permissionName?.trim();
    if (!permissionName) {
      return res.status(400).json({
        error: "Permission name is required",
        message: "Please enter a role name.",
      });
    }

    const rawPermissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    const permissions = deduplicatePermissions(rawPermissions.map(normalizePermissionItem));

    if (!hasAtLeastOneAccess(permissions)) {
      return res.status(400).json({
        error: "Assign at least one page with View or other access",
        message: "Assign at least one page with View or other access.",
      });
    }

    const existingName = await Permission.findOne({
      permissionName,
      _id: { $ne: id },
    });
    if (existingName) {
      return res.status(400).json({
        error: "Permission group already exists",
        message: "A role with this name already exists.",
      });
    }

    const permission = await Permission.findByIdAndUpdate(
      id,
      { permissionName, permissions },
      { new: true, runValidators: true }
    ).lean();

    if (!permission) {
      return res.status(404).json({
        error: "Permission group not found",
        message: "Role not found.",
      });
    }

    res.status(200).json(permission);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        error: "Permission group already exists",
        message: "A role with this name already exists.",
      });
    }
    res.status(500).json({
      error: error.message,
      message: error.response?.data?.message || error.message,
    });
  }
};

// DELETE /api/permission/:id – delete role
const deletePermission = async (req, res) => {
  try {
    const permission = await Permission.findByIdAndDelete(req.params.id);
    if (!permission) {
      return res.status(404).json({
        error: "Permission group not found",
        message: "Role not found.",
      });
    }
    res.status(200).json({ success: true, message: "Role deleted successfully." });
  } catch (error) {
    res.status(500).json({ error: error.message, message: error.message });
  }
};

module.exports = {
  getPermissions,
  getPermission,
  createPermission,
  updatePermission,
  deletePermission,
};
