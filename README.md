
# AgriPool (Django REST + React + Tailwind)

AgriPool is a logistics collaboration platform for farmers to pool transport, cut costs, and coordinate deliveries. It consists of a Django REST API and a React frontend styled with Tailwind. JWT authentication secures the API; MySQL stores data.

## ✨ Highlights
- Farmer features: create transport pool offers, browse and join approved pools, manage “My Pools,” track “My Join Requests,” maintain profile, and use a Fertilizer Advisor.
- Admin features: review/approve pool offers, manage join requests, dashboard with summaries and recently completed pools, filters and bulk actions, and helpful badges (completed/full/pending).
- Notifications: in-app, unread counts/badges, and “mark all as read.”
- Polished UI: responsive navbar with mobile menu, global Toaster, sticky footer, consistent layout.

## 🧰 Tech Stack
- Backend: Django 4.x, Django REST Framework, SimpleJWT, python-decouple, django-cors-headers
- Database: MySQL (PyMySQL client)
- Frontend: React 18, react-router-dom v6, Tailwind CSS, axios, recharts
- Auth: JWT (access/refresh) with automatic refresh interceptor on the frontend

## 📁 Monorepo Layout

```
AgriPool_starter/
├─ backend/
│  ├─ manage.py
│  ├─ .env                # local env (example values below)
│  ├─ requirements.txt
│  ├─ api/
│  │  ├─ models.py        # Farmer, Vehicle, TransportPool, PoolJoinRequest, Notification, FarmerProfile
│  │  ├─ serializers.py
│  │  ├─ views.py
│  │  ├─ urls.py
│  │  ├─ admin.py
│  │  ├─ migrations/
│  │  │  └─ 0001..0010    # schema + data migrations
│  │  └─ management/commands/seed_vehicles.py
│  └─ backend/
│     ├─ settings.py
│     ├─ urls.py
│     └─ wsgi.py
└─ frontend/
   ├─ package.json
   ├─ src/
   │  ├─ api.js           # axios instance with token + refresh
   │  ├─ App.js           # routes + global Toaster + sticky layout
   │  ├─ components/      # Navbar, Footer, Protected/Admin route guards
   │  └─ pages/           # Home, Dashboard, Admin*, Pools, Profile, FertilizerAdvisor, etc.
   └─ public/
```

## ⚙️ Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- MySQL 8.x running locally

## 🔑 Backend configuration (.env)
The backend reads configuration with python-decouple from `backend/.env` (already present).

```
# MySQL Database Configuration
DB_NAME=agripool
DB_USER=root
DB_PASSWORD=1234
DB_HOST=127.0.0.1
DB_PORT=3306

# Django Secret Key
SECRET_KEY=django-insecure-agripool-key-change-me

# Debug
DEBUG=True

# Allowed Hosts
ALLOWED_HOSTS=127.0.0.1,localhost
```

## ▶️ Running locally (Windows cmd)

1) Backend (Django)

```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py loaddata || python manage.py seed_vehicles  # optional sample data
python manage.py createsuperuser                           # create admin for /admin
python manage.py runserver
```

2) Frontend (React)

```
cd frontend
npm install
npm start
```

Backend runs at http://127.0.0.1:8000 (API under /api/). Frontend dev server runs at http://localhost:3000.

## 🔐 Authentication
- JWT via SimpleJWT
- Endpoints: `POST /api/token/` and `POST /api/token/refresh/`
- Frontend stores tokens in localStorage, attaches `Authorization: Bearer <access>` to requests, and auto-refreshes on 401 once.

## 🧱 Data Model (high level)
- Farmer: links to Django `User`, phone, location
- Vehicle: owned by User; type, capacity, route, available
- TransportPool: pool offer by a farmer provider; vehicle or selected `vehicle_type`, route, date, distance, `total_capacity`, `available_capacity`, `price_per_km`, `provider_load`, status (`PENDING/APPROVED/REJECTED/FULL`), completion fields
- PoolJoinRequest: requester, `produce_type`, `quantity`, `status` (`PENDING/APPROVED/REJECTED`)
- Notification: per-user message, read flag, timestamps
- FarmerProfile: location, contact, farm_size, preferred_crops

Key validation rules:
- `provider_load <= total_capacity`
- `total_capacity <= vehicle.capacity` (if a vehicle is assigned)
- Approval of join request ensures sufficient `available_capacity`; decrements on approval

## 🌐 API Overview (selected)
Auth & user
- `POST /api/signup/`
- `POST /api/token/`, `POST /api/token/refresh/`
- `GET  /api/current-user/`

Vehicles (ModelViewSet)
- `GET/POST /api/vehicles/`, `GET/PUT/DELETE /api/vehicles/{id}/`

Pool offers & joins
- `GET/POST /api/pool-offers/` (create by provider; list approved for marketplace)
- `GET/PUT/DELETE /api/pool-offers/{id}/` (owner/admin)
- `POST /api/pool-offers/{id}/join/`
- `GET  /api/pool-offers/{id}/joiners/` (owner/admin)
- `POST /api/pool-offers/{id}/complete/` (mark completed)
- `GET  /api/my/join-requests/`

Admin
- `GET  /api/admin/summary/`
- `GET  /api/admin/pool-offers/`, `POST /api/admin/pool-offers/{id}/approve/`
- `GET  /api/admin/join-requests/`, `POST /api/admin/join-requests/{id}/approve/`, `POST /api/admin/join-requests/{id}/reject/`

Profiles, recs, notifications
- `GET/PUT /api/farmer/profile/`
- `GET     /api/pools/recommended/`
- `GET     /api/notifications/`, `POST /api/notifications/mark-read/`

Advisor
- `POST /api/fertilizer/advice/` → `{ crop, soil, area }` ⇒ recommended N/P/K + guidance

## 🖥️ Frontend routes (major)
- `/` Home
- `/login`, `/signup`
- `/dashboard` (farmer summary + charts)
- `/pools` (Available Pools – search, join)
- `/my-pools` (manage offers, complete, view joiners)
- `/my-join-requests`
- `/create-pool-offer`
- `/profile`
- `/fertilizer-advisor`
- `/admin` (Admin Dashboard), `/admin/pool-offers`, `/admin/join-requests`

Guards: `ProtectedRoute` (requires token), `AdminRoute` (requires `user.is_admin`).

## 📊 Admin UX details
- Dashboard summary cards: totals/pending/approved/completed; recently completed pools
- Pool Offers: filters (status, text, date, completed-only), bulk approve, badges, delete
- Join Requests: list and quick actions (approve/reject)

## 🔔 Notifications
- Navbar shows unread count; dropdown for latest messages
- “Mark all as read” endpoint updates server

## 🧪 Testing (backend)
- Run: `cd backend && venv\Scripts\activate && python manage.py test`
- Included tests: serializer validation, pool join/approve logic, capacity persistence

## 🏗️ Build
- Frontend prod build: `cd frontend && npm run build`
- Django check: `cd backend && venv\Scripts\activate && python manage.py check`

## 🚀 Deployment notes
- Set `DEBUG=False`, configure `ALLOWED_HOSTS` and CORS
- Use a strong `SECRET_KEY`; configure MySQL in `.env`

## 📄 Extra docs
A comprehensive, report-ready text file is available at `docs/Project_Report.txt` (objectives, architecture, models, endpoints, flows, and more).

---

Copyright © 2025
"# AgriPool" 
