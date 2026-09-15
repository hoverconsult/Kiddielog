export const deploymentPrefix=location.hostname.endsWith('github.io')?'/Kiddielog':'';
const routedPath=location.pathname.startsWith(deploymentPrefix)?location.pathname.slice(deploymentPrefix.length)||'/':location.pathname;
export const tenantSlug=routedPath.match(/^\/t\/([a-z0-9-]+)/)?.[1]||'';
export const base=deploymentPrefix+(tenantSlug?`/t/${tenantSlug}`:'');
export const currentRoute=()=>{const raw=location.pathname.startsWith(deploymentPrefix)?location.pathname.slice(deploymentPrefix.length)||'/':location.pathname;return tenantSlug&&raw.startsWith(`/t/${tenantSlug}`)?raw.slice(`/t/${tenantSlug}`.length)||'/':raw;};
export const asset=path=>import.meta.env.BASE_URL+String(path).replace(/^\//,'');
async function request(url,body){
  const r=await fetch(url,{credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},method:body?'POST':'GET',body:body?JSON.stringify(body):undefined});
  const value=await r.json();if(!r.ok){const e=new Error(value.error||'Please try again.');e.status=r.status;throw e;}return value;
}
const apiOrigin=String(window.KIDDIE_LOG_API_ORIGIN||'').replace(/\/$/,'');
export function api(path,body){if(!tenantSlug)throw new Error('Choose an institution first.');return request(apiOrigin+'/api/t/'+tenantSlug+path,body);}
export function platformApi(path,body){return request(apiOrigin+'/api/platform'+path,body);}
export const id=()=>crypto.randomUUID();
export const time=v=>v?new Date(v).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'Africa/Accra'}):'—';
export const date=v=>v?new Date(v).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'Africa/Accra'}):'—';
export function navigate(path){history.pushState({},'',base+path);dispatchEvent(new PopStateEvent('popstate'));}
