# The Darji - Business Management App

A comprehensive business management application for custom tailoring services.

## 🚀 Features

- ✅ Invoice Generation (Auto-calculated PDF)
- ✅ Order Management with custom requirements
- ✅ Client Management
- ✅ WhatsApp Integration (Click-to-send)
- ✅ Automated Messaging (Order confirmation, Post-delivery, Re-engagement)
- ✅ Smart Reminders (Trial & Delivery dates)
- ✅ Business Analytics Dashboard
- ✅ Trial Notes & Alterations tracking

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone/Navigate to the project**
   ```bash
   cd "d:\The Darji\TECH"
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Setup environment variables**
   - Copy `.env.example` to create a `.env` file if it doesn't exist
   - Update the values (especially business phone, email, address)

5. **Initialize database**
   ```bash
   npx prisma generate
   npx prisma migrate dev
   ```

6. **Seed initial data (optional)**
   ```bash
   node server/seed.js
   ```

## 🎯 Running the Application

### Development Mode

Run both backend and frontend simultaneously:
```bash
npm run dev
```

Or run them separately:

**Backend** (runs on port 5000):
```bash
npm run server
```

**Frontend** (runs on port 3000):
```bash
npm run client
```

## 📱 First-Time Setup

1. Open your browser and navigate to `http://localhost:3000`
2. You'll see a registration page for first-time setup
3. Create your owner account with:
   - Username
   - Password
   - Full Name
4. After registration, you'll be automatically logged in

## 🔧 Configuration

### Business Information
Edit the `.env` file to customize:
- `BUSINESS_NAME` - Your business name
- `BUSINESS_PHONE` - Phone number (with country code)
- `BUSINESS_EMAIL` - Business email
- `BUSINESS_ADDRESS` - Physical address

### Default Garment Prices
After logging in, go to Settings to add default prices for:
- Pants/Trousers
- Shirts
- Blazers
- Any custom garment types

## 📊 How to Use

### Creating an Order
1. Go to "New Order" from the dashboard
2. Select or create a client
3. Add garment items (type and quantity)
4. Enter trial and delivery dates
5. Add any special requirements/notes
6. Click "Generate Invoice" - the PDF will be created automatically
7. A WhatsApp link will open with pre-filled message and invoice

### Managing Orders
- View all orders in the "Orders" page
- Filter by status (Pending, In Progress, Trial, Completed, Delivered)
- Update order status
- Add trial notes after trials
- Track delivery dates

### Automated Messages
Three types of messages are sent automatically:

1. **Order Confirmation** - Sent when invoice is generated
2. **Post-Delivery** - Sent when order status changes to "Delivered"
3. **Re-engagement** - Sent monthly to clients who haven't ordered in 30+ days

All messages open WhatsApp with pre-filled text - you just click send!

### Reminders
- The system checks daily (9 AM) for:
  - Trials scheduled in 2 days
  - Deliveries scheduled in 2 days
- Re-engagement campaigns run monthly (1st of month, 10 AM)

### Analytics
View comprehensive business insights:
- Total orders and revenue
- Order status breakdown
- Revenue trends over time
- Top garment types
- Client statistics

## 🗂️ Project Structure

```
The Darji/TECH/
├── server/                 # Backend (Node.js/Express)
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   ├── middleware/        # Authentication, etc.
│   └── index.js           # Server entry point
├── client/                # Frontend (React/Vite)
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── context/       # State management
│   │   └── api/           # API client
│   └── index.html
├── prisma/                # Database schema and migrations
│   └── schema.prisma
├── invoices/              # Generated PDF invoices
└── package.json
```

## 🔐  Security

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- API routes protected with authentication middleware
- Tokens stored in browser localStorage

## 🐛 Troubleshooting

**Database errors:**
```bash
npx prisma migrate reset
npx prisma migrate dev
```

**Port already in use:**
- Change `PORT` in `.env` file
- Or kill the process using the port

**Frontend not connecting to backend:**
- Make sure backend is running on port 5000
- Check the proxy configuration in `client/vite.config.js`

## 📞 Support

For issues or questions about The Darji app, please contact the development team.

---

**Built with ❤️ for The Darji**
