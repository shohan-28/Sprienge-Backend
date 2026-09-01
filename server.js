const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================

// CORS
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// JSON body parser
app.use(express.json());

// URL encoded body parser
app.use(
  express.urlencoded({
    extended: true,
  })
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    service: "spriengge-backend",
    message: "Backend is running successfully",
  });
});

// ============================================================
// API ROUTES
// ============================================================

app.use(
  "/api/orders",
  require("./routes/orderRoutes")
);

// ============================================================
// 404 HANDLER
// ============================================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

// ============================================================
// MONGODB + SERVER
// ============================================================

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("====================================");
    console.log("MongoDB Connected Successfully");
    console.log("====================================");

    app.listen(PORT, () => {
      console.log("====================================");
      console.log(`Server running on port ${PORT}`);
      console.log("====================================");
    });
  })
  .catch((err) => {
    console.error("====================================");
    console.error("MongoDB Connection Error:");
    console.error(err.message);
    console.error("====================================");

    process.exit(1);
  });