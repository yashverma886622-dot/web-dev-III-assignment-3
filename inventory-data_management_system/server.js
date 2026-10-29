// Load the environment variables first
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");

const productRoutes = require("./routes/productRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

// Middleware to read JSON body
app.use(express.json());

// Routes
app.use("/api/products", productRoutes);

// If no route matches
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Centralized error handler (always at the end)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and then start the server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => {
      console.log("Server running on port " + PORT);
    });
  })
  .catch((err) => {
    console.log("MongoDB connection failed:", err.message);
  });