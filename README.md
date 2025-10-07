# E-Transfer API - Order Management

Node.js API for storing and analyzing order information with Express.js and SQLite (development) / PostgreSQL (production).

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

Server will run at `http://localhost:3000`

## Environment Variables

For production deployment (e.g., Render.com), set these environment variables:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://username:password@hostname:port/database_name
PORT=3000
```

- `NODE_ENV`: Set to 'production' to use PostgreSQL instead of SQLite
- `DATABASE_URL`: PostgreSQL connection string (provided by Render.com PostgreSQL service)
- `PORT`: Server port (automatically set by Render.com)

## Database Support

- **Development**: SQLite (`orders.db` file)
- **Production**: PostgreSQL (via `DATABASE_URL` environment variable)

The application automatically switches between SQLite and PostgreSQL based on the `NODE_ENV` environment variable.

## API Endpoints

### 1. Create New Order
**POST** `/api/orders`

**Body:**
```json
{
  "email_buyer": "buyer@example.com",
  "total_amount": 150000,
  "merchant": "Shop ABC"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 1,
    "email_buyer": "buyer@example.com",
    "total_amount": 150000,
    "merchant": "Shop ABC",
    "create_date": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. Get Orders List
**GET** `/api/orders`

**Response:**
```json
{
  "success": true,
  "message": "Orders list retrieved successfully",
  "data": [
    {
      "id": 1,
      "email_buyer": "buyer@example.com",
      "total_amount": 150000,
      "merchant": "Shop ABC",
      "create_date": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 1
}
```

### 3. Get Order by ID
**GET** `/api/orders/:id`

**Response:**
```json
{
  "success": true,
  "message": "Order information retrieved successfully",
  "data": {
    "id": 1,
    "email_buyer": "buyer@example.com",
    "total_amount": 150000,
    "merchant": "Shop ABC",
    "create_date": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. Merchant Statistics
**GET** `/api/orders/stats/merchant`

**Response:**
```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": [
    {
      "merchant": "Shop ABC",
      "total_orders": 5,
      "total_revenue": 750000,
      "avg_order_value": 150000
    }
  ]
}
```

### 5. Health Check
**GET** `/health`

**Response:**
```json
{
  "success": true,
  "message": "API is running normally",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Database Structure

`orders` table:
- `id` (INTEGER, PRIMARY KEY, AUTOINCREMENT)
- `email_buyer` (TEXT, NOT NULL)
- `total_amount` (REAL, NOT NULL)
- `merchant` (TEXT, NOT NULL)
- `create_date` (DATETIME, DEFAULT CURRENT_TIMESTAMP)

## Validation

- `email_buyer`: Required, cannot be empty
- `total_amount`: Required, must be a positive number
- `merchant`: Required, cannot be empty

## Error Handling

API returns HTTP status codes:
- `200`: Success
- `201`: Created successfully
- `400`: Invalid data
- `404`: Not found
- `500`: Server error

## Project Structure

```
etransfer/
├── server.js          # Main server file
├── database.js        # Database configuration
├── package.json       # Dependencies
├── README.md          # Usage guide
├── models/
│   └── Order.js       # Order model
└── routes/
    └── orders.js      # API routes
```

## Testing with cURL

### Create order:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "email_buyer": "test@example.com",
    "total_amount": 200000,
    "merchant": "Test Shop"
  }'
```

### Get orders list:
```bash
curl http://localhost:3000/api/orders
```

### Get statistics:
```bash
curl http://localhost:3000/api/orders/stats/merchant
``` 