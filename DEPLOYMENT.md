# 🚀 Render.com Deployment Guide

## Current Issue
- Every time Render.com pulls new code from Git, SQLite data gets deleted
- SQLite is not suitable for production on Render.com (ephemeral filesystem)

## Solution: Use PostgreSQL Database

### Method 1: Using render.yaml (Recommended)

1. The `render.yaml` file in this repository will automatically:
   - Create PostgreSQL database
   - Deploy web service
   - Set environment variables
   - Link database to web service

2. In Render.com dashboard:
   - Connect your GitHub repository
   - Render will detect `render.yaml` and create both services automatically

### Method 2: Manual Setup

### Step 1: Create PostgreSQL Database on Render.com

1. Login to [Render.com](https://render.com)
2. Click **"New"** → **"PostgreSQL"**
3. Fill in the information:
   - **Name**: `etransfer-db`
   - **Database**: `etransfer`
   - **User**: `etransfer_user`
   - **Region**: Singapore or nearest
   - **PostgreSQL Version**: 15 (latest)
   - **Plan**: Free (or Starter $7/month if needed)

4. Click **"Create Database"**
5. After creation, copy the **"External Database URL"**

### Step 2: Deploy Web Service

1. In Render.com, click **"New"** → **"Web Service"**
2. Connect GitHub repository containing the code
3. Configuration:
   - **Name**: `etransfer-api`
   - **Region**: Singapore (same region as database)
   - **Branch**: `main`
   - **Root Directory**: `e-transfer-BE`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### Step 3: Setup Environment Variables

In the **Environment** section of Web Service, add:

```bash
NODE_ENV=production
DATABASE_URL=postgresql://etransfer_user:password@hostname:5432/etransfer
```

**Note**: Replace `DATABASE_URL` with the "External Database URL" from Step 1

### Step 4: Deploy

1. Click **"Create Web Service"**
2. Render.com will automatically build and deploy
3. Monitor logs to ensure successful database connection

## 🔍 Troubleshooting

### Check Database Connection in Logs

After deployment, check the logs for these messages:

```
✅ Success indicators:
🔧 Database Configuration:
NODE_ENV: production
RENDER: true
DATABASE_URL exists: true
isProduction: true
🐘 Using PostgreSQL database for production
✅ Successfully connected to PostgreSQL
🐘 Creating PostgreSQL tables...
```

```
❌ Problem indicators:
🗄️ Using SQLite database for development
❌ Error connecting to PostgreSQL: [error details]
```

### If Still Using SQLite:

1. **Check Environment Variables**: Ensure `NODE_ENV=production` and `DATABASE_URL` are set
2. **Verify Database URL**: Copy exact URL from PostgreSQL service
3. **Region Match**: Ensure both services are in same region
4. **Restart Service**: Sometimes a manual restart helps

### Force PostgreSQL Mode:

Add this environment variable if automatic detection fails:
```bash
RENDER=true
```

## ✅ Results

- ✅ Data stored in PostgreSQL (persistent)
- ✅ Data remains intact with each new code deployment
- ✅ Auto-scaling and backup (with paid plan)
- ✅ Automatic SSL/HTTPS

## 🔧 Testing

After deployment, test the APIs:

```bash
# Health check
curl https://your-app-name.onrender.com/health

# Create account
curl -X POST https://your-app-name.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "role": "customer"
  }'

# Verify data persistence
curl https://your-app-name.onrender.com/api/auth/accounts
```

## 💰 Pricing

- **Free Plan**: Database 1GB, Web Service 750 hours/month
- **Paid Plan**: Database $7/month, Web Service $7/month (99.99% uptime)

## 🔄 Automatic Deployments

Every time you push code to GitHub branch `main`, Render.com will automatically:
1. Pull latest code
2. Rebuild application
3. Deploy with zero-downtime
4. **Database data remains intact!**

## 🚨 Important Notes

1. **Regular Backups**: Render.com has auto-backup but manual data export is recommended
2. **Monitor Logs**: Watch logs to detect errors early
3. **Environment Variables**: Never commit DATABASE_URL to code
4. **Database Connection**: Ensure Web Service and Database are in same region to reduce latency

## 🐛 Common Issues & Solutions

### Issue: "Using SQLite database for development"
**Solution**: Check environment variables, ensure DATABASE_URL is correctly set

### Issue: "Error connecting to PostgreSQL"
**Solution**: Verify DATABASE_URL format and database is running

### Issue: Data still gets deleted
**Solution**: Confirm PostgreSQL is being used by checking logs for "🐘 Using PostgreSQL" 