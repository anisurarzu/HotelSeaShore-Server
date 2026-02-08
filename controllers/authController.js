const User = require("../models/User");
const jwt = require("jsonwebtoken");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
dayjs.extend(utc);
require("dotenv").config();

// Helper function to generate loginID
function generateLoginID() {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `FTB-${randomDigits}`;
}

// Register a new user
const register = async (req, res) => {
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
    loginID = generateLoginID(), // Generate if not provided
    isRestaurant,
  } = req.body;

  // Check for required fields
  const requiredFields = [
    "username",
    "gender",
    "email",
    "password",
    "phoneNumber",
    "currentAddress",
    "role",
  ];

  const missingFields = requiredFields.filter((field) => !req.body[field]);
  if (missingFields.length) {
    return res
      .status(400)
      .json({ error: `Missing required fields: ${missingFields.join(", ")}` });
  }

  // Validate required sub-fields in role
  if (!role.id || !role.label || !role.value) {
    return res.status(400).json({
      error: "Role must include id, label, and value.",
    });
  }

  try {
    const roleInfo = {
      id: role.id,
      label: role.label,
      value: role.value,
    };

    const user = await User.create({
      image,
      username,
      gender,
      email,
      password,
      plainPassword,
      phoneNumber,
      currentAddress,
      role: roleInfo,
      loginID,
      hotelID: [], // Initialize empty hotelID array (optional)
      isRestaurant: isRestaurant !== undefined ? Boolean(isRestaurant) : false,
    });

    res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        loginID: user.loginID,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateFields = Object.keys(error.keyValue).join(", ");
      return res
        .status(400)
        .json({ error: `Duplicate fields found: ${duplicateFields}` });
    }
    res.status(400).json({ error: error.message });
  }
};

// User login
const login = async (req, res) => {
  const { loginID, password, latitude, longitude, publicIP, loginTime, isRestaurant } =
    req.body;

  try {
    const user = await User.findOne({ loginID });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "10h",
    });

    // Format login time
    const formattedLoginTime = loginTime || dayjs().utc().format();

    // Add login history
    user.loginHistory.push({
      latitude: latitude || "0.0",
      longitude: longitude || "0.0",
      publicIP: publicIP || "Unknown",
      loginTime: formattedLoginTime,
      isRestaurant: isRestaurant !== undefined ? Boolean(isRestaurant) : false,
    });

    await user.save();

    // Return the hotelID array as is (now properly structured)
    res.status(200).json({
      token,
      user: {
        id: user._id,
        loginID: user.loginID,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        currentAddress: user.currentAddress,
        role: user.role,
        image: user.image,
        hotelID: user.hotelID, // Now matches the schema
        // loginHistory: user.loginHistory,
        permission: user.permission,
        isRestaurant: user.isRestaurant,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

// Get all active users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ statusID: { $ne: 255 } })
      .sort({ createdAt: -1 })
      .select("-password -plainPassword");

    res.status(200).json({
      users: users.map((user) => ({
        id: user._id,
        loginID: user.loginID,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        currentAddress: user.currentAddress,
        role: user.role,
        image: user.image,
        hotelID: user.hotelID.map((item) => item.hotelID || item),
        createdAt: user.createdAt,
        statusID: user.statusID,
        permission: user.permission,
        loginHistory: user.loginHistory.map((history) => ({
          latitude: history.latitude,
          longitude: history.longitude,
          publicIP: history.publicIP,
          loginTime: history.loginTime,
          isRestaurant: history.isRestaurant,
        })),
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Update user information
const updateUser = async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  try {
    // If password is being updated, hash it and update plainPassword
    if (updateData.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
      updateData.plainPassword = updateData.password;
    }

    // Handle hotelID array formatting
    if (updateData.hotelID && Array.isArray(updateData.hotelID)) {
      updateData.hotelID = updateData.hotelID.map((item) => {
        // Handle both {hotelID: number} and direct number formats
        if (typeof item === "object" && item.hotelID !== undefined) {
          return { hotelID: Number(item.hotelID) }; // Ensure it's a number
        }
        return { hotelID: Number(item) }; // Convert direct numbers
      });
    }

    // Update the user with the processed data
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -plainPassword");

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Format the response to match your expected structure
    const responseUser = {
      id: updatedUser._id,
      loginID: updatedUser.loginID,
      username: updatedUser.username,
      email: updatedUser.email,
      phoneNumber: updatedUser.phoneNumber,
      currentAddress: updatedUser.currentAddress,
      gender: updatedUser.gender,
      role: updatedUser.role,
      image: updatedUser.image,
      hotelID: updatedUser.hotelID.map((item) => ({ hotelID: item.hotelID })),
      permission: updatedUser.permission,
      isRestaurant: updatedUser.isRestaurant,
    };

    res.status(200).json({
      user: responseUser,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Update error:", error);

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        error: "Duplicate field value",
        field: field,
        message: `${field} already exists`,
      });
    }

    // Handle validation errors
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        error: "Validation failed",
        details: errors,
      });
    }

    res.status(500).json({
      error: "Server error",
      message: error.message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  }
};

// Soft delete user (set statusID to 255)
const updateStatusID = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByIdAndUpdate(
      id,
      { statusID: 255 },
      { new: true }
    ).select("-password -plainPassword");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "User deactivated successfully",
      user: {
        id: user._id,
        loginID: user.loginID,
        statusID: user.statusID,
      },
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

// Permanently delete user
const hardDeleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid user ID" });
    }

    const deletedUser = await User.findByIdAndDelete(id);
    if (!deletedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({
      message: "User permanently deleted",
      deletedAt: new Date(),
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  register,
  login,
  getAllUsers,
  updateUser,
  updateStatusID,
  hardDeleteUser,
};
