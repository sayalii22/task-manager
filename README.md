# TaskPulse &bull; Full-Stack Modern Task Manager

A high-performance, responsive full-stack **Task Management Web Application** engineered with **Node.js, Express, Supabase PostgreSQL, HTML5, CSS3, and Vanilla JavaScript**.

Designed with modern SaaS aesthetics, fluid dark/light modes, glassmorphic UI, JWT authentication, drag-and-drop Kanban boards, interactive calendar scheduling, and real-time dashboard analytics.

---

## ✨ Features

### 1. 🔐 Robust Authentication & Security
- **JWT (JSON Web Tokens)** stateless session authentication.
- Password hashing with **bcryptjs** (salt rounds = 10).
- Strict user data isolation: users only see and manage their own tasks.
- Rate-limiting protection on authentication endpoints against brute-force attacks.
- Quick **1-Click Demo Account** button on the login screen for instant portfolio evaluation.

### 2. 📊 Real-Time Analytics Dashboard
- **Metric Cards:** Total tasks, Pending/To Do, In Progress, Completed, Overdue, and Due Today.
- **Completion Rate Ring:** Animated SVG circular progress meter displaying real-time completion percentage.
- **7-Day Activity Trend:** Dynamic weekly completion bar chart with interactive count tooltips.
- **Today's Tasks Checklist:** Quick check-off checklist directly from the dashboard.
- **Upcoming Deadlines Widget:** Real-time countdowns ("Today", "Tomorrow", "3d overdue").

### 3. 📋 Comprehensive Task CRUD & Management
- Fields: Title, description, status (`todo`, `in-progress`, `completed`), priority (`low`, `medium`, `high`, `urgent`), category, due date, tags, recurrence.
- Visual priority styling: color badges with accent glows.
- Interactive tag chip input (`#tag` pills with add/remove).

### 4. 🗂️ Drag-and-Drop Kanban Board
- Interactive Trello/ClickUp-style Kanban board with three columns: **To Do**, **In Progress**, and **Completed**.
- Built with standard **HTML5 Drag and Drop API** (`dragstart`, `dragover`, `drop`, `dragleave`).
- Dragging cards immediately updates the task's status and synchronizes with the PostgreSQL backend.
- Column header counters and direct "+ Add Task" shortcuts per column.

### 5. 📅 Interactive Calendar Schedule
- Monthly calendar grid with **Previous Month**, **Next Month**, and **Today** navigation.
- Color-coded task chips on calendar dates matching task priorities.
- Click any date to open the **Day Inspector** showing tasks due on that day or schedule a new task.

### 6. 🔍 Powerful Search, Filter, Sort & Bulk Actions
- **Instant Search:** Debounced search matching task titles and descriptions.
- **Filters:** By Status, Priority, Category, and Due Date presets (Today, This Week, Overdue, Upcoming).
- **Sort:** By Newest, Oldest, Due Date Earliest/Latest, and Priority.
- **Bulk Actions:** Multi-select tasks to Bulk Complete, Bulk Delete, or change properties.
- **Exporting:** Download full task data as **CSV** spreadsheet or **JSON** backup.

### 7. 🔔 Notifications & Reminders
- In-app notification center bell with unread badge counter.
- Automated scanner alerting on **Overdue tasks** and **Tasks due today**.

### 8. 🌓 SaaS Aesthetics & Dark Mode
- Radiant **Dark Mode** and **Light Mode** toggle with instant switch.
- Preference saved in `localStorage`.
- Built with custom CSS design tokens, glassmorphism (`backdrop-filter`), and Google Fonts (*Outfit* and *Plus Jakarta Sans*).
- 100% responsive across desktop, tablet, and mobile devices (with mobile drawer and collapsible sidebar).

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, Modern CSS3, Vanilla JavaScript (ES6+), Font Awesome 6 |
| **Backend** | Node.js, Express.js |
| **Database** | **Supabase PostgreSQL** via `@supabase/supabase-js` (with zero-config local fallback) |
| **Auth & Security** | JWT (`jsonwebtoken`), `bcryptjs`, `express-rate-limit`, `cors` |
| **Architecture** | RESTful API, MVC Structure (Models, Controllers, Routes, Middleware) |

---

## 📁 Project Structure

