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
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://bdmart-mu.vercel.app/",

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
console.log("MONGO_URI:", process.env.MONGO_URI ? "Loaded" : "Missing");
console.log("====================================");

/*
==================================================
CORS
==================================================
*/

const corsOptions = {
  origin: function (origin, callback) {
    // Requests without Origin
    // Example: Postman / server-to-server
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      console.log("CORS ALLOWED:", origin);
      return callback(null, true);
    }

    console.log("CORS BLOCKED:", origin);

    // Don't crash backend
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
};

/*
==================================================
CORS MIDDLEWARE
==================================================
*/

app.use(cors(corsOptions));

/*
==================================================
EXPLICIT PREFLIGHT HANDLER
==================================================
*/

app.use((req, res, next) => {
  const origin = req.headers.origin;

  console.log(
    `REQUEST: ${req.method} ${req.originalUrl}`,
    origin ? `Origin: ${origin}` : ""
  );

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);

    res.setHeader(
      "Access-Control-Allow-Credentials",
      "true"
    );

    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );

    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, Accept, Origin, X-Requested-With"
    );

    res.setHeader(
      "Access-Control-Max-Age",
      "86400"
    );
  }

  /*
  ================================================
  HANDLE PREFLIGHT REQUEST
  ================================================
  */

  if (req.method === "OPTIONS") {
    console.log(
      "PREFLIGHT REQUEST HANDLED:",
      req.originalUrl
    );

    return res.status(204).end();
  }

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
  console.error("GLOBAL ERROR:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
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