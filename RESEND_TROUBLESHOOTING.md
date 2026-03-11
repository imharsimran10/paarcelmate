# Resend API Key Troubleshooting

## Current Issue

The API key `re_XKdv8tn7_2AgZqdvhkFqf9ejXEvcoJmk2` is returning:
```
"application_error": "Unable to fetch data. The request could not be resolved."
```

## Step-by-Step Fix

### Step 1: Verify Your Resend Account

1. **Check your email** for Resend verification:
   - Look for email from `no-reply@resend.com`
   - Subject: "Verify your email address"
   - Click the verification link

2. **Login to Resend**: https://resend.com/login

### Step 2: Check API Key Status

1. Go to: https://resend.com/api-keys
2. Look for your API key
3. Check if it shows as "Active" or "Restricted"

### Step 3: Create New API Key (Recommended)

Since the current key isn't working, create a fresh one:

1. Go to: https://resend.com/api-keys
2. Click **"Create API Key"**
3. Give it a name: `PaarcelMate Production`
4. Select permissions: **"Sending access"** (Full access)
5. Click **"Create"**
6. **Copy the new key immediately** (you won't see it again)

### Step 4: Update Your Backend

Once you have the new API key:

1. **Update .env file**:
   ```bash
   cd backend
   nano .env  # or use any text editor
   ```

2. **Replace the RESEND_API_KEY**:
   ```env
   RESEND_API_KEY=re_your_new_key_here
   ```

3. **Save and close**

4. **Restart backend server**:
   ```bash
   # Kill existing server
   # Windows:
   netstat -ano | findstr :3000
   taskkill /F /PID <process_id>

   # Start fresh
   npm run start:dev
   ```

### Step 5: Test Again

After updating the key:

```bash
cd backend
node test-resend.js
```

You should see:
```
✅ SUCCESS! Email sent successfully!
```

### Step 6: Test with Real Email

Once test-resend.js works, test the full flow:

```bash
curl -X POST http://localhost:3000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"your-real-email@gmail.com","type":"email"}'
```

Check your inbox for the OTP email!

## Alternative: Free Email Services

If Resend doesn't work, here are alternatives:

### 1. Gmail SMTP (Free)
- **Setup**: https://support.google.com/mail/answer/185833
- **Limit**: 500 emails/day
- Update `otp.service.ts` to use nodemailer with Gmail

### 2. SendGrid (Free)
- **Free tier**: 100 emails/day
- **Signup**: https://sendgrid.com/free

### 3. Mailgun (Free)
- **Free tier**: 5000 emails/month
- **Signup**: https://www.mailgun.com/

### 4. Brevo (formerly Sendinblue)
- **Free tier**: 300 emails/day
- **Signup**: https://www.brevo.com/

## Contact Resend Support

If you're still having issues:

- **Email**: support@resend.com
- **Discord**: https://discord.gg/resend
- **Documentation**: https://resend.com/docs

Tell them:
- You're getting "application_error: Unable to fetch data"
- API key: `re_XKdv8tn7_...` (partial for security)
- You're trying to send verification emails

---

## Quick Fix: Use Console OTP (Development Only)

While debugging the email issue, you can still use the app:

1. **Start backend**: `npm run start:dev`
2. **Sign up** with any email
3. **Check backend console** - OTP will be printed there
4. **Copy OTP** and use it to verify

The Logger will show:
```
[DEBUG] 📦 DELIVERY OTP FOR PARCEL: ...
[DEBUG] 🔐 OTP CODE: 123456
```

This works because `NODE_ENV=development` in your `.env`.

---

**Remember**: Once you get a working API key, the code is 100% ready - no changes needed!
