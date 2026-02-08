const mongoose = require("mongoose");

const DashboardSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      default: null, // null means global/default settings
    },
    theme: {
      primary: {
        type: String,
        default: "#3b82f6", // Blue
      },
      secondary: {
        type: String,
        default: "#8b5cf6", // Purple
      },
      accent: {
        type: String,
        default: "#10b981", // Green
      },
      background: {
        type: String,
        default: "#ffffff", // White
      },
      surface: {
        type: String,
        default: "#f9fafb", // Light gray
      },
      text: {
        primary: {
          type: String,
          default: "#111827", // Dark gray
        },
        secondary: {
          type: String,
          default: "#6b7280", // Medium gray
        },
      },
      border: {
        type: String,
        default: "#e5e7eb", // Light gray border
      },
      error: {
        type: String,
        default: "#ef4444", // Red
      },
      warning: {
        type: String,
        default: "#f59e0b", // Orange
      },
      success: {
        type: String,
        default: "#10b981", // Green
      },
      info: {
        type: String,
        default: "#3b82f6", // Blue
      },
    },
    cardStyle: {
      borderRadius: {
        type: String,
        default: "8px",
      },
      shadow: {
        type: String,
        default: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
      },
      padding: {
        type: String,
        default: "16px",
      },
      backgroundColor: {
        type: String,
        default: "#ffffff",
      },
      border: {
        width: {
          type: String,
          default: "1px",
        },
        style: {
          type: String,
          default: "solid",
        },
        color: {
          type: String,
          default: "#e5e7eb",
        },
      },
      hover: {
        shadow: {
          type: String,
          default: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        },
        transform: {
          type: String,
          default: "translateY(-2px)",
        },
      },
    },
    layout: {
      headerPadding: {
        type: String,
        default: "24px", // Padding from header
      },
      contentPadding: {
        type: String,
        default: "20px", // General content padding
      },
      sectionSpacing: {
        type: String,
        default: "32px", // Spacing between sections
      },
    },
    calendar: {
      displayFormat: {
        type: String,
        default: "MMM DD - MMM DD", // Format like "Jan 01 - Jan 31"
        enum: [
          "MMM DD - MMM DD", // Jan 01 - Jan 31
          "MMMM DD - MMMM DD", // January 01 - January 31
          "DD MMM - DD MMM", // 01 Jan - 31 Jan
          "DD/MM - DD/MM", // 01/01 - 31/01
          "MM/DD - MM/DD", // 01/01 - 01/31
          "YYYY-MM-DD - YYYY-MM-DD", // 2024-01-01 - 2024-01-31
        ],
      },
      showMonthName: {
        type: Boolean,
        default: true, // Show month name in calendar header
      },
      showYear: {
        type: Boolean,
        default: true, // Show year in calendar display
      },
      firstDayOfWeek: {
        type: Number,
        default: 0, // 0 = Sunday, 1 = Monday
        enum: [0, 1],
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false, // Only one should be default (global)
    },
  },
  { timestamps: true }
);

// Index for userId
DashboardSchema.index({ userId: 1 });
DashboardSchema.index({ isDefault: 1 });

// Ensure only one default dashboard exists
DashboardSchema.pre("save", async function (next) {
  if (this.isDefault && !this.userId) {
    // If setting this as default, unset other defaults
    await mongoose.model("Dashboard").updateMany(
      { isDefault: true, userId: null, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model("Dashboard", DashboardSchema);
