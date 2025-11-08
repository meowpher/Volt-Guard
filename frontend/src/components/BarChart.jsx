import React from 'react';

export default function BarChart({ data = [], height = 110, colors = ['var(--blue)','var(--green)','var(--yellow)'] }){
  const n = data.length || 1;
  const max = Math.max(...(data.length ? data : [1]));
  const h = height;
  const gap = 6;
  const totalGap = gap * (n + 1);
  const barWidth = (100 - (gap * (n + 1))) / n; // in viewBox units

  return (
    <svg viewBox="0 0 100 100" width="100%" height={h} preserveAspectRatio="none" style={{display:'block'}}>
      {data.map((v, i) => {
        const x = gap + i * (barWidth + gap);
        const heightPct = max ? (v / max) * 90 : 0; // leave 10% top padding
        const y = 100 - heightPct;
        const fill = colors[i % colors.length];
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={heightPct} fill={fill} opacity="0.85" />
            <rect x={x} y={y} width={barWidth} height={heightPct} fill="#000" opacity="0.06" />
          </g>
        );
      })}
    </svg>
  );
}
