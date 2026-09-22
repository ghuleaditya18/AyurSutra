# AyurSutra

AyurSutra is a full-stack Ayurvedic therapy and wellness appointment platform that connects patients with therapists through a role-based web application. Patients can explore available therapies, book appointments, manage their profiles, receive notifications, and submit feedback, while therapists and administrators get dedicated tools for scheduling, patient management, user administration, and service oversight.

## Purpose

AyurSutra is designed to simplify the administration of Ayurvedic care services by bringing patient registration, therapy discovery, appointment scheduling, therapist coordination, notifications, and feedback management into one application.

The platform supports three types of users:

- **Patients** — register, browse therapies, book available time slots, view appointments, manage profiles, and submit feedback.
- **Therapists** — view assigned patients and schedules, manage appointment statuses, and coordinate therapy sessions.
- **Administrators** — monitor platform statistics, manage users and bookings, review feedback, and create staff accounts.

## Features

### Patient experience

- Patient registration and JWT-based login
- Role-based protected routes
- Patient profiles with generated patient IDs
- Browse active Ayurvedic therapies and their pricing/duration
- Book therapy sessions using available date and time slots
- View and manage appointment status
- Appointment QR-code data support
- Notifications and messaging
- Submit service feedback with ratings and suggestions

### Therapist workflow

- Therapist dashboard
- View assigned patients
- View and manage therapy schedules
- Accept or update booking requests
- Mark appointments as scheduled, completed, or cancelled
- Therapist specialization and availability support
- Notifications for new bookings and appointment changes

### Administration

- Admin dashboard with user, therapist, booking, and pending-feedback statistics
- User management
- Booking and schedule management
- Feedback review workflow
- Staff creation for therapists and other staff users
- Role-based permissions for protected operations

### Booking rules

- Appointments cannot be created for dates in the past
- Sundays are treated as hospital closure days
- Available slots are generated for configured daily start times
- Appointment end time must match the selected therapy duration
- Appointments cannot extend beyond 7:00 PM
- Therapist time-slot overlap is prevented
- Booking and status changes generate user/admin notifications

## Technology stack

### Frontend

- React 19
- Vite
- React Router
- Axios
- Tailwind CSS
- ESLint

### Backend

- Python
- Django 5.2
- Django REST Framework
- Simple JWT authentication
- MySQL via `mysqlclient`
- Django CORS Headers
- WhiteNoise for static-file serving
- Gunicorn for production serving

### Main backend modules

- `accounts` — custom users, roles, patient/therapist profiles, messages, notifications, authentication, and permissions
- `bookings` — therapies, schedules, availability checks, booking validation, and appointment notifications
- `feedback` — patient feedback, ratings, comments, and review status
- `config` — Django settings, URL routing, WSGI/ASGI configuration, and exception handling

## Project structure

```text
AyurSutra/
├── AyurSutra-backend/
│   ├── accounts/                 # Users, roles, authentication, profiles, messages
│   ├── bookings/                 # Therapies, bookings, schedules, availability
│   ├── feedback/                 # Ratings and patient feedback
│   ├── config/                   # Django project configuration and API routing
│   ├── manage.py                 # Django management entry point
│   └── requirements.txt          # Python dependencies
├── AyurSutra-frontend/
│   └── frontend/
│       ├── src/
│       │   ├── api/              # Axios API clients for auth, users, bookings, feedback
│       │   ├── components/       # Shared navigation, route guards, modals, badges
│       │   ├── context/          # Authentication context and user session state
│       │   ├── pages/             # Landing, patient, therapist, and admin screens
│       │   ├── assets/            # Frontend assets
│       │   ├── App.jsx            # Role-based application routes
│       │   └── main.jsx           # React application entry point
│       ├── package.json
│       ├── vite.config.js
│       └── .env                  # Frontend API URL configuration
├── Ayursutradb.sql               # MySQL database setup/reference commands
├── package.json                  # Root JavaScript dependencies
└── package-lock.json
```

## How the application works

The React frontend uses `AuthContext` to persist the signed-in user and token in browser storage. Axios adds the JWT bearer token to API requests and attempts to refresh expired access tokens using the stored refresh token.

