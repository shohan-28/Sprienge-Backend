const express = require("express");
const router = express.Router();

const Order = require("../models/Order");
const steadfast = require("../services/steadfastService");

// ============================================================
// CREATE NEW ORDER
// POST /api/orders
// ============================================================

router.post("/", async (req, res) => {
  try {
    console.log("====================================");
    console.log("NEW ORDER RECEIVED");
    console.log("====================================");

    console.log("Request body:", req.body);

    const {
      name,
      phone,
      district,
      thana,
      address,
      note,

      productId,
      productName,
      productImage,

      price,
      quantity,

      deliveryCharge,

      orderSource,
      landingPageId,

      source,

      items,
    } = req.body;

    // ========================================================
    // BASIC VALIDATION
    // ========================================================

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required",
      });
    }

    if (!phone || !String(phone).trim()) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    if (!district || !String(district).trim()) {
      return res.status(400).json({
        success: false,
        message: "District is required",
      });
    }

    if (!thana || !String(thana).trim()) {
      return res.status(400).json({
        success: false,
        message: "Thana is required",
      });
    }

    if (!address || !String(address).trim()) {
      return res.status(400).json({
        success: false,
        message: "Address is required",
      });
    }

    // ========================================================
    // DELIVERY CHARGE
    // ========================================================

    const finalDeliveryCharge =
      Number.isFinite(Number(deliveryCharge)) &&
      Number(deliveryCharge) >= 0
        ? Number(deliveryCharge)
        : 0;

    // ========================================================
    // CREATE FINAL ITEMS
    // ========================================================

    let finalItems = [];

    // ========================================================
    // CART / MULTIPLE PRODUCTS
    // ========================================================

    if (
      Array.isArray(items) &&
      items.length > 0
    ) {
      finalItems = items.map((item) => {
        const itemPrice =
          Number(item.price) || 0;

        const itemQuantity = Math.max(
          1,
          Math.floor(
            Number(item.quantity) || 1
          )
        );

        return {
          productId:
            item.productId ?? null,

          productName:
            item.productName || "",

          productImage:
            item.productImage || "",

          price:
            itemPrice,

          quantity:
            itemQuantity,

          subtotal:
            itemPrice * itemQuantity,
        };
      });
    }

    // ========================================================
    // SINGLE PRODUCT / LANDING PAGE
    // ========================================================

    else {
      const finalPrice =
        Number(price);

      if (
        !Number.isFinite(finalPrice) ||
        finalPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid product price",
        });
      }

      const finalQuantity = Math.max(
        1,
        Math.floor(
          Number(quantity) || 1
        )
      );

      finalItems = [
        {
          productId:
            productId ?? null,

          productName:
            productName || "",

          productImage:
            productImage || "",

          price:
            finalPrice,

          quantity:
            finalQuantity,

          subtotal:
            finalPrice *
            finalQuantity,
        },
      ];
    }

    // ========================================================
    // CHECK ITEMS
    // ========================================================

    if (!finalItems.length) {
      return res.status(400).json({
        success: false,
        message: "No order items found",
      });
    }

    // ========================================================
    // VALIDATE ITEM PRICES
    // ========================================================

    const hasInvalidItem = finalItems.some(
      (item) =>
        !Number.isFinite(
          Number(item.price)
        ) ||
        Number(item.price) < 0
    );

    if (hasInvalidItem) {
      return res.status(400).json({
        success: false,
        message:
          "One or more product prices are invalid",
      });
    }

    // ========================================================
    // CALCULATE SUBTOTAL
    // ========================================================

    const calculatedSubtotal =
      finalItems.reduce(
        (sum, item) =>
          sum + item.subtotal,
        0
      );

    // ========================================================
    // CALCULATE TOTAL
    // ========================================================

    const calculatedTotal =
      calculatedSubtotal +
      finalDeliveryCharge;

    // ========================================================
    // MAIN PRODUCT INFORMATION
    //
    // For cart order:
    // first item will be used as primary product info.
    // ========================================================

    const firstItem =
      finalItems[0];

    const finalProductId =
      productId ??
      firstItem.productId ??
      null;

    const finalProductName =
      productName ||
      firstItem.productName ||
      "";

    const finalProductImage =
      productImage ||
      firstItem.productImage ||
      "";

    const finalPrice =
      Number.isFinite(Number(price)) &&
      Number(price) >= 0
        ? Number(price)
        : firstItem.price;

    const finalQuantity =
      Number.isFinite(Number(quantity)) &&
      Number(quantity) >= 1
        ? Math.floor(Number(quantity))
        : firstItem.quantity;

    // ========================================================
    // CREATE ORDER DATA
    // ========================================================

    const orderData = {
      // ======================================================
      // CUSTOMER
      // ======================================================

      name:
        String(name).trim(),

      phone:
        String(phone).trim(),

      district:
        String(district).trim(),

      thana:
        String(thana).trim(),

      address:
        String(address).trim(),

      note:
        note
          ? String(note).trim()
          : "",

      // ======================================================
      // MAIN PRODUCT
      // ======================================================

      productId:
        finalProductId,

      productName:
        finalProductName,

      productImage:
        finalProductImage,

      price:
        finalPrice,

      quantity:
        finalQuantity,

      // ======================================================
      // ITEMS
      // ======================================================

      items:
        finalItems,

      // ======================================================
      // PRICE
      // ======================================================

      subtotal:
        calculatedSubtotal,

      deliveryCharge:
        finalDeliveryCharge,

      total:
        calculatedTotal,

      // ======================================================
      // STATUS
      // ======================================================

      status:
        "pending",

      // ======================================================
      // SOURCE
      // ======================================================

      source:
        source || "website",

      orderSource:
        orderSource || "website",

      landingPageId:
        landingPageId || "",
    };

    // ========================================================
    // DEBUG
    // ========================================================

    console.log(
      "FINAL ORDER DATA:"
    );

    console.log(
      JSON.stringify(
        orderData,
        null,
        2
      )
    );

    // ========================================================
    // SAVE ORDER
    // ========================================================

    const order =
      new Order(orderData);

    const savedOrder =
      await order.save();

    // ========================================================
    // SUCCESS
    // ========================================================

    console.log("====================================");
    console.log("ORDER SAVED SUCCESSFULLY");
    console.log("====================================");

    console.log({
      orderId:
        savedOrder._id,

      customer:
        savedOrder.name,

      phone:
        savedOrder.phone,

      product:
        savedOrder.productName,

      quantity:
        savedOrder.quantity,

      subtotal:
        savedOrder.subtotal,

      deliveryCharge:
        savedOrder.deliveryCharge,

      total:
        savedOrder.total,

      items:
        savedOrder.items.length,
    });

    // ========================================================
    // RESPONSE
    // ========================================================

    return res.status(201).json({
      success: true,

      message:
        "Order Placed Successfully",

      order:
        savedOrder,
    });

  } catch (err) {
    console.error(
      "CREATE ORDER ERROR:",
      err
    );

    // ========================================================
    // MONGOOSE VALIDATION ERROR
    // ========================================================

    if (
      err.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Order validation failed",

        errors:
          Object.values(
            err.errors
          ).map(
            (error) => error.message
          ),
      });
    }

    // ========================================================
    // GENERAL ERROR
    // ========================================================

    return res.status(500).json({
      success: false,

      message:
        "Failed to place order",

      error:
        err.message,
    });
  }
});

