const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

require("dotenv").config();

const app = express();

/*
==================================================
CORS
==================================================
*/

app.use(
  cors({
    origin: true,
    credentials: true,
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
    message:
      "Backend is running successfully",
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

app.use(
  (err, req, res, next) => {
    console.error(
      "GLOBAL ERROR:",
      err
    );

    res.status(500).json({
      success: false,
      message:
        "Internal server error",
      error: err.message,
    });
  }
);

/*
==================================================
SERVER
==================================================
*/

const PORT =
  process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log(
      "===================================="
    );

    console.log(
      "MongoDB Connected Successfully"
    );

    console.log(
      "===================================="
    );

    app.listen(PORT, () => {
      console.log(
        "===================================="
      );

      console.log(
        `Server running on port ${PORT}`
      );

      console.log(
        "===================================="
      );
    });
  })
  .catch((err) => {
    console.error(
      "===================================="
    );

    console.error(
      "MongoDB Connection Error:"
    );

    console.error(err.message);

    console.error(
      "===================================="
    );

    process.exit(1);
  });