`App.jsx` defines public routes for the landing page, login, and registration, then protects patient, therapist, and administrator routes through `ProtectedRoute`. The frontend API modules communicate with the Django REST API for authentication, user management, therapies, schedules, bookings, and feedback.

The Django backend exposes REST endpoints through routers in `config/urls.py`. Authenticated users interact with the resources permitted by their role. `ScheduleViewSet` applies booking validation, filters data by user role, calculates available slots, and creates notifications for patients, therapists, and administrators when bookings change. `AdminStatsView` provides summary metrics for the administrator dashboard.

## API overview

The API is mounted under `/api/` and includes:

### Authentication and accounts

- `POST /api/register/` — register a patient account
- `POST /api/token/` — obtain access and refresh tokens
- `POST /api/token/refresh/` — refresh an access token
- `/api/users/` — manage or retrieve users according to role permissions
- `/api/users/profile/` — retrieve or update the authenticated user profile
- `/api/messages/` — access authenticated-user messages
- `/api/notifications/` — access authenticated-user notifications
- `POST /api/staff/create/` — create staff accounts as an administrator
- `GET /api/admin/stats/` — retrieve administrator dashboard statistics

### Therapies and bookings

- `/api/therapies/` — list active therapies and manage therapy records as an administrator
- `/api/schedules/` — create, view, update, and delete appointments according to role permissions
- `/api/schedules/available-slots/` — calculate available therapy slots for a selected date and therapy

### Feedback

- `/api/feedback/` — submit and manage patient feedback according to permissions

The Django admin interface is available at `/admin/`.

## Setup and installation

### Prerequisites

- Python 3.10 or newer recommended
- Node.js and npm
- MySQL server

### 1. Clone the repository

```bash
git clone https://github.com/ghuleaditya18/AyurSutra.git
cd AyurSutra
```

### 2. Configure the backend

```bash
cd AyurSutra-backend
python -m venv .venv
```

Activate the virtual environment:

```bash
# Linux/macOS
source .venv/bin/activate

# Windows PowerShell
.venv\Scripts\Activate.ps1
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file in `AyurSutra-backend/`. The Django settings expect the following values:

```dotenv
SECRET_KEY=replace_with_a_secure_secret_key
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

DB_NAME=ayursutra
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_HOST=127.0.0.1
DB_PORT=3306

CORS_ALLOWED_ORIGINS=http://localhost:5173
```

Create the MySQL database before running migrations:

```sql
CREATE DATABASE ayursutra;
```

Run migrations and start the API server:

```bash
python manage.py migrate
python manage.py runserver
```

The backend runs at `http://127.0.0.1:8000` by default.

### 3. Configure and run the frontend

Open a second terminal:

```bash
cd AyurSutra-frontend/frontend
npm install
```

Create or update `AyurSutra-frontend/frontend/.env`:

```dotenv
VITE_API_URL=http://127.0.0.1:8000/api
```

Start the Vite development server:

```bash
npm run dev
```

The frontend normally runs at `http://localhost:5173`.

## Useful commands

### Backend

```bash
cd AyurSutra-backend
python manage.py makemigrations
python manage.py migrate
python manage.py test
python manage.py createsuperuser
```

### Frontend

```bash
cd AyurSutra-frontend/frontend
npm run dev
npm run build
npm run lint
npm run preview
```

## Production considerations

Before deploying this application to production:

- set `DEBUG=False`
- use a strong, private `SECRET_KEY`
- configure explicit `ALLOWED_HOSTS`
- configure trusted `CORS_ALLOWED_ORIGINS`
- use secure MySQL credentials and environment variables
- serve Django with Gunicorn behind a reverse proxy
- run `python manage.py collectstatic`
- review HTTPS, secure-cookie, CSRF, and HSTS settings
- do not commit real credentials or environment files

## Database

The application is configured for MySQL through Django's database settings. The repository also includes `Ayursutradb.sql` as a small database reference file. Django migrations in the `accounts`, `bookings`, and `feedback` apps define the application schema.

## Status

AyurSutra is a full-stack project that demonstrates a role-based Ayurvedic therapy booking and clinic-management workflow. It can be extended with online payments, richer medical records, appointment reminders, therapist availability calendars, audit logs, and deployment automation.

## License

No explicit license file is currently included in the repository. Add an appropriate license before distributing or using the project in a commercial setting.
