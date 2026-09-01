
const express = require("express");
const router = express.Router();

const Order = require("../models/Order");
const steadfast = require("../services/steadfastService");


// ============================================================
// CREATE NEW ORDER
// Checkout / Landing Page / Admin Create Order
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

      // Admin/other frontend থেকে items এলে
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
    // PRICE
    // ========================================================

    const finalPrice = Number(price);

    if (!Number.isFinite(finalPrice) || finalPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid product price",
      });
    }


    // ========================================================
    // QUANTITY
    //
    // IMPORTANT:
    //
    // quantity 1 → 1 product
    // quantity 2 → 2 products
    // quantity 3 → 3 products
    //
    // Backend quantity = frontend quantity
    // ========================================================

    const finalQuantity = Math.max(
      1,
      Math.floor(Number(quantity) || 1)
    );


    // ========================================================
    // DELIVERY CHARGE
    // ========================================================

    const finalDeliveryCharge =
      Number.isFinite(Number(deliveryCharge)) &&
      Number(deliveryCharge) >= 0
        ? Number(deliveryCharge)
        : 0;


    // ========================================================
    // BACKEND PRICE CALCULATION
    //
    // Frontend subtotal/total আমরা trust করছি না।
    // Backend নিজে calculate করবে।
    // ========================================================

    const calculatedSubtotal =
      finalPrice * finalQuantity;

    const calculatedTotal =
      calculatedSubtotal +
      finalDeliveryCharge;


    // ========================================================
    // ORDER ITEMS
    //
    // Landing Page হলে selected product + quantity
    // একটাই item হিসেবে save হবে।
    // ========================================================

    let finalItems = [];


    // --------------------------------------------------------
    // যদি frontend থেকে valid items আসে
    // --------------------------------------------------------

    if (Array.isArray(items) && items.length > 0) {

      finalItems = items.map((item) => {

        const itemPrice =
          Number(item.price) || 0;

        const itemQuantity =
          Math.max(
            1,
            Math.floor(
              Number(item.quantity) || 1
            )
          );

        return {
          productId: item.productId,

          productName:
            item.productName || "",

          productImage:
            item.productImage || "",

          price: itemPrice,

          quantity: itemQuantity,

          subtotal:
            itemPrice * itemQuantity,
        };
      });

    } else {

      // ------------------------------------------------------
      // Landing Page / Single Product Order
      // ------------------------------------------------------

      finalItems = [
        {
          productId,

          productName:
            productName || "",

          productImage:
            productImage || "",

          price: finalPrice,

          quantity: finalQuantity,

          subtotal:
            calculatedSubtotal,
        },
      ];
    }


    // ========================================================
    // CREATE ORDER
    // ========================================================

    const orderData = {

      // ======================================================
      // CUSTOMER
      // ======================================================

      name: String(name).trim(),

      phone: String(phone).trim(),

      district: String(district).trim(),

      thana: String(thana).trim(),

      address: String(address).trim(),

      note: note
        ? String(note).trim()
        : "",


      // ======================================================
      // PRODUCT
      // ======================================================

      productId,

      productName:
        productName || "",

      productImage:
        productImage || "",


      // ======================================================
      // PRICE
      // ======================================================

      price: finalPrice,


      // ======================================================
      // IMPORTANT
      // QUANTITY
      // ======================================================

      quantity: finalQuantity,


      // ======================================================
      // CALCULATED AMOUNTS
      // ======================================================

      subtotal:
        calculatedSubtotal,

      deliveryCharge:
        finalDeliveryCharge,

      total:
        calculatedTotal,


      // ======================================================
      // ITEMS
      // ======================================================

      items: finalItems,


      // ======================================================
      // SOURCE
      // ======================================================

      orderSource:
        orderSource || "website",

      landingPageId:
        landingPageId || "",


      // ======================================================
      // STATUS
      // ======================================================

      status: "Pending",
    };


    // ========================================================
    // SAVE ORDER
    // ========================================================

    const order =
      new Order(orderData);

    const savedOrder =
      await order.save();


    // ========================================================
    // SUCCESS LOG
    // ========================================================

    console.log("====================================");
    console.log("ORDER SAVED SUCCESSFULLY");
    console.log("====================================");

    console.log({
      orderId:
        savedOrder._id,

      product:
        savedOrder.productName,

      quantity:
        savedOrder.quantity,

      price:
        savedOrder.price,

      subtotal:
        savedOrder.subtotal,

      deliveryCharge:
        savedOrder.deliveryCharge,

      total:
        savedOrder.total,
    });


    // ========================================================
    // RESPONSE
    // ========================================================

    res.status(201).json({
      success: true,

      message: "Order Placed",

      order: savedOrder,
    });

  } catch (err) {

    console.error(
      "CREATE ORDER ERROR:",
      err
    );

    res.status(500).json({
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
// Admin Panel
// ============================================================

router.get("/", async (req, res) => {
  try {

    const orders =
      await Order.find()
        .sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {

    res.status(500).json({
      error: err.message,
    });
  }
});


// ============================================================
// FRAUD CHECK
// GET /api/orders/fraud-check/01712345678
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
        error: err.message,
      });
    }
  }
);


