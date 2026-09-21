/**
 * One-time: create hidden system super admin (isSystemUser=true).
 * Usage: node scripts/createSystemSuperAdmin.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");

const LOGIN_ID = "HSS-SUPER";
const PASSWORD = "Hss@Super#2026";
const EMAIL = "system.super@hotelseashore.local";
const USERNAME = "SystemSuperAdmin";

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error("MONGO_URI missing in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const existing = await User.findOne({
    $or: [{ loginID: LOGIN_ID }, { email: EMAIL }, { username: USERNAME }],
  });

  if (existing) {
    existing.isSystemUser = true;
    existing.role = { id: 2, value: "superadmin", label: "Super Admin" };
    existing.plainPassword = PASSWORD;
    existing.password = PASSWORD; // pre-save will hash if modified
    existing.markModified("password");
    await existing.save();
    console.log("Updated existing system super admin:");
    console.log({ loginID: existing.loginID, username: existing.username, isSystemUser: existing.isSystemUser });
  } else {
    const user = await User.create({
      loginID: LOGIN_ID,
      username: USERNAME,
      email: EMAIL,
      password: PASSWORD,
      plainPassword: PASSWORD,
      gender: "male",
      phoneNumber: "",
      currentAddress: "System",
      role: { id: 2, value: "superadmin", label: "Super Admin" },
      hotelID: [],
      isSystemUser: true,
      statusID: 1,
      isRestaurant: false,
      key: `system-super-${Date.now()}`,
    });
    console.log("Created system super admin:");
    console.log({ loginID: user.loginID, username: user.username, isSystemUser: user.isSystemUser });
  }

  console.log("\nCredentials (keep private):");
  console.log(`  User ID : ${LOGIN_ID}`);
  console.log(`  Password: ${PASSWORD}`);

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
