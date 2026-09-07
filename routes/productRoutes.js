const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Product = require("../models/Product");
const StockAdjustment = require("../models/StockAdjustment");

/*
==================================================
HELPERS
==================================================
*/

const cleanString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number) ? number : fallback;
};

const toNonNegativeNumber = (value, fallback = 0) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return fallback;
  }

  return number;
};

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/*
==================================================
FIND PRODUCT BY ID
==================================================

Supports:

MongoDB _id
OR
numeric productId
==================================================
*/

const findProductById = async (id) => {
  const cleanId = cleanString(id);

  if (!cleanId) {
    return null;
  }

  /*
  ----------------------------------------------
  MongoDB ObjectId
  ----------------------------------------------
  */

  if (isValidObjectId(cleanId)) {
    const product = await Product.findById(cleanId);

    if (product) {
      return product;
    }
  }

  /*
  ----------------------------------------------
  Numeric productId
  ----------------------------------------------
  */

  if (/^\d+$/.test(cleanId)) {
    return await Product.findOne({
      productId: Number(cleanId),
    });
  }

  return null;
};

/*
==================================================
BARCODE GENERATOR
==================================================
*/

const generateBarcodeValue = () => {
  const timestamp = Date.now()
    .toString()
    .slice(-9);

  const random = Math.floor(
    100 + Math.random() * 900
  );

  return `BD${timestamp}${random}`;
};

/*
==================================================
GENERATE UNIQUE BARCODE
==================================================
*/

const generateUniqueBarcode = async () => {
  let barcode;

  do {
    barcode = generateBarcodeValue();
  } while (
    await Product.exists({
      barcode,
    })
  );

  return barcode;
};

/*
==================================================
GET NEXT PRODUCT ID
==================================================
*/

const getNextProductId = async () => {
  const lastProduct =
    await Product.findOne()
      .sort({
        productId: -1,
      })
      .select("productId")
      .lean();

  if (!lastProduct) {
    return 1;
  }

  return (
    Number(lastProduct.productId || 0) + 1
  );
};

/*
==================================================
NORMALIZE PRODUCT BODY
==================================================
*/

const normalizeProductBody = (
  body = {},
  options = {}
) => {
  const {
    includeStock = true,
  } = options;

  const data = {
    name: cleanString(body.name),

    brand: cleanString(body.brand),

    category: cleanString(body.category),

    price: toNonNegativeNumber(
      body.price
    ),

    oldPrice: toNonNegativeNumber(
      body.oldPrice
    ),

    discount: toNonNegativeNumber(
      body.discount
    ),

    rating: toNonNegativeNumber(
      body.rating
    ),

    reviews: toNonNegativeNumber(
      body.reviews
    ),

    isNew: Boolean(body.isNew),

    isFeatured: Boolean(
      body.isFeatured
    ),

    image: cleanString(body.image),

    images: Array.isArray(body.images)
      ? body.images
          .map(cleanString)
          .filter(Boolean)
      : [],

    description: cleanString(
      body.description
    ),

    tags: Array.isArray(body.tags)
      ? body.tags
          .map(cleanString)
          .filter(Boolean)
      : [],

    variants: Array.isArray(
      body.variants
    )
      ? body.variants
      : [],

    details:
      body.details &&
      typeof body.details === "object"
        ? body.details
        : {},

    sku: cleanString(body.sku),

    barcode: cleanString(
      body.barcode
    ),

    costPrice: toNonNegativeNumber(
      body.costPrice
    ),

    supplier: cleanString(
      body.supplier
    ),

    tenantId: cleanString(
      body.tenantId
    ),
  };

  /*
  ----------------------------------------------
  STOCK
  ----------------------------------------------
  */

  if (includeStock) {
    data.stock =
      toNonNegativeNumber(
        body.stock
      );
  }

  return data;
};

/*
==================================================
VALIDATE PRICE
==================================================
*/

const validatePrice = (body) => {
  if (
    body.price === undefined ||
    body.price === null ||
    body.price === ""
  ) {
    return {
      valid: false,
      message:
        "Product price is required",
    };
  }

  const price = Number(body.price);

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {
    return {
      valid: false,
      message:
        "Valid product price is required",
    };
  }

  return {
    valid: true,
    value: price,
  };
};

