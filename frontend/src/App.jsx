import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Dashboard from './components/Dashboard.jsx';
import Actions from './components/Actions.jsx';
import Alerts from './components/Alerts.jsx';
import Sensors from './components/Sensors.jsx';
import DataEntry from './components/DataEntry.jsx';
import History from './components/History.jsx';
import AnomaliesPage from './components/AnomaliesPage.jsx';
import Account from './components/Account.jsx';
import Rooms from './components/Rooms.jsx';

export default function App(){
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); localStorage.setItem('theme', theme); }, [theme]);
  return (
    <div className="app">
      <div className="container">
        <header className="header" style={{padding:0}}>
          <Navbar />
        </header>

        <main className="content">
          <section className="glass-card" style={{gridColumn:'span 12'}}>
            <div className="section-body">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/sensors" element={<Sensors />} />
                <Route path="/data" element={<DataEntry />} />
                <Route path="/history" element={<History />} />
                <Route path="/anomalies" element={<AnomaliesPage />} />
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/account" element={<Account />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </section>
        </main>

        <footer className="footer">© {new Date().getFullYear()} VoltGaurd</footer>
      </div>
    </div>
  );
}
