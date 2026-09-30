const mongoose = require("mongoose");

const courierEventSchema = new mongoose.Schema(
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
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    productId: {
      type: Number,
      required: true,
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
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // ==========================================
    // CUSTOMER
    // ==========================================

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

    // Delivery Area
    // inside-dhaka  = ৳60
    // outside-dhaka = ৳100
    deliveryArea: {
      type: String,
      enum: ["inside-dhaka", "outside-dhaka"],
      required: true,
      trim: true,
    },

    // ==========================================
    // PRODUCT BACKWARD COMPATIBILITY
    // ==========================================

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
      min: 0,
    },

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    // ==========================================
    // MULTIPLE PRODUCTS
    // ==========================================

    items: {
      type: [orderItemSchema],
      default: [],
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveryCharge: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
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

    // ==========================================
    // PAYMENT
    // ==========================================

    paymentMethod: {
      type: String,
      default: "cod",
    },

    paymentStatus: {
      type: String,
      default: "pending",
    },

    // ==========================================
    // ORDER STATUS
    // ==========================================

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

    // ==========================================
    // ORDER SOURCE
    // ==========================================

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

    // ==========================================
    // ADMIN ORDER
    // ==========================================

    officeOrderNote: {
      type: String,
      default: "",
    },

    createdBy: {
      type: String,
      default: null,
    },

    // ==========================================
    // COURIER
    // ==========================================

    courier: {
      type: String,
      default: null,
    },

    courierStatus: {
      type: String,
      default: null,
    },

    consignmentId: {
      type: String,
      default: null,
    },

    trackingCode: {
      type: String,
      default: null,
    },

    parcelCreatedAt: {
      type: Date,
      default: null,
    },

    parcelError: {
      type: String,
      default: null,
    },

    courierHistory: {
      type: [courierEventSchema],
      default: [],
    },

    // ==========================================
    // PRINT
    // ==========================================

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
    },

    printedAt: {
      type: Date,
      default: null,
    },

    // ==========================================
    // RETURN / REFUND
    // ==========================================

    returnReason: {
      type: String,
      default: "",
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

module.exports = mongoose.model("Order", orderSchema);