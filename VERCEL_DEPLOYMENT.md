# Vercel Deployment Guide

## Option 1: Deploy Frontend Only (Recommended for Quick Start)

This deploys the React frontend to Vercel while keeping the backend running separately.

### Steps:

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from the project root**:
   ```bash
   vercel
   ```

4. **Set Environment Variables in Vercel Dashboard**:
   - Go to your project settings on Vercel
   - Navigate to "Environment Variables"
   - Add:
     - `REACT_APP_API_URL` = `https://your-backend-url.com/api` (or your backend URL)

5. **For Production Deployment**:
   ```bash
   vercel --prod
   ```

### Backend Deployment Options:

**Option A: Deploy Backend Separately**
- Deploy backend to Railway, Render, Heroku, or any Node.js hosting
- Update `REACT_APP_API_URL` to point to your backend URL

**Option B: Use Vercel Serverless Functions**
- Convert Express routes to Vercel serverless functions
- See Option 2 below

---

## Option 2: Full-Stack Deployment with Vercel Serverless Functions

Convert the Express backend to Vercel serverless functions.

### Steps:

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Create API directory structure**:
   ```
   api/
     auth/
       login.js
       register.js
     users/
       index.js
     ...
   ```

3. **Convert Express routes to serverless functions**

4. **Deploy**:
   ```bash
   vercel
   ```

---

## Option 3: Deploy via GitHub Integration (Easiest)

1. **Connect GitHub Repository**:
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository: `bvggies/operationaltracker`

2. **Configure Project**:
   - **Framework Preset**: Create React App
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

3. **Environment Variables**:
   Add these in Vercel dashboard:
   - `REACT_APP_API_URL` = Your backend API URL

4. **Deploy**:
   - Click "Deploy"
   - Vercel will automatically deploy on every push to main branch

---

## Environment Variables Needed

### Frontend (Vercel):
- `REACT_APP_API_URL` - Backend API URL (e.g., `https://your-backend.railway.app/api`)

### Backend (Separate Hosting):
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - `production`
- `PORT` - Port number (usually auto-assigned)

---

## Recommended Setup

1. **Frontend**: Deploy to Vercel (Option 3 - GitHub Integration)
2. **Backend**: Deploy to Railway or Render
   - Railway: https://railway.app
   - Render: https://render.com

### Railway Backend Setup:
1. Create new project on Railway
2. Connect GitHub repository
3. Set root directory to project root
4. Add environment variables
5. Deploy

### Update Frontend API URL:
After backend is deployed, update `REACT_APP_API_URL` in Vercel to point to your Railway/Render backend URL.

---

## Troubleshooting

### Build Fails:
- Check that `client/package.json` has correct build script
- Ensure all dependencies are in `package.json`

### API Calls Fail:
- Check CORS settings in backend
- Verify `REACT_APP_API_URL` is set correctly
- Check backend logs for errors

### Environment Variables Not Working:
- Restart deployment after adding env vars
- Use `REACT_APP_` prefix for React env vars
- Rebuild after changing env vars

