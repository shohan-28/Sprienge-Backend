const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Order = require("../models/Order");
const Product = require("../models/Product");

const {
  getFraudCheck,
  getBalance,
  createParcel,
} = require("../services/steadfastService");

/*
==================================================
HELPERS
==================================================
*/

const cleanString = (value) => {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
};

const normalizeProductId = (value) => {
  const id = Number(value);

  return Number.isInteger(id) && id > 0
    ? id
    : null;
};

const normalizeQuantity = (value) => {
  const quantity = Number(value);

  return Number.isInteger(quantity) && quantity > 0
    ? quantity
    : null;
};

const normalizeVariantId = (value) => {
  return cleanString(value);
};

/*
==================================================
FIND PRODUCT
==================================================
*/

const findProduct = async (productId) => {
  const normalizedId =
    normalizeProductId(productId);

  if (!normalizedId) {
    return null;
  }

  return await Product.findOne({
    productId: normalizedId,
  });
};

/*
==================================================
FIND VARIANT
==================================================

Priority:

1. variantId
2. selectedColor
==================================================
*/

const findVariant = (
  product,
  variantId,
  selectedColor
) => {
  if (
    !product ||
    !Array.isArray(product.variants) ||
    product.variants.length === 0
  ) {
    return null;
  }

  const normalizedVariantId =
    normalizeVariantId(variantId);

  const normalizedColor =
    cleanString(selectedColor).toLowerCase();

  /*
  ----------------------------------------------
  FIRST: VARIANT ID
  ----------------------------------------------
  */

  if (normalizedVariantId) {
    const variantById =
      product.variants.find(
        (variant) =>
          cleanString(
            variant?.variantId
          ) === normalizedVariantId
      );

    if (variantById) {
      return variantById;
    }
  }

  /*
  ----------------------------------------------
  SECOND: COLOR
  ----------------------------------------------
  */

  if (normalizedColor) {
    const variantByColor =
      product.variants.find(
        (variant) =>
          cleanString(
            variant?.color
          ).toLowerCase() ===
          normalizedColor
      );

    if (variantByColor) {
      return variantByColor;
    }
  }

  return null;
};

/*
==================================================
GET AVAILABLE STOCK
==================================================
*/

const getItemAvailableStock = (
  product,
  variant,
  selectedSize
) => {
  /*
  ==============================================
  PRODUCT WITHOUT VARIANT
  ==============================================
  */

  if (!variant) {
    return Number(
      product?.stock || 0
    );
  }

  /*
  ==============================================
  VARIANT WITH SIZES
  ==============================================
  */

  if (
    Array.isArray(variant.sizes) &&
    variant.sizes.length > 0
  ) {
    const normalizedSize =
      cleanString(selectedSize);

    if (!normalizedSize) {
      return 0;
    }

    const sizeObject =
      variant.sizes.find(
        (size) =>
          cleanString(
            size?.size
          ).toLowerCase() ===
          normalizedSize.toLowerCase()
      );

    if (!sizeObject) {
      return 0;
    }

    return Number(
      sizeObject.stock || 0
    );
  }

  /*
  ==============================================
  VARIANT WITHOUT SIZE
  ==============================================
  */

  return Number(
    variant.stock || 0
  );
};

/*
==================================================
GET AUTO SIZE
==================================================

If a variant has exactly one in-stock size,
automatically return that size.

Example:

sizes:
[
  {
    size: "s",
    stock: 20
  }
]

=> "s"

If multiple sizes are available,
return null.
==================================================
*/

const getAutoSelectedSize = (
  variant
) => {
  if (
    !variant ||
    !Array.isArray(variant.sizes) ||
    variant.sizes.length === 0
  ) {
    return "";
  }

  const availableSizes =
    variant.sizes.filter(
      (size) =>
        Number(size?.stock || 0) > 0 &&
        cleanString(size?.size)
    );

  if (
    availableSizes.length === 1
  ) {
    return cleanString(
      availableSizes[0]?.size
    );
  }

  return "";
};

/*
==================================================
VALIDATE PRODUCT ITEM
==================================================
*/

