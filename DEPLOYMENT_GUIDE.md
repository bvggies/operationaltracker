# Step-by-Step Vercel Deployment Guide
## Operations Tracker - GitHub + Vercel + Neon DB

This guide will walk you through deploying your Operations Tracker application to Vercel with GitHub integration and Neon PostgreSQL database.

---

## Prerequisites

- ✅ GitHub account
- ✅ Vercel account (free tier works)
- ✅ Neon PostgreSQL database (already set up)
- ✅ Code pushed to GitHub repository

---

## Step 1: Verify GitHub Repository

1. **Check your repository is on GitHub:**
   - Go to: https://github.com/bvggies/operationaltracker
   - Verify all files are present
   - Make sure the latest code is pushed

2. **Verify repository structure:**
   ```
   operationaltracker/
   ├── api/              # Serverless functions
   ├── client/           # React frontend
   ├── server/           # Original server (not used in Vercel)
   ├── vercel.json       # Vercel configuration
   └── package.json
   ```

---

## Step 2: Create Vercel Account

1. **Go to Vercel:**
   - Visit: https://vercel.com
   - Click "Sign Up" (top right)

2. **Sign up with GitHub:**
   - Click "Continue with GitHub"
   - Authorize Vercel to access your GitHub account
   - Complete the signup process

---

## Step 3: Deploy Project to Vercel

1. **Create New Project:**
   - After logging in, click "Add New..." → "Project"
   - Or go to: https://vercel.com/new

2. **Import GitHub Repository:**
   - You'll see a list of your GitHub repositories
   - Find and click "Import" next to `bvggies/operationaltracker`
   - If you don't see it, click "Adjust GitHub App Permissions" and grant access

3. **Configure Project Settings:**
   
   **Framework Preset:**
   - Vercel should auto-detect "Other" or "Create React App"
   - If not, select "Other"

   **Root Directory:**
   - Leave as default (root of repository)

   **Build and Output Settings:**
   - **Build Command:** `cd client && npm install && npm run build`
   - **Output Directory:** `client/build`
   - **Install Command:** `npm install` (leave as default)

   **Note:** These settings are already configured in `vercel.json`, so Vercel should auto-detect them.

4. **Click "Deploy"** (don't add environment variables yet - we'll do that next)

---

## Step 4: Configure Environment Variables

1. **After deployment starts, go to Project Settings:**
   - Click on your project name
   - Go to "Settings" tab
   - Click "Environment Variables" in the left sidebar

2. **Add Required Environment Variables:**

   **Variable 1: DATABASE_URL**
   - **Key:** `DATABASE_URL`
   - **Value:** `postgresql://neondb_owner:npg_IPuJvF7j8WzK@ep-purple-wave-ahboae4g-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require`
   - **Environment:** Select all (Production, Preview, Development)
   - Click "Save"

   **Variable 2: JWT_SECRET**
   - **Key:** `JWT_SECRET`
   - **Value:** Generate a secure random string:
     - Option 1: Use online generator: https://randomkeygen.com/
     - Option 2: Run in terminal: `openssl rand -base64 32`
     - Example: `aB3dE5fG7hI9jK1lM3nO5pQ7rS9tU1vW3xY5zA7bC9dE1fG3hI5jK7lM9nO1p`
   - **Environment:** Select all (Production, Preview, Development)
   - Click "Save"

   **Variable 3: NODE_ENV**
   - **Key:** `NODE_ENV`
   - **Value:** `production`
   - **Environment:** Select all (Production, Preview, Development)
   - Click "Save"

3. **Verify all variables are added:**
   - You should see 3 environment variables listed
   - All should be available for Production, Preview, and Development

---

## Step 5: Redeploy with Environment Variables

1. **Trigger a new deployment:**
   - Go to "Deployments" tab
   - Click the "..." menu on the latest deployment
   - Click "Redeploy"
   - Or push a new commit to trigger automatic deployment

2. **Wait for deployment to complete:**
   - Watch the build logs
   - Should see "Build Successful" message
   - Deployment will take 2-5 minutes

---

## Step 6: Initialize Database

1. **Get your Vercel deployment URL:**
   - After deployment, you'll see a URL like: `https://operational-tracker-xxx.vercel.app`
   - Copy this URL

2. **Test API connection:**
   - Visit: `https://your-app.vercel.app/api/health`
   - Should see: `{"status":"ok","timestamp":"..."}`
   - If you see this, API is working!

3. **Initialize database schema:**
   
   **Option A: Using Neon Console (Recommended)**
   - Go to: https://console.neon.tech
   - Select your database
   - Go to "SQL Editor"
   - Open `server/database/schema.sql` from your local project
   - Copy and paste the entire SQL schema
   - Click "Run" to execute
   - Wait for "Success" message

   **Option B: Using psql command line**
   ```bash
   psql "postgresql://neondb_owner:npg_IPuJvF7j8WzK@ep-purple-wave-ahboae4g-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require" -f server/database/schema.sql
   ```

4. **Create admin user:**
   - In Neon SQL Editor, run:
   ```sql
   INSERT INTO users (username, password_hash, email, full_name, role, is_active, created_at)
   VALUES (
     'admin',
     '$2a$10$rOzJqXKqXKqXKqXKqXKqXeXKqXKqXKqXKqXKqXKqXKqXKqXKqXK',
     'admin@example.com',
     'System Administrator',
     'admin',
     true,
     NOW()
   );
   ```
   - **Note:** The password hash above is for `admin123`
   - Or use the seed script locally: `npm run seed-db`