/*
==================================================
CREATE PRODUCT
POST /api/products
==================================================
*/

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    /*
    ----------------------------------------------
    NAME VALIDATION
    ----------------------------------------------
    */

    const name = cleanString(
      body.name
    );

    if (!name) {
      return res.status(400).json({
        success: false,
        message:
          "Product name is required",
      });
    }

    /*
    ----------------------------------------------
    PRICE VALIDATION
    ----------------------------------------------
    */

    const priceValidation =
      validatePrice(body);

    if (!priceValidation.valid) {
      return res.status(400).json({
        success: false,
        message:
          priceValidation.message,
      });
    }

    /*
    ----------------------------------------------
    PRODUCT ID
    ----------------------------------------------
    */

    let productId;

    if (
      body.productId !==
        undefined &&
      body.productId !== null &&
      body.productId !== ""
    ) {
      productId = Number(
        body.productId
      );

      if (
        !Number.isInteger(
          productId
        ) ||
        productId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "productId must be a positive integer",
        });
      }

      const existingProduct =
        await Product.findOne({
          productId,
        })
          .select("_id")
          .lean();

      if (existingProduct) {
        return res.status(409).json({
          success: false,
          message:
            "This productId already exists",
        });
      }
    } else {
      productId =
        await getNextProductId();
    }

    /*
    ----------------------------------------------
    NORMALIZE DATA
    ----------------------------------------------
    */

    const productData =
      normalizeProductBody(body, {
        includeStock: true,
      });

    /*
    ----------------------------------------------
    BARCODE
    ----------------------------------------------
    */

    if (!productData.barcode) {
      productData.barcode =
        await generateUniqueBarcode();
    } else {
      const existingBarcode =
        await Product.findOne({
          barcode:
            productData.barcode,
        })
          .select("_id")
          .lean();

      if (existingBarcode) {
        return res.status(409).json({
          success: false,
          message:
            "This barcode already exists",
        });
      }
    }

    /*
    ----------------------------------------------
    CREATE
    ----------------------------------------------
    */

    let product;

    try {
      product =
        await Product.create({
          productId,
          ...productData,
        });
    } catch (createError) {
      /*
      ------------------------------------------
      PRODUCT ID COLLISION
      ------------------------------------------
      */

      if (
        createError?.code === 11000 &&
        createError?.keyPattern
          ?.productId
      ) {
        const retryProductId =
          await getNextProductId();

        product =
          await Product.create({
            productId:
              retryProductId,
            ...productData,
          });
      } else {
        throw createError;
      }
    }

    /*
    ----------------------------------------------
    RESPONSE
    ----------------------------------------------
    */

    return res.status(201).json({
      success: true,
      message:
        "Product created successfully",
      product,
    });
  } catch (error) {
    console.error(
      "CREATE PRODUCT ERROR:",
      error
    );

    /*
    ----------------------------------------------
    DUPLICATE KEY
    ----------------------------------------------
    */

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Duplicate product data found",
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create product",
      error: error.message,
    });
  }
});

/*
==================================================
GET ALL PRODUCTS
GET /api/products
==================================================
*/

router.get("/", async (req, res) => {
  try {
    const products =
      await Product.find()
        .sort({
          createdAt: -1,
        })
        .lean();

    return res.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error(
      "GET PRODUCTS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch products",
      error: error.message,
    });
  }
});

/*
==================================================
GENERATE BARCODE
GET /api/products/barcode/generate
==================================================

IMPORTANT:
This route MUST be before /:id
==================================================
*/

router.get(
  "/barcode/generate",
  async (req, res) => {
    try {
      const barcode =
        await generateUniqueBarcode();

      return res.json({
        success: true,
        barcode,
      });
    } catch (error) {
      console.error(
        "GENERATE BARCODE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to generate barcode",
        error: error.message,
      });
    }
  }
);

/*
==================================================
GET SINGLE PRODUCT
GET /api/products/:id
==================================================
*/

router.get("/:id", async (req, res) => {
  try {
    const product =
      await findProductById(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found",
      });
    }

    return res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error(
      "GET PRODUCT ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch product",
      error: error.message,
    });
  }
});

/*
==================================================
UPDATE PRODUCT
PUT /api/products/:id
==================================================

IMPORTANT:
Stock is NOT updated here.

Use:

PATCH /api/products/:id/stock

for stock changes.

This keeps stock history accurate.
==================================================
*/

