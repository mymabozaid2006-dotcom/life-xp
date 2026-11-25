import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import './style.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const Auth = createContext(null);
const api = async (path, token) => {
  const response = await fetch(`/api${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
};

function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);
  const value = useMemo(() => ({ supabase, session, loading }), [session, loading]);
  return <Auth.Provider value={value}>{children}</Auth.Provider>;
}

function Shell({ children }) {
  const { session, supabase: client } = useContext(Auth);
  const location = useLocation();
  const navigate = useNavigate();
  const links = [['Home','/home'],['Goals','/goals'],['Daily Tasks','/tasks'],['Progress','/progress'],['Rewards','/rewards'],['Profile','/profile']];
  return <><header className="topbar"><div className="nav wrap"><Link className="brand" to="/"><span className="brand-mark">✦</span>LIFE XP</Link><nav className="navlinks">{links.map(([name,path])=><Link className={location.pathname===path?'active':''} key={path} to={path}>{name}</Link>)}</nav><div className="navright">{session?<button className="secondary" onClick={async()=>{await client.auth.signOut();navigate('/login')}}>Sign out</button>:<Link to="/login">Log in</Link>}</div></div></header>{children}</>;
}

function Protected({ children }) {
  const { session, loading } = useContext(Auth);
  if (loading) return <main className="wrap main"><p>Loading your account…</p></main>;
  return session ? children : <Navigate to="/login" replace />;
}

function Intro() { return <main className="wrap main"><section className="hero"><div className="eyebrow">Your personal growth companion</div><h1>Make progress feel like a game.</h1><p>Build habits that stick, make progress you can see, and celebrate every step.</p><Link className="btn" to="/register">Get started →</Link><Link className="btn secondary" to="/login">Log in</Link></section><section className="grid three section">{[['🎯','Set personal goals'],['✓','Build daily habits'],['⚡','Track your progress']].map(([icon,title])=><article className="card" key={title}><div className="icon">{icon}</div><h2>{title}</h2><p className="muted">Turn meaningful plans into small steps and celebrate your progress.</p></article>)}</section></main>; }

function AuthPage({ register=false }) {
  const { supabase: client } = useContext(Auth); const navigate=useNavigate(); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  async function submit(e){e.preventDefault();setError('');if(!client){setError('Supabase is not configured. Add the VITE_SUPABASE settings to .env.local.');return}const f=new FormData(e.currentTarget);const email=String(f.get('email')).trim();const password=String(f.get('password'));if(password.length<8){setError('Use a password with at least 8 characters.');return}setBusy(true);try{const result=register?await client.auth.signUp({email,password,options:{data:{name:String(f.get('name')).trim()}}}):await client.auth.signInWithPassword({email,password});if(result.error)throw result.error;if(register&&!result.data.session){setError('Check your email to confirm your account, then log in.');return}navigate('/home')}catch(err){setError(err.message||'Could not sign in. Check your details.')}finally{setBusy(false)}}
  return <main className="wrap main"><section className="card auth-card"><Link className="brand" to="/"><span className="brand-mark">✦</span>LIFE XP</Link><div className="eyebrow">{register?'Start your next chapter':'Good to see you again'}</div><h1>{register?'Create your account':'Welcome back'}</h1><p className="muted">{register?'A little progress adds up to a lot.':'Your next small win is waiting.'}</p><form onSubmit={submit}>{register&&<label>Name<input name="name" required maxLength="100" autoComplete="name" /></label>}<label>Email address<input name="email" type="email" required autoComplete="email" /></label><label>Password<input name="password" type="password" required minLength="8" autoComplete={register?'new-password':'current-password'} /></label>{error&&<p className="error" role="alert">{error}</p>}<button disabled={busy}>{busy?'Please wait…':register?'Create account →':'Log in →'}</button></form><p className="tiny">{register?'Already have an account? ':'New to LIFE XP? '}<Link to={register?'/login':'/register'}>{register?'Log in':'Create an account'}</Link></p></section></main>;
}

function DashboardPage({ title, description, endpoint }) {
  const { session }=useContext(Auth); const [data,setData]=useState(null); const [error,setError]=useState('');
  useEffect(()=>{if(endpoint&&session)api(endpoint,session.access_token).then(setData).catch(e=>setError(e.message))},[endpoint,session]);
  const items=endpoint==='/api/goals'?data?.goals:endpoint==='/api/tasks'?data?.tasks:endpoint==='/api/rewards'?data?.rewards:null;
  return <main className="wrap main"><div className="eyebrow">LIFE XP</div><h1>{title}</h1><p className="muted">{description}</p>{error&&<p className="error">{error}</p>}{items?<section className="grid three section">{items.map(item=><article className="card" key={item.id}><h2>{item.title}</h2><p className="muted">{item.description||item.status||item.reward_type||'Keep moving forward.'}</p></article>)}</section>:<section className="grid three section"><article className="card"><div className="eyebrow">LEVEL</div><div className="stat">1</div><p className="muted">Your journey is underway.</p></article><article className="card"><div className="eyebrow">GOALS</div><p className="muted">Create a goal to begin tracking progress.</p></article><article className="card"><div className="eyebrow">XP</div><div className="stat">0</div><p className="muted">Every small step counts.</p></article></section>}</main>;
}

function App(){return <AuthProvider><BrowserRouter><Shell><Routes><Route path="/" element={<Intro/>}/><Route path="/login" element={<AuthPage/>}/><Route path="/register" element={<AuthPage register/>}/><Route path="/home" element={<Protected><DashboardPage title="Welcome to LIFE XP" description="Make your next small win count."/></Protected>}/><Route path="/goals" element={<Protected><DashboardPage title="Personal Goals" description="Your active goals." endpoint="/api/goals"/></Protected>}/><Route path="/tasks" element={<Protected><DashboardPage title="Daily Tasks & Challenges" description="Tasks connected to your goals." endpoint="/api/tasks"/></Protected>}/><Route path="/progress" element={<Protected><DashboardPage title="Progress Dashboard" description="Progress grows one step at a time."/></Protected>}/><Route path="/rewards" element={<Protected><DashboardPage title="Rewards & Achievements" description="Milestones to celebrate." endpoint="/api/rewards"/></Protected>}/><Route path="/profile" element={<Protected><Profile/></Protected>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes></Shell></BrowserRouter></AuthProvider>}

function Profile(){const {session}=useContext(Auth);return <main className="wrap main"><div className="eyebrow">Your account</div><h1>User Profile</h1><section className="card"><p>{session?.user?.user_metadata?.name||'LIFE XP member'}</p><p className="muted">{session?.user?.email}</p></section></main>}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
