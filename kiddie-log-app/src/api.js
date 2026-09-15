export const tenantSlug=location.pathname.match(/^\/t\/([a-z0-9-]+)/)?.[1]||'';
export const base=tenantSlug?`/t/${tenantSlug}`:'';
async function request(url,body){
  const r=await fetch(url,{credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});
  const value=await r.json();if(!r.ok){const e=new Error(value.error||'Please try again.');e.status=r.status;throw e;}return value;
}
export function api(path,body){if(!tenantSlug)throw new Error('Choose an institution first.');return request('/api'+base+path,body);}
export function platformApi(path,body){return request('/api/platform'+path,body);}
export const id=()=>crypto.randomUUID();
export const time=v=>v?new Date(v).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Accra'}):'—';
export const date=v=>v?new Date(v).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Africa/Accra'}):'—';
export function navigate(path){history.pushState({},'',base+path);dispatchEvent(new PopStateEvent('popstate'));}
