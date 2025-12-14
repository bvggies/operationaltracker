# Setup Guide

## Quick Start

1. **Install Dependencies:**
   ```bash
   # Install server dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

2. **Configure Environment:**
   Create a `.env` file in the root directory with:
   ```
   PORT=5000
   DATABASE_URL=postgresql://neondb_owner:npg_IPuJvF7j8WzK@ep-purple-wave-ahboae4g-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require
   JWT_SECRET=your-secret-key-change-in-production
   NODE_ENV=development
   ```

3. **Initialize Database:**
   ```bash
   node server/database/init.js
   ```
   This will:
   - Create all database tables
   - Create a default admin user (username: `admin`, password: `admin123`)

4. **Start Development Servers:**
   ```bash
   npm run dev
   ```
   This starts both backend (port 5000) and frontend (port 3000).

   Or start separately:
   ```bash
   # Terminal 1 - Backend
   npm run server
   
   # Terminal 2 - Frontend  
   npm run client
   ```

5. **Access the Application:**
   - Open http://localhost:3000 in your browser
   - Login with:
     - Username: `admin`
     - Password: `admin123`

## Database Schema

The database schema includes the following tables:
- `users` - User accounts and authentication
- `projects` - Construction projects
- `project_staff` - Project team assignments
- `tasks` - Task management
- `task_activities` - Task activity logs
- `materials` - Material inventory
- `material_usage` - Material usage records
- `material_requisitions` - Material requests
- `equipment` - Equipment inventory
- `equipment_breakdowns` - Equipment breakdown reports
- `equipment_maintenance` - Maintenance records
- `attendance` - Attendance records
- `leave_requests` - Leave request management
- `documents` - Document storage
- `notifications` - System notifications
- `audit_logs` - Audit trail

## User Roles

- **Admin**: Full system access, user management, audit logs
- **Manager**: Project management, task assignment, material approval
- **Supervisor**: Task creation, attendance marking, team management
- **Worker**: Task updates, clock in/out, leave requests

## Features Overview

### Dashboard
- Overview statistics
- Task progress charts
- Quick action links

### Projects
- Create and manage construction projects
- Assign supervisors and teams
- Track project status

### Tasks
- Create and assign tasks
- Track completion progress
- Log task activities

### Materials
- Track material inventory
- Record material usage
- Manage material requisitions
- Low stock alerts

### Equipment
- Track equipment status
- Report breakdowns
- Record maintenance

### Attendance
- Clock in/out functionality
- Attendance records
- Leave request management

### Reports
- Progress reports
- Material usage reports
- Equipment status reports
- Attendance summaries

### Documents
- Upload and manage documents
- Store site photos
- Document categorization

### Audit Logs
- Complete activity log
- User action tracking
- Change history

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL in .env file
- Check network connectivity to Neon PostgreSQL
- Ensure SSL mode is set correctly

### Port Already in Use
- Change PORT in .env file
- Or kill the process using the port

### Module Not Found Errors
- Run `npm install` in both root and client directories
- Delete node_modules and reinstall if needed

### Build Errors
- Clear cache: `npm cache clean --force`
- Delete node_modules and reinstall
- Check Node.js version (v14+ required)

## Production Deployment

### Backend
1. Set NODE_ENV=production
2. Use a strong JWT_SECRET
3. Configure CORS for your domain
4. Set up proper error logging
5. Use environment variables for all secrets

### Frontend
1. Build: `cd client && npm run build`
2. Serve the build folder
3. Configure API endpoint
4. Enable HTTPS

## Security Checklist

- [ ] Change default admin password
- [ ] Use strong JWT_SECRET
- [ ] Enable HTTPS in production
- [ ] Configure CORS properly
- [ ] Set up proper error handling
- [ ] Regular dependency updates
- [ ] Database backup strategy
- [ ] Rate limiting for API
- [ ] Input validation
- [ ] SQL injection prevention (using parameterized queries)

