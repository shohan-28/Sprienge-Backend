
const mongoose = require("mongoose");

/*
==================================================
ORDER ITEM SCHEMA
==================================================
*/

const orderItemSchema = new mongoose.Schema(
  {
    // Product Reference
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    // Product Data Snapshot
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

    // Variant
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

    // Price
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Quantity
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    // Item Subtotal
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
COURIER HISTORY SCHEMA
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
      trim: true,
    },

    productImage: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    ================================================
    MAIN PRODUCT VARIANT
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

    /*
    ================================================
    TENANT
    ================================================
    */

    tenantId: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    ================================================
    COURIER
    ================================================
    */

    courier: {
      type: String,
      default: "",
      trim: true,
    },

    courierStatus: {
      type: String,
      default: "",
      trim: true,
    },

    consignmentId: {
      type: String,
      default: "",
      trim: true,
    },

    trackingCode: {
      type: String,
      default: "",
      trim: true,
    },

    parcelCreatedAt: {
      type: Date,
      default: null,
    },

    parcelError: {
      type: String,
      default: "",
      trim: true,
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
    },
  },
  {
    timestamps: true,
  }
);

/*
==================================================
MODEL EXPORT
==================================================
*/

module.exports = mongoose.model("Order", orderSchema);
