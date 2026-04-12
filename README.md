# DjEcommerce — MERN Edition
### Django E-Commerce converted to React + Node.js + PostgreSQL, deployed on AWS

---

## What This App Does

A full-featured clothing e-commerce store converted 1-to-1 from the original Django project. Every Django model, view, and URL has been recreated in the MERN stack.

| Django Original       | MERN Equivalent                        |
|-----------------------|----------------------------------------|
| `Item` model          | Sequelize `Item` + PostgreSQL table    |
| `UserProfile`         | Merged into `User` model               |
| `OrderItem`           | `OrderItem` with quantity              |
| `Order`               | `Order` with full lifecycle flags      |
| `Address` (B/S types) | `Address` with billing/shipping types  |
| `Payment` (Stripe)    | `Payment` with stripeChargeId          |
| `Coupon`              | `Coupon` with discount amount          |
| `Refund`              | `Refund` with accept/reject            |
| Django templates      | React + React Router SPA               |
| SQLite                | PostgreSQL on **AWS RDS**              |
| Django static files   | Images uploaded to **AWS S3**          |
| Gunicorn + EC2        | Node.js on **AWS EC2**                 |
| Manual deploy         | **AWS Elastic Beanstalk** PaaS         |

---

## AWS Services Used (Assignment Requirements)

| Service | Type | Role |
|---------|------|------|
| **Amazon EC2** | IaaS | Runs the Node.js Express server |
| **Amazon S3** | IaaS | Stores product images (uploaded by admin) |
| **AWS Elastic Beanstalk** | PaaS | Manages EC2, auto-scaling, deployments |
| **Amazon RDS (PostgreSQL)** | PaaS | Managed relational database |

---

## Local Development Setup

### Prerequisites
- Node.js 18+
- PostgreSQL installed locally (you said you already have it)
- Git

### Step 1 — Clone and install

```bash
git clone <your-repo>
cd mern-ecommerce
npm run install:all
```

### Step 2 — Configure environment

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` for local development:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=djecommerce
DB_USER=postgres
DB_PASSWORD=yourpassword
JWT_SECRET=any_long_random_string
STRIPE_SECRET_KEY=sk_test_xxxx
STRIPE_PUBLIC_KEY=pk_test_xxxx
NODE_ENV=development
CLIENT_URL=http://localhost:5173
# Leave AWS keys blank for local (images will use placeholder URLs)
```

### Step 3 — Create database and seed

```bash
# Create the database in PostgreSQL
psql -U postgres -c "CREATE DATABASE djecommerce;"

# Seed with sample items, admin user, and test coupons
cd backend && npm run seed
```

This creates:
- **Admin:** admin@shop.com / admin123
- **User:** user@shop.com / user123
- 9 clothing items (Shirts, Sport wear, Outwear)
- Coupons: SAVE10 ($10 off), SAVE20 ($20 off)

### Step 4 — Run

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open http://localhost:5173

---

## AWS Deployment — Step by Step

---

### STEP 1: Set up Amazon RDS (PostgreSQL)

1. Go to **AWS Console → RDS → Create database**
2. Choose:
   - Engine: **PostgreSQL**
   - Template: **Free tier**
   - DB identifier: `djecommerce-db`
   - Master username: `postgres`
   - Master password: (choose a strong password)
3. Under **Connectivity:**
   - VPC: Default
   - Public access: **Yes** (for initial setup only)
   - Create a new VPC security group: `djecommerce-rds-sg`
4. Click **Create database** — wait ~5 minutes
5. Copy the **Endpoint** (looks like `djecommerce-db.xxxxxx.us-east-1.rds.amazonaws.com`)
6. Edit the RDS security group → add inbound rule: **PostgreSQL (5432)** from your IP + from EB security group later

---

### STEP 2: Set up Amazon S3

