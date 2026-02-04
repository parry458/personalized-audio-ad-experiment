# Personalized Audio Ad Experiment

A two-part Prolific study for personalized audio advertising research.

Built with:
- **Next.js 14+** (App Router)
- **TypeScript**
- **Supabase** (database, coming soon)
- **ElevenLabs** (audio generation, coming soon)

## Project Structure

```
src/
├── app/
│   ├── t0/                    # Part 1: Collect participant data
│   │   └── page.tsx
│   ├── t1/                    # Part 2: Play audio & collect responses
│   │   └── page.tsx
│   └── api/
│       ├── t0/
│       │   └── submit/        # POST: Submit T0 form data
│       │       └── route.ts
│       └── t1/
│           ├── get-audio/     # GET: Check audio status
│           │   └── route.ts
│           └── submit/        # POST: Submit T1 responses
│               └── route.ts
└── lib/
    └── supabaseAdmin.ts       # Server-side Supabase client
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (keep secret!)

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing the Pages

### T0 Page (Part 1)
Visit with simulated Prolific parameters:
```
http://localhost:3000/t0?PROLIFIC_PID=test123&STUDY_ID=study456&SESSION_ID=sess789
```

### T1 Page (Part 2)
Visit with simulated Prolific parameters:
```
http://localhost:3000/t1?PROLIFIC_PID=test123&STUDY_ID=study456&SESSION_ID=sess789
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/t0/submit` | POST | Submit T0 form data |
| `/api/t1/get-audio` | GET | Check audio generation status |
| `/api/t1/submit` | POST | Submit T1 responses |

## Next Steps

- [ ] Set up Supabase database tables
- [ ] Implement data persistence
- [ ] Add ElevenLabs audio generation
- [ ] Add Supabase Storage for audio files
- [ ] Build complete survey forms
- [ ] Add Prolific completion redirect
