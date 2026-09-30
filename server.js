const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

const app = express();

const PORT = Number(process.env.PORT) || 30114;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://bdmart-mu.vercel.app",
  "https://sprienge-admin-panel.vercel.app",
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

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      console.log("CORS ALLOWED:", origin);
      return callback(null, true);
    }

    console.log("CORS BLOCKED:", origin);

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

app.use(cors(corsOptions));

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
API ROUTES
==================================================
*/

/*
------------------------------
PRODUCT ROUTES
------------------------------
*/

app.use(
  "/api/products",
  require("./routes/productRoutes")
);

/*
------------------------------
TENANT ROUTES
------------------------------
*/

app.use(
  "/api/tenants",
  require("./routes/tenantRoutes")
);

/*
------------------------------
ORDER ROUTES
------------------------------
*/

app.use(
  "/api/orders",
  require("./routes/orderRoutes")
);

/*
==================================================
404 HANDLER
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
GLOBAL ERROR HANDLER
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
START SERVER
==================================================
*/

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing from environment variables"
      );
    }

    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log("====================================");
    console.log("MongoDB Connected Successfully");
    console.log("====================================");

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          "===================================="
        );

        console.log(
          `Server running on port ${PORT}`
        );

        console.log(
          "Host: 0.0.0.0"
        );

        console.log(
          "Tenant API: /api/tenants"
        );

        console.log(
          "Product API: /api/products"
        );

        console.log(
          "Order API: /api/orders"
        );

        console.log(
          "===================================="
        );
      }
    );
  } catch (err) {
    console.error("====================================");
    console.error("Backend Startup Error:");
    console.error(err.message);
    console.error("====================================");

    process.exit(1);
  }
};

startServer();