const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

function generateLoginID() {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `FTB-${randomDigits}`;
}

const UserSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      unique: true,
      sparse: true,
    },
    loginID: {
      type: String,
      unique: true,
    },
    image: { type: String },
    username: { type: String, required: true, unique: true },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "male",
    },
    email: { type: String, required: true, unique: true },
    phoneNumber: { type: String, default: "" },
    currentAddress: { type: String, default: "" },
    role: {
      id: { type: Number, required: true },
      value: { type: String, required: true },
      label: { type: String, required: true },
    },
    password: { type: String, required: true },
    plainPassword: { type: String }, // Optional; do not store from frontend
    statusID: { type: Number, default: 1 },
    hotelID: [
      {
        hotelID: { type: mongoose.Schema.Types.Mixed, required: true }, // Number or string for display
        hotelName: { type: String },
      },
    ],
    permission: {
      _id: { type: mongoose.Schema.Types.ObjectId },
      permissionName: { type: String },
      permissions: [
        {
          pageName: { type: String },
          viewAccess: { type: Boolean },
          editAccess: { type: Boolean },
          deleteAccess: { type: Boolean },
          insertAccess: { type: Boolean },
        },
      ],
    },
    isRestaurant: { type: Boolean, default: false },
    loginHistory: [
      {
        latitude: { type: String, default: "0.0" },
        longitude: { type: String, default: "0.0" },
        publicIP: { type: String, default: "Unknown" },
        loginTime: { type: Date, default: Date.now },
        isRestaurant: { type: Boolean, default: false },
      },
    ],
  },
  { timestamps: true }
);

UserSchema.pre("save", async function (next) {
  // Generate loginID if not provided
  if (!this.loginID) {
    this.loginID = generateLoginID();
  }

  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
