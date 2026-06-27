// api.js — thin client for the PHP/SQLite backend. All calls are no-ops when offline.
const BASE = './api';
let _token = null;
export function setToken(t){ _token = t; }

async function req(path, { method='GET', body=null, auth=true } = {}){
  const headers = { 'Accept':'application/json' };
  if(body) headers['Content-Type'] = 'application/json';
  if(auth && _token) headers['Authorization'] = 'Bearer ' + _token;
  let res;
  try{
    res = await fetch(BASE + path, { method, headers, body: body?JSON.stringify(body):null });
  }catch(e){ throw new ApiError('network', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 0); }
  let data = null;
  const ct = res.headers.get('content-type')||'';
  if(ct.includes('application/json')) data = await res.json().catch(()=>null);
  if(!res.ok){ throw new ApiError(data?.error||'http_'+res.status, data?.message||('ผิดพลาด ('+res.status+')'), res.status); }
  return data;
}
export class ApiError extends Error{
  constructor(code, message, status){ super(message); this.code=code; this.status=status; }
}

export const api = {
  register: (email, password, name) => req('/auth/register', { method:'POST', auth:false, body:{ email, password, name } }),
  login:    (email, password)       => req('/auth/login',    { method:'POST', auth:false, body:{ email, password } }),
  me:       ()                       => req('/me'),
  health:   ()                       => req('/health', { auth:false }),
  pull:     (since)                  => req('/sync/pull', { method:'POST', body:{ since } }),
  push:     (records)               => req('/sync/push', { method:'POST', body:{ records } }),
  members:  ()                       => req('/household/members'),
  invite:   (email)                  => req('/household/invite', { method:'POST', body:{ email } }),
  setRole:  (userId, role)           => req('/household/role',   { method:'POST', body:{ userId, role } }),
  removeMember:(userId)              => req('/household/remove', { method:'POST', body:{ userId } }),
  setPlan:  (plan, cycle)            => req('/billing/plan',     { method:'POST', body:{ plan, cycle } }),
  invoices: ()                       => req('/billing/invoices'),
};
