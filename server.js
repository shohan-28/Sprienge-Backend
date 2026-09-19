
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
  // Local Development
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",

  // Old / Other Frontend
  "https://bdmart-mu.vercel.app",

  // Admin Panel
  "https://sprienge-admin-panel.vercel.app",

  // Main Website
  "https://spriengge.shop",
  "https://www.spriengge.shop",
];

console.log("====================================");
console.log("Starting Spriengge Backend...");
console.log("PORT:", PORT);
console.log("NODE_ENV:", process.env.NODE_ENV || "not-set");
console.log(
  "MONGO_URI:",
  process.env.MONGO_URI ? "Loaded" : "Missing"
);
console.log("====================================");

/*
==================================================
CORS
==================================================
*/

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests without Origin
    // Example: Postman / server-to-server
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      console.log("CORS ALLOWED:", origin);
      return callback(null, true);
    }

    console.log("CORS BLOCKED:", origin);

    // Don't crash backend for unknown origins
    return callback(null, false);
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "Origin",
    "X-Requested-With",
  ],

  optionsSuccessStatus: 204,

  maxAge: 86400,
};

/*
==================================================
CORS MIDDLEWARE
==================================================
*/

app.use(cors(corsOptions));

/*
==================================================
PREFLIGHT
==================================================
*/

app.options("*", cors(corsOptions));

/*
==================================================
REQUEST LOGGER
==================================================
*/

app.use((req, res, next) => {
  console.log(
    `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`,
    req.headers.origin
      ? `Origin: ${req.headers.origin}`
      : ""
  );

  next();
});

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
  console.error("====================================");
  console.error("GLOBAL ERROR:");
  console.error(err);
  console.error("====================================");

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error:
      process.env.NODE_ENV === "production"
        ? undefined
        : err.message,
  });
});

/*
==================================================
MONGODB + SERVER
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

