# Operations Tracker - Construction Site Management System

A comprehensive web application for managing construction site operations, built with React and Node.js.

## Features

### Core Functionality
- **User Management**: Role-based access control (Admin, Manager, Supervisor, Worker)
- **Project & Site Management**: Create and manage construction projects
- **Task & Activity Tracking**: Assign and track tasks with progress updates
- **Material & Inventory Management**: Track materials, usage, and requisitions
- **Equipment Management**: Monitor equipment status, breakdowns, and maintenance
- **Attendance & Workforce Tracking**: Clock in/out, attendance records, and leave management
- **Reporting & Analytics**: Generate reports with charts and visualizations
- **Document Management**: Upload and manage site documents and photos
- **Audit Trail**: Complete logging of all system changes
- **Notifications**: Real-time alerts for important events

## Tech Stack

### Frontend
- React (Create React App)
- React Router for navigation
- Axios for API calls
- Recharts for data visualization
- Modern CSS with responsive design

### Backend
- Node.js with Express
- PostgreSQL (Neon Database)
- JWT for authentication
- bcryptjs for password hashing
- Multer for file uploads

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- PostgreSQL database (Neon PostgreSQL)

### Installation

1. **Install server dependencies:**
   ```bash
   npm install
   ```

2. **Install client dependencies:**
   ```bash
   cd client
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```
   PORT=5000
   DATABASE_URL=your_neon_postgresql_connection_string
   JWT_SECRET=your-secret-key
   NODE_ENV=development
   ```

4. **Initialize the database:**
   ```bash
   node server/database/init.js
   ```
   This will create all necessary tables and a default admin user:
   - Username: `admin`
   - Password: `admin123`

5. **Start the development server:**
   ```bash
   npm run dev
   ```
   This will start both the backend (port 5000) and frontend (port 3000) servers.

   Or start them separately:
   ```bash
   # Terminal 1 - Backend
   npm run server

   # Terminal 2 - Frontend
   npm run client
   ```

## Default Login Credentials

- **Username:** admin
- **Password:** admin123

**Important:** Change the default admin password after first login!

## Project Structure

```
operationaltracker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React context (Auth)
│   │   └── App.js         # Main app component
│   └── package.json
├── server/                 # Node.js backend
│   ├── config/            # Database configuration
│   ├── middleware/        # Auth and audit middleware
│   ├── routes/            # API routes
│   ├── database/          # Database schema and initialization
│   └── index.js           # Server entry point
├── package.json
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (Admin only)
- `POST /api/users` - Create user (Admin only)
- `PUT /api/users/:id` - Update user
- `PATCH /api/users/:id/deactivate` - Deactivate user (Admin only)

### Projects
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `POST /api/projects/:id/team` - Assign team members

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `POST /api/tasks/:id/activity` - Log task activity

### Materials
- `GET /api/materials` - Get all materials
- `POST /api/materials` - Create material record
- `POST /api/materials/:id/usage` - Record material usage
- `POST /api/materials/requisitions` - Create requisition
- `PATCH /api/materials/requisitions/:id` - Approve/reject requisition

### Equipment
- `GET /api/equipment` - Get all equipment
- `POST /api/equipment` - Create equipment
- `POST /api/equipment/:id/breakdown` - Report breakdown
- `POST /api/equipment/:id/maintenance` - Record maintenance

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out
- `POST /api/attendance/leave-requests` - Create leave request
- `PATCH /api/attendance/leave-requests/:id` - Approve/reject leave

### Reports
- `GET /api/reports/dashboard` - Get dashboard statistics
- `GET /api/reports/progress` - Get progress report
- `GET /api/reports/materials` - Get material usage report
- `GET /api/reports/equipment` - Get equipment status report
- `GET /api/reports/attendance` - Get attendance report

### Documents
- `GET /api/documents` - Get all documents
- `POST /api/documents` - Upload document
- `GET /api/documents/:id/download` - Download document
- `DELETE /api/documents/:id` - Delete document

### Audit Logs
- `GET /api/audit` - Get audit logs (Admin/Manager only)

## Deployment

### Vercel (Frontend)
1. Build the React app:
   ```bash
   cd client
   npm run build
   ```

2. Deploy to Vercel:
   - Connect your GitHub repository to Vercel
   - Set build command: `cd client && npm run build`
   - Set output directory: `client/build`

### Backend
The backend can be deployed to any Node.js hosting service (Heroku, Railway, Render, etc.).

Make sure to set the following environment variables:
- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV=production`
- `PORT` (if required by hosting service)

## Security Notes

- Change the default admin password immediately
- Use a strong JWT_SECRET in production
- Enable HTTPS in production
- Regularly update dependencies
- Review and adjust CORS settings for production

## License

ISC

## Support

For issues or questions, please create an issue in the repository.

