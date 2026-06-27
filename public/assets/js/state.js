// state.js — single reactive store. Local-first: hydrates from IndexedDB, persists on change.
import * as db from './db.js';
import { now, isoToday } from './format.js';
import { DEFAULT_BUDGETS, ACCOUNT_SEED, RECURRING_SEED, seedTransactions, seedNotes, seedMembers } from './data.js';

const subs = new Set();
let notifyQueued = false;

export const Store = {
  state: {
    ready:false,
    view:'dashboard', scope:'all', dark:false, palette:'ทองคำ',
    drawerOpen:false, vw: globalThis.innerWidth||1200, isMobile:false,
    txFilter:'all', search:'',
    calMonth:new Date().getMonth(), calYear:new Date().getFullYear(),
    modal:null, form:null, toast:null,
    budgets:{...DEFAULT_BUDGETS}, billingCycle:'yearly',
    settings:{ notif:true, rollover:false, overBudgetAlert:true },
    session:null, online: (typeof navigator!=='undefined'?navigator.onLine:true),
    syncing:false, lastSync:null, syncError:null,
    tx:[], accounts:[], recurring:[], notes:[], members:[],
  },

  subscribe(fn){ subs.add(fn); return () => subs.delete(fn); },
  notify(){
    if(notifyQueued) return;
    notifyQueued = true;
    Promise.resolve().then(() => { notifyQueued = false; for(const fn of subs) try{ fn(this.state); }catch(e){ console.error(e); } });
  },

  // shallow patch UI state (no persistence)
  set(patch){ Object.assign(this.state, patch); this.notify(); },
  update(fn){ fn(this.state); this.notify(); },

  // -------- preferences (persisted in kv) --------
  async setPref(k, v){ this.state[k] = v; await db.kvSet(k, v); this.notify(); },
  plan(){ return this.state.session?.user?.plan || 'free'; },
  isPro(){ return this.plan() === 'pro'; },
  loggedIn(){ return !!this.state.session?.token; },

  // -------- entity helpers (local-first + sync metadata) --------
  async _persist(store){ await db.putMany(store, this.state[store]); },
  _stamp(o){ return { ...o, updatedAt: now(), deleted: o.deleted?1:0 }; },

  async upsert(store, obj){
    const id = obj.id || cryptoId();           // never let an undefined obj.id win
    const rec = this._stamp({ ...obj, id });
    const arr = this.state[store];
    const i = arr.findIndex(x => x.id === rec.id);
    if(i >= 0) arr[i] = rec; else arr.unshift(rec);
    await db.putOne(store, rec);
    this.notify();
    queueSync();
    return rec;
  },
  async remove(store, id){
    const arr = this.state[store];
    const i = arr.findIndex(x => x.id === id);
    if(i < 0) return;
    // soft-delete (tombstone) so the deletion syncs; keep locally hidden
    const rec = { ...arr[i], deleted:1, updatedAt: now() };
    arr.splice(i, 1);
    await db.putOne(store, rec);
    this.notify();
    queueSync();
  },

  // -------- boot: hydrate or seed --------
  async boot(){
    // prefs
    for(const k of ['dark','palette','billingCycle']){ const v = await db.kvGet(k); if(v!=null) this.state[k]=v; }
    const budgets = await db.kvGet('budgets'); if(budgets) this.state.budgets = budgets;
    const settings = await db.kvGet('settings'); if(settings) this.state.settings = {...this.state.settings, ...settings};
    const session = await db.kvGet('session'); if(session) this.state.session = session;
    const lastSync = await db.kvGet('lastSync'); if(lastSync) this.state.lastSync = lastSync;

    // entities
    const seeded = await db.kvGet('seeded');
    if(!seeded){
      this.state.accounts = ACCOUNT_SEED.map(a=>({...a, updatedAt:now(), deleted:0}));
      this.state.recurring = RECURRING_SEED.map(r=>({...r, updatedAt:now(), deleted:0}));
      this.state.tx = seedTransactions();
      this.state.notes = seedNotes();
      this.state.members = seedMembers();
      for(const s of db.STORES) await db.putMany(s, this.state[s]);
      await db.kvSet('seeded', 1);
    } else {
      for(const s of db.STORES){
        const all = await db.getAll(s);
        this.state[s] = all.filter(x => !x.deleted);
      }
    }
    this.state.ready = true;
    this.notify();
  },

  async logout(){
    this.state.session = null;
    await db.kvSet('session', null);
    this.set({ view:'landing' });
  },

  // wipe everything (e.g. switch to a synced account) — keep prefs
  async resetData(){ await db.wipeAll(); }
};

function cryptoId(){ return (globalThis.crypto?.randomUUID?.()) || ('x'+Date.now().toString(36)+Math.random().toString(36).slice(2,9)); }

// sync hook is injected by sync.js to avoid a circular import
let _queueSync = () => {};
export function setSyncTrigger(fn){ _queueSync = fn; }
function queueSync(){ try{ _queueSync(); }catch(e){} }
