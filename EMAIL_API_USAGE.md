# Email Notification API Usage Guide

## Overview

The email notification system is **automatically triggered** when orders are created or updated. You don't need to call a separate email API - emails are sent automatically based on order status changes.

## Environment Setup

Make sure you have these environment variables set in your `.env` file:

```env
RESEND_KEY=re_KVf3Gb8X_GnE4E7BXiPUFhS52qVQ9zkuL
EMAIL_FROM=onboarding@resend.dev  # Optional, defaults to onboarding@resend.dev
```

## Email Flow

### 1. **Create New Order** → Sends "On Hold" Emails

When you create a new order with status `pending` or `on-hold`, the system automatically:
- ✅ Sends **"Complete Your Order — e-Transfer Details"** to customer
- ✅ Sends **"New e-Transfer Order Received"** to merchant

**API Call:**
```bash
POST http://ec2-56-228-21-242.eu-north-1.compute.amazonaws.com/api/orders
Content-Type: application/json

{
  "woocommerce_order_id": "1666",
  "status": "pending",
  "total": 15150,
  "customer_name": "John Doe",
  "customer_email": "customer@example.com",
  "description": "Order description",
  "bank_account_id": 1,
  "target_email": "payment1@company.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 123,
    "woo_order_id": "1666",
    "status": "pending",
    "total": 15150,
    "customer_email": "customer@example.com",
    "bank_account_id": 21
  }
}
```

**Emails Sent Automatically:**
- 📧 **Customer** receives payment instructions with e-Transfer details
- 📧 **Merchant** receives new order notification

---

### 2. **Update Order Status to "processing"** → Sends Processing Emails

When you update an order status from `pending` → `processing`:

**API Call:**
```bash
PUT http://ec2-56-228-21-242.eu-north-1.compute.amazonaws.com/api/orders/123?user_email=merchant@company.com
Content-Type: application/json

{
  "status": "processing"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order updated successfully",
  "data": {
    "id": 123,
    "status": "processing",
    ...
  }
}
```

**Emails Sent Automatically:**
- 📧 **Customer** receives "Payment Received — Order Now Processing"
- 📧 **Merchant** receives "Order Payment Confirmed"

---

### 3. **Update Order Status to "completed"** → Sends Completed Emails

When you update an order status to `completed`:

**API Call:**
```bash
PUT http://ec2-56-228-21-242.eu-north-1.compute.amazonaws.com/api/orders/123?user_email=merchant@company.com
Content-Type: application/json

{
  "status": "completed"
}
```

**Emails Sent Automatically:**
- 📧 **Customer** receives "Your Order Has Been Completed"
- 📧 **Merchant** receives "Order Completed" notification

---

## Complete Workflow Example

### Step 1: Create Order (Customer places order)
```bash
curl -X POST http://ec2-56-228-21-242.eu-north-1.compute.amazonaws.com/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "woocommerce_order_id": "1666",
    "status": "pending",
    "total": 15150,
    "customer_name": "John Doe",
    "customer_email": "customer@example.com",
    "bank_account_id": 1
  }'
```

**Result:**
- ✅ Order created
- 📧 Customer receives: "Complete Your Order — e-Transfer Details" (with payment instructions)
- 📧 Merchant receives: "New e-Transfer Order Received"

---

### Step 2: Customer sends e-Transfer → Merchant confirms payment
```bash
curl -X PUT http://ec2-56-228-21-242.eu-north-1.compute.amazonaws.com/api/orders/123?user_email=merchant@company.com \
  -H "Content-Type: application/json" \
  -d '{
    "status": "processing"
  }'
```

**Result:**
- ✅ Order status updated to "processing"
- 📧 Customer receives: "Payment Received — Order Now Processing"
- 📧 Merchant receives: "Order Payment Confirmed"

---

### Step 3: Merchant ships order
```bash
curl -X PUT http://ec2-56-228-21-242.eu-north-1.compute.amazonaws.com/api/orders/123?user_email=merchant@company.com \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

**Result:**
- ✅ Order status updated to "completed"
- 📧 Customer receives: "Your Order Has Been Completed"
- 📧 Merchant receives: "Order Completed" notification

---

## Email Details

### Customer Emails

#### 1. **On Hold Email** (Status: pending/on-hold)
- **Subject:** "Complete Your Order — e-Transfer Details"
- **Includes:**
  - Order number
  - Total amount
  - **e-Transfer recipient email** (merchant email)
  - **Payment amount**
  - Auto-Deposit notice

#### 2. **Processing Email** (Status: processing)
- **Subject:** "Payment Received — Order Now Processing"
- **Includes:**
  - Payment confirmation
  - Order preparation notice

#### 3. **Completed Email** (Status: completed)
- **Subject:** "Your Order Has Been Completed"
- **Includes:**
  - Order completion confirmation
  - Shipping information

---

### Merchant Emails

#### 1. **New Order Email** (Order created)
- **Subject:** "New e-Transfer Order Received"
- **Includes:**
  - Order details
  - Customer information
  - Total amount

#### 2. **Processing Notification** (Status changed to processing)
- **Subject:** "Order Payment Confirmed - Order #[ID]"
- **Includes:**
  - Payment confirmation
  - Order fulfillment reminder

#### 3. **Completed Notification** (Status changed to completed)
- **Subject:** "Order Completed - Order #[ID]"
- **Includes:**
  - Order fulfillment confirmation

---

## Important Notes

### ✅ Automatic Email Sending
- Emails are sent **automatically** when orders are created or updated
- No separate API call needed for emails
- Email failures don't block order operations (async sending)

### ✅ Email Addresses
- **Customer email:** From `customer_email` field in order
- **Merchant email:** Automatically looked up from `bank_account_id` → `bank_accounts` table

### ✅ Status Detection
- Emails are only sent when status **actually changes**
- If you update an order but status stays the same → No emails sent

### ✅ Duplicate Prevention
- If you create an order with same `woo_order_id` + `customer_email` + `bank_account_id` → No duplicate created, no emails sent

---

## Testing

### Test Order Creation
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "woocommerce_order_id": "TEST-001",
    "status": "pending",
    "total": 10000,
    "customer_email": "test@example.com",
    "bank_account_id": 1
  }'
```

### Test Status Update
```bash
curl -X PUT http://localhost:3000/api/orders/123?user_email=merchant@company.com \
  -H "Content-Type: application/json" \
  -d '{
    "status": "processing"
  }'
```

---

## Troubleshooting

### Emails Not Sending?
1. ✅ Check `RESEND_KEY` is set in `.env`
2. ✅ Check server logs for email errors
3. ✅ Verify merchant email exists in `bank_accounts` table
4. ✅ Verify customer email is valid format

### Check Email Logs
Look for these in server logs:
- `✅ On Hold email sent to customer:`
- `✅ New Order email sent to merchant:`
- `✅ Processing email sent to customer:`
- `❌ Error sending...` (if errors occur)

---

## Summary

**The email system works automatically!** Just:
1. Create orders → Emails sent automatically
2. Update order status → Emails sent automatically when status changes
3. No extra API calls needed

That's it! 🎉