// ============================================================
// GET SINGLE ORDER
// ============================================================

router.get("/:id", async (req, res) => {
  try {

    const order =
      await Order.findById(
        req.params.id
      );

    if (!order) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    res.json(order);

  } catch (err) {

    res.status(404).json({
      error: "Order not found",
    });
  }
});


// ============================================================
// UPDATE ORDER
// Admin Panel
// ============================================================

router.put("/:id", async (req, res) => {
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
        error: "Order not found",
      });
    }

    res.json(updated);

  } catch (err) {

    res.status(500).json({
      error: err.message,
    });
  }
});


// ============================================================
// DELETE ORDER
// ============================================================

router.delete("/:id", async (req, res) => {
  try {

    const deleted =
      await Order.findByIdAndDelete(
        req.params.id
      );

    if (!deleted) {
      return res.status(404).json({
        error: "Order not found",
      });
    }

    res.json({
      message: "Order deleted",
    });

  } catch (err) {

    res.status(500).json({
      error: err.message,
    });
  }
});


// ============================================================
// CONFIRM ORDER
// Admin Panel
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
          error: "Order not found",
        });
      }


      // ----------------------------------------
      // Confirm order
      // ----------------------------------------

      order.status = "confirmed";

      await order.save();


      // ----------------------------------------
      // Optional Steadfast Parcel
      // ----------------------------------------

      if (
        req.body.createParcel &&
        order.courierStatus !== "created"
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
            order.courierHistory = [];
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
        error: err.message,
      });
    }
  }
);


// ============================================================
// CREATE / RETRY / RE-CREATE STEADFAST PARCEL
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
          error: "Order not found",
        });
      }


      // ----------------------------------------
      // Duplicate protection
      // ----------------------------------------

      if (
        order.courierStatus === "created" &&
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
          order.courierHistory = [];
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
          error:
            courierErr.message,

          order,
        });
      }

    } catch (err) {

      res.status(500).json({
        error: err.message,
      });
    }
  }
);


// ============================================================
// STEADFAST WEBHOOK
// ============================================================

const COURIER_TO_ORDER_STATUS = {

  delivered:
    "delivered",

  cancelled:
    "cancelled",

  partial_delivered:
    "delivered",

  returned:
    "cancelled",
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
          error:
            "Missing consignment_id",
        });
      }


      // ----------------------------------------
      // Find order
      // ----------------------------------------

      const order =
        await Order.findOne({
          consignmentId:
            String(consignment_id),
        });


      if (!order) {

        return res.status(404).json({
          error:
            "Order not found for consignment",
        });
      }


      // ----------------------------------------
      // Update courier information
      // ----------------------------------------

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
        order.courierHistory = [];
      }


      order.courierHistory.push({

        status,

        note,

        at: new Date(),
      });


      // ----------------------------------------
      // Sync order status
      // ----------------------------------------

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
        ok: true,
      });

    } catch (err) {

      res.status(500).json({
        error: err.message,
      });
    }
  }
);


module.exports = router;

