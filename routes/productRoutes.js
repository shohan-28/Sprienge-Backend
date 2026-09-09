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
FIND PRODUCT
Supports MongoDB _id OR numeric productId
==================================================
*/

const findProductById = async (id) => {
  const cleanId = cleanString(id);

  if (!cleanId) {
    return null;
  }

  if (isValidObjectId(cleanId)) {
    const product = await Product.findById(cleanId);

    if (product) {
      return product;
    }
  }

  if (/^\d+$/.test(cleanId)) {
    return await Product.findOne({
      productId: Number(cleanId),
    });
  }

  return null;
};

/*
==================================================
BARCODE
==================================================
*/

const generateBarcodeValue = () => {
  const timestamp = Date.now().toString().slice(-9);

  const random = Math.floor(
    100 + Math.random() * 900
  );

  return `BD${timestamp}${random}`;
};

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
NEXT PRODUCT ID
==================================================
*/

const getNextProductId = async () => {
  const lastProduct = await Product.findOne()
    .sort({
      productId: -1,
    })
    .select("productId")
    .lean();

  if (!lastProduct) {
    return 1;
  }

  return Number(lastProduct.productId || 0) + 1;
};

/*
==================================================
NORMALIZE SIZES
==================================================
*/

const normalizeSizes = (sizes) => {
  if (!Array.isArray(sizes)) {
    return [];
  }

  return sizes
    .map((item) => {
      const size = cleanString(item?.size);

      const stock = toNonNegativeNumber(
        item?.stock
      );

      return {
        size,
        stock,
      };
    })
    .filter((item) => item.size);
};

/*
==================================================
NORMALIZE VARIANTS
==================================================
*/

const normalizeVariants = (variants) => {
  if (!Array.isArray(variants)) {
    return [];
  }

  return variants
    .map((variant, index) => {
      const variantId =
        cleanString(
          variant?.variantId
        ) ||
        `variant-${Date.now()}-${index + 1}`;

      const color = cleanString(
        variant?.color
      );

      const colorCode = cleanString(
        variant?.colorCode
      );

      const price = toNonNegativeNumber(
        variant?.price
      );

      const oldPrice =
        toNonNegativeNumber(
          variant?.oldPrice
        );

      const stock =
        toNonNegativeNumber(
          variant?.stock
        );

      const images = Array.isArray(
        variant?.images
      )
        ? variant.images
            .map(cleanString)
            .filter(Boolean)
        : [];

      const sizes = normalizeSizes(
        variant?.sizes
      );

      return {
        variantId,
        color,
        colorCode,
        price,
        oldPrice,
        stock,
        images,
        sizes,
      };
    });
};

/*
==================================================
VALIDATE VARIANTS
==================================================
*/

const validateVariants = (variants) => {
  if (!Array.isArray(variants)) {
    return {
      valid: true,
      variants: [],
    };
  }

  const normalized =
    normalizeVariants(variants);

  const variantIds = new Set();

  for (
    let index = 0;
    index < normalized.length;
    index++
  ) {
    const variant =
      normalized[index];

    if (!variant.variantId) {
      return {
        valid: false,
        message: `Variant ${
          index + 1
        } must have a variantId.`,
      };
    }

    if (
      variantIds.has(
        variant.variantId
      )
    ) {
      return {
        valid: false,
        message: `Duplicate variantId "${variant.variantId}" found.`,
      };
    }

    variantIds.add(
      variant.variantId
    );

    const sizeNames =
      new Set();

    for (
      let sizeIndex = 0;
      sizeIndex <
      variant.sizes.length;
      sizeIndex++
    ) {
      const size =
        variant.sizes[sizeIndex];

      if (!size.size) {
        return {
          valid: false,
          message: `Size ${
            sizeIndex + 1
          } in variant "${variant.variantId}" is invalid.`,
        };
      }

      if (
        sizeNames.has(
          size.size.toLowerCase()
        )
      ) {
        return {
          valid: false,
          message: `Duplicate size "${size.size}" found in variant "${variant.variantId}".`,
        };
      }

      sizeNames.add(
        size.size.toLowerCase()
      );
    }
  }

  return {
    valid: true,
    variants: normalized,
  };
};

