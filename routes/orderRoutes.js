
const express = require("express");
const router = express.Router();

const Order = require("../models/Order");

const {
  getFraudCheck,
  getBalance,
  createParcel,
} = require("../services/steadfastService");

/*
==================================================
HELPER FUNCTIONS
==================================================
*/

const cleanString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

const getNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : NaN;
};

/*
==================================================
POST /api/orders
CREATE ORDER
==================================================
*/

router.post("/", async (req, res) => {
  try {
    console.log("====================================");
    console.log("NEW ORDER REQUEST:");
    console.log(JSON.stringify(req.body, null, 2));
    console.log("====================================");

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

      items,

      subtotal,
      deliveryCharge,
      total,

      source,
      orderSource,
      landingPageId,
    } = req.body;

    /*
    ========================================
    CUSTOMER DATA
    ========================================
    */

    const finalName = cleanString(name);
    const finalPhone = cleanString(phone);
    const finalDistrict = cleanString(district);
    const finalThana = cleanString(thana);
    const finalAddress = cleanString(address);
    const finalNote = cleanString(note);

    /*
    ========================================
    CUSTOMER VALIDATION
    ========================================
    */

    if (!finalName) {
      return res.status(400).json({
        success: false,
        message: "Name is required.",
      });
    }

    if (!finalPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required.",
      });
    }

    if (!/^01\d{9}$/.test(finalPhone)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Bangladesh phone number.",
      });
    }

    if (!finalDistrict) {
      return res.status(400).json({
        success: false,
        message: "District is required.",
      });
    }

    if (!finalThana) {
      return res.status(400).json({
        success: false,
        message: "Thana is required.",
      });
    }

    if (!finalAddress) {
      return res.status(400).json({
        success: false,
        message: "Address is required.",
      });
    }

    /*
    ========================================
    NORMALIZE ORDER ITEMS
    ========================================
    */

    let finalItems = [];

    /*
    ========================================
    CART ORDER
    ========================================
    */

    if (
      Array.isArray(items) &&
      items.length > 0
    ) {
      finalItems = items.map((item, index) => {
        const finalProductId =
          item?.productId ??
          item?.id ??
          null;

        const finalProductName =
          cleanString(
            item?.productName ??
              item?.name
          );

        const finalProductImage =
          cleanString(
            item?.productImage ??
              item?.image
          );

        const finalPrice =
          getNumber(item?.price);

        const finalQuantity =
          getNumber(item?.quantity);

        /*
        PRICE VALIDATION
        */

        if (
          !Number.isFinite(finalPrice) ||
          finalPrice < 0
        ) {
          throw new Error(
            `Invalid price for item ${
              index + 1
            }: ${
              finalProductName ||
              "Unknown product"
            }`
          );
        }

        /*
        QUANTITY VALIDATION
        */

        if (
          !Number.isFinite(
            finalQuantity
          ) ||
          finalQuantity < 1
        ) {
          throw new Error(
            `Invalid quantity for item ${
              index + 1
            }: ${
              finalProductName ||
              "Unknown product"
            }`
          );
        }

        const itemSubtotal =
          finalPrice *
          finalQuantity;

        return {
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

          subtotal:
            itemSubtotal,
        };
      });
    }

    /*
    ========================================
    BUY NOW ORDER
    ========================================
    */

    else {
      const finalPrice =
        getNumber(price);

      const finalQuantity =
        getNumber(quantity);

      if (
        !Number.isFinite(finalPrice) ||
        finalPrice < 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product price.",
        });
      }

      if (
        !Number.isFinite(
          finalQuantity
        ) ||
        finalQuantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid product quantity.",
        });
      }

      finalItems = [
        {
          productId:
            productId ?? null,

          productName:
            cleanString(productName),

          productImage:
            cleanString(productImage),

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

    /*
    ========================================
    CHECK ITEMS
    ========================================
    */

    if (
      !Array.isArray(finalItems) ||
      finalItems.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No valid products found in order.",
      });
    }

    /*
    ========================================
    CALCULATE SUBTOTAL
    ========================================
    */

    const calculatedSubtotal =
      finalItems.reduce(
        (sum, item) => {
          return (
            sum +
            Number(
              item.subtotal || 0
            )
          );
        },
        0
      );

    /*
    ========================================
    DELIVERY CHARGE
    ========================================
    */

    const calculatedDeliveryCharge =
      finalDistrict
        .toLowerCase()
        .includes("dhaka")
        ? 60
        : 100;

    /*
    ========================================
    TOTAL
    ========================================
    */

    const calculatedTotal =
      calculatedSubtotal +
      calculatedDeliveryCharge;

    /*
    ========================================
    MAIN PRODUCT
    ========================================
    */

    const firstItem =
      finalItems[0];

    /*
    ========================================
    CREATE ORDER
    ========================================
    */

    const newOrder =
      new Order({
        /*
        CUSTOMER
        */

        name:
          finalName,

        phone:
          finalPhone,

        district:
          finalDistrict,

        thana:
          finalThana,

        address:
          finalAddress,

        note:
          finalNote,

        /*
        MAIN PRODUCT
        */

        productId:
          productId ??
          firstItem.productId ??
          null,

        productName:
          productName
            ? cleanString(
                productName
              )
            : firstItem.productName,

        productImage:
          productImage
            ? cleanString(
                productImage
              )
            : firstItem.productImage,

        price:
          Number.isFinite(
            getNumber(price)
          )
            ? getNumber(price)
            : firstItem.price,

        quantity:
          Number.isFinite(
            getNumber(quantity)
          )
            ? getNumber(quantity)
            : firstItem.quantity,

        /*
        ITEMS
        */

        items:
          finalItems,

        /*
        MONEY
        */

        subtotal:
          calculatedSubtotal,

        deliveryCharge:
          calculatedDeliveryCharge,

        total:
          calculatedTotal,

        /*
        STATUS
        */

        status:
          "pending",

        /*
        ORDER SOURCE
        */

        source:
          source || "website",

        orderSource:
          orderSource ||
          "website",

        landingPageId:
          landingPageId || "",
      });

    /*
    ========================================
    SAVE ORDER
    ========================================
    */

    const savedOrder =
      await newOrder.save();

    console.log(
      "ORDER SAVED:",
      savedOrder._id.toString()
    );

    /*
    ========================================
    RESPONSE
    ========================================
    */

    return res.status(201).json({
      success: true,

      message:
        "Order created successfully.",

      order:
        savedOrder,
    });
  } catch (error) {
    console.error(
      "CREATE ORDER ERROR:",
      error
    );

    /*
    ========================================
    CUSTOM VALIDATION ERROR
    ========================================
    */

    if (
      error.name === "Error" &&
      error.message
    ) {
      return res.status(400).json({
        success: false,
        message:
          error.message,
      });
    }

    /*
    ========================================
    MONGOOSE VALIDATION ERROR
    ========================================
    */

    if (
      error.name ===
      "ValidationError"
    ) {
      const errors =
        Object.values(
          error.errors
        ).map((err) => ({
          field:
            err.path,

          message:
            err.message,
        }));

      return res.status(400).json({
        success: false,

        message:
          "Order validation failed.",

        errors,
      });
    }

    /*
    ========================================
    DEFAULT ERROR
    ========================================
    */

    return res.status(500).json({
      success: false,

      message:
        "Failed to create order.",

      error:
        error.message,
    });
  }
});

