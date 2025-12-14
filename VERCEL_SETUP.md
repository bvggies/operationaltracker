# Vercel + Neon DB Deployment Guide

This project is configured to run entirely on Vercel with Neon PostgreSQL database.

## Quick Deploy

### 1. Deploy to Vercel

**Option A: Via Vercel Dashboard (Recommended)**
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "Add New Project"
3. Import your GitHub repository: `bvggies/operationaltracker`
4. Vercel will auto-detect the configuration
5. Add environment variables (see below)
6. Click "Deploy"

**Option B: Via Vercel CLI**
```bash
npm install -g vercel
vercel login
vercel
```

### 2. Environment Variables

Add these in Vercel Dashboard → Project Settings → Environment Variables:

**Required:**
- `DATABASE_URL` - Your Neon PostgreSQL connection string
  - Example: `postgresql://user:password@host/database?sslmode=require`
- `JWT_SECRET` - A secure random string for JWT tokens
  - Generate: `openssl rand -base64 32`
- `NODE_ENV` - Set to `production`

**Optional:**
- `FRONTEND_URL` - Your Vercel deployment URL (auto-set by Vercel)

### 3. Initialize Database

After deployment, initialize the database:

1. Get your Vercel deployment URL
2. Visit: `https://your-app.vercel.app/api/health` to verify API is working
3. Run database initialization (you can create a one-time API endpoint or use a script)

Or use the Neon console to run the SQL schema from `server/database/schema.sql`

### 4. Seed Database (Optional)

Run the seed script locally pointing to your Neon database:
```bash
DATABASE_URL=your_neon_connection_string npm run seed-db
```

## Project Structure

```
operationaltracker/
├── api/              # Vercel serverless functions
│   ├── index.js      # Main API entry point
│   ├── auth.js       # Authentication routes
│   ├── users.js      # User management
│   ├── projects.js   # Project management
│   ├── tasks.js      # Task management
│   ├── materials.js  # Material tracking
│   ├── equipment.js  # Equipment management
│   ├── attendance.js # Attendance tracking
│   ├── reports.js    # Reports & analytics
│   ├── documents.js  # Document management
│   ├── notifications.js # Notifications
│   ├── audit.js      # Audit logs
│   ├── config/       # Database config
│   └── middleware/   # Auth & audit middleware
├── client/           # React frontend
│   └── src/          # React source code
└── vercel.json       # Vercel configuration
```

## How It Works

1. **Frontend**: React app built and served as static files
2. **Backend**: Express API converted to Vercel serverless functions
3. **Database**: Neon PostgreSQL (serverless PostgreSQL)
4. **Routing**: 
   - `/api/*` → Serverless functions
   - `/*` → React app (SPA routing)

## API Endpoints

All API endpoints are available at `/api/*`:
- `/api/auth/login` - User login
- `/api/auth/register` - User registration
- `/api/auth/me` - Get current user
- `/api/users` - User management
- `/api/projects` - Project management
- `/api/tasks` - Task management
- `/api/materials` - Material tracking
- `/api/equipment` - Equipment management
- `/api/attendance` - Attendance tracking
- `/api/reports` - Reports & analytics
- `/api/documents` - Document management
- `/api/notifications` - Notifications
- `/api/audit` - Audit logs

## Troubleshooting

### API Not Working
- Check environment variables are set correctly
- Verify `DATABASE_URL` is correct
- Check Vercel function logs in dashboard

### Database Connection Issues
- Verify Neon database is running
- Check connection string format
- Ensure SSL mode is set correctly

### CORS Errors
- CORS is configured in `api/index.js`
- Check `FRONTEND_URL` environment variable

### File Uploads
- Currently using base64 encoding (limited to 10MB)
- For production, consider using Vercel Blob Storage or S3

## Local Development

```bash
# Install dependencies
npm install
cd client && npm install && cd ..

# Set environment variables
cp .env.example .env
# Edit .env with your values

# Run development server
npm run dev
```

## Production Checklist

- [ ] Environment variables set in Vercel
- [ ] Database initialized with schema
- [ ] Database seeded with initial data
- [ ] JWT_SECRET is secure and random
- [ ] CORS configured correctly
- [ ] Frontend API URL configured
- [ ] Test all major features
- [ ] Monitor Vercel function logs

## Support

For issues:
1. Check Vercel function logs
2. Check Neon database logs
3. Verify environment variables
4. Test API endpoints directly

