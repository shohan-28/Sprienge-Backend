
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
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

const normalizeProductId = (value) => {
  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
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
DEFAULT SELECTION CHECK
==================================================

Frontend থেকে পুরোনো payload এলে:

selectedColor: "Default"

বা

selectedColor: "Default Color"

এগুলোকে কোনো actual color/variant হিসেবে ধরা হবে না।
==================================================
*/

const isDefaultSelection = (value) => {
  const normalized = cleanString(value).toLowerCase();

  return (
    normalized === "" ||
    normalized === "default" ||
    normalized === "default color"
  );
};

/*
==================================================
FIND PRODUCT
==================================================
*/

const findProduct = async (productId) => {
  const normalizedId = normalizeProductId(productId);

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

Default / empty selection is ignored.
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

  const rawColor = cleanString(selectedColor);

  const normalizedColor = isDefaultSelection(rawColor)
    ? ""
    : rawColor.toLowerCase();

  /*
  ================================================
  FIRST: VARIANT ID
  ================================================
  */

  if (normalizedVariantId) {
    const variantById = product.variants.find(
      (variant) =>
        cleanString(variant?.variantId) ===
        normalizedVariantId
    );

    if (variantById) {
      return variantById;
    }

    /*
    যদি variantId পাঠানো হয় কিন্তু পাওয়া না যায়,
    পরে color দিয়ে অন্য variant select করা হবে না।
    কারণ এতে ভুল variant select হওয়ার সম্ভাবনা থাকে।
    */

    return null;
  }

  /*
  ================================================
  SECOND: COLOR
  ================================================
  */

  if (normalizedColor) {
    const variantByColor = product.variants.find(
      (variant) =>
        cleanString(variant?.color).toLowerCase() ===
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
GET AVAILABLE VARIANT LIST
==================================================
*/

const getAvailableVariants = (product) => {
  if (
    !product ||
    !Array.isArray(product.variants)
  ) {
    return [];
  }

  return product.variants.filter((variant) => {
    /*
    ----------------------------------------------
    Variant with sizes
    ----------------------------------------------
    */

    if (
      Array.isArray(variant?.sizes) &&
      variant.sizes.length > 0
    ) {
      return variant.sizes.some(
        (size) =>
          Number(size?.stock || 0) > 0
      );
    }

    /*
    ----------------------------------------------
    Variant without sizes
    ----------------------------------------------
    */

    return Number(variant?.stock || 0) > 0;
  });
};

/*
==================================================
RESOLVE VARIANT
==================================================

Rules:

1. variantId থাকলে সেটা দিয়ে find
2. না থাকলে color দিয়ে find
3. দুটোই না থাকলে:
   - product-এর কোনো variant না থাকলে => null
   - exactly one available variant থাকলে => auto select
   - multiple available variant থাকলে => error

allowAutoSelect:
create order-এর সময় true
confirm-এর সময় সাধারণত false
==================================================
*/

const resolveVariant = (
  product,
  {
    variantId = "",
    selectedColor = "",
    allowAutoSelect = true,
  } = {}
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
    isDefaultSelection(selectedColor)
      ? ""
      : cleanString(selectedColor);

  /*
  ================================================
  Explicit variantId
  ================================================
  */

  if (normalizedVariantId) {
    const variant = findVariant(
      product,
      normalizedVariantId,
      ""
    );

    if (!variant) {
      throw new Error(
        `Selected variant was not found for "${product.name}".`
      );
    }

    return variant;
  }

  /*
  ================================================
  Explicit color
  ================================================
  */

  if (normalizedColor) {
    const variant = findVariant(
      product,
      "",
      normalizedColor
    );

    if (!variant) {
      throw new Error(
        `Selected variant was not found for "${product.name}".`
      );
    }

    return variant;
  }

  /*
  ================================================
  NO VARIANT SELECTION
  ================================================
  */

  if (!allowAutoSelect) {
    throw new Error(
      `Variant information is missing for "${product.name}".`
    );
  }

  /*
  ================================================
  AUTO SELECT
  ================================================
  */

  const availableVariants =
    getAvailableVariants(product);

  if (availableVariants.length === 1) {
    return availableVariants[0];
  }

  if (availableVariants.length === 0) {
    throw new Error(
      `"${product.name}" is currently out of stock.`
    );
  }

  throw new Error(
    `Please select a variant for "${product.name}".`
  );
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
  ================================================
  PRODUCT WITHOUT VARIANT
  ================================================
  */

  if (!variant) {
    return Number(product?.stock || 0);
  }

  /*
  ================================================
  VARIANT WITH SIZES
  ================================================
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

    const sizeObject = variant.sizes.find(
      (size) =>
        cleanString(size?.size).toLowerCase() ===
        normalizedSize.toLowerCase()
    );

    if (!sizeObject) {
      return 0;
    }

    return Number(sizeObject.stock || 0);
  }

  /*
  ================================================
  VARIANT WITHOUT SIZE
  ================================================
  */

  return Number(variant.stock || 0);
};

/*
==================================================
GET AUTO SELECTED SIZE
==================================================
*/

const getAutoSelectedSize = (variant) => {
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

  if (availableSizes.length === 1) {
    return cleanString(
      availableSizes[0]?.size
    );
  }

  return "";
};

/*
==================================================
CALCULATE TOTAL VARIANT STOCK
==================================================
*/

const calculateVariantTotalStock = (
  variants
) => {
  if (!Array.isArray(variants)) {
    return 0;
  }

  return variants.reduce(
    (total, variant) => {
      if (
        Array.isArray(variant?.sizes) &&
        variant.sizes.length > 0
      ) {
        return (
          total +
          variant.sizes.reduce(
            (sizeTotal, size) =>
              sizeTotal +
              Number(size?.stock || 0),
            0
          )
        );
      }

      return (
        total +
        Number(variant?.stock || 0)
      );
    },
    0
  );
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
  ================================================
  PRODUCT ID
  ================================================
  */

  const productId =
    normalizeProductId(
      rawItem?.productId ??
        rawItem?.id
    );

  if (!productId) {
    throw new Error(
      `Invalid product ID for item ${index + 1}.`
    );
  }

  /*
  ================================================
  QUANTITY
  ================================================
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
  ================================================
  CUSTOMER SELECTIONS
  ================================================
  */

  const rawSelectedColor = cleanString(
    rawItem?.selectedColor ??
      rawItem?.color
  );

  /*
  IMPORTANT:

  "Default" এবং "Default Color"
  actual color হিসেবে যাবে না।
  */

  const selectedColor =
    isDefaultSelection(rawSelectedColor)
      ? ""
      : rawSelectedColor;

  const selectedColorCode =
    selectedColor
      ? cleanString(
          rawItem?.selectedColorCode ??
            rawItem?.colorCode
        )
      : "";

  let selectedSize =
    cleanString(
      rawItem?.selectedSize ??
        rawItem?.size
    );

  /*
  ================================================
  VARIANT ID
  ================================================
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
  ================================================
  FIND PRODUCT
  ================================================
  */

  const product =
    await findProduct(productId);

  if (!product) {
    throw new Error(
      `Product ${productId} was not found.`
    );
  }

  /*
  ================================================
  RESOLVE VARIANT
  ================================================
  */

  let variant = null;

  try {
    variant = resolveVariant(product, {
      variantId,
      selectedColor,
      allowAutoSelect: true,
    });
  } catch (variantError) {
    throw new Error(
      variantError.message
    );
  }

  /*
  ================================================
  SIZE AUTO RESOLVE
  ================================================

  যদি variant-এর মাত্র একটি available size থাকে,
  তাহলে automatically সেটি select হবে।
  */

  if (
    variant &&
    Array.isArray(variant.sizes) &&
    variant.sizes.length > 0 &&
    !selectedSize
  ) {
    const autoSize =
      getAutoSelectedSize(variant);

    if (autoSize) {
      selectedSize = autoSize;
    } else {
      throw new Error(
        `Please select a size for "${product.name}".`
      );
    }
  }

  /*
  ================================================
  SIZE VALIDATION
  ================================================
  */

  if (
    variant &&
    Array.isArray(variant.sizes) &&
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
  ================================================
  PRICE FROM DATABASE
  ================================================

  Frontend price কখনো trust করা হবে না।
  */

  const variantPrice =
    variant
      ? Number(variant.price)
      : NaN;

  const productPrice =
    Number(product.price);

  const actualPrice =
    variant &&
    Number.isFinite(variantPrice) &&
    variantPrice >= 0
      ? variantPrice
      : productPrice;

  if (
    !Number.isFinite(actualPrice) ||
    actualPrice < 0
  ) {
    throw new Error(
      `Invalid database price for "${product.name}".`
    );
  }

  /*
  ================================================
  STOCK
  ================================================
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
  ================================================
  IMAGE
  ================================================
  */

  let productImage =
    cleanString(product.image);

  if (
    variant &&
    Array.isArray(variant.images) &&
    variant.images.length > 0
  ) {
    productImage =
      cleanString(
        variant.images[0]
      );
  }

  /*
  ================================================
  FINAL NORMALIZED ITEM
  ================================================
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
        : "",

    selectedColorCode:
      variant
        ? cleanString(
            variant.colorCode
          )
        : "",

    selectedSize,

    price:
      actualPrice,

    quantity,

    subtotal:
      actualPrice * quantity,
  };
};

/*
==================================================
BUILD ORDER ITEMS
==================================================
*/

const buildOrderItems = async (
  items
) => {
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

Order create:
    stock decrease হবে না

Order confirm:
    stock decrease হবে

Variant stock decrease হলে
product.stock আবার calculate করা হবে।
==================================================
*/

const decreaseProductStock =
  async (item) => {
    const product =
      await Product.findOne({
        productId:
          Number(item.productId),
      });

    if (!product) {
      throw new Error(
        `Product ${item.productId} was not found.`
      );
    }

    const variantId =
      normalizeVariantId(
        item.variantId
      );

    const selectedColor =
      isDefaultSelection(
        item.selectedColor
      )
        ? ""
        : cleanString(
            item.selectedColor
          );

    /*
    ================================================
    FIND VARIANT
    ================================================
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
      Array.isArray(product.variants) &&
      product.variants.length > 0
    ) {
      /*
      Order-এর সময় variant information missing হলে
      confirmation-এর সময় অন্য variant silently select
      করা হবে না।
      */

      throw new Error(
        `Variant information is missing for "${product.name}".`
      );
    }

    const quantity =
      Number(item.quantity);

    /*
    ================================================
    VARIANT STOCK
    ================================================
    */

    if (variant) {
      /*
      ----------------------------------------------
      VARIANT WITH SIZE
      ----------------------------------------------
      */

      if (
        Array.isArray(variant.sizes) &&
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

        if (sizeIndex === -1) {
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

        if (
          currentStock <
          quantity
        ) {
          throw new Error(
            `Insufficient stock for "${product.name}" - ${item.selectedSize}. Available: ${currentStock}, requested: ${quantity}.`
          );
        }

        /*
        Deduct size stock
        */

        variant.sizes[
          sizeIndex
        ].stock =
          currentStock -
          quantity;

        /*
        Recalculate this variant's total stock
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
      } else {
        /*
        ----------------------------------------------
        VARIANT WITHOUT SIZE
        ----------------------------------------------
        */

        const currentStock =
          Number(
            variant.stock || 0
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
      }

      /*
      ==============================================
      IMPORTANT:
      SYNC PRODUCT TOTAL STOCK
      ==============================================
      */

      product.stock =
        calculateVariantTotalStock(
          product.variants
        );

      await product.save();

      return;
    }

    /*
    ================================================
    PRODUCT LEVEL STOCK
    ================================================
    */

    const currentStock =
      Number(
        product.stock || 0
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

inside-dhaka  => 60
outside-dhaka => 100

District / Thana ব্যবহার করা হবে না.
==================================================
*/

const calculateDeliveryCharge = ({
  deliveryArea,
}) => {
  const normalizedArea =
    cleanString(
      deliveryArea
    ).toLowerCase();

  if (
    normalizedArea ===
    "inside-dhaka"
  ) {
    return 60;
  }

  if (
    normalizedArea ===
    "outside-dhaka"
  ) {
    return 100;
  }

  return null;
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

      const address =
        cleanString(
          body.address
        );

      const deliveryArea =
        cleanString(
          body.deliveryArea
        ).toLowerCase();

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

      if (!address) {
        return res.status(400).json({
          success: false,
          message:
            "Address is required.",
        });
      }

      if (!deliveryArea) {
        return res.status(400).json({
          success: false,
          message:
            "Delivery area is required.",
        });
      }

      if (
        deliveryArea !==
          "inside-dhaka" &&
        deliveryArea !==
          "outside-dhaka"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid delivery area.",
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

      /*
      ----------------------------------------------
      NEW CART PAYLOAD
      ----------------------------------------------
      */

      if (
        Array.isArray(
          body.items
        ) &&
        body.items.length > 0
      ) {
        rawItems =
          body.items;
      }

      /*
      ----------------------------------------------
      BACKWARD COMPATIBILITY
      ----------------------------------------------
      */

      else if (
        body.productId
      ) {
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
        rawItems.length ===
        0
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
          deliveryArea,
        });

      if (
        finalDeliveryCharge ===
        null
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please select a valid delivery area.",
        });
      }

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

      const total =
        Math.max(
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
      FIRST ITEM
      ==============================================
      */

      const firstItem =
        orderItems[0];

      /*
      ==============================================
      ORDER DATA
      ==============================================
      */

      const orderData = {
        name,
        phone:
          normalizedPhone,

        address,
        note,
        deliveryArea,

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

        items:
          orderItems,

        subtotal,

        deliveryCharge:
          finalDeliveryCharge,

        additionalDiscount,

        total,

        paymentMethod,

        paymentStatus,

        status:
          "pending",

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
      IMPORTANT:

      এখানে stock decrease হবে না।

      Admin confirm করলে stock decrease হবে।
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
POST /api/orders/:id/confirm
==================================================

Stock is deducted ONLY here.
==================================================
*/

router.post(
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
        orderItems.length ===
        0
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

      Order create হওয়ার পর stock change হয়ে
      যেতে পারে।

      তাই confirm-এর আগে আবার check করা হবে।
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
        FIND STORED VARIANT
        --------------------------------------------
        */

        const variantId =
          normalizeVariantId(
            item.variantId
          );

        const selectedColor =
          isDefaultSelection(
            item.selectedColor
          )
            ? ""
            : cleanString(
                item.selectedColor
              );

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
            return res.status(400).json({
              success: false,

              message:
                `Selected variant was not found for "${product.name}".`,
            });
          }
        } else if (
          Array.isArray(
            product.variants
          ) &&
          product.variants.length > 0
        ) {
          return res.status(400).json({
            success: false,

            message:
              `Variant information is missing for "${product.name}".`,
          });
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
            !cleanString(
              item.selectedSize
            )
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

          if (
            Number(
              sizeObject.stock || 0
            ) <= 0
          ) {
            return res.status(400).json({
              success: false,

              message:
                `Size "${item.selectedSize}" is out of stock for "${product.name}".`,
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
          !Number.isInteger(
            requestedQuantity
          ) ||
          requestedQuantity <= 0
        ) {
          return res.status(400).json({
            success: false,

            message:
              `Invalid quantity for "${product.name}".`,
          });
        }

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
        "address",
        "note",
        "deliveryArea",

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
      DELIVERY AREA VALIDATION
      ==============================================
      */

      if (
        updateData.deliveryArea !==
        undefined
      ) {
        const deliveryArea =
          cleanString(
            updateData.deliveryArea
          ).toLowerCase();

        if (
          deliveryArea !==
            "inside-dhaka" &&
          deliveryArea !==
            "outside-dhaka"
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Invalid delivery area.",
          });
        }

        updateData.deliveryArea =
          deliveryArea;

        /*
        Update delivery charge automatically
        */

        updateData.deliveryCharge =
          calculateDeliveryCharge({
            deliveryArea,
          });
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

