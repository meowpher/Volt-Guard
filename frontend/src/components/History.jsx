import React, { useEffect, useState } from 'react';

export default function History(){
  const [data, setData] = useState([]);
  const [sensorId, setSensorId] = useState('');
  const [sensors, setSensors] = useState([]);
  const token = localStorage.getItem('token')||'';

  async function loadSensors(){
    const res = await fetch('/api/sensors', { headers:{ Authorization:`Bearer ${token}` }});
    const json = await res.json(); if(json.ok) setSensors(json.sensors);
  }
  async function load(){
    const url = sensorId ? `/api/readings?sensor_id=${sensorId}&limit=500` : '/api/readings?limit=500';
    const res = await fetch(url, { headers:{ Authorization:`Bearer ${token}` }});
    const json = await res.json(); if(json.ok) setData(json.data);
  }
  useEffect(()=>{ loadSensors(); load(); },[sensorId]);

  return (
    <div style={{display:'grid', gap:12}}>
      <div style={{display:'flex', gap:10}}>
        <select value={sensorId} onChange={e=>setSensorId(e.target.value)}>
          <option value="">All sensors</option>
          {sensors.map(s=> <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button className="btn btn-blue" onClick={load}>Refresh</button>
      </div>
      <div className="badge"><span className="indicator ok"/> Columns: v1 = Phase A (kW), v2 = Phase B (kW), v3 = Phase C (kW)</div>
      <div className="chart">
        <div className="chart-title">Recent readings (latest 500)</div>
        <div className="section-body" style={{overflowX:'auto'}}>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
            <thead>
              <tr>
                <th align="left">Time</th>
                <th align="right">v1</th>
                <th align="right">v2</th>
                <th align="right">v3</th>
                <th align="left">Sensor</th>
              </tr>
            </thead>
            <tbody>
              {data.slice().reverse().map((r,i)=> (
                <tr key={i}>
                  <td>{new Date((r[3]||0)*1000).toLocaleString()}</td>
                  <td align="right">{Number(r[0]).toFixed(2)}</td>
                  <td align="right">{Number(r[1]).toFixed(2)}</td>
                  <td align="right">{Number(r[2]).toFixed(2)}</td>
                  <td>{r[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
