import React, { useEffect, useState } from 'react';

export default function DataEntry(){
  const [sensors, setSensors] = useState([]);
  const [sensorId, setSensorId] = useState('');
  const selected = sensors.find(s=> String(s.id)===String(sensorId));
  const [rows, setRows] = useState('');
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState({count:0, first:[]});
  const token = localStorage.getItem('token')||'';

  async function load(){
    const res = await fetch('/api/sensors', { headers:{ Authorization:`Bearer ${token}` }});
    const data = await res.json(); if(data.ok) setSensors(data.sensors);
  }
  useEffect(()=>{ load(); },[]);

  useEffect(()=>{
    const parsed = rows.trim()? rows.trim().split(/\n+/).map(line => line.split(/[,\s]+/).slice(0,3).map(Number)).filter(v=>v.length===3 && v.every(x=>!Number.isNaN(x))) : [];
    setPreview({count: parsed.length, first: parsed.slice(0,3)});
  },[rows]);

  function fillExample(){
    setRows(["100 102 98","95, 101, 99","120 110 95"].join("\n"));
  }

  async function submit(){
    try{
      const parsed = rows.trim().split(/\n+/).map(line => line.split(/[,\s]+/).slice(0,3).map(Number)).filter(v=>v.length===3 && v.every(x=>!Number.isNaN(x)));
      const res = await fetch('/api/readings', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${token}` }, body: JSON.stringify({ sensor_id: Number(sensorId), data: parsed }) });
      const data = await res.json();
      if(!data.ok) throw new Error(data.error||'Failed');
      setMsg(`Inserted ${data.inserted} rows. Anomalies: ${data.anomalies.length}`);
    }catch(e){ setMsg(e.message); }
  }

  return (
    <div style={{display:'grid', gap:12}}>
      <div className="chart">
        <div className="chart-title">Manual data entry</div>
        <div className="section-body" style={{display:'grid', gap:10}}>
          <div className="badge"><span className="indicator ok"/> Expected schema: v1 = Phase A (kW), v2 = Phase B (kW), v3 = Phase C (kW). One sample per line, space or comma separated.</div>
          <select value={sensorId} onChange={e=>setSensorId(e.target.value)}>
            <option value="">Select sensor</option>
            {sensors.map(s => <option key={s.id} value={s.id}>{s.name} · {s.room} · {s.type}</option>)}
          </select>
          {selected && (
            <div className="badge"><span className="indicator ok"/> Selected: {selected.name} ({selected.type}) · Room: {selected.room}</div>
          )}
          <textarea rows={8} placeholder="Enter rows: v1 v2 v3 per line (e.g., 100 102 98)" value={rows} onChange={e=>setRows(e.target.value)} />
          <div style={{display:'flex', gap:10, alignItems:'center'}}>
            <button className="btn btn-yellow" onClick={fillExample}>Fill example</button>
            <button className="btn btn-blue" onClick={submit} disabled={!sensorId || !rows.trim()}>Submit readings</button>
          </div>
          <div className="subtitle">Parsed preview: {preview.count} row(s){preview.first.length? ' • first rows shown below' : ''}</div>
          {preview.first.length>0 && (
            <div style={{fontSize:12, color:'var(--muted)'}}>
              {preview.first.map((v,i)=> <div key={i}>Row {i+1}: v1={v[0]} kW, v2={v[1]} kW, v3={v[2]} kW</div>)}
            </div>
          )}
          <div style={{color:'var(--muted)'}}>{msg}</div>
        </div>
      </div>
    </div>
  );
}
