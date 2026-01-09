const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const hotelCategoryRoutes = require("./routes/hotelCategoryRoutes");
const roomRoutes = require("./routes/roomRoutes");
const hotelRoutes = require("./routes/hotelRoutes");
const bookingRoutes = require("./routes/bookingRoutes");
const dailySummaryRoutes = require("./routes/dailySummary");
const expenseRoutes = require("./routes/expense");
const permissionRoutes = require("./routes/permissionRoutes");
require("dotenv").config();

const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io with CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Make io available to routes via middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Serve static files (uploaded images)
app.use("/uploads", express.static("uploads"));

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Join room for specific hotel
  socket.on("join:hotel", (hotelID) => {
    socket.join(`hotel:${hotelID}`);
    console.log(`Socket ${socket.id} joined hotel:${hotelID}`);
  });

  // Leave hotel room
  socket.on("leave:hotel", (hotelID) => {
    socket.leave(`hotel:${hotelID}`);
    console.log(`Socket ${socket.id} left hotel:${hotelID}`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api", hotelCategoryRoutes);
app.use("/api", roomRoutes);
app.use("/api", hotelRoutes);
app.use("/api", bookingRoutes);
app.use("/api", dailySummaryRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api", permissionRoutes);

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API is running...",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io server initialized`);
});

// Export io for use in other modules if needed
module.exports = { io };
