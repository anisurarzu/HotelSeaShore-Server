/**
 * Users & Agents routes
 * Use these for the Users & Agents / Agent Information frontend page.
 * Base path: /api/users
 */
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const UserController = require("../controllers/userController");

// GET /api/users – list users (role, permission, hotelID with hotelName)
router.get("/users", protect, UserController.getUsers);

// POST /api/users – create user
router.post("/users", protect, UserController.createUser);

// PUT /api/users/:id – update user
router.put("/users/:id", protect, UserController.updateUser);

// DELETE /api/users/:id – delete user
router.delete("/users/:id", protect, UserController.deleteUser);

module.exports = router;
