# Booking API Improvements

## Overview
The booking controller and routes have been upgraded to international professional standards with real-time data update features.

## Key Improvements

### 1. **Professional Error Handling**
- Standardized success/error response format
- Consistent HTTP status codes
- Detailed error messages with timestamps
- Proper validation error handling

### 2. **Input Validation**
- Comprehensive validation using `express-validator`
- Field-level validation with custom error messages
- Query parameter validation
- MongoDB ObjectId validation

### 3. **Advanced Query Features**
- **Pagination**: `page` and `limit` query parameters
- **Sorting**: `sortBy` and `sortOrder` parameters
- **Filtering**: By status, hotel, booking number, date range
- **Search**: Multi-field search (name, phone, email, booking number, transaction ID)
- **Date Range**: Filter bookings by check-in/check-out dates

### 4. **Real-Time Updates (Socket.io)**
- Real-time notifications for booking events:
  - `booking:created` - When a new booking is created
  - `booking:updated` - When a booking is updated
  - `booking:canceled` - When a booking is canceled
  - `booking:deleted` - When a booking is deleted
- Hotel-specific rooms for targeted updates
- Automatic event emission on all booking operations

### 5. **New Endpoints**

#### Statistics Endpoint
```
GET /api/bookings/stats/overview
```
Returns:
- Total bookings count
- Total revenue
- Total advance payments
- Total due payments
- Average bill amount
- Status breakdown
- Upcoming check-ins (next 7 days)

#### Date Range Endpoint
```
GET /api/bookings/date-range?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```
Get all bookings within a specific date range.

### 6. **Auto-Calculations**
- Automatic nights calculation from check-in/check-out dates
- Automatic due payment calculation from total bill and advance payment
- Prevents calculation errors

### 7. **Performance Optimizations**
- Database aggregation for booking number generation
- Lean queries for better performance
- Efficient pagination
- Indexed queries

## API Endpoints

### Create Booking
```
POST /api/bookings
Headers: Authorization: Bearer <token>
Body: (see validation requirements)
```

### Get All Bookings
```
GET /api/bookings?page=1&limit=50&sortBy=createdAt&sortOrder=desc&statusID=1&hotelID=1&search=john
```

### Get Booking by ID
```
GET /api/bookings/:id
```

### Get Bookings by Hotel
```
GET /api/bookings/hotel/:hotelID?page=1&limit=50
```

### Get Bookings by Booking Number
```
GET /api/bookings/bookingNo/:bookingNo
```

### Get Booking Statistics
```
GET /api/bookings/stats/overview?hotelID=1&startDate=2024-01-01&endDate=2024-12-31
```

### Get Bookings by Date Range
```
GET /api/bookings/date-range?startDate=2024-01-01&endDate=2024-01-31&hotelID=1
```

### Update Booking
```
PUT /api/bookings/:id
```

### Cancel Booking (Soft Delete)
```
PUT /api/bookings/soft/:id
Body: { canceledBy: "username", reason: "Cancellation reason" }
```

### Delete Booking
```
DELETE /api/bookings/:id
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Booking created successfully",
  "data": { ... },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Phone number is required"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Real-Time Events

### Client-Side Socket.io Setup
```javascript
import io from 'socket.io-client';

const socket = io('http://your-server-url');

// Join hotel room for targeted updates
socket.emit('join:hotel', hotelID);

// Listen for booking events
socket.on('booking:created', (data) => {
  console.log('New booking:', data);
});

socket.on('booking:updated', (data) => {
  console.log('Booking updated:', data);
});

socket.on('booking:canceled', (data) => {
  console.log('Booking canceled:', data);
});

socket.on('booking:deleted', (data) => {
  console.log('Booking deleted:', data);
});
```

## Installation

Install new dependencies:
```bash
npm install socket.io express-validator
```

## Environment Variables

Add to `.env`:
```
CLIENT_URL=http://localhost:3000  # For Socket.io CORS
```

## Migration Notes

### Breaking Changes
- Route paths have been standardized (all use `/api/bookings` prefix)
- Response format changed to include `success`, `message`, and `timestamp`
- `getBookingsByHotelId` now uses URL parameter instead of body

### Backward Compatibility
- Old route `/api/getBookingByHotelID` has been replaced with `/api/bookings/hotel/:hotelID`
- All endpoints now require proper validation

## Best Practices

1. **Always use pagination** for large datasets
2. **Use filters** to reduce data transfer
3. **Subscribe to Socket.io events** for real-time updates
4. **Validate input** on the client side before sending
5. **Handle errors** gracefully using the standardized error format

## Performance Tips

- Use `lean()` queries when you don't need Mongoose documents
- Implement caching for frequently accessed data
- Use database indexes on frequently queried fields
- Limit pagination size (max 100 items per page)

