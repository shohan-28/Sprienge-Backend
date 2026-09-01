
const mongoose = require("mongoose");


// ============================================================
// COURIER EVENT SCHEMA
// ============================================================

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
  {
    _id: false,
  }
);


// ============================================================
// ORDER ITEM SCHEMA
// ============================================================

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.Mixed,
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

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    // IMPORTANT:
    // This stores the quantity of this particular product.
    //
    // Example:
    // quantity = 2
    // means customer ordered 2 pieces.
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    _id: false,
  }
);


// ============================================================
// ORDER SCHEMA
// ============================================================

const orderSchema = new mongoose.Schema(
  {

    // ==========================================================
    // CUSTOMER INFORMATION
    // ==========================================================

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
      required: true,
      trim: true,
    },

    thana: {
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


    // ==========================================================
    // SINGLE PRODUCT INFORMATION
    //
    // Used mainly by Landing Page / Single Product Order.
    // ==========================================================

    productId: {
      type: mongoose.Schema.Types.Mixed,
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

    price: {
      type: Number,
      default: 0,
      min: 0,
    },


    // ==========================================================
    // IMPORTANT QUANTITY
    //
    // Landing Page:
    //
    // quantity = 1 → 1 piece
    // quantity = 2 → 2 pieces
    // quantity = 3 → 3 pieces
    //
    // ==========================================================

    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },


    // ==========================================================
    // ORDER ITEMS
    //
    // Supports multiple products.
    // ==========================================================

    items: {
      type: [orderItemSchema],
      default: [],
    },


    // ==========================================================
    // PRICE INFORMATION
    // ==========================================================

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


    // ==========================================================
    // ORDER STATUS
    // ==========================================================

    status: {
      type: String,
      default: "pending",
    },


    // ==========================================================
    // STEADFAST COURIER
    // ==========================================================

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


    // ==========================================================
    // LABEL PRINT TRACKING
    // ==========================================================

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


    // ==========================================================
    // ADMIN / TENANT INFORMATION
    // ==========================================================

    tenantId: {
      type: String,
      default: null,
    },


    // ==========================================================
    // ORDER SOURCE
    // ==========================================================

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


    // ==========================================================
    // LANDING PAGE SOURCE
    //
    // Example:
    //
    // orderSource = "landing-page"
    // landingPageId = "2"
    //
    // ==========================================================

    orderSource: {
      type: String,
      default: "website",
    },

    landingPageId: {
      type: String,
      default: "",
    },


    // ==========================================================
    // ADMIN INTERNAL NOTE
    // ==========================================================

    officeOrderNote: {
      type: String,
      default: "",
    },


    // ==========================================================
    // ADVANCE / DISCOUNT
    // ==========================================================

    advanceAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    additionalDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },


    // ==========================================================
    // CREATED BY ADMIN
    // ==========================================================

    createdBy: {
      type: String,
      default: null,
    },


    // ==========================================================
    // RETURN / REFUND
    // ==========================================================

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
      ],

      default: "pending",
    },
  },

  {
    timestamps: true,
  }
);


// ============================================================
// EXPORT MODEL
// ============================================================

module.exports =
  mongoose.model("Order", orderSchema);

