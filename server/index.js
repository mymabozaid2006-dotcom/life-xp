import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const port = Number(process.env.PORT || 3000);
const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '32kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'LIFE XP API' }));

app.use('/api', async (req, res, next) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return res.status(401).json({ error: 'Sign in to continue.' });
  if (!supabaseUrl || !publishableKey) return res.status(503).json({ error: 'Server auth is not configured.' });
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return res.status(401).json({ error: 'Your session is invalid. Please sign in again.' });
  req.user = data.user;
  req.supabase = client;
  next();
});

app.get('/api/me', async (req, res) => {
  const { data, error } = await req.supabase.from('users').select('id,name,email,total_xp,current_level,created_at').eq('id', req.user.id).maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ user: req.user, profile: data });
});

app.get('/api/goals', async (req, res) => {
  const { data, error } = await req.supabase.from('goals').select('*,tasks(*)').eq('user_id', req.user.id).order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ goals: data });
});

app.post('/api/goals', async (req, res) => {
  const title = String(req.body?.title || '').trim();
  if (!title || title.length > 200) return res.status(400).json({ error: 'Enter a goal title (up to 200 characters).' });
  const { data, error } = await req.supabase.from('goals').insert({ user_id: req.user.id, title, description: String(req.body?.description || '').slice(0, 2000) }).select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json({ goal: data });
});

app.get('/api/tasks', async (req, res) => {
  const { data, error } = await req.supabase.from('tasks').select('*,goals!inner(user_id,title)').eq('goals.user_id', req.user.id).order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  res.json({ tasks: data });
});

app.get('/api/rewards', async (req, res) => {
  const { data, error } = await req.supabase.from('rewards').select('*').order('required_xp');
  if (error) return res.status(400).json({ error: error.message });
  res.json({ rewards: data });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(port, () => console.log(`LIFE XP API running at http://localhost:${port}`));
