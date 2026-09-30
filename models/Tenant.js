const mongoose = require("mongoose");

const tenantSchema = new mongoose.Schema(
  {
    /*
    ==================================================
    TENANT ID
    ==================================================
    */

    tenantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    /*
    ==================================================
    STORE / BRAND NAME
    ==================================================
    */

    name: {
      type: String,
      required: true,
      trim: true,
    },

    /*
    ==================================================
    LOGO
    ==================================================
    */

    logo: {
      type: String,
      default: "",
      trim: true,
    },

    /*
    ==================================================
    STATUS
    ==================================================
    */

    active: {
      type: Boolean,
      default: true,
    },
  },

  {
    timestamps: true,
    minimize: false,
  }
);

/*
==================================================
INDEXES
==================================================
*/

tenantSchema.index({
  name: "text",
});

/*
==================================================
EXPORT
==================================================
*/

module.exports = mongoose.model("Tenant", tenantSchema);