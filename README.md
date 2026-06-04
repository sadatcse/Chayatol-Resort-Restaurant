# Chayatol Resort & Restaurant Management System

An all-in-one corporate administration and resource planning platform custom-tailored for **Chayatol Resort & Restaurant**. This unified software solution provides staff directory management, division organization, auditing logs, and robust role-based access controls (RBAC) powered by Next.js.

---

## 🚀 Key Features

* **Staff Directory & Management:** Full CRUD operations for resort personnel. Add and update employee records with legal name, corporate email, mobile number, assigned division, system role, custom profile pictures, and active duty status.
* **Role-Based Access Control (RBAC):** Hierarchical permissions system protecting access levels across Super Admin, Admin, and Manager accounts.
* **Resort Division Organization:** Dynamically group staff into custom departments/divisions (e.g., IT, Management, Operations, Food & Beverage).
* **System Audit Logging:** Automated logging mechanism tracking database operations (POST, PUT, DELETE actions) to keep a secure transaction trail.
* **Aesthetic Dashboard:** Styled with bespoke HSL/HEX corporate brand colors, featuring stat cards, filter pills, interactive modals, responsive grid structures, and micro-animated transitions.

---

## 🛠️ Technology Stack

### Core Framework
* **[Next.js](https://nextjs.org/)** (v16.2.7 with App Router & Turbopack)
* **[React](https://react.dev/)** (v19.2.4)

### Database & ODM
* **[MongoDB](https://www.mongodb.com/)** (Database)
* **[Mongoose](https://mongoosejs.com/)** (ODM)

### Design & Styling
* **[Tailwind CSS](https://tailwindcss.com/)** (v4.0)
* **[DaisyUI](https://daisyui.com/)** (v5.5)
* **[Framer Motion](https://www.framer.com/motion/)** (Animations)
* **[SweetAlert2](https://sweetalert2.github.io/)** (Dialog modals)
* **[React Icons](https://react-icons.github.io/react-icons/)** (Visual glyphs)

### Authentication & Security
* **JSON Web Tokens (JWT)** for session integrity
* **Bcrypt.js** for password hashing and validation

---

## 📂 Project Directory Structure

```text
├── public/                 # Static assets (images, icons)
├── src/
│   ├── app/
│   │   ├── api/            # Next.js Server-Side Route Handlers
│   │   │   ├── department/
│   │   │   ├── permissions/
│   │   │   ├── transaction-logs/
│   │   │   ├── user/
│   │   │   ├── userlog/
│   │   │   └── userrole/
│   │   ├── dashboard/      # Client-side Dashboard Views
│   │   │   ├── profile/    # User settings and credentials
│   │   │   ├── setting/    # Role permission adjustments
│   │   │   ├── staff/      # Resort Staff Directory
│   │   │   └── user-access/# Session activity audit logs
│   │   ├── globals.css     # Global styles and custom Tailwind @theme
│   │   ├── layout.js       # App-wide context wrappers
│   │   └── page.js         # Landing / Login gateway
│   ├── components/         # Shared components (Sidebar, Header, Pagination, etc.)
│   ├── hooks/              # Custom React hooks (Debounce, Axios Secure interceptors)
│   ├── lib/                # Database connection helper, logger middleware
│   ├── models/             # Mongoose database collection schemas
│   └── providers/          # React context providers (AuthContext)
├── seed-user.mjs           # Database seeding script for initial superadmin/admin accounts
├── package.json            # Dependencies and build scripts
└── README.md               # System documentation
```

---

## ⚙️ Getting Started

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and a running **MongoDB** instance (local or Atlas cluster).

### 2. Environment Configuration
Create a `.env` file in the root directory and populate the following keys:

```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
NEXT_PUBLIC_BACKEND_URL=/api
```

### 3. Install Dependencies
Run the following command to download project dependencies:

```bash
npm install
```

### 4. Seed the Database
Populate your database with the default Super Admin and Admin records:

```bash
node seed-user.mjs
```

### 5. Running the Application

* **Development Server:**
  ```bash
  npm run dev
  ```
  Open [http://localhost:3000](http://localhost:3000) in your web browser.

* **Production Build:**
  ```bash
  npm run build
  npm run start
  ```

---

## 👥 Contributors

This software is built and maintained by:

* **Md Sadat Khan** ([sadatcse](https://github.com/sadatcse))
* **Salauddin Khan**
