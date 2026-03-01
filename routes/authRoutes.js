const express = require("express");
const {
  register,
  login,
  getAllUsers,
  updateUser,
  updateStatusID,
  hardDeleteUser,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/login", login);

// Protected routes (Users & Agents page)
router.post("/register", protect, register); // Create user (admin)
router.get("/users", protect, getAllUsers);
router.put("/users/:id", protect, updateUser);
router.delete("/users/:id", protect, hardDeleteUser); // DELETE /auth/users/:id

// Soft delete user (statusID=255)
router.put("/users/soft/:id", protect, updateStatusID);
// Hard delete (alias; primary delete is above)
router.delete("/users/hard/:id", protect, hardDeleteUser);

module.exports = router;
