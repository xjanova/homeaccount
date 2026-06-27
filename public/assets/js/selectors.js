// selectors.js — pure derivations from state (income, expense, donut, budgets, charts, calendar)
import { CATS, EXPENSE_CATS, INCOME_CATS, MONTHS_HIST } from './data.js';
import { TH_MONTHS_SHORT } from './format.js';

export function scopedTx(s){
  const list = s.tx.filter(t => !t.deleted);
  return s.scope === 'all' ? list : list.filter(t => t.scope === s.scope);
}
export function totals(s){
  const f = scopedTx(s);
  const income = f.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0);
  const expense = f.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0);
  const balance = income - expense;
  const totalBudget = EXPENSE_CATS.reduce((a,c)=>a+(s.budgets[c]||0),0);
  const budgetLeft = totalBudget - expense;
  return { income, expense, balance, totalBudget, budgetLeft };
}
// expense grouped by category, sorted desc
export function byCategory(s){
  const f = scopedTx(s).filter(t=>t.type==='expense');
  const map = {};
  for(const t of f) map[t.cat] = (map[t.cat]||0) + t.amount;
  const rows = Object.keys(map).map(c => ({ cat:c, th:CATS[c]?.th||c, color:CATS[c]?.color||'var(--ink2)', amount:map[c] }));
  rows.sort((a,b)=>b.amount-a.amount);
  return rows;
}
// donut segments (cumulative arcs as conic-gradient stops)
export function donut(s){
  const rows = byCategory(s);
  const total = rows.reduce((a,r)=>a+r.amount,0) || 1;
  let acc = 0;
  const stops = rows.map(r => { const from=acc/total*100; acc+=r.amount; const to=acc/total*100; return { ...r, from, to, pct: r.amount/total*100 }; });
  return { rows: stops, total };
}
// budget rows with status
export function budgetRows(s){
  const f = scopedTx(s).filter(t=>t.type==='expense');
  const spent = {};
  for(const t of f) spent[t.cat] = (spent[t.cat]||0)+t.amount;
  return EXPENSE_CATS.filter(c => (s.budgets[c]||0) > 0).map(c => {
    const limit = s.budgets[c]||0, used = spent[c]||0, pct = limit?Math.min(used/limit*100,100):0;
    const ratio = limit?used/limit:0;
    const status = ratio>1 ? 'over' : ratio>0.85 ? 'near' : 'ok';
    return { cat:c, th:CATS[c]?.th||c, color:CATS[c]?.color, limit, used, pct, ratio, status };
  });
}
// 6-month income/expense series (history + current scoped month)
export function monthSeries(s){
  const { income, expense } = totals(s);
  const cur = { label: TH_MONTHS_SHORT[new Date().getMonth()], inc:income, exp:expense };
  return [...MONTHS_HIST, cur];
}
export function accountTotals(s){
  const total = s.accounts.filter(a=>!a.deleted).reduce((a,x)=>a+x.balance,0);
  return { total, accounts: s.accounts.filter(a=>!a.deleted) };
}
export function reportStats(s){
  const { income, expense, balance } = totals(s);
  const savingRate = income>0 ? Math.max(0, balance/income*100) : 0;
  const f = scopedTx(s);
  const days = 30;
  const avgPerDay = expense/days;
  return { income, expense, balance, savingRate, avgPerDay, count:f.length };
}
// calendar cells for month m/y with recurring events
export function calendarCells(s, m, y){
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m+1, 0).getDate();
  const cells = [];
  for(let i=0;i<first;i++) cells.push(null);
  const recs = s.recurring.filter(r=>!r.deleted);
  for(let d=1; d<=days; d++){
    const evs = recs.filter(r => r.day === d).map(r => ({ ...r }));
    cells.push({ day:d, events:evs });
  }
  return cells;
}
export function recurringTotals(s){
  const recs = s.recurring.filter(r=>!r.deleted);
  const inc = recs.filter(r=>r.type==='income').reduce((a,r)=>a+r.amount,0);
  const exp = recs.filter(r=>r.type==='expense').reduce((a,r)=>a+r.amount,0);
  return { inc, exp };
}
export function recentTx(s, n=6){
  return scopedTx(s).slice().sort((a,b)=> (b.date>a.date?1:b.date<a.date?-1:0) || b.updatedAt-a.updatedAt).slice(0,n);
}