/*
==================================================
CALCULATE TOTAL VARIANT STOCK
==================================================

If a variant has sizes:
  size stocks are counted.

If a variant has no sizes:
  variant.stock is counted.
==================================================
*/

const calculateVariantTotalStock = (
  variants
) => {
  if (
    !Array.isArray(variants) ||
    variants.length === 0
  ) {
    return 0;
  }

  return variants.reduce(
    (total, variant) => {
      if (
        Array.isArray(
          variant.sizes
        ) &&
        variant.sizes.length > 0
      ) {
        return (
          total +
          variant.sizes.reduce(
            (
              sizeTotal,
              size
            ) =>
              sizeTotal +
              Number(
                size.stock || 0
              ),
            0
          )
        );
      }

      return (
        total +
        Number(
          variant.stock || 0
        )
      );
    },
    0
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

  const variantsValidation =
    validateVariants(
      body.variants
    );

  if (
    !variantsValidation.valid
  ) {
    throw new Error(
      variantsValidation.message
    );
  }

  const data = {
    name: cleanString(
      body.name
    ),

    brand: cleanString(
      body.brand
    ),

    category: cleanString(
      body.category
    ),

    price:
      toNonNegativeNumber(
        body.price
      ),

    oldPrice:
      toNonNegativeNumber(
        body.oldPrice
      ),

    discount:
      toNonNegativeNumber(
        body.discount
      ),

    rating:
      toNonNegativeNumber(
        body.rating
      ),

    reviews:
      toNonNegativeNumber(
        body.reviews
      ),

    isNew:
      Boolean(body.isNew),

    isFeatured:
      Boolean(body.isFeatured),

    image:
      cleanString(body.image),

    images:
      Array.isArray(body.images)
        ? body.images
            .map(cleanString)
            .filter(Boolean)
        : [],

    description:
      cleanString(
        body.description
      ),

    tags:
      Array.isArray(body.tags)
        ? body.tags
            .map(cleanString)
            .filter(Boolean)
        : [],

    variants:
      variantsValidation.variants,

    details:
      body.details &&
      typeof body.details ===
        "object" &&
      !Array.isArray(
        body.details
      )
        ? body.details
        : {},

    sku:
      cleanString(body.sku),

    barcode:
      cleanString(
        body.barcode
      ),

    costPrice:
      toNonNegativeNumber(
        body.costPrice
      ),

    supplier:
      cleanString(
        body.supplier
      ),

    tenantId:
      cleanString(
        body.tenantId
      ),
  };

  if (includeStock) {
    /*
    If variants exist, calculate
    product stock from variants.

    If no variants exist, use
    normal product stock.
    */

    if (
      data.variants.length > 0
    ) {
      data.stock =
        calculateVariantTotalStock(
          data.variants
        );
    } else {
      data.stock =
        toNonNegativeNumber(
          body.stock
        );
    }
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

  const price = Number(
    body.price
  );

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
    const body =
      req.body || {};

    const name =
      cleanString(
        body.name
      );

    if (!name) {
      return res.status(400).json({
        success: false,
        message:
          "Product name is required",
      });
    }

    const priceValidation =
      validatePrice(body);

    if (
      !priceValidation.valid
    ) {
      return res.status(400).json({
        success: false,
        message:
          priceValidation.message,
      });
    }

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

    let productData;

    try {
      productData =
        normalizeProductBody(
          body,
          {
            includeStock: true,
          }
        );
    } catch (error) {
      return res.status(400).json({
        success: false,
        message:
          error.message,
      });
    }

    if (
      !productData.barcode
    ) {
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

    let product;

    try {
      product =
        await Product.create({
          productId,
          ...productData,
        });
    } catch (createError) {
      if (
        createError?.code ===
          11000 &&
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

    if (
      error?.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Duplicate product data found",
        error:
          error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to create product",
      error:
        error.message,
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
      count:
        products.length,
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
      error:
        error.message,
    });
  }
});

/*
==================================================
GENERATE BARCODE
GET /api/products/barcode/generate
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
        error:
          error.message,
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

router.get(
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
        error:
          error.message,
      });
    }
  }
);

/*
==================================================
UPDATE PRODUCT
PUT /api/products/:id
==================================================
*/

router.put(
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

      const body =
        req.body || {};

      /*
      ----------------------------------------------
      NAME
      ----------------------------------------------
      */

      if (
        body.name !==
        undefined
      ) {
        const name =
          cleanString(
            body.name
          );

        if (!name) {
          return res.status(400).json({
            success: false,
            message:
              "Product name cannot be empty",
          });
        }

        product.name =
          name;
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
            body[field] !==
            undefined
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
      */

      const numericFields = [
        "price",
        "oldPrice",
        "discount",
        "rating",
        "reviews",
        "costPrice",
      ];

      for (
        const field of numericFields
      ) {
        if (
          body[field] !==
          undefined
        ) {
          const value =
            Number(
              body[field]
            );

          if (
            !Number.isFinite(
              value
            ) ||
            value < 0
          ) {
            return res.status(400).json({
              success: false,
              message: `${field} must be a non-negative number`,
            });
          }

          product[field] =
            value;
        }
      }

      /*
      ----------------------------------------------
      BOOLEAN
      ----------------------------------------------
      */

      if (
        body.isNew !==
        undefined
      ) {
        product.isNew =
          body.isNew === true ||
          body.isNew ===
            "true" ||
          body.isNew === 1 ||
          body.isNew ===
            "1";
      }

      if (
        body.isFeatured !==
        undefined
      ) {
        product.isFeatured =
          body.isFeatured ===
            true ||
          body.isFeatured ===
            "true" ||
          body.isFeatured === 1 ||
          body.isFeatured ===
            "1";
      }

      /*
      ----------------------------------------------
      IMAGES
      ----------------------------------------------
      */

      if (
        Array.isArray(
          body.images
        )
      ) {
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

      if (
        Array.isArray(
          body.tags
        )
      ) {
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
        const variantsValidation =
          validateVariants(
            body.variants
          );

        if (
          !variantsValidation.valid
        ) {
          return res.status(400).json({
            success: false,
            message:
              variantsValidation.message,
          });
        }

        product.variants =
          variantsValidation.variants;

        /*
        Sync product stock
        with variants.
        */

        product.stock =
          calculateVariantTotalStock(
            product.variants
          );
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
        body.barcode !==
        undefined
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
              $ne:
                product._id,
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

        product.barcode =
          barcode;
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

      if (
        error?.code ===
        11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Duplicate product data found",
          error:
            error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to update product",
        error:
          error.message,
      });
    }
  }
);

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

      await StockAdjustment.deleteMany(
        {
          product:
            product._id,
        }
      );

      await Product.deleteOne({
        _id:
          product._id,
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
        error:
          error.message,
      });
    }
  }
);