---

## Step 7: Seed Database (Optional)

1. **Run seed script locally:**
   ```bash
   cd D:\operationaltracker
   npm run seed-db
   ```

2. **Or manually create test data:**
   - Use the Neon console SQL editor
   - Or use the API endpoints after deployment

---

## Step 8: Test Your Deployment

1. **Visit your Vercel URL:**
   - Example: `https://operational-tracker-xxx.vercel.app`
   - Should see the login page

2. **Test login:**
   - Username: `admin`
   - Password: `admin123`
   - Should redirect to Admin Dashboard

3. **Test different roles:**
   - Login as `manager1` / `password123` → Manager Dashboard
   - Login as `supervisor1` / `password123` → Supervisor Dashboard
   - Login as `worker1` / `password123` → Worker Dashboard

4. **Test API endpoints:**
   - Visit: `https://your-app.vercel.app/api/health`
   - Should return JSON with status

---

## Step 9: Configure Custom Domain (Optional)

1. **Go to Project Settings:**
   - Click "Domains" in left sidebar

2. **Add custom domain:**
   - Enter your domain name
   - Follow Vercel's DNS configuration instructions
   - Wait for DNS propagation (can take up to 48 hours)

---

## Step 10: Enable Automatic Deployments

1. **Automatic deployments are enabled by default:**
   - Every push to `main` branch triggers a new deployment
   - Preview deployments are created for pull requests

2. **Verify GitHub integration:**
   - Go to Project Settings → Git
   - Should see your GitHub repository connected
   - Production branch: `main`

---

## Troubleshooting

### Build Fails

**Error: "Build command failed"**
- Check build logs in Vercel dashboard
- Verify `client/package.json` has correct build script
- Ensure all dependencies are listed

**Solution:**
```bash
# Test build locally first
cd client
npm install
npm run build
```

### API Not Working

**Error: "Cannot GET /api/..."**
- Check `vercel.json` configuration
- Verify API routes are in `/api` directory
- Check function logs in Vercel dashboard

**Solution:**
- Go to Vercel Dashboard → Your Project → Functions
- Check function logs for errors
- Verify environment variables are set

### Database Connection Issues

**Error: "Connection refused" or "SSL required"**
- Verify `DATABASE_URL` is correct
- Ensure `?sslmode=require` is in connection string
- Check Neon database is running

**Solution:**
- Test connection string in Neon console
- Verify database is not paused (Neon free tier pauses after inactivity)
- Check environment variables are set correctly

### CORS Errors

**Error: "CORS policy blocked"**
- CORS is configured in `api/index.js`
- Should work automatically with Vercel

**Solution:**
- Check `api/index.js` CORS configuration
- Verify frontend URL matches Vercel deployment URL

### Environment Variables Not Working

**Error: Variables not accessible**
- Variables must be set before deployment
- Need to redeploy after adding variables

**Solution:**
1. Add environment variables
2. Go to Deployments
3. Click "Redeploy" on latest deployment
4. Or push a new commit

---

## Quick Reference

### Vercel Dashboard URLs
- **Projects:** https://vercel.com/dashboard
- **Your Project:** https://vercel.com/[your-username]/operationaltracker
- **Deployments:** https://vercel.com/[your-username]/operationaltracker/deployments
- **Settings:** https://vercel.com/[your-username]/operationaltracker/settings

### Neon Console
- **Dashboard:** https://console.neon.tech
- **SQL Editor:** https://console.neon.tech/project/[project-id]/sql

### Environment Variables Checklist
- [ ] `DATABASE_URL` - Neon PostgreSQL connection string
- [ ] `JWT_SECRET` - Secure random string
- [ ] `NODE_ENV` - Set to `production`

### Test Credentials
- **Admin:** `admin` / `admin123`
- **Manager:** `manager1` / `password123`
- **Supervisor:** `supervisor1` / `password123`
- **Worker:** `worker1` / `password123`

---

## Post-Deployment Checklist

- [ ] Deployment successful
- [ ] Environment variables configured
- [ ] Database schema initialized
- [ ] Admin user created
- [ ] Login page accessible
- [ ] Can login with admin credentials
- [ ] Admin dashboard loads
- [ ] API endpoints working (`/api/health`)
- [ ] Can create/view projects
- [ ] Can create/view tasks
- [ ] Role-based redirects working
- [ ] All dashboards accessible

---

## Support

If you encounter issues:

1. **Check Vercel Function Logs:**
   - Vercel Dashboard → Your Project → Functions → View Logs

2. **Check Build Logs:**
   - Vercel Dashboard → Your Project → Deployments → Click deployment → View Logs

3. **Check Neon Database:**
   - Neon Console → Check database status
   - Verify connection string

4. **Test Locally:**
   - Run `npm run dev` locally
   - Test with same environment variables

---

## Next Steps

After successful deployment:

1. **Change default admin password**
2. **Create additional users through admin panel**
3. **Configure email notifications (if needed)**
4. **Set up monitoring and alerts**
5. **Configure backup strategy for database**

---

## Summary

Your application is now:
- ✅ Hosted on Vercel (frontend + backend)
- ✅ Connected to Neon PostgreSQL
- ✅ Automatically deploying from GitHub
- ✅ Accessible via public URL
- ✅ Fully functional with all features

**Your live URL:** `https://operational-tracker-[hash].vercel.app`

Congratulations! 🎉

