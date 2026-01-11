# The Darji - Enterprise Tailoring Business Management System

A modern, full-stack business management application for custom tailoring services built with **React**, **Node.js**, **Express**, **MongoDB Atlas**, and **AWS S3**.

## 🚀 Features

### Core Functionality
- **Client Management** - Comprehensive client database with contact information and order history
- **Order Management** - Complete order lifecycle from creation to delivery
- **Garment Catalog** - Customizable garment types with pricing and cost tracking
- **Invoice Generation** - Automated PDF invoice generation with professional templates
- **Measurements** - Flexible measurement templates for different garment types
- **Analytics Dashboard** - Revenue, profit margins, and business insights
- **Message System** - Client communication with WhatsApp integration (ready)

### Enterprise Features
- **JWT Authentication** - Secure user authentication with role-based access control
- **File Storage** - AWS S3 integration with local storage fallback
- **Profit Analysis** - Track costs and profit margins for each garment type
- **Order Tracking** - Real-time order status updates (Pending → InProgress → Trial → Completed → Delivered)
- **Special Requirements** - Image uploads for custom specifications
- **Trial Notes** - Track fittings and alterations with images

## 🛠️ Technology Stack

### Frontend
- **React 18** + **Vite** - Modern React setup with fast HMR
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Tailwind CSS** - Utility-first CSS framework

### Backend
- **Node.js** + **Express.js** - RESTful API server
- **MongoDB Atlas** - Cloud-native NoSQL database
- **Mongoose** - MongoDB ODM with schema validation
- **JWT** - JSON Web Tokens for authentication
- **Bcrypt** - Password hashing
- **PDFKit** - Invoice PDF generation

### Infrastructure & DevOps
- **AWS S3** - Cloud file storage for images and invoices
- **Winston** - Structured logging with daily file rotation
- **Helmet** - Security headers
- **Express Rate Limit** - DDoS protection
- **Compression** - Response compression
- **Zod** - Runtime type validation

## 📁 Project Structure

```
the-darji-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context providers
│   │   ├── api/           # API client configuration
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
│
├── server/                # Express backend
│   ├── config/           # Configuration files
│   │   ├── database.js   # MongoDB connection
│   │   ├── logger.js     # Winston logger
│   │   └── s3.js         # AWS S3 client
│   ├── models/           # Mongoose schemas (8 models)
│   ├── routes/           # API route handlers (9 routes)
│   ├── middleware/       # Custom middleware
│   ├── services/         # Business logic services
│   ├── validators/       # Zod validation schemas
│   └── scripts/          # Utility scripts
│
├── uploads/              # Local file storage
├── invoices/             # Generated PDF invoices
└── logs/                 # Application logs
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and npm
- **MongoDB Atlas** account (or local MongoDB)
- **AWS Account** (optional - for S3 storage)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd the-darji-app
```

2. **Install dependencies**
```bash
npm install
cd client && npm install && cd ..
```

3. **Configure environment variables**

Create `.env` file in the root directory:

```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/thedarji?retryWrites=true&w=majority

# JWT Authentication
JWT_SECRET=your-super-secret-256-bit-key
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# AWS S3 (Optional)
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=thedarji-uploads
AWS_S3_INVOICE_BUCKET=thedarji-invoices

# Business Information
BUSINESS_NAME="The Darji - Where Tradition Meets Elegance"
BUSINESS_PHONE="+918854017433"
BUSINESS_EMAIL="thedarji.creations@gmail.com"
BUSINESS_ADDRESS="Jaipur, Rajasthan"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

4. **Run database migration** (if migrating from SQLite/Prisma)
```bash
npm run migrate
```

5. **Start development servers**
```bash
npm run dev
```

This will start:
- Backend API on `http://localhost:5000`
- Frontend on `http://localhost:5173`

### Production Build

```bash
# Build frontend
cd client
npm run build

# Start production server
npm start
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/refresh` - Refresh JWT token

### Clients
- `GET /api/clients` - List clients (with pagination & search)
- `GET /api/clients/:id` - Get client details with order history
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Garments
- `GET /api/garments` - List garment types
- `POST /api/garments` - Create garment type
- `PUT /api/garments/:id` - Update garment type
- `DELETE /api/garments/:id` - Delete garment type
- `GET /api/garments/stats/profitability` - Get profit margins

### Orders
- `GET /api/orders` - List orders (with filters)
- `GET /api/orders/:id` - Get order details
- `POST /api/orders` - Create new order  
- `PUT /api/orders/:id` - Update order
- `PATCH /api/orders/:id/status` - Update order status
- `POST /api/orders/:id/special-requirements` - Add requirement with image
- `POST /api/orders/:id/trial-notes` - Add trial note with image

### Invoices
- `POST /api/invoices/generate/:orderId` - Generate invoice PDF
- `GET /api/invoices/:id` - Get invoice
- `GET /api/invoices/download/:id` - Download PDF

### Analytics
- `GET /api/analytics/overview` - Dashboard statistics
- `GET /api/analytics/revenue` - Revenue trends
- `GET /api/analytics/profit` - Profit analysis
- `GET /api/analytics/garments` - Garment popularity
- `GET /api/analytics/clients` - Top clients

## 🔒 Security Features

- **JWT Authentication** - Secure token-based auth
- **Bcrypt Password Hashing** - Industry-standard password security
- **Helmet.js** - Security headers (XSS, clickjacking protection)
- **Rate Limiting** - Prevent brute force attacks
- **Input Validation** - Zod schema validation
- **NoSQL Injection Prevention** - Sanitized inputs
- **CORS Configuration** - Controlled cross-origin access

## 📊 Database Schema

### Models
1. **User** - Authentication and user management
2. **Client** - Customer information
3. **GarmentType** - Garment catalog with pricing
4. **Order** - Order details with nested items and services
5. **Invoice** - Generated PDF invoices
6. **Message** - Client communication history
7. **MessageTemplate** - Reusable message templates
8. **MeasurementTemplate** - Saved measurement sets

## 🎨 UI Features

- **Responsive Design** - Works on desktop, tablet, and mobile
- **Modern UI** - Clean, professional interface
- **Real-time Updates** - Dynamic data updates
- **Image Upload** - Drag-and-drop file uploads
- **PDF Generation** - Professional invoice templates
- **Search & Filter** - Quick data access
- **Pagination** - Efficient large dataset handling

## 🚀 Deployment

### Backend Deployment (Render/Railway/Heroku)
1. Set environment variables in hosting platform
2. Connect MongoDB Atlas (whitelist hosting IP)
3. Configure AWS S3 buckets (optional)
4. Deploy from Git repository

### Frontend Deployment (Vercel/Netlify)
1. Build frontend: `npm run build`
2. Deploy `client/dist` folder
3. Set `VITE_API_URL` environment variable

## 📝 License

ISC

## 👨‍💻 Author

**The Darji**
- Email: thedarji.creations@gmail.com
- Instagram: @thedarji.creations

## 🆘 Support

For issues and questions, please open an issue on GitHub.

---

**Version 2.0.0** - MongoDB Atlas + AWS S3 Enterprise Architecture
