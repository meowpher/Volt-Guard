import React, { useState } from 'react';

export default function Actions(){
  const [status, setStatus] = useState('');

  async function post(url, body){
    const token = localStorage.getItem('token')||'';
    const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json', Authorization: token ? `Bearer ${token}` : undefined}, body: JSON.stringify(body||{}) });
    if(!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }

  async function get(url){
    const token = localStorage.getItem('token')||'';
    const res = await fetch(url, { headers: { Authorization: token ? `Bearer ${token}` : undefined }});
    if(!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }

  const onSafety = async()=>{
    try{ setStatus('Running safety diagnostics...'); const r = await post('/api/safety-check'); setStatus(`Safety check complete. Anomalies: ${r.result.detected}`); }
    catch(e){ setStatus(`Safety check failed: ${e.message}`); }
  };
  const onReport = async()=>{
    try{ setStatus('Generating report...'); const r = await get('/api/generate-report'); setStatus(`Report ready. Samples: ${r.samples}, Peak: ${r.peak_value.toFixed(2)}`); }
    catch(e){ setStatus(`Report failed: ${e.message}`); }
  };
  const onView = async()=>{
    try{ setStatus('Fetching alerts...'); const r = await get('/api/view-alerts'); setStatus(`Fetched ${r.alerts.length} alerts.`); }
    catch(e){ setStatus(`View alerts failed: ${e.message}`); }
  };
  const onShutdown = async()=>{
    if(!confirm('Trigger EMERGENCY SHUTDOWN?')) return;
    try{ setStatus('Triggering emergency shutdown...'); const r = await post('/api/emergency-shutdown', { reason:'ui' }); setStatus(r.message || 'Shutdown triggered'); }
    catch(e){ setStatus(`Shutdown failed: ${e.message}`); }
  };

  return (
    <div>
      <div className="btns">
        <button className="btn btn-blue" onClick={onSafety}>Safety Check</button>
        <button className="btn btn-green" onClick={onReport}>Generate Report</button>
        <button className="btn btn-yellow" onClick={onView}>View Alerts</button>
        <button className="btn btn-red" onClick={onShutdown}>Emergency Shutdown</button>
      </div>
      <div style={{marginTop:12, color:'var(--muted)'}}>{status}</div>
    </div>
  );
}
