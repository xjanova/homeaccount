// db.js — IndexedDB persistence (local-first). Entity stores keyed by id + a kv store.
const DB_NAME = 'moneynual';
const DB_VER = 1;
export const STORES = ['tx','accounts','recurring','notes','members'];
let _db = null;

export function openDB(){
  if(_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    if(!('indexedDB' in globalThis)){ reject(new Error('no-indexeddb')); return; }
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      for(const s of STORES) if(!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath:'id' });
      if(!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath:'k' });
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}
function tx(store, mode='readonly'){ return openDB().then(db => db.transaction(store, mode).objectStore(store)); }
function p(req){ return new Promise((res,rej)=>{ req.onsuccess=()=>res(req.result); req.onerror=()=>rej(req.error); }); }

export async function getAll(store){ return p((await tx(store)).getAll()); }
export async function putMany(store, items){
  const db = await openDB();
  return new Promise((res, rej) => {
    const t = db.transaction(store, 'readwrite'); const os = t.objectStore(store);
    for(const it of items) os.put(it);
    t.oncomplete = res; t.onerror = () => rej(t.error);
  });
}
export async function putOne(store, item){ return p((await tx(store,'readwrite')).put(item)); }
export async function delOne(store, id){ return p((await tx(store,'readwrite')).delete(id)); }
export async function clearStore(store){ return p((await tx(store,'readwrite')).clear()); }

export async function kvGet(k, def=null){ const r = await p((await tx('kv')).get(k)); return r ? r.v : def; }
export async function kvSet(k, v){ return p((await tx('kv','readwrite')).put({ k, v })); }

export async function wipeAll(){
  for(const s of STORES) await clearStore(s);
  await clearStore('kv');
}
export function dbAvailable(){ return 'indexedDB' in globalThis; }
