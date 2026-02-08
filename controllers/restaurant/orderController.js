const Order = require("../../models/restaurant/Order");
const Menu = require("../../models/restaurant/Menu");
const Booking = require("../../models/Booking");
const mongoose = require("mongoose");

// Helper function for success response
const sendSuccessResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message,
    ...(data && { data }),
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

// Helper function for error response
const sendErrorResponse = (res, statusCode, message, errors = null) => {
  const response = {
    success: false,
    message,
    ...(errors && { errors }),
    timestamp: new Date().toISOString(),
  };
  return res.status(statusCode).json(response);
};

// Create new order
const createOrder = async (req, res) => {
  try {
    const {
      invoiceNo,
      customerName,
      customerPhone,
      customerEmail,
      tableNumber,
      orderType,
      items,
      subtotal,
      tax,
      discount,
      paymentStatus,
      paymentMethod,
      orderStatus,
      notes,
    } = req.body;

    // Validate required fields
    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      return sendErrorResponse(res, 400, "Missing required fields: customerName and items are required");
    }

    // Validate item IDs and count quantities
    const itemIds = [];
    const itemCounts = {};
    for (const itemId of items) {
      if (!mongoose.Types.ObjectId.isValid(itemId)) {
        return sendErrorResponse(res, 400, `Invalid item ID: ${itemId}`);
      }
      const objId = new mongoose.Types.ObjectId(itemId);
      itemIds.push(objId);
      itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
    }

    // Calculate subtotal from menu items if not provided
    let calculatedSubtotal = 0;
    if (subtotal === undefined) {
      const uniqueItemIds = [...new Set(itemIds.map(id => id.toString()))];
      const menuItems = await Menu.find({ _id: { $in: uniqueItemIds } });
      if (menuItems.length !== uniqueItemIds.length) {
        return sendErrorResponse(res, 404, "One or more menu items not found");
      }
      // Calculate subtotal considering quantities (duplicate IDs)
      calculatedSubtotal = menuItems.reduce((sum, item) => {
        const quantity = itemCounts[item._id.toString()] || 1;
        return sum + (item.price * quantity);
      }, 0);
    }

    // Calculate totals
    const subtotalAmount = subtotal !== undefined ? Number(subtotal) : calculatedSubtotal;
    const taxAmount = tax ? Number(tax) : 0;
    const discountAmount = discount ? Number(discount) : 0;
    const totalAmount = subtotalAmount + taxAmount - discountAmount;

    if (totalAmount < 0) {
      return sendErrorResponse(res, 400, "Total amount cannot be negative");
    }

    // Create order
    const order = await Order.create({
      invoiceNo: invoiceNo ? invoiceNo.trim() : "",
      customerName: customerName.trim(),
      customerPhone: customerPhone ? customerPhone.trim() : "",
      customerEmail: customerEmail ? customerEmail.trim() : "",
      tableNumber: tableNumber ? tableNumber.trim() : "",
      orderType: orderType || "dine_in",
      items: itemIds,
      subtotal: subtotalAmount,
      tax: taxAmount,
      discount: discountAmount,
      total: totalAmount,
      paymentStatus: paymentStatus || "pending",
      paymentMethod: paymentMethod || undefined,
      orderStatus: orderStatus || "pending",
      notes: notes ? notes.trim() : "",
      orderedBy: req.user ? req.user._id : null,
    });

    sendSuccessResponse(res, 201, "Order created successfully", {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        invoiceNo: order.invoiceNo,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        tableNumber: order.tableNumber,
        orderType: order.orderType,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        total: order.total,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        notes: order.notes,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    console.error("Create order error:", error);
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendErrorResponse(res, 400, "Validation failed", errors);
    }
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Get all orders
const getOrders = async (req, res) => {
  try {
    const { invoiceNo, orderStatus, paymentStatus, orderType, statusID, startDate, endDate } = req.query;

    // Build query
    const query = {};
    
    if (invoiceNo) {
      query.invoiceNo = invoiceNo.trim();
    }
    
    if (orderStatus) {
      query.orderStatus = orderStatus;
    }
    
    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }
    
    if (orderType) {
      query.orderType = orderType;
    }
    
    if (statusID !== undefined) {
      query.statusID = Number(statusID);
    } else {
      query.statusID = { $ne: 255 }; // Get active orders by default
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const orders = await Order.find(query)
      .populate("orderedBy", "username email loginID")
      .sort({ createdAt: -1 });

    sendSuccessResponse(res, 200, "Orders retrieved successfully", {
      orders: orders.map((order) => ({
        id: order._id,
        orderNumber: order.orderNumber,
        invoiceNo: order.invoiceNo,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        tableNumber: order.tableNumber,
        orderType: order.orderType,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        total: order.total,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        orderStatus: order.orderStatus,
        notes: order.notes,
        orderedBy: order.orderedBy,
        statusID: order.statusID,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      })),
      count: orders.length,
    });
  } catch (error) {
    console.error("Get orders error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Get order by ID
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(res, 400, "Invalid order ID");
    }

    const order = await Order.findById(id).populate("orderedBy", "username email loginID");

    if (!order) {
      return sendErrorResponse(res, 404, "Order not found");
    }

    sendSuccessResponse(res, 200, "Order retrieved successfully", {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        invoiceNo: order.invoiceNo,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        customerEmail: order.customerEmail,
        tableNumber: order.tableNumber,
        orderType: order.orderType,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        discount: order.discount,
        total: order.total,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        orderStatus: order.orderStatus,
        notes: order.notes,
        orderedBy: order.orderedBy,
        statusID: order.statusID,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error) {
    console.error("Get order error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Update order
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      invoiceNo,
      customerName,
      customerPhone,
      customerEmail,
      tableNumber,
      orderType,
      items,
      subtotal,
      tax,
      discount,
      paymentStatus,
      paymentMethod,
      orderStatus,
      notes,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(res, 400, "Invalid order ID");
    }

    const order = await Order.findById(id);
    if (!order) {
      return sendErrorResponse(res, 404, "Order not found");
    }

    const updateData = {};

    if (invoiceNo !== undefined) updateData.invoiceNo = invoiceNo.trim();
    if (customerName !== undefined) updateData.customerName = customerName.trim();
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone.trim();
    if (customerEmail !== undefined) updateData.customerEmail = customerEmail.trim();
    if (tableNumber !== undefined) updateData.tableNumber = tableNumber.trim();
    if (orderType !== undefined) updateData.orderType = orderType;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (orderStatus !== undefined) updateData.orderStatus = orderStatus;
    if (notes !== undefined) updateData.notes = notes.trim();

    // If items are being updated, recalculate totals
    if (items && Array.isArray(items) && items.length > 0) {
      // Validate item IDs and count quantities
      const itemIds = [];
      const itemCounts = {};
      for (const itemId of items) {
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
          return sendErrorResponse(res, 400, `Invalid item ID: ${itemId}`);
        }
        const objId = new mongoose.Types.ObjectId(itemId);
        itemIds.push(objId);
        itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
      }

      // Calculate subtotal from menu items
      const uniqueItemIds = [...new Set(itemIds.map(id => id.toString()))];
      const menuItems = await Menu.find({ _id: { $in: uniqueItemIds } });
      if (menuItems.length !== uniqueItemIds.length) {
        return sendErrorResponse(res, 404, "One or more menu items not found");
      }
      // Calculate subtotal considering quantities (duplicate IDs)
      const calculatedSubtotal = menuItems.reduce((sum, item) => {
        const quantity = itemCounts[item._id.toString()] || 1;
        return sum + (item.price * quantity);
      }, 0);

      updateData.items = itemIds;
      updateData.subtotal = calculatedSubtotal;

      const taxAmount = tax !== undefined ? Number(tax) : order.tax;
      const discountAmount = discount !== undefined ? Number(discount) : order.discount;
      updateData.tax = taxAmount;
      updateData.discount = discountAmount;
      updateData.total = calculatedSubtotal + taxAmount - discountAmount;
    } else {
      // Only update tax/discount if items are not being updated
      if (tax !== undefined || discount !== undefined || subtotal !== undefined) {
        const subtotalAmount = subtotal !== undefined ? Number(subtotal) : order.subtotal;
        const taxAmount = tax !== undefined ? Number(tax) : order.tax;
        const discountAmount = discount !== undefined ? Number(discount) : order.discount;
        updateData.subtotal = subtotalAmount;
        updateData.tax = taxAmount;
        updateData.discount = discountAmount;
        updateData.total = subtotalAmount + taxAmount - discountAmount;
      }
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("orderedBy", "username email loginID");

    sendSuccessResponse(res, 200, "Order updated successfully", {
      order: {
        id: updatedOrder._id,
        orderNumber: updatedOrder.orderNumber,
        invoiceNo: updatedOrder.invoiceNo,
        customerName: updatedOrder.customerName,
        customerPhone: updatedOrder.customerPhone,
        customerEmail: updatedOrder.customerEmail,
        tableNumber: updatedOrder.tableNumber,
        orderType: updatedOrder.orderType,
        items: updatedOrder.items,
        subtotal: updatedOrder.subtotal,
        tax: updatedOrder.tax,
        discount: updatedOrder.discount,
        total: updatedOrder.total,
        paymentStatus: updatedOrder.paymentStatus,
        paymentMethod: updatedOrder.paymentMethod,
        orderStatus: updatedOrder.orderStatus,
        notes: updatedOrder.notes,
        updatedAt: updatedOrder.updatedAt,
      },
    });
  } catch (error) {
    console.error("Update order error:", error);
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return sendErrorResponse(res, 400, "Validation failed", errors);
    }
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Delete order (soft delete - set statusID to 255)
const deleteOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(res, 400, "Invalid order ID");
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { statusID: 255 },
      { new: true }
    );

    if (!order) {
      return sendErrorResponse(res, 404, "Order not found");
    }

    sendSuccessResponse(res, 200, "Order deleted successfully", {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        statusID: order.statusID,
      },
    });
  } catch (error) {
    console.error("Delete order error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Get order statistics
const getOrderStatistics = async (req, res) => {
  try {
    const { invoiceNo, startDate, endDate } = req.query;

    const query = {
      statusID: { $ne: 255 },
    };

    if (invoiceNo) {
      query.invoiceNo = invoiceNo.trim();
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const orders = await Order.find(query);

    const stats = {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
      pendingOrders: orders.filter((o) => o.orderStatus === "pending").length,
      confirmedOrders: orders.filter((o) => o.orderStatus === "confirmed").length,
      preparingOrders: orders.filter((o) => o.orderStatus === "preparing").length,
      readyOrders: orders.filter((o) => o.orderStatus === "ready").length,
      servedOrders: orders.filter((o) => o.orderStatus === "served").length,
      cancelledOrders: orders.filter((o) => o.orderStatus === "cancelled").length,
      paidOrders: orders.filter((o) => o.paymentStatus === "paid").length,
      pendingPayments: orders.filter((o) => o.paymentStatus === "pending").length,
      totalTax: orders.reduce((sum, order) => sum + order.tax, 0),
      totalDiscount: orders.reduce((sum, order) => sum + order.discount, 0),
    };

    sendSuccessResponse(res, 200, "Order statistics retrieved successfully", {
      statistics: stats,
    });
  } catch (error) {
    console.error("Get order statistics error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

// Get booking information by invoice number
const getBookingByInvoiceNo = async (req, res) => {
  try {
    const { invoiceNo } = req.params;

    if (!invoiceNo) {
      return sendErrorResponse(res, 400, "invoiceNo is required");
    }

    // Find bookings by invoiceNo
    const bookings = await Booking.find({ invoiceNo: invoiceNo.trim() }).sort({ createdAt: -1 });

    if (!bookings || bookings.length === 0) {
      return sendErrorResponse(res, 404, "No bookings found for this invoice number");
    }

    sendSuccessResponse(res, 200, "Booking information retrieved successfully", {
      invoiceNo: invoiceNo.trim(),
      bookings: bookings.map((booking) => ({
        name: booking.fullName,
        phone: booking.phone,
        email: booking.email,
      })),
      count: bookings.length,
    });
  } catch (error) {
    console.error("Get booking by invoice number error:", error);
    sendErrorResponse(res, 500, "Server error", error.message);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getOrderStatistics,
  getBookingByInvoiceNo,
};
