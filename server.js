const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

const app = express();

/*
==================================================
CONFIG
==================================================
*/

const PORT = Number(process.env.PORT) || 30114;

const allowedOrigins = [
  "https://sprienge-admin-panel.vercel.app",
  "https://spriengge.shop",
  "https://www.spriengge.shop",
];

console.log("====================================");
console.log("Starting Spriengge Backend...");
console.log("PORT:", PORT);
console.log("NODE_ENV:", process.env.NODE_ENV || "not-set");
console.log("MONGO_URI:", process.env.MONGO_URI ? "Loaded" : "Missing");
console.log("====================================");

/*
==================================================
CORS
==================================================
*/

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without origin
      // e.g. Postman/server-to-server
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked CORS origin:", origin);

      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

/*
==================================================
BODY PARSER
==================================================
*/

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

/*
==================================================
HEALTH CHECK
==================================================
*/

app.get("/", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    service: "spriengge-backend",
    message: "Backend is running successfully",
    port: PORT,
  });
});

/*
==================================================
PRODUCT ROUTES
==================================================
*/

app.use(
  "/api/products",
  require("./routes/productRoutes")
);

/*
==================================================
ORDER ROUTES
==================================================
*/

app.use(
  "/api/orders",
  require("./routes/orderRoutes")
);

/*
==================================================
404
==================================================
*/

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

/*
==================================================
GLOBAL ERROR
==================================================
*/

app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

/*
==================================================
MONGODB
==================================================
*/

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing from environment variables"
      );
    }

    await mongoose.connect(process.env.MONGO_URI);

    console.log("====================================");
    console.log("MongoDB Connected Successfully");
    console.log("====================================");

    /*
    ==================================================
    SERVER
    ==================================================
    */

    app.listen(PORT, "0.0.0.0", () => {
      console.log("====================================");
      console.log(`Server running on port ${PORT}`);
      console.log("Host: 0.0.0.0");
      console.log("====================================");
    });
  } catch (err) {
    console.error("====================================");
    console.error("Backend Startup Error:");
    console.error(err.message);
    console.error("====================================");

    process.exit(1);
  }
};

startServer();