const validateProductItem = async (
  rawItem,
  index
) => {
  /*
  ==============================================
  PRODUCT ID
  ==============================================
  */

  const productId =
    normalizeProductId(
      rawItem?.productId ??
        rawItem?.id
    );

  if (!productId) {
    throw new Error(
      `Invalid product ID for item ${
        index + 1
      }.`
    );
  }

  /*
  ==============================================
  QUANTITY
  ==============================================
  */

  const quantity =
    normalizeQuantity(
      rawItem?.quantity ??
        rawItem?.qty
    );

  if (!quantity) {
    throw new Error(
      `Invalid quantity for product ${productId}.`
    );
  }

  /*
  ==============================================
  CUSTOMER SELECTIONS
  ==============================================
  */

  const selectedColor =
    cleanString(
      rawItem?.selectedColor ??
        rawItem?.color
    );

  const selectedColorCode =
    cleanString(
      rawItem?.selectedColorCode ??
        rawItem?.colorCode
    );

  let selectedSize =
    cleanString(
      rawItem?.selectedSize ??
        rawItem?.size
    );

  /*
  ==============================================
  VARIANT ID
  ==============================================
  */

  const variantId =
    normalizeVariantId(
      rawItem?.variantId ??
        rawItem?.selectedVariant?.variantId ??
        rawItem?.selectedVariant?.id ??
        rawItem?.variant?.variantId ??
        rawItem?.variant?.id
    );

  /*
  ==============================================
  FIND PRODUCT FROM MONGODB
  ==============================================
  */

  const product =
    await findProduct(
      productId
    );

  if (!product) {
    throw new Error(
      `Product ${productId} was not found.`
    );
  }

  /*
  ==============================================
  FIND VARIANT
  ==============================================
  */

  let variant = null;

  if (
    variantId ||
    selectedColor
  ) {
    variant =
      findVariant(
        product,
        variantId,
        selectedColor
      );

    if (!variant) {
      throw new Error(
        `Selected variant was not found for "${product.name}".`
      );
    }
  } else if (
    Array.isArray(
      product.variants
    ) &&
    product.variants.length > 0
  ) {
    /*
    If product has variants but
    frontend didn't send any variant,
    try automatic selection only when
    there is exactly one available variant.
    */

    const availableVariants =
      product.variants.filter(
        (item) => {
          if (
            Array.isArray(
              item?.sizes
            ) &&
            item.sizes.length > 0
          ) {
            return item.sizes.some(
              (size) =>
                Number(
                  size?.stock || 0
                ) > 0
            );
          }

          return (
            Number(
              item?.stock || 0
            ) > 0
          );
        }
      );

    if (
      availableVariants.length === 1
    ) {
      variant =
        availableVariants[0];
    } else {
      throw new Error(
        `Please select a variant for "${product.name}".`
      );
    }
  }

  /*
  ==============================================
  SIZE AUTO-RESOLVE
  ==============================================

  If frontend sends no size but variant has
  exactly ONE available size, use that size.

  This fixes stale/old cart payloads such as:

  selectedSize: null

  for:

  sizes: [
    {
      size: "s",
      stock: 20
    }
  ]
  ==============================================
  */

  if (
    variant &&
    Array.isArray(
      variant.sizes
    ) &&
    variant.sizes.length > 0 &&
    !selectedSize
  ) {
    const autoSize =
      getAutoSelectedSize(
        variant
      );

    if (autoSize) {
      selectedSize =
        autoSize;
    } else {
      throw new Error(
        `Please select a size for "${product.name}".`
      );
    }
  }

  /*
  ==============================================
  SIZE VALIDATION
  ==============================================
  */

  if (
    variant &&
    Array.isArray(
      variant.sizes
    ) &&
    variant.sizes.length > 0
  ) {
    const sizeObject =
      variant.sizes.find(
        (size) =>
          cleanString(
            size?.size
          ).toLowerCase() ===
          cleanString(
            selectedSize
          ).toLowerCase()
      );

    if (!sizeObject) {
      throw new Error(
        `Selected size "${selectedSize}" is not available for "${product.name}".`
      );
    }

    if (
      Number(
        sizeObject.stock || 0
      ) <= 0
    ) {
      throw new Error(
        `Selected size "${selectedSize}" is out of stock for "${product.name}".`
      );
    }
  }

  /*
  ==============================================
  PRICE FROM DATABASE
  ==============================================

  Never trust frontend price.
  ==============================================
  */

  const variantPrice =
    variant
      ? Number(
          variant.price
        )
      : NaN;

  const productPrice =
    Number(
      product.price
    );

  const actualPrice =
    variant &&
    Number.isFinite(
      variantPrice
    ) &&
    variantPrice >= 0
      ? variantPrice
      : productPrice;

  if (
    !Number.isFinite(
      actualPrice
    ) ||
    actualPrice < 0
  ) {
    throw new Error(
      `Invalid database price for "${product.name}".`
    );
  }

  /*
  ==============================================
  STOCK
  ==============================================
  */

  const availableStock =
    getItemAvailableStock(
      product,
      variant,
      selectedSize
    );

  if (
    quantity >
    availableStock
  ) {
    throw new Error(
      `Insufficient stock for "${product.name}". Available: ${availableStock}, requested: ${quantity}.`
    );
  }

  /*
  ==============================================
  IMAGE
  ==============================================
  */

  let productImage =
    cleanString(
      product.image
    );

  if (
    variant &&
    Array.isArray(
      variant.images
    ) &&
    variant.images.length > 0
  ) {
    productImage =
      cleanString(
        variant.images[0]
      );
  }

  /*
  ==============================================
  FINAL NORMALIZED ITEM
  ==============================================
  */

  return {
    product:
      product._id,

    productId:
      product.productId,

    productName:
      product.name,

    productImage,

    variantId:
      variant
        ? cleanString(
            variant.variantId
          )
        : "",

    selectedColor:
      variant
        ? cleanString(
            variant.color
          )
        : selectedColor,

    selectedColorCode:
      variant
        ? cleanString(
            variant.colorCode
          )
        : selectedColorCode,

    selectedSize,

    price:
      actualPrice,

    quantity,

    subtotal:
      actualPrice *
      quantity,
  };
};

