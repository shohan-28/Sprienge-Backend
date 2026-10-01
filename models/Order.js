// models/Order.js

const mongoose = require("mongoose");

/*
==================================================
COURIER EVENT SCHEMA
==================================================
*/

const courierEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      default: "",
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    at: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

/*
==================================================
ORDER ITEM SCHEMA
==================================================
*/

const orderItemSchema = new mongoose.Schema(
  {
    /*
    -----------------------------------------------
    PRODUCT REFERENCE
    -----------------------------------------------
    */

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    /*
    -----------------------------------------------
    PRODUCT IDENTIFICATION
    -----------------------------------------------
    */

    productId: {
      type: Number,
      required: true,
      min: 1,
    },

    productName: {
      type: String,
      default: "",
      trim: true,
    },

    productImage: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    -----------------------------------------------
    VARIANT
    -----------------------------------------------
    */

    variantId: {
      type: String,
      default: "",
      trim: true,
    },

    selectedColor: {
      type: String,
      default: "",
      trim: true,
    },

    selectedColorCode: {
      type: String,
      default: "",
      trim: true,
    },

    selectedSize: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    -----------------------------------------------
    PRICE
    -----------------------------------------------
    */

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  {
    _id: false,
  }
);

/*
==================================================
ORDER SCHEMA
==================================================
*/

const orderSchema = new mongoose.Schema(
  {
    /*
    ==================================================
    CUSTOMER INFORMATION
    ==================================================
    */

    name: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    /*
    IMPORTANT:
    Customer এখন পুরো address একসাথে লিখবে।
    District / Thana আলাদা field নেই।
    */

    address: {
      type: String,
      required: true,
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    ==================================================
    DELIVERY AREA
    ==================================================
    
    inside-dhaka  = ৳60
    outside-dhaka = ৳100
    */

    deliveryArea: {
      type: String,
      enum: [
        "inside-dhaka",
        "outside-dhaka",
      ],
      required: true,
      trim: true,
    },

    /*
    ==================================================
    PRODUCT BACKWARD COMPATIBILITY
    ==================================================

    These fields are kept because older orders may
    still contain single-product data at top level.
    New orders primarily use `items`.
    */

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    productId: {
      type: Number,
      default: null,
      min: 1,
    },

    productName: {
      type: String,
      default: "",
      trim: true,
    },

    productImage: {
      type: String,
      default: "",
      trim: true,
    },

    variantId: {
      type: String,
      default: "",
      trim: true,
    },

    selectedColor: {
      type: String,
      default: "",
      trim: true,
    },

    selectedColorCode: {
      type: String,
      default: "",
      trim: true,
    },

    selectedSize: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    /*
    ==================================================
    MULTIPLE PRODUCTS
    ==================================================
    */

    items: {
      type: [orderItemSchema],
      default: [],
    },

    /*
    ==================================================
    PRICE CALCULATION
    ==================================================
    */

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveryCharge: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    additionalDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    advanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
    ==================================================
    PAYMENT
    ==================================================
    */

    paymentMethod: {
      type: String,
      default: "cod",
      trim: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
      ],
      default: "pending",
      trim: true,
    },

    /*
    ==================================================
    ORDER STATUS
    ==================================================
    */

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
        "duplicate",
      ],
      default: "pending",
      trim: true,
    },

    /*
    ==================================================
    ORDER SOURCE
    ==================================================
    */

    source: {
      type: String,
      enum: [
        "phone",
        "whatsapp",
        "facebook",
        "website",
        "walkin",
        "other",
      ],
      default: "website",
      trim: true,
    },

    orderSource: {
      type: String,
      default: "website",
      trim: true,
    },

    landingPageId: {
      type: String,
      default: "",
      trim: true,
    },

    tenantId: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    ==================================================
    ADMIN ORDER INFORMATION
    ==================================================
    */

    officeOrderNote: {
      type: String,
      default: "",
      trim: true,
    },

    createdBy: {
      type: String,
      default: null,
      trim: true,
    },

    /*
    ==================================================
    COURIER
    ==================================================
    */

    courier: {
      type: String,
      default: null,
      trim: true,
    },

    courierStatus: {
      type: String,
      default: null,
      trim: true,
    },

    consignmentId: {
      type: String,
      default: null,
      trim: true,
    },

    trackingCode: {
      type: String,
      default: null,
      trim: true,
    },

    parcelCreatedAt: {
      type: Date,
      default: null,
    },

    parcelError: {
      type: String,
      default: null,
      trim: true,
    },

    courierHistory: {
      type: [courierEventSchema],
      default: [],
    },

    /*
    ==================================================
    PRINT
    ==================================================
    */

    printStatus: {
      type: String,
      enum: [
        "not_printed",
        "queued",
        "printing",
        "printed",
        "failed",
      ],
      default: "not_printed",
      trim: true,
    },

    printedAt: {
      type: Date,
      default: null,
    },

    /*
    ==================================================
    RETURN / REFUND
    ==================================================
    */

    returnReason: {
      type: String,
      default: "",
      trim: true,
    },

    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    refundStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "refunded",
        "rejected",
      ],
      default: "pending",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
==================================================
INDEXES
==================================================
*/

orderSchema.index({
  phone: 1,
});

orderSchema.index({
  status: 1,
});

orderSchema.index({
  createdAt: -1,
});

orderSchema.index({
  consignmentId: 1,
});

/*
==================================================
MODEL
==================================================
*/

module.exports =
  mongoose.models.Order ||
  mongoose.model("Order", orderSchema);