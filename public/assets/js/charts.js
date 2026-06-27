// charts.js — lightweight inline-SVG charts (line, donut via conic-gradient, bars)
import { fmtK } from './format.js';

// income vs expense line chart (6 points). Returns SVG string sized to viewBox 0 0 W H.
export function lineChart(series, opt={}){
  const W = opt.w||520, H = opt.h||190, pad = 26, bottom = 22;
  const xs = series.length;
  const max = Math.max(1, ...series.map(p=>Math.max(p.inc,p.exp)));
  const x = i => pad + (W-pad*2) * (xs<=1?0:i/(xs-1));
  const y = v => (H-bottom) - (H-bottom-10) * (v/max);
  const path = key => series.map((p,i)=> (i?'L':'M')+x(i).toFixed(1)+' '+y(p[key]).toFixed(1)).join(' ');
  const area = key => path(key) + ` L${x(xs-1)} ${H-bottom} L${x(0)} ${H-bottom} Z`;
  const dots = key => series.map((p,i)=>`<circle cx="${x(i).toFixed(1)}" cy="${y(p[key]).toFixed(1)}" r="3.4" fill="var(--surf)" stroke="${key==='inc'?'var(--pos)':'var(--neg)'}" stroke-width="2.4"/>`).join('');
  const labels = series.map((p,i)=>`<text x="${x(i).toFixed(1)}" y="${H-6}" text-anchor="middle" font-size="9.5" fill="var(--ink2)" font-family="Sora">${p.label}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="none" style="overflow:visible">
    <defs>
      <linearGradient id="mnInc" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--pos)" stop-opacity=".22"/><stop offset="1" stop-color="var(--pos)" stop-opacity="0"/></linearGradient>
      <linearGradient id="mnExp" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--neg)" stop-opacity=".20"/><stop offset="1" stop-color="var(--neg)" stop-opacity="0"/></linearGradient>
    </defs>
    <path d="${area('inc')}" fill="url(#mnInc)"/>
    <path d="${area('exp')}" fill="url(#mnExp)"/>
    <path d="${path('inc')}" fill="none" stroke="var(--pos)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${path('exp')}" fill="none" stroke="var(--neg)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    ${dots('inc')}${dots('exp')}${labels}
  </svg>`;
}

// donut: conic-gradient ring. rows: [{color, from, to}] in %
export function donutStyle(rows){
  if(!rows.length) return 'background:conic-gradient(var(--sd) 0 100%);';
  const stops = rows.map(r => `${r.color} ${r.from.toFixed(2)}% ${r.to.toFixed(2)}%`).join(', ');
  return `background:conic-gradient(${stops});`;
}

// vertical bars: data [{label, value, color?}]
export function barChart(data, opt={}){
  const max = Math.max(1, ...data.map(d=>Math.abs(d.value)));
  return `<div class="row" style="align-items:flex-end; gap:10px; height:${opt.h||150}px;">` + data.map(d=>{
    const h = Math.max(4, Math.abs(d.value)/max*100);
    const col = d.color || (d.value<0?'var(--neg)':'linear-gradient(180deg,var(--a1),var(--a2))');
    return `<div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; height:100%; justify-content:flex-end;">
      <div class="num" style="font-size:9.5px; color:var(--ink2)">${fmtK(d.value)}</div>
      <div class="bar" style="width:70%; height:${h}%; min-height:4px; border-radius:9px 9px 4px 4px; background:${col}; box-shadow:var(--raise)"></div>
      <div style="font-size:9.5px; color:var(--ink2); font-family:Sora">${d.label}</div>
    </div>`;
  }).join('') + `</div>`;
}
