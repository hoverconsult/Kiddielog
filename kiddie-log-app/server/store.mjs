import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export const uid = () => randomUUID();
export const now = () => new Date().toISOString();
export class Store {
  constructor(path) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, tenant TEXT NOT NULL, kind TEXT NOT NULL, data TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS records_scope ON records(tenant,kind);
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, tenant TEXT NOT NULL, requestKey TEXT UNIQUE NOT NULL, data TEXT NOT NULL);
      CREATE TRIGGER IF NOT EXISTS immutable_event_update BEFORE UPDATE ON events BEGIN SELECT RAISE(ABORT,'Events are append-only'); END;
      CREATE TRIGGER IF NOT EXISTS immutable_event_delete BEFORE DELETE ON events BEGIN SELECT RAISE(ABORT,'Events are append-only'); END;`);
  }
  put(kind, tenant, record) {
    this.db.prepare('INSERT INTO records VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data').run(record.id, tenant, kind, JSON.stringify(record));
    return record;
  }
  get(kind, tenant, id) { const row=this.db.prepare('SELECT data FROM records WHERE kind=? AND tenant=? AND id=?').get(kind,tenant,id);return row ? JSON.parse(row.data) : null; }
  list(kind, tenant) { return this.db.prepare('SELECT data FROM records WHERE kind=? AND tenant=?').all(kind,tenant).map(r=>JSON.parse(r.data)); }
  delete(kind,tenant,id) { this.db.prepare('DELETE FROM records WHERE kind=? AND tenant=? AND id=?').run(kind,tenant,id); }
  events(tenant) { return this.db.prepare('SELECT data FROM events WHERE tenant=? ORDER BY rowid DESC').all(tenant).map(r=>JSON.parse(r.data)); }
  eventByKey(key) { const row=this.db.prepare('SELECT data FROM events WHERE requestKey=?').get(key);return row?JSON.parse(row.data):null; }
  append(tenant,event) { this.db.prepare('INSERT INTO events VALUES (?,?,?,?)').run(event.id,tenant,event.requestKey,JSON.stringify(event));return event; }
  transaction(fn) { this.db.exec('BEGIN IMMEDIATE');try {const result=fn();this.db.exec('COMMIT');return result;}catch(e){this.db.exec('ROLLBACK');throw e;} }
  close(){this.db.close();}
}

export function seed(s) {
  const t='evangel';if(s.get('tenant',t,t))return;
  s.transaction(()=>{
    s.put('tenant',t,{id:t,name:'Evangel ICGC',ministry:'Children’s Ministry',accent:'forest',timezone:'Africa/Accra'});
    const users=[['owner','Sarah Mitchell','sarah@example.com','Owner'],['staff','Akosua Boateng','akosua@example.com','Check-in Officer'],['registrar','Prince Mensah','prince@example.com','Registration Officer'],['comms','Esi Owusu','esi@example.com','Communications Officer'],['viewer','Kofi Darko','kofi@example.com','Viewer'],['parent','Ama Mensah','ama@example.com','Parent'],['parent2','Kwame Asante','kwame@example.com','Parent']];
    users.forEach(([id,name,email,role])=>s.put('user',t,{id,name,email,role,status:'active',version:1,phone:'+233240000000'}));
    s.put('family',t,{id:'family-ama',parentId:'parent',name:'Mensah family',relationship:'Mother',status:'approved'});
    s.put('family',t,{id:'family-kwame',parentId:'parent2',name:'Asante family',relationship:'Father',status:'approved'});
    const kids=[['emma','Emma Adjoa Mensah','Kindergarten','2020-03-14','parent','family-ama','Peanut allergy. Please check snacks with parent.'],['lucas','Lucas Mensah','Nursery','2022-07-08','parent','family-ama',''],['abena','Abena Asante','Primary 1','2018-11-06','parent2','family-kwame',''],['kojo','Kojo Asante','Kindergarten','2020-06-19','parent2','family-kwame','']];
    kids.forEach(([id,name,group,dob,parentId,familyId,safetyNote])=>s.put('child',t,{id,name,group,dob,parentId,familyId,safetyNote,status:'approved',photo:''}));
    s.put('collector',t,{id:'john',parentId:'parent',name:'John Mensah',relationship:'Uncle',phone:'+233241234567',email:'john@example.com',photo:'',consent:true,identity:true,status:'approved',inviteAccepted:true});
    const d=new Date();d.setHours(8,12,0,0);
    for(const [i,id] of ['emma','lucas','abena'].entries())s.append(t,{id:uid(),requestKey:'seed-'+id,type:'CHECK_IN',childId:id,actorId:'staff',staffName:'Akosua Boateng',at:new Date(d.getTime()+i*240000).toISOString(),notification:'not_connected'});
    s.put('application',t,{id:'application-jennifer',type:'family',status:'pending',version:1,createdAt:now(),parent:{name:'Jennifer Adams',email:'jennifer@example.com',phone:'+233240123456',relationship:'Mother'},children:[{name:'Lily Adams',dob:'2021-05-22',group:'Nursery',safetyNote:'',photo:''}]});
    s.put('message',t,{id:uid(),parentId:'parent',sender:'Esi Owusu',body:'Welcome, Ama! Emma and Lucas are settled in. You can manage today’s pickup here.',at:now(),requestKey:'seed-message'});
  });
}
