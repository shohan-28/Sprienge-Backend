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

const normalizeProductId = (
  value
) => {
  const id = Number(value);

  return Number.isInteger(id) &&
    id > 0
    ? id
    : null;
};

const normalizeQuantity = (
  value
) => {
  const quantity = Number(
    value
  );

  return Number.isInteger(
    quantity
  ) && quantity > 0
    ? quantity
    : null;
};

const normalizeVariantId = (
  value
) => {
  return cleanString(value);
};

/*
==================================================
FIND PRODUCT
==================================================
*/

const findProduct = async (
  productId
) => {
  const normalizedId =
    normalizeProductId(
      productId
    );

  if (!normalizedId) {
    return null;
  }

  return await Product.findOne({
    productId:
      normalizedId,
  });
};

/*
==================================================
FIND VARIANT
==================================================
*/

const findVariant = (
  product,
  variantId,
  selectedColor
) => {
  if (
    !product ||
    !Array.isArray(
      product.variants
    ) ||
    product.variants.length === 0
  ) {
    return null;
  }

  const normalizedVariantId =
    normalizeVariantId(
      variantId
    );

  const normalizedColor =
    cleanString(
      selectedColor
    ).toLowerCase();

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
            variant.variantId
          ) ===
          normalizedVariantId
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
            variant.color
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
GET ITEM AVAILABLE STOCK
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
      product.stock || 0
    );
  }

  /*
  ==============================================
  VARIANT WITH SIZES
  ==============================================
  */

  if (
    Array.isArray(
      variant.sizes
    ) &&
    variant.sizes.length > 0
  ) {
    const normalizedSize =
      cleanString(
        selectedSize
      );

    if (!normalizedSize) {
      return 0;
    }

    const sizeObject =
      variant.sizes.find(
        (size) =>
          cleanString(
            size.size
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
VALIDATE PRODUCT ITEM
==================================================
*/

const validateProductItem =
  async (
    rawItem,
    index
  ) => {
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

    const quantity =
      normalizeQuantity(
        rawItem?.quantity
      );

    if (!quantity) {
      throw new Error(
        `Invalid quantity for product ${productId}.`
      );
    }

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

    const selectedSize =
      cleanString(
        rawItem?.selectedSize ??
          rawItem?.size
      );

    const variantId =
      normalizeVariantId(
        rawItem?.variantId ??
          rawItem?.variant
      );

    /*
    ==============================================
    DATABASE PRODUCT
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
      throw new Error(
        `Please select a variant for "${product.name}".`
      );
    }

    /*
    ==============================================
    SIZE REQUIRED
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
      throw new Error(
        `Please select a size for "${product.name}".`
      );
    }

    /*
    ==============================================
    PRICE
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
      variantPrice > 0
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

    /*
    SIZE EXISTS CHECK
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
              size.size
            ).toLowerCase() ===
            selectedSize.toLowerCase()
        );

      if (!sizeObject) {
        throw new Error(
          `Selected size "${selectedSize}" is not available for "${product.name}".`
        );
      }
    }

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
    FINAL ITEM
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
DECREASE STOCK FOR CONFIRMATION
==================================================

IMPORTANT:

This function is called ONLY when
order is confirmed.

Create Order does NOT call this.
==================================================
*/

const decreaseProductStock =
  async (item) => {
    const product =
      await Product.findOne({
        productId:
          item.productId,
      });

    if (!product) {
      throw new Error(
        `Product ${item.productId} was not found while updating stock.`
      );
    }

    /*
    ==============================================
    NO VARIANT
    ==============================================
    */

    if (
      !item.variantId
    ) {
      const quantity =
        Number(
          item.quantity
        );

      const updatedProduct =
        await Product.findOneAndUpdate(
          {
            _id:
              product._id,

            stock: {
              $gte:
                quantity,
            },
          },
          {
            $inc: {
              stock:
                -quantity,
            },
          },
          {
            new: true,
          }
        );

      if (!updatedProduct) {
        const latest =
          await Product.findById(
            product._id
          )
            .select(
              "stock name"
            )
            .lean();

        throw new Error(
          `Insufficient stock for "${product.name}". Available: ${Number(
            latest?.stock || 0
          )}, requested: ${quantity}.`
        );
      }

      return updatedProduct;
    }

    /*
    ==============================================
    FIND VARIANT
    ==============================================
    */

    const variantIndex =
      product.variants.findIndex(
        (variant) =>
          cleanString(
            variant.variantId
          ) ===
          cleanString(
            item.variantId
          )
      );

    if (
      variantIndex === -1
    ) {
      throw new Error(
        `Variant "${item.variantId}" was not found for "${product.name}".`
      );
    }

    const variant =
      product.variants[
        variantIndex
      ];

    /*
    ==============================================
    VARIANT WITH SIZE
    ==============================================
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
              size.size
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
          `Insufficient stock for "${product.name}" - ${variant.color || item.variantId} / ${item.selectedSize}. Available: ${currentStock}, requested: ${quantity}.`
        );
      }

      /*
      --------------------------------------------
      ATOMIC SIZE UPDATE
      --------------------------------------------
      */

      const updatedProduct =
        await Product.findOneAndUpdate(
          {
            _id:
              product._id,

            variants: {
              $elemMatch: {
                variantId:
                  item.variantId,

                sizes: {
                  $elemMatch: {
                    size:
                      item.selectedSize,

                    stock: {
                      $gte:
                        quantity,
                    },
                  },
                },
              },
            },
          },
          {
            $inc: {
              "variants.$[variant].sizes.$[size].stock":
                -quantity,
            },
          },
          {
            arrayFilters: [
              {
                "variant.variantId":
                  item.variantId,
              },
              {
                "size.size":
                  item.selectedSize,

                "size.stock": {
                  $gte:
                    quantity,
                },
              },
            ],

            new: true,
          }
        );

      if (!updatedProduct) {
        throw new Error(
          `Stock changed before confirmation for "${product.name}" - ${variant.color || item.variantId} / ${item.selectedSize}. Please try again.`
        );
      }

      /*
      --------------------------------------------
      SYNC PRODUCT TOTAL STOCK
      --------------------------------------------
      */

      const totalStock =
        updatedProduct.variants.reduce(
          (
            total,
            currentVariant
          ) => {
            if (
              Array.isArray(
                currentVariant.sizes
              ) &&
              currentVariant.sizes
                .length > 0
            ) {
              return (
                total +
                currentVariant.sizes.reduce(
                  (
                    sizeTotal,
                    size
                  ) =>
                    sizeTotal +
                    Number(
                      size.stock ||
                        0
                    ),
                  0
                )
              );
            }

            return (
              total +
              Number(
                currentVariant.stock ||
                  0
              )
            );
          },
          0
        );

      updatedProduct.stock =
        totalStock;

      await updatedProduct.save();

      return updatedProduct;
    }

    /*
    ==============================================
    VARIANT WITHOUT SIZE
    ==============================================
    */

    const quantity =
      Number(
        item.quantity
      );

    const updatedProduct =
      await Product.findOneAndUpdate(
        {
          _id:
            product._id,

          variants: {
            $elemMatch: {
              variantId:
                item.variantId,

              stock: {
                $gte:
                  quantity,
              },
            },
          },
        },
        {
          $inc: {
            "variants.$[variant].stock":
              -quantity,
          },
        },
        {
          arrayFilters: [
            {
              "variant.variantId":
                item.variantId,

              "variant.stock": {
                $gte:
                  quantity,
              },
            },
          ],

          new: true,
        }
      );

    if (!updatedProduct) {
      throw new Error(
        `Insufficient stock for "${product.name}" - ${
          variant.color ||
          item.variantId
        }.`
      );
    }

    /*
    ----------------------------------------------
    SYNC PRODUCT TOTAL
    ----------------------------------------------
    */

    const totalStock =
      updatedProduct.variants.reduce(
        (
          total,
          currentVariant
        ) => {
          if (
            Array.isArray(
              currentVariant.sizes
            ) &&
            currentVariant.sizes
              .length > 0
          ) {
            return (
              total +
              currentVariant.sizes.reduce(
                (
                  sizeTotal,
                  size
                ) =>
                  sizeTotal +
                  Number(
                    size.stock ||
                      0
                  ),
                0
              )
            );
          }

          return (
            total +
            Number(
              currentVariant.stock ||
                0
            )
          );
        },
        0
      );

    updatedProduct.stock =
      totalStock;

    await updatedProduct.save();

    return updatedProduct;
  };

/*
==================================================
POST /api/orders
CREATE ORDER
==================================================

IMPORTANT:

NO STOCK DEDUCTION HERE.

Stock will be deducted only
when admin confirms the order.
==================================================
*/

router.post(
  "/",
  async (req, res) => {
    try {
      console.log(
        "===================================="
      );

      console.log(
        "NEW ORDER REQUEST:"
      );

      console.log(
        JSON.stringify(
          req.body,
          null,
          2
        )
      );

      console.log(
        "===================================="
      );

      const {
        name,
        phone,
        district,
        thana,
        address,
        note,

        productId,
        quantity,

        items,

        source,
        orderSource,
        landingPageId,

        paymentMethod,
      } = req.body;

      /*
      ==============================================
      CUSTOMER
      ==============================================
      */

      const finalName =
        cleanString(name);

      const finalPhone =
        cleanString(phone);

      const finalDistrict =
        cleanString(
          district
        );

      const finalThana =
        cleanString(thana);

      const finalAddress =
        cleanString(
          address
        );

      const finalNote =
        cleanString(note);

      /*
      ==============================================
      VALIDATION
      ==============================================
      */

      if (!finalName) {
        return res.status(400).json({
          success: false,
          message:
            "Name is required.",
        });
      }

      if (!finalPhone) {
        return res.status(400).json({
          success: false,
          message:
            "Phone number is required.",
        });
      }

      if (
        !/^01\d{9}$/.test(
          finalPhone
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Bangladesh phone number.",
        });
      }

      if (!finalDistrict) {
        return res.status(400).json({
          success: false,
          message:
            "District is required.",
        });
      }

      if (!finalThana) {
        return res.status(400).json({
          success: false,
          message:
            "Thana is required.",
        });
      }

      if (!finalAddress) {
        return res.status(400).json({
          success: false,
          message:
            "Address is required.",
        });
      }

      /*
      ==============================================
      RAW ITEMS
      ==============================================
      */

      let rawItems = [];

      if (
        Array.isArray(items) &&
        items.length > 0
      ) {
        rawItems = items;
      } else if (
        productId
      ) {
        rawItems = [
          {
            productId,
            quantity:
              quantity || 1,

            variantId:
              req.body
                ?.variantId,

            selectedColor:
              req.body
                ?.selectedColor,

            selectedColorCode:
              req.body
                ?.selectedColorCode,

            selectedSize:
              req.body
                ?.selectedSize,
          },
        ];
      }

      if (
        !Array.isArray(
          rawItems
        ) ||
        rawItems.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "No valid products found in order.",
        });
      }

      /*
      ==============================================
      VALIDATE ALL PRODUCTS
      ==============================================
      */

      const finalItems = [];

      for (
        let index = 0;
        index <
        rawItems.length;
        index++
      ) {
        const validatedItem =
          await validateProductItem(
            rawItems[index],
            index
          );

        finalItems.push(
          validatedItem
        );
      }

      /*
      ==============================================
      SUBTOTAL
      ==============================================
      */

      const calculatedSubtotal =
        finalItems.reduce(
          (
            sum,
            item
          ) =>
            sum +
            Number(
              item.subtotal ||
                0
            ),
          0
        );

      /*
      ==============================================
      DELIVERY
      ==============================================
      */

      const calculatedDeliveryCharge =
        finalDistrict
          .toLowerCase()
          .includes("dhaka")
          ? 60
          : 100;

      /*
      ==============================================
      TOTAL
      ==============================================
      */

      const calculatedTotal =
        calculatedSubtotal +
        calculatedDeliveryCharge;

      /*
      ==============================================
      FIRST ITEM
      ==============================================
      */

      const firstItem =
        finalItems[0];

      /*
      ==============================================
      CREATE ORDER
      ==============================================
      */

      const newOrder =
        new Order({
          name:
            finalName,

          phone:
            finalPhone,

          district:
            finalDistrict,

          thana:
            finalThana,

          address:
            finalAddress,

          note:
            finalNote,

          /*
          ------------------------------------------
          BACKWARD COMPATIBILITY
          ------------------------------------------
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
          ------------------------------------------
          ITEMS
          ------------------------------------------
          */

          items:
            finalItems,

          /*
          ------------------------------------------
          MONEY
          ------------------------------------------
          */

          subtotal:
            calculatedSubtotal,

          deliveryCharge:
            calculatedDeliveryCharge,

          total:
            calculatedTotal,

          /*
          ------------------------------------------
          STATUS
          ------------------------------------------
          */

          status:
            "pending",

          /*
          ------------------------------------------
          PAYMENT
          ------------------------------------------
          */

          paymentMethod:
            cleanString(
              paymentMethod
            ) || "cod",

          paymentStatus:
            "pending",

          /*
          ------------------------------------------
          SOURCE
          ------------------------------------------
          */

          source:
            cleanString(
              source
            ) || "website",

          orderSource:
            cleanString(
              orderSource
            ) || "website",

          landingPageId:
            cleanString(
              landingPageId
            ),
        });

      /*
      ==============================================
      SAVE ORDER
      ==============================================
      */

      const savedOrder =
        await newOrder.save();

      console.log(
        "ORDER SAVED:",
        savedOrder._id.toString()
      );

      /*
      ==============================================
      IMPORTANT
      ==============================================

      STOCK IS NOT DEDUCTED HERE.

      ==============================================
      */

      return res.status(201).json({
        success: true,

        message:
          "Order created successfully.",

        order:
          savedOrder,
      });
    } catch (error) {
      console.error(
        "CREATE ORDER ERROR:",
        error
      );

      if (
        error.name ===
          "Error" &&
        error.message
      ) {
        return res.status(400).json({
          success: false,
          message:
            error.message,
        });
      }

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

      if (
        error instanceof
        mongoose.Error.CastError
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID.",
        });
      }

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
          .populate(
            "product",
            "productId name brand category image price variants"
          )
          .sort({
            createdAt: -1,
          });

      return res.json({
        success: true,
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
FRAUD CHECK
POST /api/orders/fraud-check
==================================================
*/

router.post(
  "/fraud-check",
  async (req, res) => {
    try {
      const phone =
        cleanString(
          req.body?.phone
        );

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "Phone number is required.",
        });
      }

      if (
        !/^01\d{9}$/.test(
          phone
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid Bangladesh phone number.",
        });
      }

      const result =
        await getFraudCheck(
          phone
        );

      return res.json({
        success: true,
        data:
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
          "Fraud check failed.",
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
      const balance =
        await getBalance();

      return res.json({
        success: true,
        data:
          balance,
      });
    } catch (error) {
      console.error(
        "BALANCE ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to get courier balance.",
        error:
          error.message,
      });
    }
  }
);

