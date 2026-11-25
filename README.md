# LIFE XP full-stack project

React + Vite frontend, Node.js/Express API, and Supabase Auth/Postgres.

## Setup

1. Copy `.env.example` to `.env` and fill in `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.
2. Create `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the browser client.
3. Run `npm install`.
4. Run `npm run server` in one terminal and `npm run dev` in another.

The browser uses only a Supabase publishable key. Never put a service-role key in frontend code.