router.put("/:id", async (req, res) => {
  try {
    const product =
      await findProductById(
        req.params.id
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found",
      });
    }

    const body = req.body || {};

    /*
    ----------------------------------------------
    NAME
    ----------------------------------------------
    */

    if (body.name !== undefined) {
      const name =
        cleanString(body.name);

      if (!name) {
        return res.status(400).json({
          success: false,
          message:
            "Product name cannot be empty",
        });
      }

      product.name = name;
    }

    /*
    ----------------------------------------------
    BASIC STRING FIELDS
    ----------------------------------------------
    */

    const stringFields = [
      "brand",
      "category",
      "image",
      "description",
      "sku",
      "supplier",
      "tenantId",
    ];

    stringFields.forEach(
      (field) => {
        if (
          body[field] !== undefined
        ) {
          product[field] =
            cleanString(
              body[field]
            );
        }
      }
    );

    /*
    ----------------------------------------------
    NUMERIC FIELDS
    ----------------------------------------------
    
    NOTE:
    stock intentionally excluded.
    ----------------------------------------------
    */

    const numericFields = [
      "price",
      "oldPrice",
      "discount",
      "rating",
      "reviews",
      "costPrice",
    ];

    for (const field of numericFields) {
      if (
        body[field] !== undefined
      ) {
        const value = Number(
          body[field]
        );

        if (
          !Number.isFinite(value) ||
          value < 0
        ) {
          return res.status(400).json({
            success: false,
            message: `${field} must be a non-negative number`,
          });
        }

        product[field] = value;
      }
    }

    /*
    ----------------------------------------------
    BOOLEANS
    ----------------------------------------------
    */

    if (
      body.isNew !== undefined
    ) {
      product.isNew =
        body.isNew === true ||
        body.isNew === "true" ||
        body.isNew === 1 ||
        body.isNew === "1";
    }

    if (
      body.isFeatured !== undefined
    ) {
      product.isFeatured =
        body.isFeatured === true ||
        body.isFeatured === "true" ||
        body.isFeatured === 1 ||
        body.isFeatured === "1";
    }

    /*
    ----------------------------------------------
    IMAGES
    ----------------------------------------------
    */

    if (Array.isArray(body.images)) {
      product.images =
        body.images
          .map(cleanString)
          .filter(Boolean);
    }

    /*
    ----------------------------------------------
    TAGS
    ----------------------------------------------
    */

    if (Array.isArray(body.tags)) {
      product.tags =
        body.tags
          .map(cleanString)
          .filter(Boolean);
    }

    /*
    ----------------------------------------------
    VARIANTS
    ----------------------------------------------
    */

    if (
      Array.isArray(
        body.variants
      )
    ) {
      product.variants =
        body.variants;
    }

    /*
    ----------------------------------------------
    DETAILS
    ----------------------------------------------
    */

    if (
      body.details &&
      typeof body.details ===
        "object" &&
      !Array.isArray(
        body.details
      )
    ) {
      product.details =
        body.details;
    }

    /*
    ----------------------------------------------
    BARCODE
    ----------------------------------------------
    */

    if (
      body.barcode !== undefined
    ) {
      const barcode =
        cleanString(
          body.barcode
        );

      if (!barcode) {
        return res.status(400).json({
          success: false,
          message:
            "Barcode cannot be empty",
        });
      }

      const existingBarcode =
        await Product.findOne({
          barcode,
          _id: {
            $ne: product._id,
          },
        })
          .select("_id")
          .lean();

      if (existingBarcode) {
        return res.status(409).json({
          success: false,
          message:
            "This barcode already exists",
        });
      }

      product.barcode = barcode;
    }

    /*
    ----------------------------------------------
    SAVE
    ----------------------------------------------
    */

    await product.save();

    return res.json({
      success: true,
      message:
        "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error(
      "UPDATE PRODUCT ERROR:",
      error
    );

    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Duplicate product data found",
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update product",
      error: error.message,
    });
  }
});

/*
==================================================
DELETE PRODUCT
DELETE /api/products/:id
==================================================
*/

router.delete(
  "/:id",
  async (req, res) => {
    try {
      const product =
        await findProductById(
          req.params.id
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      /*
      ------------------------------------------
      DELETE STOCK HISTORY
      ------------------------------------------
      */

      await StockAdjustment.deleteMany(
        {
          product: product._id,
        }
      );

      /*
      ------------------------------------------
      DELETE PRODUCT
      ------------------------------------------
      */

      await Product.deleteOne({
        _id: product._id,
      });

      return res.json({
        success: true,
        message:
          "Product deleted successfully",
      });
    } catch (error) {
      console.error(
        "DELETE PRODUCT ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to delete product",
        error: error.message,
      });
    }
  }
);

