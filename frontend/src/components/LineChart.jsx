import React from 'react';

export default function LineChart({ data = [], height = 110, stroke = 'var(--blue)' }){
  const width = 340; // will scale via viewBox
  const h = height;
  const n = data.length || 1;
  const min = Math.min(...(data.length ? data : [0]));
  const max = Math.max(...(data.length ? data : [1]));
  const span = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / Math.max(1, n - 1)) * 100;
    const y = 100 - ((v - min) / span) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" width="100%" height={h} preserveAspectRatio="none" style={{display:'block'}}>
      <defs>
        <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {data.length > 1 && (
        <>
          <polyline fill="none" stroke={stroke} strokeWidth="1.6" points={points} />
          <polyline fill="url(#lineGrad)" stroke="none" points={`0,100 ${points} 100,100`} />
        </>
      )}
    </svg>
  );
}
