const express = require("express");
const mongoose = require("mongoose");

const Tenant = require("../models/Tenant");

const router = express.Router();

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

/*
==================================================
GENERATE TENANT ID
==================================================
*/

const generateTenantId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);

  return `tenant_${timestamp}_${random}`;
};

/*
==================================================
GET ALL TENANTS
==================================================
*/

router.get("/", async (req, res) => {
  try {
    const tenants = await Tenant.find({
      active: true,
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: tenants.length,
      tenants,
    });
  } catch (error) {
    console.error("GET TENANTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Tenant list load করতে সমস্যা হয়েছে",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message,
    });
  }
});

/*
==================================================
GET SINGLE TENANT
==================================================
*/

router.get("/:id", async (req, res) => {
  try {
    const id = cleanString(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    let tenant = null;

    /*
    ----------------------------------------------
    MongoDB ObjectId
    ----------------------------------------------
    */

    if (mongoose.isValidObjectId(id)) {
      tenant = await Tenant.findById(id);
    }

    /*
    ----------------------------------------------
    tenantId
    ----------------------------------------------
    */

    if (!tenant) {
      tenant = await Tenant.findOne({
        tenantId: id,
      });
    }

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant পাওয়া যায়নি",
      });
    }

    return res.status(200).json({
      success: true,
      tenant,
    });
  } catch (error) {
    console.error("GET SINGLE TENANT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Tenant load করতে সমস্যা হয়েছে",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message,
    });
  }
});

/*
==================================================
CREATE TENANT
==================================================
*/

router.post("/", async (req, res) => {
  try {
    const name = cleanString(req.body?.name);
    const logo = cleanString(req.body?.logo);

    /*
    ----------------------------------------------
    VALIDATION
    ----------------------------------------------
    */

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Tenant/Store name is required",
      });
    }

    /*
    ----------------------------------------------
    DUPLICATE NAME CHECK
    ----------------------------------------------
    */

    const existingTenant = await Tenant.findOne({
      name: {
        $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
      active: true,
    });

    if (existingTenant) {
      return res.status(409).json({
        success: false,
        message: "এই নামে একটি Tenant আগে থেকেই আছে",
        tenant: existingTenant,
      });
    }

    /*
    ----------------------------------------------
    GENERATE UNIQUE TENANT ID
    ----------------------------------------------
    */

    let tenantId = "";
    let isUnique = false;

    for (let i = 0; i < 5; i++) {
      const generatedId = generateTenantId();

      const exists = await Tenant.exists({
        tenantId: generatedId,
      });

      if (!exists) {
        tenantId = generatedId;
        isUnique = true;
        break;
      }
    }

    if (!isUnique) {
      return res.status(500).json({
        success: false,
        message: "Unique Tenant ID generate করা যায়নি",
      });
    }

    /*
    ----------------------------------------------
    CREATE
    ----------------------------------------------
    */

    const tenant = await Tenant.create({
      tenantId,
      name,
      logo,
      active: true,
    });

    return res.status(201).json({
      success: true,
      message: "Tenant সফলভাবে তৈরি হয়েছে",
      tenant,
    });
  } catch (error) {
    console.error("CREATE TENANT ERROR:", error);

    /*
    ----------------------------------------------
    DUPLICATE KEY
    ----------------------------------------------
    */

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "এই Tenant ইতিমধ্যে exists করে",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Tenant তৈরি করতে সমস্যা হয়েছে",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message,
    });
  }
});

/*
==================================================
UPDATE TENANT
==================================================
*/

router.put("/:id", async (req, res) => {
  try {
    const id = cleanString(req.params.id);

    const name =
      req.body?.name !== undefined
        ? cleanString(req.body.name)
        : undefined;

    const logo =
      req.body?.logo !== undefined
        ? cleanString(req.body.logo)
        : undefined;

    const active =
      req.body?.active !== undefined
        ? Boolean(req.body.active)
        : undefined;

    /*
    ----------------------------------------------
    VALIDATION
    ----------------------------------------------
    */

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    if (name !== undefined && !name) {
      return res.status(400).json({
        success: false,
        message: "Tenant name cannot be empty",
      });
    }

    /*
    ----------------------------------------------
    FIND TENANT
    ----------------------------------------------
    */

    let tenant = null;

    if (mongoose.isValidObjectId(id)) {
      tenant = await Tenant.findById(id);
    }

    if (!tenant) {
      tenant = await Tenant.findOne({
        tenantId: id,
      });
    }

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant পাওয়া যায়নি",
      });
    }

    /*
    ----------------------------------------------
    DUPLICATE NAME CHECK
    ----------------------------------------------
    */

    if (name !== undefined) {
      const duplicate = await Tenant.findOne({
        _id: {
          $ne: tenant._id,
        },
        name: {
          $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
          $options: "i",
        },
        active: true,
      });

      if (duplicate) {
        return res.status(409).json({
          success: false,
          message: "এই নামে আরেকটি Tenant আগে থেকেই আছে",
        });
      }

      tenant.name = name;
    }

    /*
    ----------------------------------------------
    UPDATE LOGO
    ----------------------------------------------
    */

    if (logo !== undefined) {
      tenant.logo = logo;
    }

    /*
    ----------------------------------------------
    UPDATE STATUS
    ----------------------------------------------
    */

    if (active !== undefined) {
      tenant.active = active;
    }

    await tenant.save();

    return res.status(200).json({
      success: true,
      message: "Tenant সফলভাবে update হয়েছে",
      tenant,
    });
  } catch (error) {
    console.error("UPDATE TENANT ERROR:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Tenant update করতে duplicate data পাওয়া গেছে",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Tenant update করতে সমস্যা হয়েছে",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message,
    });
  }
});

/*
==================================================
DELETE TENANT
==================================================
*/

router.delete("/:id", async (req, res) => {
  try {
    const id = cleanString(req.params.id);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Tenant ID is required",
      });
    }

    /*
    ----------------------------------------------
    FIND TENANT
    ----------------------------------------------
    */

    let tenant = null;

    if (mongoose.isValidObjectId(id)) {
      tenant = await Tenant.findById(id);
    }

    if (!tenant) {
      tenant = await Tenant.findOne({
        tenantId: id,
      });
    }

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: "Tenant পাওয়া যায়নি",
      });
    }

    /*
    ----------------------------------------------
    SOFT DELETE
    ----------------------------------------------
    
    Product / Order-এর tenantId যেন orphan না হয়ে যায়,
    তাই database থেকে permanently delete করছি না।
    */

    tenant.active = false;

    await tenant.save();

    return res.status(200).json({
      success: true,
      message: "Tenant সফলভাবে remove হয়েছে",
      tenant,
    });
  } catch (error) {
    console.error("DELETE TENANT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Tenant remove করতে সমস্যা হয়েছে",
      error:
        process.env.NODE_ENV === "production"
          ? undefined
          : error.message,
    });
  }
});

/*
==================================================
EXPORT
==================================================
*/

module.exports = router;