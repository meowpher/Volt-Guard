import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Navbar(){
  return (
    <nav className="navbar">
      <div className="nav-left">
        <div className="logo" aria-label="VoltGaurd">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 2L3 14h7l-1 8 11-14h-7l0-6z" fill="#0b1020"/>
          </svg>
        </div>
        <div>
          <div className="title">VoltGaurd</div>
          <div className="subtitle">Power monitoring</div>
        </div>
      </div>
      <div className="nav-right">
        <div className="nav-links">
          <Item to="/">Dashboard</Item>
          <Item to="/sensors">Sensors</Item>
          <Item to="/data">Data Entry</Item>
          <Item to="/history">History</Item>
          <Item to="/rooms">Rooms</Item>
          <Item to="/anomalies">Anomalies</Item>
          <Item to="/account">Account</Item>
        </div>
      </div>
    </nav>
  );
}

function Item({to, children}){
  return (
    <NavLink to={to} className={({isActive}) => `nav-item${isActive ? ' active' : ''}`}>{children}</NavLink>
  );
}
