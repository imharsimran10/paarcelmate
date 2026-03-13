# 🚀 Step-by-Step Vercel Deployment Guide

Complete guide to deploy PaarcelMate to Vercel (Frontend) and Railway (Backend).

---

## 📦 Part 1: Deploy Backend to Railway

### Step 1.1: Create Railway Account
1. Go to https://railway.app
2. Click "Login" → Sign in with GitHub
3. Authorize Railway to access your GitHub

### Step 1.2: Create PostgreSQL Database
1. Click "New Project"
2. Select "Provision PostgreSQL"
3. Wait for deployment (30 seconds)
4. Click on PostgreSQL service
5. Go to "Variables" tab
6. Copy the `DATABASE_URL` value
   - Example: `postgresql://postgres:password@monorail.proxy.rlwy.net:12345/railway`

### Step 1.3: Create Redis Database
1. In the same project, click "New Service"
2. Click "Database" → Select "Redis"
3. Wait for deployment
4. Click on Redis service
5. Go to "Variables" tab
6. Copy the `REDIS_URL` value
   - Example: `redis://default:password@redis.railway.internal:6379`

### Step 1.4: Deploy Backend Service
1. In the same project, click "New Service"
2. Click "GitHub Repo"
3. Select your repository: `imharsimran10/paarcelmate`
4. Click "Add Service"

### Step 1.5: Configure Backend Build Settings
1. Click on the backend service
2. Go to "Settings" tab
3. Set **Root Directory**: `backend`
4. Set **Build Command**: `npm install && npm run build`
5. Set **Start Command**: `npm run start:prod`
6. Click "Deploy"

### Step 1.6: Add Backend Environment Variables
1. Click on backend service
2. Go to "Variables" tab
3. Click "New Variable" and add each one:

```env
# Application
NODE_ENV=production
APP_NAME=PaarcelMate
API_PORT=3000
API_PREFIX=/api/v1

# Database (paste from PostgreSQL service)
DATABASE_URL=postgresql://postgres:xxxxx@monorail.proxy.rlwy.net:xxxxx/railway

# Redis (paste from Redis service)
REDIS_URL=redis://default:xxxxx@redis.railway.internal:6379

# JWT Secrets (generate new ones!)
JWT_SECRET=your-new-production-jwt-secret-min-32-characters
JWT_EXPIRATION=7d
JWT_REFRESH_SECRET=your-new-production-refresh-secret-min-32-characters
JWT_REFRESH_EXPIRATION=30d

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=paarcelmate@gmail.com
SMTP_PASS=abfs gyvb dnyg pqyf
SMTP_FROM_EMAIL=paarcelmate@gmail.com
SMTP_FROM_NAME=PaarcelMate

# CORS (will update after frontend deployment)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100
```

### Step 1.7: Generate Production Secrets
```bash
# Run this command 2 times to generate 2 different secrets:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Use output for JWT_SECRET and JWT_REFRESH_SECRET
```

### Step 1.8: Get Backend URL
1. After deployment completes (2-3 minutes)
2. Go to "Settings" tab
3. Scroll to "Networking" section
4. Click "Generate Domain"
5. Copy the URL (e.g., `https://paarcelmate-backend.up.railway.app`)
6. **Save this URL** - you'll need it for frontend!

### Step 1.9: Run Database Migrations
1. Click on backend service
2. Go to "Deployments" tab
3. Click on latest deployment
4. Click "View Logs"
5. You should see Nest.js starting successfully

To run migrations (optional - Railway will auto-run on deploy):
1. Go to backend service → Settings
2. Under "Build", add to Build Command:
   ```
   npm install && npm run build && npx prisma migrate deploy
   ```

---

## 🎨 Part 2: Deploy Frontend to Vercel

### Step 2.1: Create Vercel Account
1. Go to https://vercel.com
2. Click "Sign Up" → Continue with GitHub
3. Authorize Vercel to access your GitHub

### Step 2.2: Import Project
1. Click "Add New..." → "Project"
2. Find `imharsimran10/paarcelmate` in the list
3. Click "Import"

### Step 2.3: Configure Project Settings
1. **Framework Preset**: Auto-detected as Next.js ✅
2. **Root Directory**: Click "Edit" → Select `web-dashboard`
3. **Build Command**: Leave default (`npm run build`)
4. **Output Directory**: Leave default (`.next`)
5. **Install Command**: Leave default (`npm install`)

### Step 2.4: Add Environment Variables
Click "Environment Variables" and add:

```env
# Backend API URL (from Railway Step 1.8)
NEXT_PUBLIC_API_BASE_URL=https://paarcelmate-backend.up.railway.app/api/v1

# Mapbox Token (get from https://account.mapbox.com)
NEXT_PUBLIC_MAPBOX_TOKEN=your-mapbox-public-token-here

# Stripe (optional - can add later)
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_your_stripe_public_key
```

**IMPORTANT**: Use your Railway backend URL from Step 1.8!

### Step 2.5: Deploy Frontend
1. Click "Deploy"
2. Wait 2-3 minutes for build
3. Once complete, click "Visit" to see your app!
4. Copy your Vercel URL (e.g., `https://paarcelmate.vercel.app`)

---

## 🔄 Part 3: Update CORS Settings

### Step 3.1: Update Backend CORS
1. Go back to Railway
2. Click on backend service
3. Go to "Variables" tab
4. Find `CORS_ORIGINS` variable
5. Update it with your Vercel URLs:
   ```
   https://paarcelmate.vercel.app,https://paarcelmate-git-main.vercel.app
   ```