/*
==================================================
BUILD ORDER ITEMS
==================================================
*/

const buildOrderItems =
  async (items) => {
    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      throw new Error(
        "Order must contain at least one item."
      );
    }

    const orderItems = [];

    for (
      let index = 0;
      index < items.length;
      index++
    ) {
      const normalizedItem =
        await validateProductItem(
          items[index],
          index
        );

      orderItems.push(
        normalizedItem
      );
    }

    return orderItems;
  };

/*
==================================================
DECREASE PRODUCT STOCK
==================================================

IMPORTANT:

Stock is decreased ONLY when order is
confirmed.

Order creation does NOT decrease stock.
==================================================
*/

const decreaseProductStock =
  async (item) => {
    const product =
      await Product.findOne({
        productId:
          Number(
            item.productId
          ),
      });

    if (!product) {
      throw new Error(
        `Product ${item.productId} was not found.`
      );
    }

    /*
    ==============================================
    FIND VARIANT
    ==============================================
    */

    let variant = null;

    if (
      item.variantId ||
      item.selectedColor
    ) {
      variant =
        findVariant(
          product,
          item.variantId,
          item.selectedColor
        );
    }

    /*
    ==============================================
    VARIANT STOCK
    ==============================================
    */

    if (variant) {
      /*
      --------------------------------------------
      SIZE STOCK
      --------------------------------------------
      */

      if (
        Array.isArray(
          variant.sizes
        ) &&
        variant.sizes.length > 0
      ) {
        const sizeIndex =
          variant.sizes.findIndex(
            (size) =>
              cleanString(
                size?.size
              ).toLowerCase() ===
              cleanString(
                item.selectedSize
              ).toLowerCase()
          );

        if (
          sizeIndex === -1
        ) {
          throw new Error(
            `Size "${item.selectedSize}" was not found for "${product.name}".`
          );
        }

        const currentStock =
          Number(
            variant.sizes[
              sizeIndex
            ].stock || 0
          );

        const quantity =
          Number(
            item.quantity
          );

        if (
          currentStock <
          quantity
        ) {
          throw new Error(
            `Insufficient stock for "${product.name}" - ${item.selectedSize}. Available: ${currentStock}, requested: ${quantity}.`
          );
        }

        variant.sizes[
          sizeIndex
        ].stock =
          currentStock -
          quantity;

        /*
        Recalculate variant stock
        */

        variant.stock =
          variant.sizes.reduce(
            (total, size) =>
              total +
              Number(
                size?.stock || 0
              ),
            0
          );

        await product.save();

        return;
      }

      /*
      --------------------------------------------
      VARIANT WITHOUT SIZE
      --------------------------------------------
      */

      const currentStock =
        Number(
          variant.stock || 0
        );

      const quantity =
        Number(
          item.quantity
        );

      if (
        currentStock <
        quantity
      ) {
        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${currentStock}, requested: ${quantity}.`
        );
      }

      variant.stock =
        currentStock -
        quantity;

      await product.save();

      return;
    }

    /*
    ==============================================
    PRODUCT LEVEL STOCK
    ==============================================
    */

    const currentStock =
      Number(
        product.stock || 0
      );

    const quantity =
      Number(
        item.quantity
      );

    if (
      currentStock <
      quantity
    ) {
      throw new Error(
        `Insufficient stock for "${product.name}". Available: ${currentStock}, requested: ${quantity}.`
      );
    }

    product.stock =
      currentStock -
      quantity;

    await product.save();
  };

/*
==================================================
CALCULATE DELIVERY CHARGE
==================================================
*/

const calculateDeliveryCharge =
  ({
    district,
    deliveryCharge,
  }) => {
    const normalizedDistrict =
      cleanString(
        district
      ).toLowerCase();

    /*
    ==============================================
    DHAKA
    ==============================================
    */

    if (
      normalizedDistrict ===
      "dhaka"
    ) {
      return 60;
    }

    /*
    ==============================================
    FRONTEND DELIVERY CHARGE
    ==============================================
    */

    const customCharge =
      Number(
        deliveryCharge
      );

    if (
      Number.isFinite(
        customCharge
      ) &&
      customCharge >= 0
    ) {
      return customCharge;
    }

    /*
    ==============================================
    DEFAULT OUTSIDE DHAKA
    ==============================================
    */

    return 100;
  };

/*
==================================================
CREATE ORDER
POST /api/orders
==================================================
*/

router.post(
  "/",
  async (req, res) => {
    try {
      const body =
        req.body || {};

      /*
      ==============================================
      CUSTOMER INFORMATION
      ==============================================
      */

      const name =
        cleanString(
          body.name
        );

      const phone =
        cleanString(
          body.phone
        );

      const district =
        cleanString(
          body.district
        );

      const thana =
        cleanString(
          body.thana
        );

      const address =
        cleanString(
          body.address
        );

      const note =
        cleanString(
          body.note
        );

      /*
      ==============================================
      BASIC VALIDATION
      ==============================================
      */

      if (!name) {
        return res.status(400).json({
          success: false,
          message:
            "Customer name is required.",
        });
      }

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "Phone number is required.",
        });
      }

      if (!district) {
        return res.status(400).json({
          success: false,
          message:
            "District is required.",
        });
      }

      if (!thana) {
        return res.status(400).json({
          success: false,
          message:
            "Thana is required.",
        });
      }

      if (!address) {
        return res.status(400).json({
          success: false,
          message:
            "Address is required.",
        });
      }

      /*
      ==============================================
      PHONE VALIDATION
      ==============================================
      */

      const normalizedPhone =
        phone.replace(
          /\D/g,
          ""
        );

      if (
        normalizedPhone.length !==
        11
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 11 digit phone number.",
        });
      }

      /*
      ==============================================
      ITEMS
      ==============================================
      */

      let rawItems = [];

      if (
        Array.isArray(
          body.items
        ) &&
        body.items.length > 0
      ) {
        rawItems =
          body.items;
      } else if (
        body.productId
      ) {
        /*
        --------------------------------------------
        BACKWARD COMPATIBILITY

        Supports old single-product payload.
        --------------------------------------------
        */

        rawItems = [
          {
            productId:
              body.productId,

            productName:
              body.productName,

            productImage:
              body.productImage,

            variantId:
              body.variantId,

            selectedColor:
              body.selectedColor ??
              body.color,

            selectedColorCode:
              body.selectedColorCode ??
              body.colorCode,

            selectedSize:
              body.selectedSize ??
              body.size,

            price:
              body.price,

            quantity:
              body.quantity,
          },
        ];
      }

      if (
        rawItems.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No products found in order.",
        });
      }

      /*
      ==============================================
      BUILD / VALIDATE ITEMS
      ==============================================
      */

      let orderItems;

      try {
        orderItems =
          await buildOrderItems(
            rawItems
          );
      } catch (itemError) {
        console.error(
          "ORDER ITEM VALIDATION ERROR:",
          itemError
        );

        return res.status(400).json({
          success: false,
          message:
            itemError.message,
        });
      }

      /*
      ==============================================
      SUBTOTAL
      ==============================================
      */

      const subtotal =
        orderItems.reduce(
          (total, item) =>
            total +
            Number(
              item.subtotal || 0
            ),
          0
        );

      /*
      ==============================================
      DELIVERY CHARGE
      ==============================================
      */

      const finalDeliveryCharge =
        calculateDeliveryCharge({
          district,
          deliveryCharge:
            body.deliveryCharge,
        });

      /*
      ==============================================
      ADDITIONAL DISCOUNT
      ==============================================
      */

      const additionalDiscount =
        Math.max(
          0,
          Number(
            body.additionalDiscount ||
              0
          )
        );

      /*
      ==============================================
      TOTAL
      ==============================================
      */

      const total = Math.max(
        0,
        subtotal +
          finalDeliveryCharge -
          additionalDiscount
      );

      /*
      ==============================================
      PAYMENT
      ==============================================
      */

      const paymentMethod =
        cleanString(
          body.paymentMethod
        ) ||
        "cash_on_delivery";

      const paymentStatus =
        cleanString(
          body.paymentStatus
        ) ||
        "pending";

      /*
      ==============================================
      SOURCE
      ==============================================
      */

      const source =
        cleanString(
          body.source
        ) ||
        "website";

      const orderSource =
        cleanString(
          body.orderSource
        ) ||
        source;

      /*
      ==============================================
      OPTIONAL FIELDS
      ==============================================
      */

      const landingPageId =
        cleanString(
          body.landingPageId
        );

      const tenantId =
        cleanString(
          body.tenantId
        ) ||
        "t-main";

      /*
      ==============================================
      CREATE ORDER DATA
      ==============================================
      */

      const firstItem =
        orderItems[0];

      const orderData = {
        name,
        phone:
          normalizedPhone,
        district,
        thana,
        address,
        note,

        /*
        --------------------------------------------
        BACKWARD COMPATIBILITY FIELDS
        --------------------------------------------
        */

        product:
          firstItem.product,

        productId:
          firstItem.productId,

        productName:
          firstItem.productName,

        productImage:
          firstItem.productImage,

        variantId:
          firstItem.variantId,

        selectedColor:
          firstItem.selectedColor,

        selectedColorCode:
          firstItem.selectedColorCode,

        selectedSize:
          firstItem.selectedSize,

        price:
          firstItem.price,

        quantity:
          firstItem.quantity,

        /*
        --------------------------------------------
        ALL ITEMS
        --------------------------------------------
        */

        items:
          orderItems,

        /*
        --------------------------------------------
        FINANCIAL
        --------------------------------------------
        */

        subtotal,

        deliveryCharge:
          finalDeliveryCharge,

        additionalDiscount,

        total,

        /*
        --------------------------------------------
        PAYMENT
        --------------------------------------------
        */

        paymentMethod,

        paymentStatus,

        /*
        --------------------------------------------
        STATUS
        --------------------------------------------
        */

        status:
          "pending",

        /*
        --------------------------------------------
        SOURCE
        --------------------------------------------
        */

        source,

        orderSource,

        landingPageId,

        tenantId,
      };

      /*
      ==============================================
      CREATE ORDER
      ==============================================
      */

      const order =
        await Order.create(
          orderData
        );

      console.log(
        "ORDER CREATED:",
        order._id.toString()
      );

      /*
      ==============================================
      IMPORTANT:
      ==============================================

      DO NOT decrease stock here.

      Stock will be decreased only when
      admin confirms the order.

      ==============================================
      */

      return res.status(201).json({
        success: true,

        message:
          "Order placed successfully.",

        order,
      });
    } catch (error) {
      console.error(
        "CREATE ORDER ERROR:",
        error
      );

      /*
      ==============================================
      MONGOOSE VALIDATION ERROR
      ==============================================
      */

      if (
        error?.name ===
        "ValidationError"
      ) {
        const errors =
          Object.values(
            error.errors
          ).map(
            (err) => ({
              field:
                err.path,

              message:
                err.message,
            })
          );

        return res.status(400).json({
          success: false,

          message:
            "Order validation failed.",

          errors,
        });
      }

      /*
      ==============================================
      DUPLICATE KEY
      ==============================================
      */

      if (
        error?.code === 11000
      ) {
        return res.status(409).json({
          success: false,

          message:
            "Duplicate order data found.",

          error:
            error.message,
        });
      }

      /*
      ==============================================
      GENERAL ERROR
      ==============================================
      */

      return res.status(500).json({
        success: false,

        message:
          "Failed to create order.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
GET ALL ORDERS
GET /api/orders
==================================================
*/

router.get(
  "/",
  async (req, res) => {
    try {
      const orders =
        await Order.find()
          .sort({
            createdAt: -1,
          })
          .populate(
            "product",
            "productId name brand category image price variants"
          )
          .lean();

      return res.json({
        success: true,

        count:
          orders.length,

        orders,
      });
    } catch (error) {
      console.error(
        "GET ORDERS ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch orders.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
CONFIRM ORDER
PATCH /api/orders/:id/confirm
==================================================

Stock is deducted ONLY here.
==================================================
*/

router.patch(
  "/:id/confirm",
  async (req, res) => {
    try {
      /*
      ==============================================
      VALIDATE OBJECT ID
      ==============================================
      */

      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID.",
        });
      }

      /*
      ==============================================
      FIND ORDER
      ==============================================
      */

      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found.",
        });
      }

      /*
      ==============================================
      ALREADY CONFIRMED
      ==============================================
      */

      if (
        order.status ===
        "confirmed"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Order is already confirmed.",
        });
      }

      /*
      ==============================================
      GET ITEMS
      ==============================================
      */

      const orderItems =
        Array.isArray(
          order.items
        )
          ? order.items
          : [];

      if (
        orderItems.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Order has no items.",
        });
      }

      /*
      ==============================================
      FINAL STOCK VALIDATION
      ==============================================

      Stock may have changed after order creation.

      Therefore ALWAYS validate again before
      deduction.
      ==============================================
      */

      for (
        const item of orderItems
      ) {
        const product =
          await findProduct(
            item.productId
          );

        if (!product) {
          return res.status(400).json({
            success: false,

            message:
              `Product ${item.productId} was not found.`,
          });
        }

        /*
        --------------------------------------------
        FIND VARIANT
        --------------------------------------------
        */

        let variant = null;

        if (
          item.variantId ||
          item.selectedColor
        ) {
          variant =
            findVariant(
              product,
              item.variantId,
              item.selectedColor
            );

          if (!variant) {
            return res.status(400).json({
              success: false,

              message:
                `Selected variant was not found for "${product.name}".`,
            });
          }
        }

        /*
        --------------------------------------------
        SIZE VALIDATION
        --------------------------------------------
        */

        if (
          variant &&
          Array.isArray(
            variant.sizes
          ) &&
          variant.sizes.length > 0
        ) {
          if (
            !item.selectedSize
          ) {
            return res.status(400).json({
              success: false,

              message:
                `Size is required for "${product.name}".`,
            });
          }

          const sizeObject =
            variant.sizes.find(
              (size) =>
                cleanString(
                  size?.size
                ).toLowerCase() ===
                cleanString(
                  item.selectedSize
                ).toLowerCase()
            );

          if (!sizeObject) {
            return res.status(400).json({
              success: false,

              message:
                `Size "${item.selectedSize}" is no longer available for "${product.name}".`,
            });
          }
        }

        /*
        --------------------------------------------
        AVAILABLE STOCK
        --------------------------------------------
        */

        const availableStock =
          getItemAvailableStock(
            product,
            variant,
            item.selectedSize
          );

        const requestedQuantity =
          Number(
            item.quantity
          );

        if (
          requestedQuantity >
          availableStock
        ) {
          return res.status(400).json({
            success: false,

            message:
              `Insufficient stock for "${product.name}". Available: ${availableStock}, requested: ${requestedQuantity}.`,

            productId:
              product.productId,

            variantId:
              item.variantId ||
              "",

            size:
              item.selectedSize ||
              "",

            availableStock,

            requestedQuantity,
          });
        }
      }

      /*
      ==============================================
      DEDUCT STOCK
      ==============================================
      */

      try {
        for (
          const item of orderItems
        ) {
          await decreaseProductStock(
            item
          );
        }
      } catch (stockError) {
        console.error(
          "CONFIRM STOCK ERROR:",
          stockError
        );

        return res.status(400).json({
          success: false,

          message:
            `Order could not be confirmed. ${stockError.message}`,
        });
      }

      /*
      ==============================================
      CONFIRM ORDER
      ==============================================
      */

      order.status =
        "confirmed";

      await order.save();

      console.log(
        "ORDER CONFIRMED:",
        order._id.toString()
      );

      return res.json({
        success: true,

        message:
          "Order confirmed successfully. Stock deducted.",

        order,
      });
    } catch (error) {
      console.error(
        "CONFIRM ORDER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to confirm order.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
CREATE COURIER PARCEL
POST /api/orders/:id/create-parcel
==================================================
*/

router.post(
  "/:id/create-parcel",
  async (req, res) => {
    try {
      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return res.status(404).json({
          success: false,

          message:
            "Order not found.",
        });
      }

      /*
      ==============================================
      CONFIRM REQUIRED
      ==============================================
      */

      if (
        order.status !==
        "confirmed"
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Order must be confirmed before creating a courier parcel.",
        });
      }

      /*
      ==============================================
      DUPLICATE PARCEL
      ==============================================
      */

      if (
        order.consignmentId &&
        !req.body?.force
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Parcel already exists for this order.",

          order,
        });
      }

      /*
      ==============================================
      CREATE PARCEL
      ==============================================
      */

      const parcel =
        await createParcel(
          order
        );

      /*
      ==============================================
      SAVE COURIER DATA
      ==============================================
      */

      order.courier =
        "steadfast";

      order.parcelCreatedAt =
        new Date();

      order.courierStatus =
        parcel?.status ||
        "created";

      order.consignmentId =
        parcel?.consignment
          ?.consignment_id ||
        parcel?.consignment_id ||
        "";

      order.trackingCode =
        parcel?.consignment
          ?.tracking_code ||
        parcel?.tracking_code ||
        "";

      order.parcelError =
        "";

      await order.save();

      console.log(
        "PARCEL CREATED:",
        order._id.toString(),
        order.consignmentId
      );

      return res.json({
        success: true,

        message:
          "Parcel created successfully.",

        order,

        parcel,
      });
    } catch (error) {
      console.error(
        "CREATE PARCEL ERROR:",
        error
      );

      try {
        await Order.findByIdAndUpdate(
          req.params.id,
          {
            parcelError:
              error.message,
          }
        );
      } catch (updateError) {
        console.error(
          "PARCEL ERROR UPDATE FAILED:",
          updateError
        );
      }

      return res.status(500).json({
        success: false,

        message:
          "Failed to create parcel.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
FRAUD CHECK
GET /api/orders/fraud-check/:phone
==================================================
*/

router.get(
  "/fraud-check/:phone",
  async (req, res) => {
    try {
      const phone =
        cleanString(
          req.params.phone
        );

      if (!phone) {
        return res.status(400).json({
          success: false,

          message:
            "Phone number is required.",
        });
      }

      const result =
        await getFraudCheck(
          phone
        );

      return res.json({
        success: true,

        phone,

        fraudCheck:
          result,
      });
    } catch (error) {
      console.error(
        "FRAUD CHECK ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to check fraud status.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
STEADFAST BALANCE
GET /api/orders/courier/balance
==================================================
*/

router.get(
  "/courier/balance",
  async (req, res) => {
    try {
      const result =
        await getBalance();

      return res.json({
        success: true,

        balance:
          result,
      });
    } catch (error) {
      console.error(
        "COURIER BALANCE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch courier balance.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
GET SINGLE ORDER
GET /api/orders/:id
==================================================
*/

router.get(
  "/:id",
  async (req, res) => {
    try {
      /*
      IMPORTANT:

      Keep special routes above /:id
      ============================================
      */

      const order =
        await Order.findById(
          req.params.id
        ).populate(
          "product",
          "productId name brand category image price variants"
        );

      if (!order) {
        return res.status(404).json({
          success: false,

          message:
            "Order not found.",
        });
      }

      return res.json({
        success: true,

        order,
      });
    } catch (error) {
      console.error(
        "GET SINGLE ORDER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch order.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
UPDATE ORDER
PUT /api/orders/:id
==================================================
*/

router.put(
  "/:id",
  async (req, res) => {
    try {
      const allowedFields = [
        "name",
        "phone",
        "district",
        "thana",
        "address",
        "note",

        "status",

        "paymentMethod",
        "paymentStatus",

        "courier",
        "courierStatus",
        "consignmentId",
        "trackingCode",

        "printStatus",
        "printedAt",

        "returnReason",
        "refundAmount",
        "refundStatus",

        "source",
        "orderSource",
        "landingPageId",
        "tenantId",
      ];

      const updateData = {};

      for (
        const field of allowedFields
      ) {
        if (
          Object.prototype.hasOwnProperty.call(
            req.body,
            field
          )
        ) {
          updateData[field] =
            req.body[field];
        }
      }

      /*
      ==============================================
      PHONE NORMALIZATION
      ==============================================
      */

      if (
        updateData.phone !==
        undefined
      ) {
        const phone =
          cleanString(
            updateData.phone
          ).replace(
            /\D/g,
            ""
          );

        if (
          phone.length !==
          11
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Phone number must contain 11 digits.",
          });
        }

        updateData.phone =
          phone;
      }

      /*
      ==============================================
      UPDATE
      ==============================================
      */

      const updatedOrder =
        await Order.findByIdAndUpdate(
          req.params.id,
          {
            $set:
              updateData,
          },
          {
            new: true,
            runValidators:
              true,
          }
        );

      if (!updatedOrder) {
        return res.status(404).json({
          success: false,

          message:
            "Order not found.",
        });
      }

      return res.json({
        success: true,

        message:
          "Order updated successfully.",

        order:
          updatedOrder,
      });
    } catch (error) {
      console.error(
        "UPDATE ORDER ERROR:",
        error
      );

      /*
      ==============================================
      VALIDATION ERROR
      ==============================================
      */

      if (
        error.name ===
        "ValidationError"
      ) {
        const errors =
          Object.values(
            error.errors
          ).map(
            (err) => ({
              field:
                err.path,

              message:
                err.message,
            })
          );

        return res.status(400).json({
          success: false,

          message:
            "Order validation failed.",

          errors,
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Failed to update order.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
DELETE ORDER
DELETE /api/orders/:id
==================================================
*/

router.delete(
  "/:id",
  async (req, res) => {
    try {
      const deletedOrder =
        await Order.findByIdAndDelete(
          req.params.id
        );

      if (!deletedOrder) {
        return res.status(404).json({
          success: false,

          message:
            "Order not found.",
        });
      }

      console.log(
        "ORDER DELETED:",
        req.params.id
      );

      return res.json({
        success: true,

        message:
          "Order deleted successfully.",
      });
    } catch (error) {
      console.error(
        "DELETE ORDER ERROR:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to delete order.",

        error:
          error.message,
      });
    }
  }
);

/*
==================================================
EXPORT
==================================================
*/

module.exports = router;