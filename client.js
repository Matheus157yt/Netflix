/*
client.js - helpers front-end para consumir API com refresh automático.
Armazena accessToken e refreshToken em localStorage (para testes).
*/
async function apiFetch(url, opts = {}) {
  opts.headers = opts.headers || {};
  opts.headers['Content-Type'] = 'application/json';
  const token = localStorage.getItem('accessToken');
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;
  if (opts.body && typeof opts.body === 'object') opts.body = JSON.stringify(opts.body);
  let res = await fetch(url, opts);
  if (res.status === 401) {
    const ok = await tryRefresh();
    if (ok) {
      opts.headers['Authorization'] = 'Bearer ' + localStorage.getItem('accessToken');
      res = await fetch(url, opts);
    }
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

async function tryRefresh(){
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;
  try {
    const r = await fetch('/api/auth/refresh', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ refreshToken })});
    if (!r.ok) { localStorage.removeItem('accessToken'); localStorage.removeItem('refreshToken'); return false; }
    const data = await r.json();
    if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    return true;
  } catch (err) { console.error('tryRefresh', err); return false; }
}

// verbos
async function apiGet(url){ return apiFetch(url, { method:'GET' }); }
async function apiPost(url, body){ return apiFetch(url, { method:'POST', body }); }
async function apiPut(url, body){ return apiFetch(url, { method:'PUT', body }); }
async function apiDelete(url){ return apiFetch(url, { method:'DELETE' }); }

function showMsg(msg){ const el=document.getElementById('msg'); if(!el) return alert(msg); el.innerText = msg; setTimeout(()=>el.innerText='', 3000); }