/*
==================================================
ADJUST PRODUCT STOCK
PATCH /api/products/:id/stock
==================================================

For products WITHOUT variants.

If product has variants, use:

PATCH /api/products/:id/variant-stock
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

      const delta =
        Number(
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

      if (
        !Number.isFinite(
          delta
        ) ||
        delta === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Stock delta must be a non-zero number",
        });
      }

      if (
        !Number.isInteger(
          delta
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Stock delta must be an integer",
        });
      }

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
      Do not directly change
      product stock when variants
      exist.
      */

      if (
        Array.isArray(
          existingProduct.variants
        ) &&
        existingProduct.variants
          .length > 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This product has variants. Adjust stock using the variant-stock endpoint.",
        });
      }

      let updatedProduct;

      if (delta > 0) {
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
                stock:
                  -removeAmount,
              },
            },
            {
              new: true,
            }
          );

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

      const after =
        Number(
          updatedProduct.stock ||
            0
        );

      const before =
        after - delta;

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
        error:
          error.message,
      });
    }
  }
);

/*
==================================================
ADJUST VARIANT / SIZE STOCK
PATCH /api/products/:id/variant-stock
==================================================

BODY:

{
  "variantId": "red",
  "size": "M",
  "delta": 5,
  "reason": "New stock",
  "adminId": "admin-001"
}

For variant without sizes:

{
  "variantId": "red",
  "delta": 5
}
==================================================
*/