// ============================================================
// GET ALL ORDERS
// GET /api/orders
// ============================================================

router.get("/", async (req, res) => {
  try {
    const orders =
      await Order.find()
        .sort({
          createdAt: -1,
        });

    res.json(orders);

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// ============================================================
// FRAUD CHECK
// GET /api/orders/fraud-check/:phone
// ============================================================

router.get(
  "/fraud-check/:phone",
  async (req, res) => {
    try {
      const data =
        await steadfast.getFraudCheck(
          req.params.phone
        );

      res.json(data);

    } catch (err) {
      res.status(502).json({
        success: false,
        error: err.message,
      });
    }
  }
);

// ============================================================
// STEADFAST BALANCE
// GET /api/orders/steadfast-balance
// ============================================================

router.get(
  "/steadfast-balance",
  async (req, res) => {
    try {
      const data =
        await steadfast.getBalance();

      res.json(data);

    } catch (err) {
      res.status(502).json({
        success: false,
        error: err.message,
      });
    }
  }
);

// ============================================================
// GET SINGLE ORDER
// GET /api/orders/:id
// ============================================================

router.get(
  "/:id",
  async (req, res) => {
    try {
      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          error:
            "Order not found",
        });
      }

      res.json(order);

    } catch (err) {
      res.status(404).json({
        success: false,
        error:
          "Order not found",
      });
    }
  }
);

// ============================================================
// UPDATE ORDER
// PUT /api/orders/:id
// ============================================================

router.put(
  "/:id",
  async (req, res) => {
    try {
      const updated =
        await Order.findByIdAndUpdate(
          req.params.id,
          req.body,
          {
            new: true,
            runValidators: true,
          }
        );

      if (!updated) {
        return res.status(404).json({
          success: false,
          error:
            "Order not found",
        });
      }

      res.json(updated);

    } catch (err) {
      res.status(500).json({
        success: false,
        error:
          err.message,
      });
    }
  }
);

// ============================================================
// DELETE ORDER
// DELETE /api/orders/:id
// ============================================================

