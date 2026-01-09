const mongoose = require("mongoose");

const permissionItemSchema = new mongoose.Schema(
  {
    pageName: {
      type: String,
      required: [true, "Page name is required"],
      trim: false,
    },
    viewAccess: {
      type: Boolean,
      default: false,
    },
    editAccess: {
      type: Boolean,
      default: false,
    },
    deleteAccess: {
      type: Boolean,
      default: false,
    },
    insertAccess: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
); // Prevent automatic _id creation for sub-documents

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
      validate: {
        validator: function (arr) {
          // Check for duplicate pageNames within the same document
          const pageNames = arr.map((item) => item.pageName);
          return new Set(pageNames).size === pageNames.length;
        },
        message: "Duplicate page names in permissions array",
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
