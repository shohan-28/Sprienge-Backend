const mongoose = require("mongoose");

const stockAdjustmentSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    productId: {
      type: Number,
      required: true,
    },

    productName: {
      type: String,
      default: "",
    },

    delta: {
      type: Number,
      required: true,
    },

    before: {
      type: Number,
      required: true,
    },

    after: {
      type: Number,
      required: true,
    },

    reason: {
      type: String,
      default: "",
      trim: true,
    },

    adminId: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "StockAdjustment",
  stockAdjustmentSchema
);