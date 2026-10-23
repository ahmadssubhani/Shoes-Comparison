# ShoeScope · Web Frontend

Next.js 16 (App Router, Turbopack, TypeScript, Tailwind CSS) web application for ShoeScope.

## Getting Started

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Provide your public Supabase credentials and Gemini API key:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-flash-latest
```

3. Install dependencies and run development server:
```bash
npm install
npm run dev
```

4. Or run production build:
```bash
npm run build
npm run start -p 3000
```

Open [http://localhost:3000](http://localhost:3000) to view the application.
