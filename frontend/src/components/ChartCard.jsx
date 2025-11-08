import React from 'react';

export default function ChartCard({ title, children }){
  return (
    <div className="chart">
      <div className="chart-title">{title}</div>
      <div className="chart-placeholder">{children}</div>
    </div>
  );
}
