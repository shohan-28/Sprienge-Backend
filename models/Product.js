const mongoose = require("mongoose");

const sizeSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      trim: true,
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const variantSchema = new mongoose.Schema(
  {
    variantId: {
      type: String,
      required: true,
      trim: true,
    },

    color: {
      type: String,
      default: "",
      trim: true,
    },

    colorCode: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    oldPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    images: {
      type: [String],
      default: [],
    },

    sizes: {
      type: [sizeSchema],
      default: [],
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    brand: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    oldPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviews: {
      type: Number,
      default: 0,
      min: 0,
    },

    isNew: {
      type: Boolean,
      default: false,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    image: {
      type: String,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    description: {
      type: String,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    variants: {
      type: [variantSchema],
      default: [],
    },

    details: {
      shortDescription: {
        type: String,
        default: "",
      },

      overview: {
        type: String,
        default: "",
      },

      features: {
        type: [String],
        default: [],
      },

      specifications: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
      },

      howToUse: {
        type: [String],
        default: [],
      },

      careInstructions: {
        type: [String],
        default: [],
      },

      whatsIncluded: {
        type: [String],
        default: [],
      },

      deliveryInfo: {
        type: String,
        default: "",
      },

      returnPolicy: {
        type: String,
        default: "",
      },

      warranty: {
        type: String,
        default: "",
      },
    },

    // Admin fields
    sku: {
      type: String,
      default: "",
      trim: true,
    },

    barcode: {
      type: String,
      default: "",
      trim: true,
    },

    costPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    supplier: {
      type: String,
      default: "",
      trim: true,
    },

    tenantId: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);