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
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
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