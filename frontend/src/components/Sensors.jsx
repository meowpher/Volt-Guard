import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function Sensors(){
  const [list, setList] = useState([]);
  const [name, setName] = useState('');
  const [room, setRoom] = useState('Living Room');
  const [type, setType] = useState('meter');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token') || '';

  async function load(){
    try {
      setError('');
      const res = await fetch('/api/sensors', { 
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      if(data.ok) {
        setList(data.sensors);
      } else {
        setError(data.error || 'Failed to load sensors');
        toast.error('Failed to load sensors');
      }
    } catch(err) {
      setError('Connection error');
      console.error(err);
    }
  }

  useEffect(() => { 
    load(); 
  }, []);

  async function add(){
    if(!name.trim()) {
      toast.error('Please enter a sensor name');
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch('/api/sensors', { 
        method: 'POST', 
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        }, 
        body: JSON.stringify({ name, room, type })
      });
      
      const data = await res.json();
      
      if(data.ok) {
        toast.success('Sensor added successfully');
        setName('');
        load();
      } else {
        toast.error(data.error || 'Failed to add sensor');
      }
    } catch(err) {
      toast.error('Error adding sensor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const rooms = ['Living Room', 'Kitchen', 'Bedroom', 'Bathroom', 'Garage', 'Office'];
  const types = ['meter', 'plug', 'phase'];

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="chart">
        <div className="chart-title">Add Sensor</div>
        <div className="section-body" style={{ display: 'grid', gap: 12 }}>
          <div className="badge">
            <span className="indicator ok" /> 
            Data expected as three numbers per sample: Phase A/B/C active power (kW). For single-phase, duplicate into the other fields.
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10 }}>
            <input 
              placeholder="Sensor name" 
              value={name} 
              onChange={e => setName(e.target.value)}
              disabled={loading}
            />
            <select 
              value={room} 
              onChange={e => setRoom(e.target.value)}
              disabled={loading}
            >
              {rooms.map(r => <option key={r}>{r}</option>)}
            </select>
            <select 
              value={type} 
              onChange={e => setType(e.target.value)}
              disabled={loading}
            >
              {types.map(t => <option key={t}>{t}</option>)}
            </select>
            <button 
              className="btn btn-green" 
              onClick={add}
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
          </div>

          {error && (
            <div style={{ color: 'var(--red)', fontSize: '0.9em' }}>
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="chart">
        <div className="chart-title">Your Sensors</div>
        <div className="section-body" style={{ display: 'grid', gap: 10 }}>
          {list.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
              No sensors added yet
            </div>
          ) : (
            list.map(s => (
              <div 
                key={s.id} 
                className="glass-card" 
                style={{
                  padding: 12, 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  border: '1px solid var(--border)',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{s.name}</div>
                  <div className="subtitle">{s.room} · {s.type}</div>
                </div>
                <div className="badge">ID {s.id}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
