/**
 * Users & Agents controller
 * Handles user list, create, update, delete with role, permission, and hotelID (with hotelName).
 * Use these endpoints for the Users & Agents / Agent Information frontend page.
 */
const User = require("../models/User");
const Hotel = require("../models/Hotel");
const Permission = require("../models/Permission");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

function generateLoginID() {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `FTB-${randomDigits}`;
}

async function getHotelNameMap() {
  const hotels = await Hotel.find({}).select("hotelID hotelName").lean();
  const map = {};
  hotels.forEach((h) => {
    map[h.hotelID] = h.hotelName || "";
    map[String(h.hotelID)] = h.hotelName || "";
  });
  return map;
}

function formatUser(user, hotelNameMap = {}) {
  const u = user.toObject ? user.toObject() : user;
  const hotelIDList = Array.isArray(u.hotelID) ? u.hotelID : [];
  const hotelIDFormatted = hotelIDList.map((item) => {
    const id = item.hotelID !== undefined ? item.hotelID : item;
    const num = typeof id === "string" ? parseInt(id, 10) : id;
    const name = hotelNameMap[num] ?? hotelNameMap[id] ?? item.hotelName ?? "";
    return { hotelID: id, hotelName: name };
  });
  return {
    id: u._id,
    _id: u._id,
    key: u.key,
    username: u.username,
    email: u.email,
    phoneNumber: u.phoneNumber ?? "",
    loginID: u.loginID,
    currentAddress: u.currentAddress ?? "",
    gender: u.gender,
    image: u.image,
    role: u.role ? { id: u.role.id, value: u.role.value, label: u.role.label } : undefined,
    permission:
      u.permission && (u.permission._id || u.permission.permissionName)
        ? {
            _id: u.permission._id,
            permissionName: u.permission.permissionName,
            permissions: u.permission.permissions,
          }
        : undefined,
    hotelID: hotelIDFormatted,
    statusID: u.statusID,
    isRestaurant: u.isRestaurant,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

// GET /api/users – list all active users (Users & Agents page)
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ statusID: { $ne: 255 } })
      .sort({ createdAt: -1 })
      .select("-password -plainPassword")
      .lean();

    const hotelNameMap = await getHotelNameMap();
    const formatted = users.map((u) => formatUser(u, hotelNameMap));

    res.status(200).json({ users: formatted });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// POST /api/users – create user (Users & Agents page)
const createUser = async (req, res) => {
  const {
    image,
    username,
    gender,
    email,
    password,
    plainPassword,
    phoneNumber,
    currentAddress,
    role,
    permission,
    hotelID: hotelIDPayload,
    key,
    loginID = generateLoginID(),
    isRestaurant,
  } = req.body;

  const requiredFields = ["username", "email", "password", "role"];
  const missingFields = requiredFields.filter((field) => !req.body[field]);
  if (missingFields.length) {
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  if (!role || !role.id || !role.label || !role.value) {
    return res.status(400).json({
      error: "Role must include id, label, and value.",
    });
  }

  try {
    const existingEmail = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({ error: "Email already registered" });
    }
    const existingLoginID = await User.findOne({ loginID: loginID.trim() });
    if (existingLoginID) {
      return res.status(400).json({ error: "Login ID already in use" });
    }

    let permissionDoc = permission;
    if (permission && permission._id && !permission.permissionName) {
      const found = await Permission.findById(permission._id).lean();
      if (found)
        permissionDoc = {
          _id: found._id,
          permissionName: found.permissionName,
          permissions: found.permissions,
        };
    }

    const hotelIDArray = Array.isArray(hotelIDPayload)
      ? hotelIDPayload.map((item) => {
          const id = typeof item === "object" && item.hotelID !== undefined ? item.hotelID : item;
          const num = typeof id === "string" ? parseInt(id, 10) : id;
          return isNaN(num) ? { hotelID: id } : { hotelID: num };
        })
      : [];

    const createPayload = {
      image: image || undefined,
      username: username.trim(),
      gender: gender || "male",
      email: email.trim().toLowerCase(),
      password,
      phoneNumber: phoneNumber != null ? String(phoneNumber) : "",
      currentAddress: currentAddress != null ? String(currentAddress) : "",
      role: { id: role.id, value: role.value, label: role.label },
      loginID: loginID.trim(),
      hotelID: hotelIDArray,
      isRestaurant: isRestaurant !== undefined ? Boolean(isRestaurant) : false,
    };
    if (key != null && key !== "") createPayload.key = String(key);
    if (permissionDoc && (permissionDoc._id || permissionDoc.permissionName)) {
      createPayload.permission = permissionDoc;
    }

    const user = await User.create(createPayload);

    const hotelNameMap = await getHotelNameMap();
    const formatted = formatUser(user, hotelNameMap);

    res.status(201).json({
      message: "User created successfully",
      user: formatted,
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateFields = Object.keys(error.keyValue || {}).join(", ");
      return res
        .status(400)
        .json({ error: `Duplicate fields found: ${duplicateFields}` });
    }
    res.status(400).json({ error: error.message });
  }
};

// PUT /api/users/:id – update user (Users & Agents page)
const updateUser = async (req, res) => {
  const { id } = req.params;
  const updateData = { ...req.body };

  try {
    delete updateData.plainPassword;

    if (updateData.email) {
      const existing = await User.findOne({
        email: updateData.email.trim().toLowerCase(),
        _id: { $ne: id },
      });
      if (existing) return res.status(400).json({ error: "Email already in use" });
    }
    if (updateData.loginID) {
      const existing = await User.findOne({
        loginID: updateData.loginID.trim(),
        _id: { $ne: id },
      });
      if (existing) return res.status(400).json({ error: "Login ID already in use" });
    }

    if (updateData.password && updateData.password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    } else {
      delete updateData.password;
    }

    if (updateData.permission) {
      if (updateData.permission._id && !updateData.permission.permissionName) {
        const found = await Permission.findById(updateData.permission._id).lean();
        if (found)
          updateData.permission = {
            _id: found._id,
            permissionName: found.permissionName,
            permissions: found.permissions,
          };
      }
    }

    if (updateData.hotelID && Array.isArray(updateData.hotelID)) {
      updateData.hotelID = updateData.hotelID.map((item) => {
        const id = typeof item === "object" && item.hotelID !== undefined ? item.hotelID : item;
        const num = typeof id === "string" ? parseInt(id, 10) : id;
        return isNaN(num) ? { hotelID: id } : { hotelID: num };
      });
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .select("-password -plainPassword")
      .lean();

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const hotelNameMap = await getHotelNameMap();
    const responseUser = formatUser(updatedUser, hotelNameMap);

    res.status(200).json({
      user: responseUser,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Update error:", error);
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({
        error: "Duplicate field value",
        field: field,
        message: `${field} already exists`,
      });
    }
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ error: "Validation failed", details: errors });
    }
    res.status(500).json({
      error: "Server error",
      message: error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  }
};

// DELETE /api/users/:id – delete user (Users & Agents page)
const deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
};