```
Task Manager/
├── server.js                     # Express server & route bootstrap
├── package.json                  # Dependencies & npm scripts
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore file
├── test-api.js                   # Automated 12-point API test runner
├── test-supabase.js              # Supabase models, normalizers & error tests
│
├── config/
│   ├── db.js                     # Supabase client manager & fallback detector
│   └── fallbackStore.js          # Persistent local fallback store
│
├── supabase/
│   └── schema.sql                # Complete PostgreSQL SQL schema & RLS policies
│
├── models/
│   ├── User.js                   # Supabase PostgreSQL User model
│   ├── Task.js                   # Supabase PostgreSQL Task model
│   └── Category.js               # Supabase PostgreSQL Category model
│
├── controllers/
│   ├── authController.js         # Register, Login, Me, Profile handlers
│   ├── taskController.js         # Task CRUD, filters, stats, bulk, export
│   └── categoryController.js     # Default & custom category handlers
│
├── routes/
│   ├── authRoutes.js             # /api/auth routes
│   ├── taskRoutes.js             # /api/tasks routes
│   └── categoryRoutes.js         # /api/categories routes
│
├── middleware/
│   ├── authMiddleware.js         # JWT verification & route protection
│   └── errorMiddleware.js        # Supabase/PostgreSQL error handler & 404
│
├── public/                       # Frontend Assets
│   ├── index.html                # Modern Landing Page
│   ├── login.html                # Sign In Page with 1-Click Demo
│   ├── register.html             # Registration Page
│   ├── dashboard.html            # Analytics Dashboard
│   ├── tasks.html                # Task List & Kanban Board
│   ├── calendar.html             # Monthly Calendar View
│   │
│   ├── css/
│   │   └── style.css             # Unified SaaS CSS Design System
│   │
│   └── js/
│       ├── api.js                # API Client, Auth helpers & Toast manager
│       ├── app.js                # Themes, navigation, notifications, modals
│       ├── auth.js               # Form authentication & demo seeder
│       ├── dashboard.js          # Dashboard charts, metrics & widgets
│       ├── tasks.js              # List view, Kanban drag-and-drop, filters
│       └── calendar.js           # Month grid & date task scheduling
│
└── README.md
```

---

## 🐘 Supabase PostgreSQL Setup

### 1. Database Schema Execution
The repository includes a ready-to-run SQL schema file located at [`supabase/schema.sql`](file:///c:/Users/sayli/Task%20Manager/supabase/schema.sql).

To initialize your Supabase PostgreSQL database:
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Create a new project (or select an existing one).
3. Navigate to the **SQL Editor** on the left navigation panel.
4. Open or copy the contents of [`supabase/schema.sql`](file:///c:/Users/sayli/Task%20Manager/supabase/schema.sql) and paste them into the SQL Editor.
5. Click **Run**.

This script sets up:
- **`users` table**: Stores accounts with UUID primary keys, hashed passwords, and lowercased email uniqueness.
- **`categories` table**: Includes system defaults (Work, Personal, Study, Shopping, Health, Other) and custom user categories.
- **`tasks` table**: Stores tasks with user foreign key cascades, priority/status constraints, and `TEXT[]` tags.
- **Triggers**: Automatic `updated_at` timestamp management on record modification.
- **Performance Indexes**: High-speed lookup compound indexes (`user_id`, `status`, `due_date`, `priority`, `created_at DESC`, GIN index on `tags`).
- **Row Level Security (RLS)**: Security policies for authenticated access and service role access.

### 2. Environment Variables Configuration
Retrieve your project credentials from **Project Settings -> API** in the Supabase Dashboard, then populate `.env`:

```env
PORT=5000
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_secret_key
JWT_SECRET=super_secret_jwt_key_task_manager_2026_modern_secure
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

> **Zero-Config Resiliency:** If `SUPABASE_URL` is omitted or left as placeholder, the server automatically activates the **Persistent Local Fallback Mode**. You can run, test, and develop the application offline without an active internet connection.

---

## 🚀 Running the Application

### 1. Installation
```bash
npm install
```

### 2. Development Server
```bash
npm run dev
```

### 3. Production Server
```bash
npm start
```

Navigate to: `http://localhost:5000`

### 4. Running the Test Suites
Run both the full 12-point API test suite and the Supabase unit test suite:
```bash
npm test
```

Or run each suite individually:
```bash
npm run test:api       # REST endpoints, auth, and CRUD tests
npm run test:supabase  # Normalizers, mappings & PostgreSQL error handlers
```

---

## 📡 REST API Reference

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT token | No |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes |
| `PUT` | `/api/auth/profile` | Update profile information | Yes |

### Tasks (`/api/tasks`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/tasks` | Get tasks (supports status, priority, category, search, dueFilter, sort, pagination) | Yes |
| `POST` | `/api/tasks` | Create a new task | Yes |
| `GET` | `/api/tasks/:id` | Get single task details | Yes |
| `PUT` | `/api/tasks/:id` | Update task details | Yes |
| `PATCH`| `/api/tasks/:id/status`| Quick status update (Kanban drag / checkbox) | Yes |
| `DELETE`| `/api/tasks/:id` | Delete task | Yes |
| `GET` | `/api/tasks/stats` | Get dashboard metrics & 7-day activity | Yes |
| `POST` | `/api/tasks/bulk` | Bulk delete or bulk status update | Yes |
| `GET` | `/api/tasks/export` | Export tasks as CSV or JSON | Yes |

### Categories (`/api/categories`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/categories` | Get default & custom categories | Yes |
| `POST` | `/api/categories` | Create custom category | Yes |
| `PUT` | `/api/categories/:id` | Update custom category | Yes |
| `DELETE`| `/api/categories/:id` | Delete custom category | Yes |

---

## 📜 License
This project is open source and available under the [MIT License](LICENSE).
#   t a s k - m a n a g e r  
 