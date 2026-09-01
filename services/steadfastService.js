// services/steadfastService.js
//
// Thin wrapper around the Steadfast Courier API. Credentials come from
// .env — never exposed to the frontend. Get your Api Key / Secret Key
// from your Steadfast merchant panel (Settings -> API).

const axios = require("axios");

const BASE_URL =
  process.env.STEADFAST_BASE_URL || "https://portal.packzy.com/api/v1";

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Api-Key": process.env.STEADFAST_API_KEY,
    "Secret-Key": process.env.STEADFAST_SECRET_KEY,
    "Content-Type": "application/json",
  },
});

// Creates one consignment. `order` is a Mongoose Order document (or plain
// object) with name/phone/address/total/items already populated.
async function createParcel(order) {
  const payload = {
    invoice: String(order._id),
    recipient_name: order.name,
    recipient_phone: order.phone,
    recipient_address: `${order.address}, ${order.thana}, ${order.district}`,
    cod_amount: order.total,
    note: order.note || "",
    item_description: (order.items || [])
      .map((it) => `${it.name} x${it.quantity}`)
      .join(", "),
  };

  const { data } = await client.post("/create_order", payload);
  // Typical Steadfast response shape:
  // { status: 200, message: "...", consignment: { consignment_id, tracking_code, status, ... } }
  return data;
}

// Polling fallback for when the webhook hasn't fired yet, or to
// double-check a status manually.
async function getStatusByConsignmentId(consignmentId) {
  const { data } = await client.get(`/status_by_cid/${consignmentId}`);
  return data;
}

// Fraud/reliability check — this phone number's delivery track record
// across ALL Steadfast merchants, not just your own store.
async function getFraudCheck(phone) {
  const { data } = await client.get(`/fraud_check/${phone}`);
  // Typical response shape:
  // { total_parcels, total_delivered, total_cancelled, success_ratio }
  return data;
}

// Current Steadfast account balance — handy for a low-balance warning
// before a bulk parcel-creation run fails partway through.
async function getBalance() {
  const { data } = await client.get("/get_balance");
  return data;
}

module.exports = {
  createParcel,
  getStatusByConsignmentId,
  getFraudCheck,
  getBalance,
};
