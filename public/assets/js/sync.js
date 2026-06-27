// sync.js — offline-first sync engine (last-write-wins by updatedAt, tombstones).
// Only active when logged in + pro + online. Free/offline users never touch the network.
import { Store, setSyncTrigger } from './state.js';
import * as db from './db.js';
import { api, setToken } from './api.js';
import { now } from './format.js';

const SYNC_STORES = ['tx','accounts','recurring','notes']; // members handled server-side
let timer = null, running = false, pending = false;

export function initSync(){
  setSyncTrigger(schedule);
  // restore token from session
  const tok = Store.state.session?.token; if(tok) setToken(tok);
  globalThis.addEventListener?.('online',  () => { Store.set({ online:true }); schedule(); });
  globalThis.addEventListener?.('offline', () => Store.set({ online:false }));
}

export function canSync(){
  const s = Store.state;
  return !!(s.session?.token) && (s.session?.user?.plan === 'pro') && s.online;
}

// debounce pushes after local edits
function schedule(){
  if(!canSync()) return;
  if(timer) clearTimeout(timer);
  timer = setTimeout(() => runSync('push'), 1200);
}

export async function runSync(reason='manual'){
  if(!canSync()){ return { skipped:true }; }
  if(running){ pending = true; return { busy:true }; }
  running = true; Store.set({ syncing:true, syncError:null });
  try{
    // 1) PULL changes since last sync
    const since = Store.state.lastSync || 0;
    const pull = await api.pull(since);
    if(pull?.records) await mergeIncoming(pull.records);

    // 2) PUSH local changes (everything updated after lastSync — server upserts LWW)
    const out = {};
    for(const store of SYNC_STORES){
      const all = await db.getAll(store);
      out[store] = all.filter(r => (r.updatedAt||0) > since);
    }
    const push = await api.push(out);

    const serverTime = pull?.serverTime || push?.serverTime || now();
    Store.state.lastSync = serverTime;
    await db.kvSet('lastSync', serverTime);
    Store.set({ syncing:false, lastSync:serverTime });
  }catch(e){
    Store.set({ syncing:false, syncError: e.message || 'sync ล้มเหลว' });
  }finally{
    running = false;
    if(pending){ pending = false; schedule(); }
  }
  return { ok:true };
}

// merge server records into IndexedDB + memory (LWW)
async function mergeIncoming(records){
  for(const store of SYNC_STORES){
    const incoming = records[store]; if(!incoming?.length) continue;
    const localAll = await db.getAll(store);
    const byId = new Map(localAll.map(r => [r.id, r]));
    const toPut = [];
    for(const rec of incoming){
      const cur = byId.get(rec.id);
      if(!cur || (rec.updatedAt||0) >= (cur.updatedAt||0)) toPut.push(rec);
    }
    if(toPut.length){
      await db.putMany(store, toPut);
      // refresh in-memory non-deleted view
      const fresh = await db.getAll(store);
      Store.state[store] = fresh.filter(x => !x.deleted);
    }
  }
  Store.notify();
}

// after login: adopt token, pull remote, then push local so nothing is lost
export async function afterLogin(){
  const tok = Store.state.session?.token; if(tok) setToken(tok);
  await runSync('login');
}
