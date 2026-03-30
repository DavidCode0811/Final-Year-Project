# Exam Portal - Secure Online Examination System

A production-ready secure examination system built with Next.js featuring advanced anti-cheating mechanisms.

## Features

### Authentication System
- Student and Lecturer roles
- Secure registration and login
- Session management with JWT
- Protected routes

### Exam Management
**For Lecturers:**
- Create exams with custom durations
- Add multiple-choice questions
- View exam results
- Monitor student activity logs

**For Students:**
- View available exams
- Take exams with timer
- View results after submission

### Advanced Anti-Cheating System

The system implements five critical anti-cheating mechanisms:

#### 1. Focus/Blur Detection
- Detects when student leaves the browser window
- Logs every focus loss event
- Auto-submits exam after 5 focus losses

#### 2. Page Visibility API
- Detects tab switching
- Immediately triggers auto-submission when tab is hidden
- Prevents students from opening other tabs

#### 3. Inactivity Monitoring
- Checks for user activity every 10 seconds
- Shows warning after 15 seconds of inactivity
- Auto-submits exam after 30 seconds of inactivity

#### 4. Broadcast Channel API (Multi-Tab Detection)
- Detects if exam is opened in multiple tabs
- Immediately auto-submits when multiple tabs detected
- Prevents students from using multiple browser windows

#### 5. Auto-Submission System
Automatically submits the exam when:
- Timer reaches zero
- Tab switch detected
- Multiple tabs detected
- Excessive focus loss (5 times)
- Prolonged inactivity

### Activity Logging
All suspicious activities are logged to the database:
- focus_loss
- tab_hidden
- inactivity_warning
- inactivity_timeout
- multi_tab_detected
- manual_submit
- auto_submit

## Tech Stack

- **Framework:** Next.js 13 (App Router)
- **Language:** JavaScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui + Radix UI
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Supabase)
- **Authentication:** JWT with bcrypt
- **Deployment:** Vercel

## Project Structure

```
exam-portal/
├── antiCheat/              # Anti-cheating hooks
│   ├── useFocusTracker.js
│   ├── useVisibilityTracker.js
│   ├── useInactivityMonitor.js
│   ├── useBroadcastChannel.js
│   └── useAutoSubmit.js
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── exams/
│   │   ├── submit/
│   │   └── logs/
│   ├── login/
│   ├── register/
│   ├── dashboard/
│   ├── create-exam/
│   ├── exam/[id]/
│   ├── result/[id]/
│   └── layout.js
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── AuthProvider.js
│   ├── ExamTimer.js
│   └── WarningModal.js
├── lib/                  # Utilities
│   ├── supabase.js
│   └── auth.js
└── hooks/                # General hooks
```

## Database Schema

```sql
users (
  id uuid PRIMARY KEY,
  name text,
  email text UNIQUE,
  password text,
  role text CHECK (role IN ('student', 'lecturer')),
  created_at timestamptz
)

exams (
  id uuid PRIMARY KEY,
  title text,
  duration integer,
  lecturer_id uuid REFERENCES users(id),
  is_active boolean,
  created_at timestamptz
)

questions (
  id uuid PRIMARY KEY,
  exam_id uuid REFERENCES exams(id),
  question_text text,
  options jsonb,
  correct_answer text,
  order_index integer,
  created_at timestamptz
)

responses (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  exam_id uuid REFERENCES exams(id),
  answers jsonb,
  score integer,
  submitted_at timestamptz,
  submission_type text CHECK (submission_type IN ('manual', 'auto')),
  UNIQUE(user_id, exam_id)
)

activity_logs (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  exam_id uuid REFERENCES exams(id),
  event_type text,
  timestamp timestamptz,
  metadata jsonb
)
```

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Supabase account

### 1. Clone the Repository
```bash
git clone <repository-url>
cd exam-portal
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Supabase

The database schema has already been created. You need to set up environment variables:

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project:
1. Go to your Supabase dashboard
2. Navigate to Settings > API
3. Copy the Project URL and anon/public key

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production
```bash
npm run build
```

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts and add environment variables when asked.

### Option 2: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

## Usage Guide

### For Lecturers

1. **Register** as a lecturer
2. **Login** to your account
3. Click **Create Exam**
4. Fill in exam details:
   - Exam title
   - Duration in minutes
   - Add questions with 4 options each
   - Specify correct answers
5. Submit to create the exam
6. View exams on dashboard

### For Students

1. **Register** as a student
2. **Login** to your account
3. View available exams on dashboard
4. Click **Start Exam** on any exam
5. Read anti-cheating rules carefully
6. Click **I Understand - Start Exam**
7. Answer questions (timer will count down)
8. Click **Submit Exam** or wait for auto-submission
9. View results

## Anti-Cheating Warnings

Students will see warnings for:
- Leaving the browser window (focus loss)
- Switching tabs
- Inactivity
- Multiple tabs detected

After certain violations, the exam is automatically submitted.

## Security Features

- Passwords hashed with bcrypt
- JWT-based authentication
- Row Level Security (RLS) in database
- Protected API routes
- Input validation
- Prevention of multiple submissions
- Copy/paste disabled during exam
- Right-click disabled during exam

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Exams
- `GET /api/exams` - Get all active exams
- `POST /api/exams` - Create exam (lecturer only)
- `GET /api/exams/[id]` - Get specific exam

### Submissions
- `POST /api/submit` - Submit exam answers

### Activity Logs
- `POST /api/logs` - Log activity event

## Browser Compatibility

The anti-cheating features require modern browser support for:
- Page Visibility API
- Broadcast Channel API
- Focus/Blur events

Supported browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Known Limitations

- BroadcastChannel API may not work in private/incognito mode in some browsers
- Anti-cheating can be bypassed with virtual machines (physical proctoring recommended for high-stakes exams)
- Timer stops if browser is completely closed

## Troubleshooting

### Environment Variables Not Loading
- Ensure `.env.local` exists in root directory
- Restart development server after adding variables
- Check variable names match exactly

### Database Errors
- Verify Supabase URL and key are correct
- Check RLS policies in Supabase dashboard
- Ensure migrations have been applied

### Anti-Cheating Not Working
- Check browser console for errors
- Verify browser supports required APIs
- Test in non-private browsing mode

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
