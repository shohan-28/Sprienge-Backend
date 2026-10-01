// services/steadfastService.js

const axios = require("axios");

/*
==================================================
STEADFAST CONFIG
==================================================
*/

const BASE_URL =
  process.env.STEADFAST_BASE_URL ||
  "https://portal.packzy.com/api/v1";

const API_KEY = process.env.STEADFAST_API_KEY;
const SECRET_KEY = process.env.STEADFAST_SECRET_KEY;

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,

  headers: {
    "Api-Key": API_KEY,
    "Secret-Key": SECRET_KEY,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/*
==================================================
HELPERS
==================================================
*/

// Convert value to clean string
const cleanString = (value) => {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
};

// Normalize Bangladesh phone number
const normalizePhone = (phone) => {
  let value = cleanString(phone);

  // Remove spaces, -, brackets etc.
  value = value.replace(/[^\d+]/g, "");

  // +8801XXXXXXXXX -> 01XXXXXXXXX
  if (value.startsWith("+880")) {
    value = "0" + value.slice(4);
  }

  // 8801XXXXXXXXX -> 01XXXXXXXXX
  if (value.startsWith("8801")) {
    value = "0" + value.slice(3);
  }

  return value;
};

// Check credentials before making Steadfast requests
const validateCredentials = () => {
  if (!API_KEY || !SECRET_KEY) {
    const error = new Error(
      "Steadfast API credentials are missing. Please check STEADFAST_API_KEY and STEADFAST_SECRET_KEY in your .env file."
    );

    error.code = "STEADFAST_CONFIG_ERROR";

    throw error;
  }
};

/*
==================================================
STEADFAST ERROR HANDLER
==================================================
*/

const handleSteadfastError = (error, operation = "Steadfast API request") => {
  console.error(`\n========== ${operation} FAILED ==========`);

  if (error?.response) {
    console.error("Status:", error.response.status);

    console.error(
      "Response:",
      JSON.stringify(error.response.data, null, 2)
    );

    console.error("URL:", error.config?.url);
    console.error("Method:", error.config?.method);
  } else if (error?.request) {
    console.error("No response received from Steadfast.");
    console.error("URL:", error.config?.url);
  } else {
    console.error("Error:", error.message);
  }

  console.error("========================================\n");

  let message = `${operation} failed.`;

  if (error?.response?.data) {
    const data = error.response.data;

    if (typeof data === "string") {
      message = data;
    } else if (data.message) {
      message = data.message;
    } else if (data.error) {
      message =
        typeof data.error === "string"
          ? data.error
          : JSON.stringify(data.error);
    } else if (data.errors) {
      message =
        typeof data.errors === "string"
          ? data.errors
          : JSON.stringify(data.errors);
    }
  } else if (error?.message) {
    message = error.message;
  }

  const customError = new Error(message);

  customError.status =
    error?.response?.status ||
    error?.status ||
    500;

  customError.code =
    error?.code ||
    "STEADFAST_API_ERROR";

  customError.responseData =
    error?.response?.data || null;

  return customError;
};

/*
==================================================
CREATE PARCEL
==================================================
*/

async function createParcel(order) {
  try {
    validateCredentials();

    if (!order) {
      throw new Error("Order information is required.");
    }

    const orderId = cleanString(order._id);

    if (!orderId) {
      throw new Error("Order ID is missing.");
    }

    const recipientName = cleanString(order.name);

    const recipientPhone = normalizePhone(order.phone);

    const recipientAddress = cleanString(order.address);

    const codAmount = Number(order.total);

    if (!recipientName) {
      throw new Error("Recipient name is required.");
    }

    if (!recipientPhone) {
      throw new Error("Recipient phone number is required.");
    }

    if (!recipientAddress) {
      throw new Error("Recipient address is required.");
    }

    if (!Number.isFinite(codAmount) || codAmount <= 0) {
      throw new Error("Invalid COD amount.");
    }

    /*
    -----------------------------------------------
    ITEM DESCRIPTION
    -----------------------------------------------
    */

    const itemDescription = (order.items || [])
      .map((item) => {
        const name = cleanString(item.name) || "Product";
        const quantity = Number(item.quantity) || 1;

        return `${name} x${quantity}`;
      })
      .join(", ");

    /*
    -----------------------------------------------
    STEADFAST PAYLOAD
    -----------------------------------------------
    */

    const payload = {
      invoice: orderId,

      recipient_name: recipientName,

      recipient_phone: recipientPhone,

      // IMPORTANT:
      // District / Thana are no longer used.
      // Customer's complete address goes directly here.
      recipient_address: recipientAddress,

      cod_amount: codAmount,

      note: cleanString(order.note),

      item_description: itemDescription,
    };

    console.log("\n========== STEADFAST CREATE PARCEL ==========");
    console.log("Invoice:", payload.invoice);
    console.log("Recipient:", payload.recipient_name);
    console.log("Phone:", payload.recipient_phone);
    console.log("Address:", payload.recipient_address);
    console.log("COD:", payload.cod_amount);
    console.log("============================================\n");

    const { data } = await client.post(
      "/create_order",
      payload
    );

    console.log(
      "\n========== STEADFAST PARCEL CREATED =========="
    );

    console.log(
      JSON.stringify(data, null, 2)
    );

    console.log(
      "==============================================\n"
    );

    return data;
  } catch (error) {
    throw handleSteadfastError(
      error,
      "Steadfast parcel creation"
    );
  }
}

/*
==================================================
GET STATUS BY CONSIGNMENT ID
==================================================
*/

async function getStatusByConsignmentId(consignmentId) {
  try {
    validateCredentials();

    const cid = cleanString(consignmentId);

    if (!cid) {
      throw new Error(
        "Consignment ID is required."
      );
    }

    const { data } = await client.get(
      `/status_by_cid/${encodeURIComponent(cid)}`
    );

    return data;
  } catch (error) {
    throw handleSteadfastError(
      error,
      "Steadfast status check"
    );
  }
}

/*
==================================================
FRAUD CHECK
==================================================
*/

async function getFraudCheck(phone) {
  try {
    validateCredentials();

    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      throw new Error(
        "Phone number is required for fraud check."
      );
    }

    console.log(
      "\n========== STEADFAST FRAUD CHECK =========="
    );

    console.log(
      "Phone:",
      normalizedPhone
    );

    console.log(
      "===========================================\n"
    );

    const { data } = await client.get(
      `/fraud_check/${encodeURIComponent(normalizedPhone)}`
    );

    console.log(
      "\n========== FRAUD CHECK RESPONSE =========="
    );

    console.log(
      JSON.stringify(data, null, 2)
    );

    console.log(
      "==========================================\n"
    );

    return data;
  } catch (error) {
    throw handleSteadfastError(
      error,
      "Steadfast fraud check"
    );
  }
}

/*
==================================================
GET BALANCE
==================================================
*/

async function getBalance() {
  try {
    validateCredentials();

    const { data } = await client.get(
      "/get_balance"
    );

    console.log(
      "\n========== STEADFAST BALANCE =========="
    );

    console.log(
      JSON.stringify(data, null, 2)
    );

    console.log(
      "=======================================\n"
    );

    return data;
  } catch (error) {
    throw handleSteadfastError(
      error,
      "Steadfast balance check"
    );
  }
}

/*
==================================================
EXPORT
==================================================
*/

module.exports = {
  createParcel,
  getStatusByConsignmentId,
  getFraudCheck,
  getBalance,
};