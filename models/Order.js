const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      default: "",
    },

    productName: {
      type: String,
      default: "",
    },

    productImage: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      default: 0,
    },

    quantity: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Customer Information
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

    district: {
      type: String,
      default: "",
      trim: true,
    },

    thana: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    // Product Information
    productId: {
      type: String,
      default: "",
    },

    productName: {
      type: String,
      default: "",
    },

    productImage: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      default: 0,
    },

    quantity: {
      type: Number,
      default: 1,
    },

    // Multiple Items
    items: {
      type: [orderItemSchema],
      default: [],
    },

    // Payment / Amount
    subtotal: {
      type: Number,
      default: 0,
    },

    deliveryCharge: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
      default: 0,
    },

    // Order Status
    status: {
      type: String,
      enum: [
        "pending",

/*
==================================================
ORDER ITEM SCHEMA
==================================================
*/

const orderItemSchema = new mongoose.Schema(
  {
    /*
    ================================================
    PRODUCT REFERENCE
    ================================================
    */

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    /*
    ================================================
    PRODUCT DATA SNAPSHOT
    ================================================
    */

    productId: {
      type: Number,
      default: null,
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
    ================================================
    VARIANT
    ================================================
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
    ================================================
    PRICE
    ================================================
    */

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    /*
    ================================================
    QUANTITY
    ================================================
    */

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    /*
    ================================================
    ITEM SUBTOTAL
    ================================================
    */

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

/*
==================================================
COURIER HISTORY
==================================================
*/

const courierHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      default: "",
    },

    note: {
      type: String,
      default: "",
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
ORDER SCHEMA
==================================================
*/

const orderSchema = new mongoose.Schema(
  {
    /*
    ================================================
    CUSTOMER
    ================================================
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

    district: {
      type: String,
      default: "",
      trim: true,
    },

    thana: {
      type: String,
      default: "",
      trim: true,
    },

    address: {
      type: String,
      default: "",
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    ================================================
    MAIN PRODUCT
    ================================================
    */

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    productId: {
      type: Number,
      default: null,
    },

    productName: {
      type: String,
      default: "",
    },

    productImage: {
      type: String,
      default: "",
    },

    variantId: {
      type: String,
      default: "",
    },

    selectedColor: {
      type: String,
      default: "",
    },

    selectedColorCode: {
      type: String,
      default: "",
    },

    selectedSize: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      default: 0,
    },

    quantity: {
      type: Number,
      default: 1,
    },

    /*
    ================================================
    ORDER ITEMS
    ================================================
    */

    items: {
      type: [orderItemSchema],
      default: [],
    },

    /*
    ================================================
    MONEY
    ================================================
    */

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveryCharge: {
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
    ================================================
    PAYMENT
    ================================================
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
      ],
      default: "pending",
    },

    /*
    ================================================
    ORDER STATUS
    ================================================
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
    },

    /*
    ================================================
    ORDER SOURCE
    ================================================
    */

    source: {
      type: String,
      default: "website",
    },

    orderSource: {
      type: String,
      default: "website",
    },

    landingPageId: {
      type: String,
      default: "",
    },

    tenantId: {
      type: String,
      default: "",
    },

    /*
    ================================================
    COURIER
    ================================================
    */

    courier: {
      type: String,
      default: "",
    },

    courierStatus: {
      type: String,
      default: "",
    },

    consignmentId: {
      type: String,
      default: "",
    },

    trackingCode: {
      type: String,
      default: "",
    },

    parcelCreatedAt: {
      type: Date,
      default: null,
    },

    parcelError: {
      type: String,
      default: "",
    },

    courierHistory: {
      type: [courierHistorySchema],
      default: [],
    },

    /*
    ================================================
    PRINT
    ================================================
    */

    printStatus: {
      type: Boolean,
      default: false,
    },

    printedAt: {
      type: Date,
      default: null,
    },

    /*
    ================================================
    RETURN / REFUND
    ================================================
    */

    returnReason: {
      type: String,
      default: "",
    },

    refundAmount: {
      type: Number,
      default: 0,
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
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Order",
  orderSchema
);
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
        "duplicate",
      ],
      default: "pending",
    },

    // Source
    source: {
      type: String,
      default: "website",
    },

    orderSource: {
      type: String,
      default: "website",
    },

    landingPageId: {
      type: String,
      default: "",
    },

    // Tenant
    tenantId: {
      type: String,
      default: "",
    },

    // Courier
    courier: {
      type: String,
      default: "",
    },

    trackingCode: {
      type: String,
      default: "",
    },

    parcelCreatedAt: {
      type: Date,
      default: null,
    },

    // Printing
    printStatus: {
      type: Boolean,
      default: false,
    },

    printedAt: {
      type: Date,
      default: null,
    },

    // Return Information
    returnReason: {
      type: String,
      default: "",
    },

    refundAmount: {
      type: Number,
      default: 0,
    },

    refundStatus: {
      type: String,
      enum: ["pending", "processing", "refunded", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);