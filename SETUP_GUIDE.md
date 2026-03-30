# Complete Setup and Deployment Guide

## Quick Start (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**Get Supabase Credentials:**
- The database has already been created with all tables and RLS policies
- Go to your Supabase dashboard
- Navigate to Settings > API
- Copy the Project URL and anon/public key

### Step 3: Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000`

---

## Database Setup (Already Completed)

The database schema has been automatically created with the following tables:

### Tables Created:
1. **users** - Stores user information (students and lecturers)
2. **exams** - Stores exam details
3. **questions** - Stores exam questions with options
4. **responses** - Stores student submissions and scores
5. **activity_logs** - Stores all anti-cheating events

### Security (Row Level Security):
All tables have RLS enabled with appropriate policies:
- Students can only view their own data
- Lecturers can manage their own exams
- Activity logs are protected per user
- Proper authentication required for all operations

---

## Testing the Application

### 1. Create a Lecturer Account
1. Go to `/register`
2. Fill in details and select "Lecturer" role
3. Click "Create Account"

### 2. Create an Exam
1. Login as lecturer
2. Click "Create Exam" button
3. Fill in exam details:
   - Title: "Sample Math Exam"
   - Duration: 30 (minutes)
4. Add questions:
   - Question 1: "What is 2 + 2?"
     - Options: 3, 4, 5, 6
     - Correct Answer: 4
   - Question 2: "What is 10 - 5?"
     - Options: 3, 4, 5, 6
     - Correct Answer: 5
5. Click "Create Exam"

### 3. Create a Student Account
1. Logout from lecturer account
2. Go to `/register`
3. Fill in details and select "Student" role
4. Click "Create Account"

### 4. Take an Exam
1. Login as student
2. Click on available exam
3. Read anti-cheating rules
4. Click "I Understand - Start Exam"
5. Answer questions
6. Try switching tabs (you'll see a warning)
7. Submit exam or wait for timer

### 5. View Results
After submission, you'll see:
- Score percentage
- Number correct/incorrect
- Submission type (manual/auto)
- Timestamp

---

## Anti-Cheating Features Testing

### Test Focus Detection:
1. Start an exam
2. Click outside the browser window
3. You should see a "Focus Loss Detected" warning
4. Do this 5 times to trigger auto-submission

### Test Tab Switching:
1. Start an exam
2. Switch to another tab (Ctrl+Tab or Cmd+Tab)
3. The exam will auto-submit within 3 seconds

### Test Multi-Tab Detection:
1. Start an exam in one tab
2. Open the same exam URL in another tab
3. Both tabs will detect this and auto-submit

### Test Inactivity:
1. Start an exam
2. Don't move mouse or type for 15 seconds
3. You'll see an inactivity warning
4. Continue being inactive for 30 seconds total
5. Exam will auto-submit

### Test Timer:
1. Create a 1-minute exam for testing
2. Start the exam
3. Wait for timer to reach 00:00
4. Exam will auto-submit

---

## Deployment to Vercel

### Method 1: GitHub Integration (Recommended)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo>
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js

3. **Add Environment Variables:**
   - In Vercel project settings
   - Go to "Environment Variables"
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Your app is live!

### Method 2: Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Add Environment Variables:**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

5. **Redeploy:**
   ```bash
   vercel --prod
   ```

---

## Production Checklist

Before going live, ensure:

- [ ] Environment variables are set correctly
- [ ] Database is accessible from production
- [ ] All RLS policies are enabled
- [ ] Test all anti-cheating features
- [ ] Test on multiple browsers
- [ ] Test on mobile devices
- [ ] Set up error monitoring (optional)
- [ ] Configure custom domain (optional)

---

## Folder Structure Explanation

```
exam-portal/
├── antiCheat/                    # Anti-cheating detection hooks
│   ├── useFocusTracker.js       # Detects window focus loss
│   ├── useVisibilityTracker.js  # Detects tab switching
│   ├── useInactivityMonitor.js  # Detects user inactivity
│   ├── useBroadcastChannel.js   # Detects multiple tabs
│   └── useAutoSubmit.js         # Handles auto-submission
│
├── app/                         # Next.js 13 App Router
│   ├── api/                     # Backend API routes
│   │   ├── auth/
│   │   │   ├── login/route.js  # Login endpoint
│   │   │   └── register/route.js # Registration endpoint
│   │   ├── exams/
│   │   │   ├── route.js        # Get/Create exams
│   │   │   └── [id]/route.js   # Get specific exam
│   │   ├── submit/route.js     # Submit exam
│   │   └── logs/route.js       # Log activities
│   │
│   ├── login/page.js           # Login page
│   ├── register/page.js        # Registration page
│   ├── dashboard/page.js       # Main dashboard
│   ├── create-exam/page.js     # Exam creation (lecturers)
│   ├── exam/[id]/page.js       # Exam taking page (students)
│   ├── result/[id]/page.js     # Results page
│   ├── layout.js               # Root layout with AuthProvider
│   └── page.tsx                # Home page (redirects to login)
│
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── AuthProvider.js         # Authentication context
│   ├── ExamTimer.js           # Countdown timer component
│   └── WarningModal.js        # Warning dialog component
│
├── lib/
│   ├── supabase.js            # Supabase client
│   └── auth.js                # Authentication utilities
│
└── Configuration Files
    ├── .env.local             # Environment variables (create this)
    ├── .env.example           # Example env file
    ├── package.json           # Dependencies
    ├── tailwind.config.ts     # Tailwind configuration
    ├── next.config.js         # Next.js configuration
    └── README.md              # Documentation
```

---

## API Routes Documentation

### Authentication

#### POST /api/auth/register
Register a new user (student or lecturer)

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword",
  "role": "student"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student"
  }
}
```

#### POST /api/auth/login
Login user and get authentication token

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": { ... },
  "token": "base64_encoded_token"
}
```

