# Hotel API Documentation

## Overview
The Hotel API provides a hierarchical structure for managing hotels, categories, and rooms. The system follows international professional standards with real-time updates via Socket.io.

## Structure
```
Hotel
  └── Categories (roomCategories)
      └── Rooms (roomNumbers)
          └── Bookings
```

## API Endpoints

### Hotel Operations

#### Create Hotel
```http
POST /api/hotels
Authorization: Bearer <token>
Content-Type: application/json

{
  "hotelName": "Grand Hotel",
  "hotelDescription": "A luxurious hotel in the heart of the city",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "contact": {
    "phone": "+1234567890",
    "email": "info@grandhotel.com",
    "website": "https://grandhotel.com"
  },
  "location": {
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "amenities": ["WiFi", "Pool", "Gym", "Spa"],
  "status": "active"
}
```

#### Get All Hotels
```http
GET /api/hotels?page=1&limit=50&sortBy=createdAt&sortOrder=desc&status=active&search=grand
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `sortBy` - Field to sort by (default: createdAt)
- `sortOrder` - asc or desc (default: desc)
- `status` - Filter by status (active, inactive, maintenance)
- `search` - Search in hotel name, description, or city

#### Get Hotel by ID
```http
GET /api/hotels/:id
```
Supports both MongoDB `_id` and `hotelID` (numeric)

#### Update Hotel
```http
PUT /api/hotels/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "hotelName": "Updated Hotel Name",
  "status": "active"
}
```

#### Delete Hotel
```http
DELETE /api/hotels/:id
```

---

### Category Operations

#### Add Category to Hotel
```http
POST /api/hotels/:hotelId/categories
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Deluxe Suite",
  "description": "Spacious rooms with ocean view",
  "basePrice": 299.99,
  "maxOccupancy": {
    "adults": 2,
    "children": 2
  },
  "amenities": ["WiFi", "TV", "Mini Bar"],
  "isActive": true
}
```

#### Get All Categories
```http
GET /api/hotels/:hotelId/categories
```

#### Update Category
```http
PUT /api/hotels/:hotelId/categories/:categoryId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Category Name",
  "basePrice": 349.99
}
```

#### Delete Category
```http
DELETE /api/hotels/:hotelId/categories/:categoryId
```

---

### Room Operations

#### Add Room to Category
```http
POST /api/hotels/:hotelId/categories/:categoryId/rooms
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "101",
  "roomId": "RM-101",
  "status": "available",
  "price": 299.99,
  "capacity": {
    "adults": 2,
    "children": 1
  },
  "amenities": ["WiFi", "TV", "AC"],
  "description": "Room with balcony"
}
```

#### Get All Rooms in Category
```http
GET /api/hotels/:hotelId/categories/:categoryId/rooms
```

#### Update Room
```http
PUT /api/hotels/:hotelId/categories/:categoryId/rooms/:roomId
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "occupied",
  "price": 349.99
}
```

#### Delete Room
```http
DELETE /api/hotels/:hotelId/categories/:categoryId/rooms/:roomId
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Hotel created successfully",
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
      "field": "hotelName",
      "message": "Hotel name is required"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

## Real-Time Events (Socket.io)

### Client Setup
```javascript
import io from 'socket.io-client';

const socket = io('http://your-server-url');

// Join hotel room for targeted updates
socket.emit('join:hotel', hotelID);

// Listen for hotel events
socket.on('hotel:created', (data) => {
  console.log('New hotel:', data);
});

socket.on('hotel:updated', (data) => {
  console.log('Hotel updated:', data);
});

socket.on('hotel:deleted', (data) => {
  console.log('Hotel deleted:', data);
});

// Category events
socket.on('hotel:category:added', (data) => {
  console.log('Category added:', data);
});

socket.on('hotel:category:updated', (data) => {
  console.log('Category updated:', data);
});

socket.on('hotel:category:deleted', (data) => {
  console.log('Category deleted:', data);
});

// Room events
socket.on('hotel:room:added', (data) => {
  console.log('Room added:', data);
});

socket.on('hotel:room:updated', (data) => {
  console.log('Room updated:', data);
});

socket.on('hotel:room:deleted', (data) => {
  console.log('Room deleted:', data);
});

socket.on('hotel:room:status:updated', (data) => {
  console.log('Room status updated:', data);
});

// Booking events
socket.on('hotel:booking:updated', (data) => {
  console.log('Booking updated:', data);
});

socket.on('hotel:booking:deleted', (data) => {
  console.log('Booking deleted:', data);
});
```

---

## Model Structure

### Hotel Model
```javascript
{
  hotelName: String (required),
  hotelID: Number (auto-incremented, unique),
  hotelDescription: String (required),
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  location: {
    latitude: Number,
    longitude: Number
  },
  amenities: [String],
  images: [String],
  rating: Number (0-5),
  status: String (active, inactive, maintenance),
  roomCategories: [CategorySchema],
  totalRooms: Number (auto-calculated),
  availableRooms: Number (auto-calculated),
  createTime: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Category Model
```javascript
{
  name: String (required),
  categoryId: String,
  description: String,
  basePrice: Number,
  maxOccupancy: {
    adults: Number,
    children: Number
  },
  amenities: [String],
  images: [String],
  roomNumbers: [RoomSchema],
  isActive: Boolean (default: true),
  createdAt: Date,
  updatedAt: Date
}
```

### Room Model
```javascript
{
  name: String (required),
  roomId: String,
  status: String (available, occupied, maintenance, reserved),
  price: Number,
  capacity: {
    adults: Number,
    children: Number
  },
  amenities: [String],
  bookedDates: [String], // YYYY-MM-DD format
  bookings: [BookingSchema],
  description: String,
  images: [String],
  createdAt: Date,
  updatedAt: Date
}
```

---

## Usage Examples

### Complete Workflow

1. **Create Hotel**
```javascript
const hotel = await fetch('/api/hotels', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    hotelName: 'Grand Hotel',
    hotelDescription: 'Luxury hotel',
    status: 'active'
  })
});
```

2. **Add Category**
```javascript
const category = await fetch(`/api/hotels/${hotelId}/categories`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Deluxe Suite',
    basePrice: 299.99
  })
});
```

3. **Add Room**
```javascript
const room = await fetch(`/api/hotels/${hotelId}/categories/${categoryId}/rooms`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: '101',
    status: 'available',
    price: 299.99
  })
});
```

---

## Legacy Endpoints (Backward Compatibility)

The following legacy endpoints are still supported:

- `POST /api/hotel` - Create hotel
- `GET /api/hotel` - Get all hotels
- `PUT /api/hotel/:id` - Update hotel
- `DELETE /api/hotel/:id` - Delete hotel
- `PUT /api/hotels/room/updateBooking` - Update booking in room
- `DELETE /api/hotels/bookings/delete` - Delete booking details
- `PUT /api/hotels/:hotelID/roomCategories/:categoryID/roomStatus` - Update room status

---

## Best Practices

1. **Always use pagination** for listing endpoints
2. **Use filters** to reduce data transfer
3. **Subscribe to Socket.io events** for real-time updates
4. **Validate input** on the client side before sending
5. **Handle errors** gracefully using the standardized error format
6. **Use hotelID for better performance** when querying by hotel ID

---

## Performance Tips

- Use `lean()` queries when you don't need Mongoose documents
- Implement caching for frequently accessed hotels
- Use database indexes (already configured)
- Limit pagination size (max 100 items per page)
- Use hotelID instead of MongoDB _id when possible for better performance

