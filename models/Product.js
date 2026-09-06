const mongoose = require("mongoose");

/*
==================================================
SIZE SCHEMA
==================================================
*/

const sizeSchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
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

/*
==================================================
VARIANT SCHEMA
==================================================
*/

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
      required: true,
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

/*
==================================================
DETAILS SCHEMA
==================================================
*/

const detailsSchema = new mongoose.Schema(
  {
    shortDescription: {
      type: String,
      default: "",
      trim: true,
    },

    overview: {
      type: String,
      default: "",
      trim: true,
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
      type: String,
      default: "",
      trim: true,
    },

    careInstructions: {
      type: String,
      default: "",
      trim: true,
    },

    whatsIncluded: {
      type: [String],
      default: [],
    },

    deliveryInfo: {
      type: String,
      default: "",
      trim: true,
    },

    returnPolicy: {
      type: String,
      default: "",
      trim: true,
    },

    warranty: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

/*
==================================================
PRODUCT SCHEMA
==================================================
*/

const productSchema = new mongoose.Schema(
  {
    /*
    ================================================
    STABLE PRODUCT ID
    ================================================
    */

    productId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },

    /*
    ================================================
    BASIC INFO
    ================================================
    */

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

    /*
    ================================================
    STOCK
    ================================================
    */

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    /*
    ================================================
    RATING
    ================================================
    */

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

    /*
    ================================================
    FLAGS
    ================================================
    */

    isNew: {
      type: Boolean,
      default: false,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    /*
    ================================================
    IMAGE
    ================================================
    */

    image: {
      type: String,
      default: "",
      trim: true,
    },

    images: {
      type: [String],
      default: [],
    },

    /*
    ================================================
    DESCRIPTION
    ================================================
    */

    description: {
      type: String,
      default: "",
      trim: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    /*
    ================================================
    VARIANTS
    ================================================
    */

    variants: {
      type: [variantSchema],
      default: [],
    },

    /*
    ================================================
    DETAILS
    ================================================
    */

    details: {
      type: detailsSchema,
      default: () => ({}),
    },

    /*
    ================================================
    TENANT
    ================================================
    */

    tenantId: {
      type: String,
      default: "",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Product", productSchema);