import React, { useEffect, useState } from 'react';

export default function Account(){
  const [token, setToken] = useState(localStorage.getItem('token')||'');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  async function auth(path){
    setMsg('');
    const res = await fetch(`/api/auth/${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({email, password})});
    const data = await res.json();
    if(!res.ok || !data.ok){ setMsg(data.error||'Auth failed'); return; }
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setMsg('Success');
  }

  async function me(){
    const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` }});
    const data = await res.json();
    setMsg(JSON.stringify(data));
  }

  async function train(){
    const res = await fetch('/api/train', { method:'POST', headers: { Authorization: `Bearer ${token}` }});
    const data = await res.json(); setMsg(JSON.stringify(data));
  }
  async function seed(){
    const res = await fetch('/api/seed-demo', { method:'POST' });
    const data = await res.json(); setMsg(JSON.stringify(data));
  }

  return (
    <div style={{display:'grid', gap:12}}>
      <div className="badge">Logged in: {token ? 'yes' : 'no'}</div>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
        <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input placeholder="password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
      </div>
      <div className="btns" style={{gridTemplateColumns:'repeat(5,1fr)'}}>
        <button className="btn btn-blue" onClick={()=>auth('signup')}>Sign up</button>
        <button className="btn btn-green" onClick={()=>auth('login')}>Log in</button>
        <button className="btn btn-yellow" onClick={me}>Who am I?</button>
        <button className="btn btn-blue" onClick={train} disabled={!token}>Train on my data</button>
        <button className="btn btn-red" onClick={seed}>Seed demo (10k)</button>
      </div>
      <div style={{color:'var(--muted)'}}>{msg}</div>
    </div>
  );
}
