# PaarcelMate - Vercel Deployment Guide

Complete guide to deploy PaarcelMate to production using Vercel, Railway, and managed services.

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Redis Setup](#redis-setup)
4. [Backend Deployment](#backend-deployment)
5. [Frontend Deployment](#frontend-deployment)
6. [Post-Deployment](#post-deployment)
7. [Troubleshooting](#troubleshooting)

---

## 🔧 Prerequisites

### Required Accounts
- [ ] GitHub account (with your repository)
- [ ] Vercel account (free tier works)
- [ ] Railway account (for backend & database) OR Render
- [ ] Supabase/Neon account (for PostgreSQL) - Alternative
- [ ] Upstash account (for Redis) - Alternative

### Email Service
- Gmail account with App Password configured
- Current: paarcelmate@gmail.com
- App Password: ycaqgoixieagabpm

---

## 💾 Database Setup

### Option 1: Railway PostgreSQL (Recommended)

1. **Create New Project**
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy PostgreSQL"

2. **Get Connection String**
   ```bash
   # Format:
   postgresql://user:password@host:port/database
   ```

3. **Enable PostGIS Extension**
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

### Option 2: Supabase PostgreSQL

1. **Create Project**
   - Go to [supabase.com](https://supabase.com)
   - Create new project
   - Note the connection string

2. **Connection Pooling**
   - Use "Transaction" mode pooling
   - Copy the pooled connection string

### Option 3: Neon PostgreSQL

1. **Create Database**
   - Go to [neon.tech](https://neon.tech)
   - Create new project
   - Enable connection pooling

---

## 🔴 Redis Setup

### Option 1: Upstash Redis (Recommended - Free Tier)

1. **Create Database**
   - Go to [upstash.com](https://upstash.com)
   - Create Redis database
   - Select region closest to your backend

2. **Get Connection URL**
   ```bash
   # Format:
   redis://default:password@host:port
   ```

### Option 2: Railway Redis

1. **Add to Existing Project**
   - In your Railway project
   - Click "New Service"
   - Select "Redis"

---

## 🚀 Backend Deployment (NestJS API)

### Deploy to Railway

1. **Create New Service**
   ```bash
   # In Railway dashboard:
   1. New Service → GitHub Repo
   2. Select your repository
   3. Set root directory: /backend
   ```

2. **Configure Build Settings**
   ```bash
   # Build Command (Railway auto-detects):
   npm install && npm run build

   # Start Command:
   npm run start:prod
   ```

3. **Environment Variables**
   ```env
   # Application
   NODE_ENV=production
   APP_NAME=PaarcelMate
   API_PORT=3000
   API_PREFIX=/api/v1

   # Database (from Railway PostgreSQL)
   DATABASE_URL=postgresql://user:pass@host:port/db

   # Redis (from Upstash/Railway)
   REDIS_URL=redis://default:pass@host:port

   # JWT Secrets (generate new ones!)
   JWT_SECRET=your-production-jwt-secret-min-32-chars
   JWT_EXPIRATION=7d
   JWT_REFRESH_SECRET=your-production-refresh-secret-min-32-chars
   JWT_REFRESH_EXPIRATION=30d

   # Email (Gmail SMTP)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=paarcelmate@gmail.com
   SMTP_PASS=ycaqgoixieagabpm
   SMTP_FROM_EMAIL=paarcelmate@gmail.com
   SMTP_FROM_NAME=PaarcelMate

   # CORS (add your frontend URL)
   CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:3000

   # Rate Limiting
   RATE_LIMIT_TTL=60
   RATE_LIMIT_MAX=100

   # Optional: Remove or set placeholder values
   STRIPE_SECRET_KEY=placeholder
   AWS_ACCESS_KEY_ID=placeholder
   AWS_SECRET_ACCESS_KEY=placeholder
   ```

4. **Generate Production Secrets**
   ```bash
   # Use this to generate secure secrets:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

5. **Deploy**
   - Railway will auto-deploy on push to main
   - Note your backend URL: `https://your-app.up.railway.app`

### Alternative: Deploy to Render

1. **Create Web Service**
   - Go to [render.com](https://render.com)
   - New → Web Service
   - Connect GitHub repository

2. **Configuration**
   ```bash
   Name: paarcelmate-api
   Root Directory: backend
   Build Command: npm install && npm run build
   Start Command: npm run start:prod
   ```

3. **Add Environment Variables** (same as Railway)

---

## 🎨 Frontend Deployment (Next.js Dashboard)

### Deploy to Vercel

1. **Import Project**
   - Go to [vercel.com](https://vercel.com)
   - New Project → Import Git Repository
   - Select your repository

2. **Configure Project**
   ```bash
   Framework Preset: Next.js
   Root Directory: web-dashboard
   Build Command: npm run build  # Leave default
   Output Directory: .next         # Leave default
   Install Command: npm install   # Leave default
   ```

3. **Environment Variables**
   ```env
   # Backend API URL (from Railway/Render)
   NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app/api/v1

   # Optional: Analytics, etc.
   NEXT_PUBLIC_GA_ID=your-google-analytics-id
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will auto-deploy on push to main
   - Note your frontend URL: `https://your-app.vercel.app`

### Update CORS in Backend

After getting your Vercel URL, update the backend `CORS_ORIGINS`:
```env
CORS_ORIGINS=https://your-app.vercel.app,https://your-app-git-main.vercel.app
```

---

## 🔄 Post-Deployment Steps

### 1. Run Database Migrations

```bash
# SSH into Railway container or run locally with production DATABASE_URL
npx prisma migrate deploy
npx prisma db seed  # Optional: seed initial data
```

### 2. Test API Endpoints

```bash
# Health Check
curl https://your-backend.up.railway.app/api/v1/health

# Test OTP
curl -X POST https://your-backend.up.railway.app/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### 3. Test Frontend

1. Visit your Vercel URL
2. Try registration flow
3. Check email delivery
4. Test login

### 4. Configure Custom Domain (Optional)

#### Vercel Frontend
```bash
1. Go to Vercel dashboard
2. Project Settings → Domains
3. Add your domain (e.g., paarcelmate.com)
4. Update DNS records as instructed
```

#### Railway Backend
```bash
1. Go to Railway dashboard
2. Service Settings → Networking
3. Add custom domain (e.g., api.paarcelmate.com)
4. Update DNS records
```

### 5. Update Environment Variables

After adding custom domains, update:
- Backend `CORS_ORIGINS` with new frontend domain
- Frontend `NEXT_PUBLIC_API_URL` with new backend domain

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test connection
psql "postgresql://user:pass@host:port/db"

# Check if PostGIS is enabled
SELECT PostGIS_version();
```

### Email Not Sending

```bash
# Check SMTP settings
curl -v telnet://smtp.gmail.com:465

# Verify app password
# Go to: https://myaccount.google.com/apppasswords
```

### CORS Errors

```env
# Make sure frontend URL is in CORS_ORIGINS
CORS_ORIGINS=https://yourapp.vercel.app

# Include branch previews if needed
CORS_ORIGINS=https://yourapp.vercel.app,https://yourapp-git-*.vercel.app
```

### Build Failures

#### Frontend (Google Fonts SSL)
```bash
# This is a Windows-specific issue
# Vercel (Linux) deployment will work fine
# No action needed for production
```

#### Backend
```bash
# Check build logs in Railway/Render
# Common issues:
# - Missing environment variables
# - TypeScript errors
# - Missing dependencies
```

### Migration Errors

```bash
# Reset database (DANGER: deletes all data!)
npx prisma migrate reset

# Or apply specific migration
npx prisma migrate deploy
```

---

## 📊 Monitoring & Logs

### Railway
- View logs: Service → Deployments → Logs
- Metrics: Service → Metrics

### Vercel
- View logs: Project → Deployments → Logs
- Analytics: Project → Analytics

### Database
- Railway: Database → Metrics
- Supabase: Project → Database → Logs

---

## 💰 Cost Estimates (Monthly)

### Free Tier Setup
- **Vercel Frontend**: $0 (Hobby plan)
- **Railway**: $5-10 (starter resources)
- **Upstash Redis**: $0 (free tier: 10K commands/day)
- **Gmail SMTP**: $0 (500 emails/day)
- **Total**: ~$5-10/month

### Production Setup
- **Vercel**: $20 (Pro plan)
- **Railway**: $20-50 (scaled resources)
- **Neon**: $19+ (with autoscaling)
- **Upstash**: $0-10 (pay-as-you-go)
- **Total**: ~$60-100/month

---

## 🔐 Security Checklist

- [ ] Change all JWT secrets
- [ ] Enable Prisma connection pooling
- [ ] Set up database backups
- [ ] Configure rate limiting
- [ ] Enable HTTPS only
- [ ] Set secure cookie flags
- [ ] Review CORS origins
- [ ] Enable logging & monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure firewall rules

---

## 📚 Additional Resources

- [Railway Docs](https://docs.railway.app)
- [Vercel Docs](https://vercel.com/docs)
- [NestJS Deployment](https://docs.nestjs.com/deployment)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Production](https://www.prisma.io/docs/guides/deployment)

---

## 🆘 Support

If you encounter issues:

1. Check Railway/Vercel logs
2. Review environment variables
3. Test API endpoints individually
4. Check database connectivity
5. Verify email service

---

**Deployment Guide Version**: 1.0
**Last Updated**: March 12, 2026
**Tested Platforms**: Railway + Vercel
