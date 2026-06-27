# บัญชีนวล — View Module Contract (read this fully before writing any view)

You are writing ONE view module: `public/assets/js/views/<name>.js`. It must match the
neumorphic cream-gold design and integrate with the existing engine. **Do not edit any other file.**

## Golden rules
- **Vanilla ES module.** Import only LEAF modules (never `main.js`): `../selectors.js`, `../charts.js`,
  `../data.js`, `../format.js`, `../icons.js`, `../ui.js`, `../state.js`, `../api.js`, `../sync.js`.
  `render`/`afterRender` already receive everything via `ctx` — prefer `ctx`.
- **Output HTML strings** from `render(ctx)`. Escape ALL user-supplied text with `ctx.esc(...)`
  (transaction notes, names, emails, category names typed by users). Static Thai labels need no escaping.
- **All interactivity via `data-act="actionName"`** + optional `data-id`, `data-v`, `data-k`.
  Global actions already exist (see list). View-specific actions go in an exported `actions` object.
- **Numbers** use class `num` (Sora font, tabular). Money via `ctx.fmt(n)` → `฿1,234`, compact `ctx.fmtK(n)`.
- Match the design tokens & shadow system. Reuse the CSS classes below — don't invent new visual styles.
- Keep it responsive: the engine sets `.is-mobile` on `.app-root` and adjusts grids via CSS. Use the
  provided grid classes (`g-kpi`, `g-charts`, `g-split`, `g-auto`).