/*
==================================================
ADJUST STOCK
PATCH /api/products/:id/stock
==================================================

BODY:

{
  "delta": 10,
  "reason": "New stock received",
  "adminId": "admin-001"
}

OR

{
  "delta": -5,
  "reason": "Damaged items",
  "adminId": "admin-001"
}

==================================================
*/

router.patch(
  "/:id/stock",
  async (req, res) => {
    try {
      const id =
        cleanString(
          req.params.id
        );

      const delta = Number(
        req.body?.delta
      );

      const reason =
        cleanString(
          req.body?.reason
        );

      const adminId =
        cleanString(
          req.body?.adminId
        );

      /*
      ----------------------------------------------
      VALIDATE DELTA
      ----------------------------------------------
      */

      if (
        !Number.isFinite(delta) ||
        delta === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Stock delta must be a non-zero number",
        });
      }

      /*
      ----------------------------------------------
      DELTA MUST BE INTEGER
      ----------------------------------------------
      */

      if (
        !Number.isInteger(delta)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Stock delta must be an integer",
        });
      }

      /*
      ----------------------------------------------
      FIND PRODUCT
      ----------------------------------------------
      */

      const existingProduct =
        await findProductById(id);

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      /*
      ----------------------------------------------
      ATOMIC STOCK UPDATE
      ----------------------------------------------
      */

      let updatedProduct;

      if (delta > 0) {
        /*
        ------------------------------------------
        ADD STOCK
        ------------------------------------------
        */

        updatedProduct =
          await Product.findOneAndUpdate(
            {
              _id:
                existingProduct._id,
            },
            {
              $inc: {
                stock: delta,
              },
            },
            {
              new: true,
            }
          );
      } else {
        /*
        ------------------------------------------
        REMOVE STOCK
        ------------------------------------------

        stock >= Math.abs(delta)

        This prevents negative stock.
        ------------------------------------------
        */

        const removeAmount =
          Math.abs(delta);

        updatedProduct =
          await Product.findOneAndUpdate(
            {
              _id:
                existingProduct._id,

              stock: {
                $gte:
                  removeAmount,
              },
            },
            {
              $inc: {
                stock: -removeAmount,
              },
            },
            {
              new: true,
            }
          );

        /*
        ------------------------------------------
        INSUFFICIENT STOCK
        ------------------------------------------
        */

        if (!updatedProduct) {
          const latestProduct =
            await Product.findById(
              existingProduct._id
            )
              .select(
                "stock productId name"
              )
              .lean();

          const currentStock =
            Number(
              latestProduct?.stock ||
                0
            );

          return res.status(400).json({
            success: false,
            message:
              `Insufficient stock. Current stock: ${currentStock}`,
            currentStock,
          });
        }
      }

      /*
      ----------------------------------------------
      CALCULATE BEFORE
      ----------------------------------------------
      */

      const after =
        Number(
          updatedProduct.stock ||
            0
        );

      const before =
        after - delta;

      /*
      ----------------------------------------------
      CREATE STOCK HISTORY
      ----------------------------------------------
      */

      const adjustment =
        await StockAdjustment.create(
          {
            product:
              updatedProduct._id,

            productId:
              updatedProduct.productId,

            productName:
              updatedProduct.name,

            delta,

            before,

            after,

            reason,

            adminId,
          }
        );

      /*
      ----------------------------------------------
      RESPONSE
      ----------------------------------------------
      */

      return res.json({
        success: true,
        message:
          "Stock adjusted successfully",

        product:
          updatedProduct,

        adjustment,
      });
    } catch (error) {
      console.error(
        "ADJUST STOCK ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to adjust stock",
        error: error.message,
      });
    }
  }
);

/*
==================================================
STOCK HISTORY
GET /api/products/:id/stock-adjustments
==================================================
*/

router.get(
  "/:id/stock-adjustments",
  async (req, res) => {
    try {
      const product =
        await findProductById(
          req.params.id
        );

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      const adjustments =
        await StockAdjustment.find({
          product: product._id,
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      return res.json({
        success: true,
        count:
          adjustments.length,
        adjustments,
      });
    } catch (error) {
      console.error(
        "STOCK HISTORY ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch stock history",
        error: error.message,
      });
    }
  }
);

/*
==================================================
MODULE EXPORT
==================================================
*/

module.exports = router;