6. Backend will auto-redeploy (30 seconds)

---

## 🧪 Part 4: Test Your Deployment

### Step 4.1: Test Backend API
```bash
# Replace with your Railway URL
curl https://paarcelmate-backend.up.railway.app/api/v1/health
```

Expected response:
```json
{"status":"ok","timestamp":"...","database":"connected"}
```

### Step 4.2: Test Frontend
1. Visit your Vercel URL: `https://paarcelmate.vercel.app`
2. Click "Sign Up"
3. Fill in registration form
4. Check your email for OTP (or check Railway logs)
5. Complete registration
6. Try logging in

### Step 4.3: Check Backend Logs
1. Go to Railway → Backend service
2. Click "Deployments" → Latest deployment
3. Click "View Logs"
4. You should see:
   ```
   🚀 PaarcelMate API is running!
   📡 URL: http://0.0.0.0:3000
   ```

---

## ⚙️ Part 5: Environment Variable Reference

### Where to Set Each Variable

| Variable | Backend (Railway) | Frontend (Vercel) |
|----------|-------------------|-------------------|
| DATABASE_URL | ✅ | ❌ |
| REDIS_URL | ✅ | ❌ |
| JWT_SECRET | ✅ | ❌ |
| JWT_REFRESH_SECRET | ✅ | ❌ |
| SMTP_* | ✅ | ❌ |
| CORS_ORIGINS | ✅ | ❌ |
| NEXT_PUBLIC_API_BASE_URL | ❌ | ✅ |
| NEXT_PUBLIC_MAPBOX_TOKEN | ❌ | ✅ |
| NEXT_PUBLIC_STRIPE_PUBLIC_KEY | ❌ | ✅ |

### Why NEXT_PUBLIC_ Prefix?
- Variables with `NEXT_PUBLIC_` are exposed to the browser
- They're safe to expose (no secrets!)
- Used for client-side API calls and third-party integrations

---

## 🔧 Troubleshooting

### Backend Not Starting
**Check Railway logs:**
1. Railway → Backend Service → Deployments → View Logs
2. Look for errors

**Common issues:**
- Missing environment variables
- Database connection failed (check DATABASE_URL)
- Redis connection failed (check REDIS_URL)

### Frontend API Errors (CORS)
**Solution:**
1. Check `NEXT_PUBLIC_API_BASE_URL` in Vercel
2. Update `CORS_ORIGINS` in Railway backend
3. Make sure Railway URL is correct

### Email Not Sending
**Check:**
1. SMTP_PASS is correct in Railway
2. Gmail App Password is active
3. Check Railway backend logs for email errors

### Database Migrations Not Running
**Run manually:**
1. Railway → Backend Service → Settings
2. Update Build Command:
   ```
   npm install && npm run build && npx prisma migrate deploy
   ```
3. Redeploy

---

## 🔄 Updating Your Deployment

### To Deploy Code Changes:

**Backend:**
1. Push changes to GitHub: `git push origin main`
2. Railway automatically detects and redeploys
3. Wait 2-3 minutes

**Frontend:**
1. Push changes to GitHub: `git push origin main`
2. Vercel automatically detects and redeploys
3. Wait 2-3 minutes

**No manual action needed!** Both auto-deploy on git push.

---

## 📊 Monitoring

### Railway Metrics
- Railway → Service → Metrics tab
- View CPU, Memory, Network usage

### Vercel Analytics
- Vercel → Project → Analytics tab
- View page views, performance

### Logs
**Backend logs:**
- Railway → Backend → Deployments → View Logs

**Frontend logs:**
- Vercel → Project → Deployments → Logs

---

## 💰 Cost Estimate

### Free Tier (Good for MVP)
- **Railway**: $5/month (500 hours included)
- **Vercel**: $0 (Hobby plan)
- **Total**: ~$5/month

### Paid Tier (For production)
- **Railway**: $20-50/month (more resources)
- **Vercel**: $20/month (Pro plan)
- **Total**: ~$40-70/month

---

## 🎯 Success Checklist

- [ ] Railway PostgreSQL deployed
- [ ] Railway Redis deployed
- [ ] Railway Backend deployed
- [ ] Backend environment variables configured
- [ ] Backend URL obtained
- [ ] Vercel Frontend deployed
- [ ] Frontend environment variables configured
- [ ] Frontend URL obtained
- [ ] CORS updated in backend
- [ ] Tested backend API endpoint
- [ ] Tested frontend registration flow
- [ ] Email OTP working
- [ ] Login working

---

## 🆘 Need Help?

**Railway Issues:**
- Docs: https://docs.railway.app
- Discord: https://discord.gg/railway

**Vercel Issues:**
- Docs: https://vercel.com/docs
- Discord: https://vercel.com/discord

**PaarcelMate Issues:**
- Check SECURITY_ALERT.md
- Check VERCEL_DEPLOYMENT_GUIDE.md
- Review Railway/Vercel logs

---

## 🎉 You're Done!

Your app is now live on the internet!

**Share your links:**
- 🌐 Frontend: https://paarcelmate.vercel.app
- 🔌 Backend API: https://paarcelmate-backend.up.railway.app

**Next Steps:**
1. Share with friends for testing
2. Set up custom domain (optional)
3. Monitor logs and fix issues
4. Add more features!

---

**Deployment Date**: March 12, 2026
**Deployment Status**: Ready to Deploy
**Estimated Time**: 30-45 minutes