## Module shape
```js
import { ... } from '../...';            // leaf modules only, as needed
export function render(ctx){ return `...html...`; }     // REQUIRED
export function afterRender(ctx, root){ /* optional: focus inputs, wire complex bits */ }
export const actions = {                  // optional: view-specific data-act handlers
  myAction(el, ev){ /* el.dataset.*, import Store/toast as needed; mutate → auto re-render */ }
};
```
`actions` handlers run on `click` (and `submit`, preventDefault'd). For live typing use `data-input="name"`,
for change events `data-change="name"` (handler keys identical). To mutate state import `{ Store } from '../state.js'`
and call `Store.set({...})` / `Store.update(fn)` / `await Store.upsert(store,obj)` / `await Store.remove(store,id)`
/ `await Store.setPref(key,val)` — any mutation auto re-renders + persists (IndexedDB) + queues sync.

## ctx API (everything you need)
- `ctx.state` — live app state (see shape below). `ctx.S` — the Store (same as `import { Store }`).
- `ctx.sel` — selectors module (pure derivations). `ctx.D` — data module (constants).
- `ctx.icon(name,size=18,sw=2)` → inline `<svg>` string. Names: dashboard,list,calendar,budget,tag,wallet,
  report,settings,price,receipt,team,crown,check,x,star,mail,shield,logout,bolt,lock,google,plus,trash,
  cash,bank,card,qr,search,chevL,chevR,sun,moon,bell,trend,cloud,cloudOff,download,edit,home,building,user,target,menu,refresh.
- Formatting: `ctx.fmt(n)`,`ctx.fmtK(n)`,`ctx.fmtNum(n)`,`ctx.fmtDate(iso)`,`ctx.fmtDateLong(iso)`,
  `ctx.monthLabel(m,y)`,`ctx.scopeName(id)`,`ctx.greeting()`,`ctx.esc(s)`,`ctx.isoToday()`,`ctx.uid()`,`ctx.TH_MONTHS`,`ctx.TH_DOW`.
- `ctx.CATS`,`ctx.PLANS`. Data constants live on `ctx.D` (see below).
- `ctx.toast(msg)`,`ctx.confirm({title,message,ok,cancel,danger})→Promise<bool>`.
- `ctx.go(view)` navigate. `ctx.S.isPro()`,`ctx.S.loggedIn()`,`ctx.S.plan()`.
- For auth/billing views: `ctx.api` (see api.js), `ctx.ApiError`, `ctx.setToken`, `ctx.afterLogin()`, `ctx.runSync()`, `ctx.canSync()`.

## State shape (`ctx.state`)
```
view, scope('all'|'personal'|'home'|'office'), dark, palette, drawerOpen, vw, isMobile,
txFilter('all'|'income'|'expense'), search, calMonth, calYear, modal, form, billingCycle('monthly'|'yearly'),
budgets{catId:amount}, settings{notif,rollover,overBudgetAlert},
session(null | {token,user:{id,email,name,plan},household:{id,name,plan,seats,owner_id,billing_cycle}}),
online, syncing, lastSync, syncError,
tx[], accounts[], recurring[], notes[], members[]
```
Entity shapes (all carry `id`, `updatedAt`, `deleted`):
- tx: `{id,type:'income'|'expense',cat,amount,accountId,scope,note,date:'YYYY-MM-DD'}`
- accounts: `{id,name,type,icon,balance,numLabel,tone:'gold'|'teal'|'lav'|'rose'}`
- recurring: `{id,day(1-31),type,cat,amount,label}`
- notes: `{id,text,color(0-5)}`
- members (local seed; server overrides when pro): `{id,name,email,role:'owner'|'admin'|'member',avatar,tone,pending}`

## ctx.D constants
`D.CATS` (id→{th,kind,icon,color,tint}), `D.EXPENSE_CATS[]`, `D.INCOME_CATS[]`, `D.DEFAULT_BUDGETS`,
`D.PALETTES`(6 named), `D.SCOPES[{id,th,icon}]`, `D.PLANS{free,pro:{name,en,monthly,yearly,tagline,features[],missing[]}}`,
`D.NOTE_COLORS[{bg,edge,ink}]`, `D.ROLE_META{owner,admin,member:{th,color,bg}}`, `D.INVOICES_DEMO`, `D.MONTHS_HIST`,
`D.scopeName(id)`.

## Selectors (`ctx.sel.*`, all take `state`)
`scopedTx(s)`,`totals(s)→{income,expense,balance,totalBudget,budgetLeft}`,`byCategory(s)→[{cat,th,color,amount}]`,
`donut(s)→{rows:[{...,from,to,pct}],total}`,`budgetRows(s)→[{cat,th,color,limit,used,pct,ratio,status:'ok'|'near'|'over'}]`,
`monthSeries(s)→[{label,inc,exp}]`(6 pts),`accountTotals(s)→{total,accounts[]}`,
`reportStats(s)→{income,expense,balance,savingRate,avgPerDay,count}`,`calendarCells(s,m,y)→[null|{day,events:[recurring]}]`,
`recurringTotals(s)→{inc,exp}`,`recentTx(s,n)`.

## Charts (`import { lineChart, donutStyle, barChart } from '../charts.js'`)
- `lineChart(series,{w,h})` → SVG string. series=[{label,inc,exp}].
- `donutStyle(rows)` → CSS `background:` string for a `.donut` element. rows from `sel.donut().rows`.
- `barChart([{label,value,color?}],{h})` → HTML string of vertical bars.

## CSS classes (in app.css — use these, do not restyle)
Surfaces: `.card .raise .inset .inset-sm .gold .gold-soft .panel`(padded card w/ `h3`).
Buttons: `.btn`(+`.icon .sm .block`), `.btn-primary .btn-pos .btn-neg .btn-ghost`. Tiles: `.tile`(+`.sm .md .gold`).
Inputs: `.field`(wrap an `<input>`), `label.lbl`. Chips/pills/badges: `.chip`(+`.on`), `.pill`, `.badge`(+`.pos .neg`),
`.seg`(segmented: `<div class=seg><button class=on>..`), `.switch`(+`.on`, contains `<i>`).
Progress: `.progress`(contains `<i style=width:X%>`). Page header: `.page-head` → `.eyebrow`,`h1`,`.sub`.
Grids: `.grid`(+`.g-kpi .g-charts .g-split .g-auto`). KPI: `.kpi`→`.top`,`.lab`,`.val`(+`.pos .neg`),`.hint`.
Lists: `.tx-row`→`.desc`(b/small),`.tx-amt`(+`.pos .neg`); table `.thead`/`.trow` use grid var `--cols-tx` with `.tx-mid` cols.
Notes: `.note`(+`textarea`,`.acts`). Calendar: `.cal-grid .cal-dow .cal-cell`(+`.today .empty`)→`.dn`,`.cal-ev`.
Pricing: `.plan-card`(+`.pro`)→`.price`,`.feat`(+`.miss`),`.ribbon`. Empty: `.empty`→tile,h3,p. Avatars: `.avatar`(+`.gold .teal .lav .rose`).
Auth/landing: `.chromeless .lnav .hero .feat-grid .cta-band .auth-wrap .auth-card .divider`.
Utility: `.row .col .between .center .wrap .gap6/10/14/18 .mt6/10/14/18/24 .mb10/14/18 .muted .small .b .sb
.t-pos .t-neg .t-gold .right .nowrap .num .hide`.

## Existing GLOBAL data-act (already handled in main.js — just reference them)
`nav`(data-id=view), `openAdd`, `setScopeGlobal`(data-v=scope), `setFilter`(data-v), `editTx`(data-id), `delTx`(data-id),
`toggleDark`, `cyclePalette`, `logout`, `toggleDrawer`. The add/edit transaction modal is global (openAdd).

## Theme fidelity cheatsheet
Light tokens: bg `#f3eee4`, surf `#ece5d8`, ink `#544c40`, ink2 `#9a8f7c`, accent a1 `#e6b347`→a2 `#d98e3f`,
pos `#4f9e7e`, neg `#cf6f4a`. Shadows: card=raised panel, raise=button up, inset/inset-sm=pressed. Radius 22px cards,
11–15px buttons/tiles, 24–28px modals. Headings/numbers = Sora; Thai body = Anuphan. Active tab/chip = inset (pressed).
