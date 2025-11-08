import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b'];

export default function ReDonut({ data=[0,0,0], height=180 }){
  const items = [
    { name: 'Phase A', value: Number(data[0]||0) },
    { name: 'Phase B', value: Number(data[1]||0) },
    { name: 'Phase C', value: Number(data[2]||0) },
  ];
  return (
    <div style={{width:'100%', height}}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={items} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} stroke="none">
            {items.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip cursor={false} contentStyle={{background:'rgba(15,21,32,.9)', border:'1px solid var(--border)'}}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
