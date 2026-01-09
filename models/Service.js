const mongoose = require("mongoose");

/* const DetailsSchema = new mongoose.Schema({
  subDetails: {
    type: String,
    required: true,
  },
});

const PackageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  details: [DetailsSchema],
  price: {
    type: Number, // Changed to Number
    required: true,
  },
  discount: {
    type: Number, // Changed to Number
    required: true,
  },
}); */

const ServiceSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    packages: [
      {
        name: {
          type: String,
          required: true,
        },
        details: [
          {
            subDetails: {
              type: String,
              required: true,
            },
          },
        ],
        price: {
          type: Number,
          required: true,
        },
        discount: {
          type: Number,
          required: true,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Service", ServiceSchema);

module.exports = mongoose.model("Service", ServiceSchema);