router.patch(
  "/:id/variant-stock",
  async (req, res) => {
    try {
      const id =
        cleanString(
          req.params.id
        );

      const variantId =
        cleanString(
          req.body?.variantId
        );

      const size =
        cleanString(
          req.body?.size
        );

      const delta =
        Number(
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

      if (!variantId) {
        return res.status(400).json({
          success: false,
          message:
            "variantId is required",
        });
      }

      if (
        !Number.isFinite(
          delta
        ) ||
        delta === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Stock delta must be a non-zero number",
        });
      }

      if (
        !Number.isInteger(
          delta
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Stock delta must be an integer",
        });
      }

      const product =
        await findProductById(id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found",
        });
      }

      const variant =
        product.variants.find(
          (item) =>
            cleanString(
              item.variantId
            ) === variantId
        );

      if (!variant) {
        return res.status(404).json({
          success: false,
          message:
            `Variant "${variantId}" not found.`,
        });
      }

      /*
      ==============================================
      VARIANT HAS SIZES
      ==============================================
      */

      if (
        Array.isArray(
          variant.sizes
        ) &&
        variant.sizes.length > 0
      ) {
        if (!size) {
          return res.status(400).json({
            success: false,
            message:
              "Size is required for this variant.",
          });
        }

        const sizeObject =
          variant.sizes.find(
            (item) =>
              cleanString(
                item.size
              ).toLowerCase() ===
              size.toLowerCase()
          );

        if (!sizeObject) {
          return res.status(404).json({
            success: false,
            message:
              `Size "${size}" not found in variant "${variantId}".`,
          });
        }

        const currentStock =
          Number(
            sizeObject.stock || 0
          );

        const newStock =
          currentStock + delta;

        if (newStock < 0) {
          return res.status(400).json({
            success: false,
            message:
              `Insufficient stock. Current stock: ${currentStock}`,
            currentStock,
          });
        }

        sizeObject.stock =
          newStock;
      }

      /*
      ==============================================
      VARIANT WITHOUT SIZES
      ==============================================
      */

      else {
        const currentStock =
          Number(
            variant.stock || 0
          );

        const newStock =
          currentStock + delta;

        if (newStock < 0) {
          return res.status(400).json({
            success: false,
            message:
              `Insufficient stock. Current stock: ${currentStock}`,
            currentStock,
          });
        }

        variant.stock =
          newStock;
      }

      /*
      ==============================================
      SYNC PRODUCT TOTAL STOCK
      ==============================================
      */

      product.stock =
        calculateVariantTotalStock(
          product.variants
        );

      await product.save();

      /*
      ==============================================
      HISTORY
      ==============================================
      */

      const after =
        size
          ? Number(
              variant.sizes.find(
                (item) =>
                  cleanString(
                    item.size
                  ).toLowerCase() ===
                  size.toLowerCase()
              )?.stock || 0
            )
          : Number(
              variant.stock || 0
            );

      const before =
        after - delta;

      const historyReason =
        [
          reason,
          `Variant: ${variantId}`,
          size
            ? `Size: ${size}`
            : "",
        ]
          .filter(Boolean)
          .join(" | ");

      const adjustment =
        await StockAdjustment.create(
          {
            product:
              product._id,

            productId:
              product.productId,

            productName:
              product.name,

            delta,

            before,

            after,

            reason:
              historyReason,

            adminId,
          }
        );

      return res.json({
        success: true,
        message:
          "Variant stock adjusted successfully",
        product,
        adjustment,
      });
    } catch (error) {
      console.error(
        "ADJUST VARIANT STOCK ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to adjust variant stock",
        error:
          error.message,
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
          product:
            product._id,
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
        error:
          error.message,
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