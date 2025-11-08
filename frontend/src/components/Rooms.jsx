import React, { useEffect, useState } from 'react';
import BarChart from './BarChart.jsx';

export default function Rooms(){
  const [rooms, setRooms] = useState([]);
  const [limit, setLimit] = useState(1000);
  const token = localStorage.getItem('token')||'';

  async function load(){
    const res = await fetch(`/api/rooms-summary?limit=${limit}`, { headers:{ Authorization:`Bearer ${token}` }});
    const data = await res.json(); if(data.ok) setRooms(data.rooms);
  }
  useEffect(()=>{ load(); },[limit]);

  return (
    <div style={{display:'grid', gap:12}}>
      <div style={{display:'flex', gap:10, alignItems:'center'}}>
        <div className="subtitle">Recent readings window:</div>
        <select value={limit} onChange={e=>setLimit(Number(e.target.value))}>
          {[200,500,1000,2000,5000].map(n=> <option key={n} value={n}>{n}</option>)}
        </select>
        <button className="btn btn-blue" onClick={load}>Refresh</button>
      </div>
      <div className="grid" style={{gridTemplateColumns:'repeat(12,1fr)'}}>
        {rooms.map(r => (
          <div key={r.room} style={{gridColumn:'span 6'}}>
            <div className="chart">
              <div className="chart-title">{r.room} · {r.sensors} sensors · {r.reading_count} readings</div>
              <div className="section-body">
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
                  <div>
                    <div className="subtitle">Latest vector</div>
                    <BarChart data={r.last} />
                  </div>
                  <div>
                    <div className="subtitle">Total (window)</div>
                    <div style={{fontSize:22, fontWeight:700}}>{Number(r.total).toFixed(2)}</div>
                    <div className="subtitle">Last update: {r.last_ts ? new Date(r.last_ts*1000).toLocaleString() : '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