/*
==================================================
STEADFAST WEBHOOK
POST /api/orders/webhook
==================================================
*/

router.post(
  "/webhook",
  async (req, res) => {
    try {
      console.log(
        "===================================="
      );

      console.log(
        "STEADFAST WEBHOOK:"
      );

      console.log(
        JSON.stringify(
          req.body,
          null,
          2
        )
      );

      console.log(
        "===================================="
      );

      const {
        consignment_id,
        status,
        invoice,
      } = req.body;

      if (!consignment_id) {
        return res.status(400).json({
          success: false,
          message:
            "Consignment ID is required.",
        });
      }

      const searchConditions = [
        {
          consignmentId:
            String(
              consignment_id
            ),
        },

        {
          trackingCode:
            String(
              consignment_id
            ),
        },
      ];

      if (
        invoice &&
        mongoose.Types.ObjectId.isValid(
          invoice
        )
      ) {
        searchConditions.push({
          _id:
            invoice,
        });
      }

      const order =
        await Order.findOne({
          $or:
            searchConditions,
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found.",
        });
      }

      order.courierStatus =
        status || "";

      const normalizedStatus =
        String(
          status || ""
        )
          .trim()
          .toLowerCase();

      if (
        normalizedStatus ===
          "delivered" ||
        normalizedStatus ===
          "partial_delivered"
      ) {
        order.status =
          "delivered";
      }

      if (
        normalizedStatus ===
          "cancelled" ||
        normalizedStatus ===
          "returned"
      ) {
        order.status =
          "returned";
      }

      if (
        !Array.isArray(
          order.courierHistory
        )
      ) {
        order.courierHistory =
          [];
      }

      order.courierHistory.push({
        status:
          status || "",

        note:
          "Updated from Steadfast webhook.",

        at:
          new Date(),
      });

      await order.save();

      return res.json({
        success: true,
        message:
          "Webhook processed.",
      });
    } catch (error) {
      console.error(
        "WEBHOOK ERROR:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Webhook processing failed.",
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

IMPORTANT:

THIS is where stock is deducted.
==================================================
*/

router.post(
  "/:id/confirm",
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
      ALREADY CONFIRMED
      ==============================================
      */

      if (
        order.status ===
        "confirmed"
      ) {
        return res.json({
          success: true,
          message:
            "Order is already confirmed.",
          order,
        });
      }

      /*
      ==============================================
      FINAL STATES
      ==============================================
      */

      if (
        order.status ===
          "delivered" ||
        order.status ===
          "cancelled" ||
        order.status ===
          "returned" ||
        order.status ===
          "duplicate"
      ) {
        return res.status(400).json({
          success: false,
          message:
            `Order cannot be confirmed because its current status is "${order.status}".`,
        });
      }

      /*
      ==============================================
      ORDER ITEMS
      ==============================================
      */

      const orderItems =
        Array.isArray(
          order.items
        ) &&
        order.items.length > 0
          ? order.items
          : [
              {
                productId:
                  order.productId,

                variantId:
                  order.variantId,

                selectedColor:
                  order.selectedColor,

                selectedColorCode:
                  order.selectedColorCode,

                selectedSize:
                  order.selectedSize,

                quantity:
                  order.quantity ||
                  1,
              },
            ];

      /*
      ==============================================
      VALIDATE STOCK AGAIN
      ==============================================

      Stock could have changed
      after order creation.

      So check fresh database stock.
      ==============================================
      */

      for (
        let index = 0;
        index <
        orderItems.length;
        index++
      ) {
        const item =
          orderItems[index];

        const product =
          await findProduct(
            item.productId
          );

        if (!product) {
          return res.status(400).json({
            success: false,
            message:
              `Product ${item.productId} no longer exists.`,
          });
        }

        const variant =
          findVariant(
            product,
            item.variantId,
            item.selectedColor
          );

        /*
        --------------------------------------------
        VARIANT REQUIRED
        --------------------------------------------
        */

        if (
          Array.isArray(
            product.variants
          ) &&
          product.variants.length >
            0 &&
          !variant
        ) {
          return res.status(400).json({
            success: false,
            message:
              `Variant for "${product.name}" is no longer available.`,
          });
        }

        /*
        --------------------------------------------
        SIZE REQUIRED
        --------------------------------------------
        */

        if (
          variant &&
          Array.isArray(
            variant.sizes
          ) &&
          variant.sizes.length >
            0
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
                  size.size
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
      ----------------------------------------------
      CONFIRM REQUIRED
      ----------------------------------------------
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

      const parcel =
        await createParcel(
          order
        );

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