/*
==================================================
GET ALL ORDERS
GET /api/orders
==================================================
*/

router.get("/", async (req, res) => {
  try {
    const orders =
      await Order.find()
        .sort({
          createdAt: -1,
        });

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "GET ORDERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch orders.",

      error:
        error.message,
    });
  }
});

/*
==================================================
FRAUD CHECK
POST /api/orders/fraud-check
==================================================
*/

router.post(
  "/fraud-check",
  async (req, res) => {
    try {
      const phone =
        cleanString(
          req.body?.phone
        );

      if (!phone) {
        return res.status(400).json({
          success: false,

          message:
            "Phone number is required.",
        });
      }

      /*
      ========================================
      PHONE VALIDATION
      ========================================
      */

      if (
        !/^01\d{9}$/.test(phone)
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid Bangladesh phone number.",
        });
      }

      const result =
        await getFraudCheck(
          phone
        );

      return res.json({
        success: true,

        data:
          result,
      });
    } catch (error) {
      console.error(
        "FRAUD CHECK ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Fraud check failed.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
STEADFAST BALANCE
GET /api/orders/courier/balance
==================================================
*/

router.get(
  "/courier/balance",
  async (req, res) => {
    try {
      const balance =
        await getBalance();

      return res.json({
        success: true,

        data:
          balance,
      });
    } catch (error) {
      console.error(
        "BALANCE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to get courier balance.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
STEADFAST WEBHOOK
POST /api/orders/webhook
==================================================
*/

router.post(
  "/webhook",
  async (req, res) => {
    try {
      console.log(
        "===================================="
      );

      console.log(
        "STEADFAST WEBHOOK:"
      );

      console.log(
        JSON.stringify(
          req.body,
          null,
          2
        )
      );

      console.log(
        "===================================="
      );

      const {
        consignment_id,
        status,
        invoice,
      } = req.body;

      /*
      ========================================
      VALIDATION
      ========================================
      */

      if (!consignment_id) {
        return res.status(400).json({
          success: false,

          message:
            "Consignment ID is required.",
        });
      }

      /*
      ========================================
      FIND ORDER
      ========================================
      */

      const order =
        await Order.findOne({
          $or: [
            {
              consignmentId:
                consignment_id,
            },

            {
              trackingCode:
                consignment_id,
            },

            {
              _id: invoice,
            },
          ],
        });

      if (!order) {
        return res.status(404).json({
          success: false,

          message:
            "Order not found.",
        });
      }

      /*
      ========================================
      UPDATE COURIER STATUS
      ========================================
      */

      order.courierStatus =
        status || null;

      /*
      ========================================
      NORMALIZE STATUS
      ========================================
      */

      const normalizedStatus =
        String(
          status || ""
        )
          .trim()
          .toLowerCase();

      /*
      ========================================
      DELIVERED
      ========================================
      */

      if (
        normalizedStatus ===
          "delivered" ||
        normalizedStatus ===
          "partial_delivered"
      ) {
        order.status =
          "delivered";
      }

      /*
      ========================================
      RETURNED
      ========================================
      */

      if (
        normalizedStatus ===
          "cancelled" ||
        normalizedStatus ===
          "returned"
      ) {
        order.status =
          "returned";
      }

      /*
      ========================================
      COURIER HISTORY
      ========================================
      */

      if (
        !Array.isArray(
          order.courierHistory
        )
      ) {
        order.courierHistory =
          [];
      }

      order.courierHistory.push({
        status:
          status || "",

        note:
          "Updated from Steadfast webhook.",

        at:
          new Date(),
      });

      /*
      ========================================
      SAVE
      ========================================
      */

      await order.save();

      return res.json({
        success: true,

        message:
          "Webhook processed.",
      });
    } catch (error) {
      console.error(
        "WEBHOOK ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Webhook processing failed.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
CONFIRM ORDER
POST /api/orders/:id/confirm
==================================================
*/

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

          message:
            "Order not found.",
        });
      }

      /*
      ========================================
      ALREADY CONFIRMED
      ========================================
      */

      if (
        order.status ===
        "confirmed"
      ) {
        return res.json({
          success: true,

          message:
            "Order is already confirmed.",

          order,
        });
      }

      /*
      ========================================
      PREVENT CONFIRMING FINAL STATES
      ========================================
      */

      if (
        order.status ===
          "delivered" ||
        order.status ===
          "cancelled" ||
        order.status ===
          "returned" ||
        order.status ===
          "duplicate"
      ) {
        return res.status(400).json({
          success: false,

          message:
            `Order cannot be confirmed because its current status is "${order.status}".`,
        });
      }

      /*
      ========================================
      CONFIRM ORDER
      ========================================
      */

      order.status =
        "confirmed";

      await order.save();

      console.log(
        "ORDER CONFIRMED:",
        order._id.toString()
      );

      /*
      ========================================
      RESPONSE
      ========================================
      */

      return res.json({
        success: true,

        message:
          "Order confirmed successfully.",

        order,
      });
    } catch (error) {
      console.error(
        "CONFIRM ORDER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to confirm order.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
CREATE COURIER PARCEL
POST /api/orders/:id/create-parcel
==================================================
*/

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

          message:
            "Order not found.",
        });
      }

      /*
      ========================================
      PREVENT DUPLICATE PARCEL
      ========================================
      */

      if (
        order.consignmentId &&
        !req.body?.force
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Parcel already exists for this order.",

          order,
        });
      }

      /*
      ========================================
      CREATE PARCEL
      ========================================
      */

      const parcel =
        await createParcel(
          order
        );

      /*
      ========================================
      UPDATE ORDER
      ========================================
      */

      order.courier =
        "steadfast";

      order.parcelCreatedAt =
        new Date();

      order.courierStatus =
        parcel?.status ||
        "created";

      order.consignmentId =
        parcel?.consignment
          ?.consignment_id ||
        parcel?.consignment_id ||
        null;

      order.trackingCode =
        parcel?.consignment
          ?.tracking_code ||
        parcel?.tracking_code ||
        null;

      order.parcelError =
        null;

      /*
      ========================================
      SAVE
      ========================================
      */

      await order.save();

      console.log(
        "PARCEL CREATED:",
        order._id.toString(),
        order.consignmentId
      );

      return res.json({
        success: true,

        message:
          "Parcel created successfully.",

        order,

        parcel,
      });
    } catch (error) {
      console.error(
        "CREATE PARCEL ERROR:",
        error
      );

      /*
      ========================================
      SAVE PARCEL ERROR
      ========================================
      */

      try {
        await Order.findByIdAndUpdate(
          req.params.id,
          {
            parcelError:
              error.message,
          }
        );
      } catch (updateError) {
        console.error(
          "PARCEL ERROR UPDATE FAILED:",
          updateError
        );
      }

      return res.status(500).json({
        success: false,

        message:
          "Failed to create parcel.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
GET SINGLE ORDER
GET /api/orders/:id
==================================================
*/

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

          message:
            "Order not found.",
        });
      }

      return res.json({
        success: true,

        order,
      });
    } catch (error) {
      console.error(
        "GET SINGLE ORDER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch order.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
UPDATE ORDER
PUT /api/orders/:id
==================================================
*/

router.put(
  "/:id",
  async (req, res) => {
    try {
      const updatedOrder =
        await Order.findByIdAndUpdate(
          req.params.id,
          req.body,
          {
            new: true,

            runValidators:
              true,
          }
        );

      if (!updatedOrder) {
        return res.status(404).json({
          success: false,

          message:
            "Order not found.",
        });
      }

      return res.json({
        success: true,

        message:
          "Order updated successfully.",

        order:
          updatedOrder,
      });
    } catch (error) {
      console.error(
        "UPDATE ORDER ERROR:",
        error
      );

      /*
      ========================================
      MONGOOSE VALIDATION ERROR
      ========================================
      */

      if (
        error.name ===
        "ValidationError"
      ) {
        const errors =
          Object.values(
            error.errors
          ).map((err) => ({
            field:
              err.path,

            message:
              err.message,
          }));

        return res.status(400).json({
          success: false,

          message:
            "Order validation failed.",

          errors,
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Failed to update order.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
DELETE ORDER
DELETE /api/orders/:id
==================================================
*/

router.delete(
  "/:id",
  async (req, res) => {
    try {
      const deletedOrder =
        await Order.findByIdAndDelete(
          req.params.id
        );

      if (!deletedOrder) {
        return res.status(404).json({
          success: false,

          message:
            "Order not found.",
        });
      }

      console.log(
        "ORDER DELETED:",
        req.params.id
      );

      return res.json({
        success: true,

        message:
          "Order deleted successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE ORDER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to delete order.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
EXPORT ROUTER
==================================================
*/

module.exports = router;