1. Go to **AWS Console → S3 → Create bucket**
2. Name: `djecommerce-images` (must be globally unique)
3. Region: `us-east-1`
4. **Uncheck** "Block all public access" → confirm
5. After creation, go to **Permissions → Bucket Policy**, paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::djecommerce-images/*"
  }]
}
```

6. Go to **IAM → Users → Create user**
   - Name: `djecommerce-s3-user`
   - Attach policy: **AmazonS3FullAccess**
   - Create **Access Key** → save `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

---

### STEP 3: Build the React frontend

```bash
cd frontend
npm run build
# This creates frontend/dist/
```

Copy the built frontend into the backend to serve as static files. Add this to `backend/server.js` (already included):

```js
const path = require('path');
// Serve React build
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
```

---

### STEP 4: Deploy with Elastic Beanstalk

#### Option A — EB CLI (recommended)

```bash
# Install EB CLI
pip install awsebcli

# In project root
eb init djecommerce-mern --platform node.js-18 --region us-east-1

eb create djecommerce-production

# Set environment variables
eb setenv \
  DB_HOST=your-rds-endpoint.rds.amazonaws.com \
  DB_PORT=5432 \
  DB_NAME=djecommerce \
  DB_USER=postgres \
  DB_PASSWORD=yourpassword \
  JWT_SECRET=your_long_secret \
  STRIPE_SECRET_KEY=sk_live_xxxx \
  STRIPE_PUBLIC_KEY=pk_live_xxxx \
  AWS_ACCESS_KEY_ID=your_key \
  AWS_SECRET_ACCESS_KEY=your_secret \
  AWS_REGION=us-east-1 \
  S3_BUCKET_NAME=djecommerce-images \
  NODE_ENV=production

eb deploy
eb open
```

#### Option B — AWS Console (manual ZIP upload)

1. Zip the project (exclude node_modules):
```bash
zip -r djecommerce.zip . -x "*/node_modules/*" -x "frontend/dist/*" -x ".git/*"
```
2. Go to **Elastic Beanstalk → Create application**
   - Application name: `djecommerce-mern`
   - Platform: **Node.js 18**
3. Upload the zip as the application version
4. Under **Configure more options → Software → Environment properties**, add all env vars from `.env.example`
5. Click **Create environment**

---

### STEP 5: Connect RDS to Elastic Beanstalk

1. Find your EB environment's **security group** (EC2 → Security Groups)
2. Go to your **RDS security group** → Edit inbound rules
3. Add rule: **PostgreSQL (5432)** → Source: **EB security group ID**
4. Now EB can talk to RDS

### STEP 6: Run database migrations

```bash
# SSH into the EB EC2 instance
eb ssh

# Or run seed remotely
eb ssh -c "cd /var/app/current && node backend/seeders/seed.js"
```

---

## API Endpoints Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | User | Get profile |
| GET | `/api/items` | — | List items (search, filter, paginate) |
| GET | `/api/items/:slug` | — | Get single item |
| POST | `/api/items` | Admin | Create item + S3 upload |
| PUT | `/api/items/:id` | Admin | Update item |
| DELETE | `/api/items/:id` | Admin | Delete item |
| GET | `/api/cart` | User | View cart (active order) |
| POST | `/api/cart/add/:slug` | User | Add item to cart |
| DELETE | `/api/cart/remove/:slug` | User | Remove item entirely |
| PATCH | `/api/cart/remove-single/:slug` | User | Decrement quantity |
| GET | `/api/addresses` | User | List addresses |
| POST | `/api/addresses` | User | Save address |
| POST | `/api/checkout` | User | Assign addresses to order |
| GET | `/api/payment` | User | Get order total |
| POST | `/api/payment` | User | Process Stripe payment |
| GET | `/api/orders/my` | User | Order history |
| GET | `/api/orders` | Admin | All orders |
| PUT | `/api/orders/:id/deliver` | Admin | Mark shipped |
| PUT | `/api/orders/:id/receive` | User | Mark received |
| POST | `/api/coupons/apply` | User | Apply coupon code |
| GET | `/api/coupons` | Admin | List coupons |
| POST | `/api/coupons` | Admin | Create coupon |
| POST | `/api/refunds` | User | Request refund by refCode |
| GET | `/api/refunds` | Admin | List refunds |
| PUT | `/api/refunds/:id/accept` | Admin | Accept refund |

---

## Test Cases (~15) for Assignment

| # | Module | Test Case | How to Test |
|---|--------|-----------|-------------|
| 1 | Auth | Register new user | POST /api/auth/register |
| 2 | Auth | Login with correct credentials | POST /api/auth/login |
| 3 | Auth | Login with wrong password returns 401 | POST /api/auth/login |
| 4 | Items | List all items | GET /api/items |
| 5 | Items | Filter by category | GET /api/items?category=S |
| 6 | Items | Admin creates new item | POST /api/items (admin JWT) |
| 7 | Cart | Add item to cart | POST /api/cart/add/:slug |
| 8 | Cart | Decrement item quantity | PATCH /api/cart/remove-single/:slug |
| 9 | Cart | Remove item from cart | DELETE /api/cart/remove/:slug |
| 10 | Coupon | Apply valid coupon code | POST /api/coupons/apply |
| 11 | Coupon | Apply invalid coupon returns 404 | POST /api/coupons/apply |
| 12 | Checkout | Save shipping + billing address | POST /api/checkout |
| 13 | Payment | Process Stripe payment | POST /api/payment |
| 14 | Orders | View user order history | GET /api/orders/my |
| 15 | Refund | Submit refund request by refCode | POST /api/refunds |

---

## Project Structure

```
mern-ecommerce/
├── .ebextensions/          ← AWS Elastic Beanstalk configs
│   ├── nodecommand.config
│   └── envvars.config
├── backend/
│   ├── config/
│   │   ├── database.js     ← Sequelize + PostgreSQL (RDS)
│   │   └── s3.js           ← AWS S3 + multer upload
│   ├── middleware/
│   │   └── auth.js         ← JWT protect + adminOnly
│   ├── models/
│   │   ├── index.js        ← All associations
│   │   ├── User.js         ← User + UserProfile merged
│   │   ├── Item.js         ← Product (matches Django Item)
│   │   ├── OrderItem.js
│   │   ├── Order.js
│   │   ├── Address.js      ← Billing (B) / Shipping (S)
│   │   ├── Payment.js      ← Stripe charge record
│   │   ├── Coupon.js
│   │   └── Refund.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── items.js
│   │   ├── cart.js
│   │   ├── addresses.js
│   │   ├── checkout.js
│   │   ├── payment.js
│   │   ├── orders.js
│   │   ├── coupons.js
│   │   └── refunds.js
│   ├── seeders/seed.js
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── CartContext.jsx
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   └── ItemCard.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Products.jsx
│   │   │   ├── ProductDetail.jsx
│   │   │   ├── Auth.jsx
│   │   │   ├── OrderSummary.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── Payment.jsx
│   │   │   ├── OrderHistory.jsx
│   │   │   ├── RequestRefund.jsx
│   │   │   └── admin/AdminDashboard.jsx
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── index.css
│   └── package.json
├── Procfile                ← EB process definition
├── package.json            ← Root scripts
└── README.md
```   # Updated