### Exams

#### GET /api/exams
Get all active exams

**Response:**
```json
{
  "exams": [
    {
      "id": "uuid",
      "title": "Math Exam",
      "duration": 60,
      "question_count": 10,
      "lecturer": {
        "name": "Dr. Smith"
      }
    }
  ]
}
```

#### POST /api/exams
Create a new exam (lecturers only)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Final Exam",
  "duration": 90,
  "questions": [
    {
      "question_text": "What is 2+2?",
      "options": ["3", "4", "5", "6"],
      "correct_answer": "4"
    }
  ]
}
```

#### GET /api/exams/[id]
Get specific exam with questions

**Response:**
```json
{
  "exam": {
    "id": "uuid",
    "title": "Math Exam",
    "duration": 60,
    "questions": [
      {
        "id": "uuid",
        "question_text": "What is 2+2?",
        "options": ["3", "4", "5", "6"],
        "order_index": 0
      }
    ]
  }
}
```

### Submissions

#### POST /api/submit
Submit exam answers

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "exam_id": "uuid",
  "answers": {
    "question_id_1": "answer_1",
    "question_id_2": "answer_2"
  },
  "submission_type": "manual"
}
```

**Response:**
```json
{
  "message": "Exam submitted successfully",
  "score": 8,
  "total": 10,
  "response": { ... }
}
```

### Activity Logs

#### POST /api/logs
Log anti-cheating events

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "exam_id": "uuid",
  "event_type": "focus_loss",
  "metadata": {
    "count": 1
  }
}
```

---

## Troubleshooting Common Issues

### Issue: "Missing Supabase environment variables"
**Solution:**
- Create `.env.local` file in root directory
- Add both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Restart the development server

### Issue: "User already exists" during registration
**Solution:**
- Use a different email address
- Or delete the existing user from Supabase dashboard

### Issue: Anti-cheating features not working
**Solution:**
- Check browser console for errors
- Ensure you're using a modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- Disable browser extensions that might interfere
- Don't use incognito/private mode (BroadcastChannel may not work)

### Issue: Database permission errors
**Solution:**
- Check that RLS policies are enabled in Supabase
- Verify the user is authenticated
- Check the user's role matches the required role for the operation

### Issue: Build fails
**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

---

## Performance Optimization

For production deployments:

1. **Enable caching:**
   - Next.js automatically caches static assets
   - Configure CDN caching headers if needed

2. **Database optimization:**
   - Indexes are already created on foreign keys
   - Consider adding indexes on frequently queried columns

3. **Image optimization:**
   - Use Next.js Image component for images
   - Already configured in the project

4. **Monitoring:**
   - Set up Vercel Analytics
   - Monitor API response times
   - Track error rates

---

## Security Best Practices

1. **Never commit `.env.local` to git:**
   - Already in `.gitignore`
   - Always use environment variables

2. **Use strong passwords:**
   - Enforce password requirements
   - Consider adding password strength meter

3. **Regular updates:**
   - Keep dependencies updated
   - Monitor security advisories

4. **Rate limiting:**
   - Consider adding rate limiting to API routes
   - Prevent brute force attacks

---

## Support and Contact

For questions or issues:
1. Check this guide first
2. Review the main README.md
3. Check browser console for errors
4. Review Supabase logs
5. Open an issue on GitHub

---

## License

MIT License - Feel free to use for educational or commercial purposes.
