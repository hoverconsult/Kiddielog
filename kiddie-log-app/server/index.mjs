import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, extname } from 'node:path';
import { Store, seed } from './store.mjs';
import { createDomain, AppError } from './domain.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
export function createApp({dbPath=resolve(root,'data/kiddie-log.sqlite')}={}) {
  const store=new Store(dbPath);seed(store);const domain=createDomain(store);
  const limits=new Map();
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');res.setHeader('Cross-Origin-Opener-Policy','same-origin');
    try{
      const host=req.headers.host||'';
      const allowedHosts=(process.env.KIDDIE_LOG_ALLOWED_HOSTS||'127.0.0.1:4174,localhost:4174,127.0.0.1:5173,localhost:5173').split(',').map(v=>v.trim());
      if(!allowedHosts.includes(host))throw new AppError('Host is not allowed.',403);
      const allowedOrigins=new Set([`http://${host}`,'http://127.0.0.1:5173','http://localhost:5173','http://127.0.0.1:4174','http://localhost:4174',...String(process.env.KIDDIE_LOG_PUBLIC_ORIGIN||'').split(',').filter(Boolean)]);
      if(req.headers.origin&&!allowedOrigins.has(req.headers.origin))throw new AppError('Request origin is not allowed.',403);
      const url=new URL(req.url,'http://'+host);const path=url.pathname;
      if(!path.startsWith('/api/')){
        if(req.method!=='GET')throw new AppError('Not found.',404);
        const manifest=path.match(/^\/t\/([a-z0-9-]+)\/manifest\.webmanifest$/);if(manifest){const institution=domain.tenant(manifest[1]);res.setHeader('Content-Type','application/manifest+json');res.setHeader('Cache-Control','public, max-age=3600');res.end(JSON.stringify({name:`Kiddie Log · ${institution.name}`,short_name:'Kiddie Log',description:'Safe attendance, care information and child handovers.',start_url:`/t/${institution.id}/`,scope:`/t/${institution.id}/`,display:'standalone',background_color:'#f5f7fb',theme_color:'#082f4f',icons:[{src:'/icons/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any maskable'}]}));return;}
        const dist=resolve(root,'dist');const relative=decodeURIComponent(path).replace(/^\/+/, '');const file=resolve(dist,relative||'index.html');
        if(!file.startsWith(dist+ '/')&&!file.startsWith(dist+'\\'))throw new AppError('Not found.',404);
        const target=existsSync(file)&&extname(file)?file:resolve(dist,'index.html');
        if(!existsSync(target)){res.writeHead(200,{'Content-Type':'text/plain'});res.end('Kiddie Log API is running. Start the frontend at http://127.0.0.1:5173 or run npm run build.');return;}
        res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'");
        res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'})[extname(target)]||'application/octet-stream');res.end(readFileSync(target));return;
      }
      res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');
      if(path.startsWith('/api/platform/')){
        let body={};if(req.method==='POST'){if(!String(req.headers['content-type']).startsWith('application/json'))throw new AppError('JSON is required.',415);let raw='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>100000)throw new AppError('Request too large.',413);raw+=chunk;}try{body=JSON.parse(raw||'{}');}catch{throw new AppError('Invalid JSON.');}}
        if(req.method==='GET'&&/^\/api\/platform\/institutions\/[a-z0-9-]+$/.test(path)){const id=path.split('/').at(-1);const t=domain.tenant(id);res.end(JSON.stringify({id:t.id,name:t.name,ministry:t.ministry}));return;}
        if(req.method==='POST'&&path==='/api/platform/institutions'){const key=req.socket.remoteAddress+':institution-signup';const previous=limits.get(key);const entry=previous&&previous.until>Date.now()?previous:{count:0,until:Date.now()+3600000};entry.count++;limits.set(key,entry);if(entry.count>10)throw new AppError('Too many registration attempts. Please try later.',429);res.statusCode=201;res.end(JSON.stringify(domain.createInstitution(body)));return;}
        throw new AppError('Not found.',404);
      }
      const m=path.match(/^\/api\/t\/([a-z0-9-]+)(\/.*)?$/);if(!m)throw new AppError('Not found.',404);
      const t=m[1],p=m[2]||'/';domain.tenant(t);
      let body={};if(req.method==='POST'){
        if(!String(req.headers['content-type']).startsWith('application/json'))throw new AppError('JSON is required.',415);
        let raw='',bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>8_000_000)throw new AppError('Request too large.',413);raw+=chunk;}try{body=JSON.parse(raw||'{}');}catch{throw new AppError('Invalid JSON.');}
      }
      const token=(req.headers.cookie||'').split(';').map(v=>v.trim()).find(v=>v.startsWith('kl_session='))?.slice(11)||'';
      const u=domain.session(t,token);const post=req.method==='POST';let result;
      if(post&&['/login','/login/verify','/collector/check','/register','/collector/accept'].includes(p)){
        const key=req.socket.remoteAddress+':'+p;const previous=limits.get(key);const entry=previous&&previous.until>Date.now()?previous:{count:0,until:Date.now()+60000};entry.count++;limits.set(key,entry);if(entry.count>30)throw new AppError('Too many attempts. Please wait a minute.',429);
      }
      if(!post&&p==='/tenant')result=domain.tenant(t);
      else if(post&&p==='/login')result=domain.login(t,body);
      else if(post&&p==='/login/verify'){result=domain.verifyLogin(t,body);const secure=process.env.NODE_ENV==='production'?'; Secure':'';res.setHeader('Set-Cookie',`kl_session=${result.token}; HttpOnly; SameSite=Strict; Path=/api/t/${t}; Max-Age=28800${secure}`);result={user:result.user};}
      else if(post&&p==='/logout'){result=domain.logout(t,token);const secure=process.env.NODE_ENV==='production'?'; Secure':'';res.setHeader('Set-Cookie',`kl_session=; HttpOnly; SameSite=Strict; Path=/api/t/${t}; Max-Age=0${secure}`);}
      else if(post&&p==='/register')result=domain.register(t,body);
      else if(post&&p==='/collector/accept')result=domain.acceptInvite(t,body);
      else if(post&&p==='/collector/check')result=domain.collectorCheck(t,body);
      else{
        if(!u)throw new AppError('Please sign in to continue.',401);
        if(!post&&p==='/state')result=domain.state(t,u);
        else if(post&&/^\/applications\/[^/]+\/decision$/.test(p))result=domain.decide(t,u,p.split('/')[2],body);
        else if(post&&p==='/collectors')result=domain.invite(t,u,body);
        else if(post&&p==='/authorisations')result=domain.authorise(t,u,body);
        else if(post&&/^\/authorisations\/[^/]+\/revoke$/.test(p))result=domain.revoke(t,u,p.split('/')[2]);
        else if(post&&p==='/check-in')result=domain.checkin(t,u,body);
        else if(post&&p==='/pickups/verify')result=domain.verifyPickup(t,u,body);
        else if(!post&&/^\/pickups\/[^/]+$/.test(p))result=domain.verification(t,u,p.split('/')[2]);
        else if(post&&p==='/check-out')result=domain.checkout(t,u,body);
        else if(!post&&/^\/operations\/[^/]+$/.test(p))result=domain.operation(t,u,p.split('/')[2]);
        else if(!post&&/^\/receipts\/[^/]+$/.test(p))result=domain.receipt(t,u,p.split('/')[2]);
        else if(post&&p==='/messages')result=domain.message(t,u,body);
        else if(post&&p==='/announcements')result=domain.announce(t,u,body);
        else if(post&&/^\/notifications\/[^/]+\/read$/.test(p))result=domain.readNotification(t,u,p.split('/')[2]);
        else if(post&&/^\/children\/[^/]+\/care$/.test(p))result=domain.care(t,u,p.split('/')[2],body);
        else if(post&&p==='/branding')result=domain.branding(t,u,body);
        else if(post&&p==='/users')result=domain.addUser(t,u,body);
        else if(post&&/^\/users\/[^/]+$/.test(p))result=domain.updateUser(t,u,p.split('/')[2],body);
        else if(post&&p==='/profile')result=domain.profile(t,u,body);
        else throw new AppError('Not found.',404);
      }
      res.end(JSON.stringify(result));
    }catch(e){res.statusCode=e.status||500;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.status?e.message:'An unexpected error occurred. Please try again.'}));if(!e.status)console.error(e);}
  });
  return {server,store,domain};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {server,store}=createApp();server.listen(4174,'127.0.0.1',()=>console.log('Kiddie Log local server: http://127.0.0.1:4174'));
  const stop=()=>server.close(()=>{store.close();process.exit(0);});process.on('SIGINT',stop);process.on('SIGTERM',stop);
}
