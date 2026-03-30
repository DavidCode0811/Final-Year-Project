# Quick Start Guide

Get the exam portal running in 5 minutes!

## Step 1: Install Dependencies (1 minute)
```bash
npm install
```

## Step 2: Configure Environment (2 minutes)

Create `.env.local` file in root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Get your Supabase credentials:**
- Database is already set up with all tables
- Go to Supabase Dashboard > Settings > API
- Copy Project URL and anon/public key

## Step 3: Run Development Server (30 seconds)
```bash
npm run dev
```

Visit: **http://localhost:3000**

## Step 4: Create Test Accounts (1 minute)

### Lecturer Account:
1. Click "Register"
2. Fill in:
   - Name: `Test Lecturer`
   - Email: `lecturer@test.com`
   - Password: `password123`
   - Role: `Lecturer`
3. Login with these credentials

### Student Account:
1. Logout
2. Click "Register"
3. Fill in:
   - Name: `Test Student`
   - Email: `student@test.com`
   - Password: `password123`
   - Role: `Student`

## Step 5: Create a Test Exam (1 minute)

Login as lecturer and create exam:

**Exam Details:**
- Title: `Sample Quiz`
- Duration: `5` minutes

**Question 1:**
- Question: `What is 2 + 2?`
- Options: `2`, `3`, `4`, `5`
- Correct Answer: `4`

**Question 2:**
- Question: `What is 10 - 5?`
- Options: `3`, `4`, `5`, `6`
- Correct Answer: `5`

## Step 6: Take the Exam

1. Logout from lecturer account
2. Login as student
3. Click on "Sample Quiz"
4. Read the anti-cheating rules
5. Click "I Understand - Start Exam"
6. Answer the questions
7. Try switching tabs (you'll get a warning!)
8. Submit and view results

## Testing Anti-Cheating Features

### Test 1: Tab Switching
- Start exam
- Press `Ctrl+Tab` (or `Cmd+Tab` on Mac)
- Exam will auto-submit

### Test 2: Focus Loss
- Start exam
- Click outside browser window 5 times
- Exam will auto-submit

### Test 3: Multiple Tabs
- Start exam in one tab
- Open same exam in new tab
- Both will auto-submit

### Test 4: Inactivity
- Start exam
- Don't touch mouse/keyboard for 30 seconds
- Exam will auto-submit

## Deploy to Vercel (5 minutes)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables when prompted
# NEXT_PUBLIC_SUPABASE_URL
# NEXT_PUBLIC_SUPABASE_ANON_KEY

# Go to production
vercel --prod
```

## Troubleshooting

**Issue:** Cannot connect to database
**Fix:** Check environment variables are correct

**Issue:** Anti-cheating not working
**Fix:** Don't use incognito mode, use modern browser

**Issue:** Build fails
**Fix:** Run `rm -rf node_modules .next && npm install`

## What's Next?

- Review the full [README.md](README.md) for detailed documentation
- Read [SETUP_GUIDE.md](SETUP_GUIDE.md) for comprehensive setup
- Check [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for technical details

## Support

Open an issue on GitHub if you encounter problems.

---

**You're all set! Happy testing!**