router.delete(
  "/:id",
  async (req, res) => {
    try {
      const deleted =
        await Order.findByIdAndDelete(
          req.params.id
        );

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error:
            "Order not found",
        });
      }

      res.json({
        success: true,
        message:
          "Order deleted",
      });

    } catch (err) {
      res.status(500).json({
        success: false,
        error:
          err.message,
      });
    }
  }
);

// ============================================================
// CONFIRM ORDER
// POST /api/orders/:id/confirm
// ============================================================

router.post(
  "/:id/confirm",
  async (req, res) => {
    try {
      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          error:
            "Order not found",
        });
      }

      // ------------------------------------------------------
      // Confirm
      // ------------------------------------------------------

      order.status =
        "confirmed";

      await order.save();

      // ------------------------------------------------------
      // Optional Steadfast Parcel
      // ------------------------------------------------------

      if (
        req.body.createParcel &&
        order.courierStatus !==
          "created"
      ) {
        try {
          const result =
            await steadfast.createParcel(
              order
            );

          const consignment =
            result.consignment || {};

          order.courier =
            "steadfast";

          order.courierStatus =
            "created";

          order.consignmentId =
            consignment.consignment_id;

          order.trackingCode =
            consignment.tracking_code;

          order.parcelCreatedAt =
            new Date();

          order.parcelError =
            null;

          if (
            !Array.isArray(
              order.courierHistory
            )
          ) {
            order.courierHistory =
              [];
          }

          order.courierHistory.push({
            status: "created",
            at: new Date(),
          });

          await order.save();

        } catch (courierErr) {
          order.courierStatus =
            "failed";

          order.parcelError =
            courierErr.message;

          await order.save();
        }
      }

      res.json(order);

    } catch (err) {
      res.status(500).json({
        success: false,
        error:
          err.message,
      });
    }
  }
);

// ============================================================
// CREATE / RETRY STEADFAST PARCEL
// POST /api/orders/:id/create-parcel
// ============================================================

router.post(
  "/:id/create-parcel",
  async (req, res) => {
    try {
      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          error:
            "Order not found",
        });
      }

      // ------------------------------------------------------
      // Duplicate protection
      // ------------------------------------------------------

      if (
        order.courierStatus ===
          "created" &&
        !req.body.force
      ) {
        return res.json(order);
      }

      try {
        const result =
          await steadfast.createParcel(
            order
          );

        const consignment =
          result.consignment || {};

        order.courier =
          "steadfast";

        order.courierStatus =
          "created";

        order.consignmentId =
          consignment.consignment_id;

        order.trackingCode =
          consignment.tracking_code;

        order.parcelCreatedAt =
          new Date();

        order.parcelError =
          null;

        if (
          !Array.isArray(
            order.courierHistory
          )
        ) {
          order.courierHistory =
            [];
        }

        order.courierHistory.push({
          status: req.body.force
            ? "recreated"
            : "created",

          at: new Date(),
        });

        await order.save();

        res.json(order);

      } catch (courierErr) {
        order.courierStatus =
          "failed";

        order.parcelError =
          courierErr.message;

        await order.save();

        res.status(502).json({
          success: false,

          error:
            courierErr.message,

          order,
        });
      }

    } catch (err) {
      res.status(500).json({
        success: false,
        error:
          err.message,
      });
    }
  }
);

// ============================================================
// STEADFAST WEBHOOK
// POST /api/orders/steadfast/webhook
// ============================================================

const COURIER_TO_ORDER_STATUS = {
  delivered: "delivered",
  cancelled: "cancelled",
  partial_delivered: "delivered",
  returned: "cancelled",
};

router.post(
  "/steadfast/webhook",
  async (req, res) => {
    try {
      const {
        consignment_id,
        status,
        tracking_code,
        note,
      } = req.body;

      if (!consignment_id) {
        return res.status(400).json({
          success: false,
          error:
            "Missing consignment_id",
        });
      }

      const order =
        await Order.findOne({
          consignmentId:
            String(consignment_id),
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          error:
            "Order not found for consignment",
        });
      }

      // ------------------------------------------------------
      // Courier info
      // ------------------------------------------------------

      order.courierStatus =
        status;

      if (tracking_code) {
        order.trackingCode =
          tracking_code;
      }

      if (
        !Array.isArray(
          order.courierHistory
        )
      ) {
        order.courierHistory =
          [];
      }

      order.courierHistory.push({
        status,
        note: note || "",
        at: new Date(),
      });

      // ------------------------------------------------------
      // Sync order status
      // ------------------------------------------------------

      if (
        COURIER_TO_ORDER_STATUS[
          status
        ]
      ) {
        order.status =
          COURIER_TO_ORDER_STATUS[
            status
          ];
      }

      await order.save();

      res.json({
        success: true,
        ok: true,
      });

    } catch (err) {
      res.status(500).json({
        success: false,
        error:
          err.message,
      });
    }
  }
);

module.exports = router;