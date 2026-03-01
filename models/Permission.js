const mongoose = require("mongoose");

const permissionItemSchema = new mongoose.Schema(
  {
    pageKey: { type: String, trim: true },
    pageName: { type: String, trim: false },
    viewAccess: { type: Boolean, default: false },
    insertAccess: { type: Boolean, default: false },
    editAccess: { type: Boolean, default: false },
    deleteAccess: { type: Boolean, default: false },
  },
  { _id: false }
);

const permissionSchema = new mongoose.Schema(
  {
    permissionName: {
      type: String,
      required: [true, "Permission name is required"],
      trim: true,
      unique: true,
    },
    permissions: {
      type: [permissionItemSchema],
      default: [],
      validate: {
        validator: function (arr) {
          const keys = arr.map((item) => item.pageKey || item.pageName).filter(Boolean);
          return keys.length === 0 || new Set(keys).size === keys.length;
        },
        message: "Duplicate page (pageKey/pageName) in permissions array",
      },
    },
  },
  {
    timestamps: true,
    autoIndex: false, // Disable automatic index creation
  }
);

// Create index only on permissionName (not on permissions.pageName)
permissionSchema.index({ permissionName: 1 }, { unique: true });

module.exports = mongoose.model("Permission", permissionSchema);
