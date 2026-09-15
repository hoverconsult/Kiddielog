import test from 'node:test';
import assert from 'node:assert/strict';
import { Store, seed } from '../server/store.mjs';
import { createDomain } from '../server/domain.mjs';

function fixture(){const store=new Store(':memory:');seed(store);return {store,domain:createDomain(store)};}

test('tenant-scoped records do not cross institution boundaries',()=>{
  const {store}=fixture();
  assert.equal(store.get('child','another-tenant','emma'),null);
  assert.equal(store.list('child','another-tenant').length,0);
  store.close();
});

test('a parent cannot perform a staff verification',()=>{
  const {store,domain}=fixture();
  const parent=store.get('user','evangel','parent');
  assert.throws(()=>domain.verifyPickup('evangel',parent,{code:'KL-INVALID'}),/permission/i);
  store.close();
});

test('checkout is append-only, idempotent, and blocks a second release',()=>{
  const {store,domain}=fixture();
  const parent=store.get('user','evangel','parent');
  const staff=store.get('user','evangel','staff');
  const grant=domain.authorise('evangel',parent,{childId:'emma',collectorId:'john',startsAt:new Date(Date.now()-1000).toISOString(),endsAt:new Date(Date.now()+3600000).toISOString(),note:''});
  const verification=domain.verifyPickup('evangel',staff,{code:grant.code});
  const first=domain.checkout('evangel',staff,{verificationId:verification.id,confirmed:true,requestKey:'checkout-one'});
  const replay=domain.checkout('evangel',staff,{verificationId:verification.id,confirmed:true,requestKey:'checkout-one'});
  assert.equal(replay.id,first.id);
  assert.throws(()=>domain.checkout('evangel',staff,{verificationId:verification.id,confirmed:true,requestKey:'checkout-two'}),/already used|already checked out/i);
  assert.equal(store.events('evangel').filter(e=>e.type==='CHECK_OUT'&&e.childId==='emma').length,1);
  store.close();
});

test('registration stays pending until an authorised reviewer approves it',()=>{
  const {store,domain}=fixture();
  const result=domain.register('evangel',{requestKey:'new-family',parent:{name:'Adwoa Test',email:'adwoa.test@example.com',phone:'+233241112222',relationship:'Mother'},children:[{name:'Nana Test',dob:'2021-01-20',group:'Nursery',safetyNote:'',photo:''}]});
  assert.equal(result.status,'pending');
  assert.equal(store.list('user','evangel').some(u=>u.email==='adwoa.test@example.com'),false);
  const reviewer=store.get('user','evangel','registrar');
  domain.decide('evangel',reviewer,result.id,{decision:'approved',version:1});
  assert.equal(store.list('user','evangel').some(u=>u.email==='adwoa.test@example.com'&&u.role==='Parent'),true);
  store.close();
});

test('an institution can create an isolated tenant and owner account',()=>{
  const {store,domain}=fixture();
  const result=domain.createInstitution({slug:'grace-centre',name:'Grace Centre',ministry:'Children Ministry',ownerName:'Adwoa Owner',ownerEmail:'owner@grace.test',ownerPhone:'+233241112233',authority:'yes'});
  assert.equal(result.id,'grace-centre');
  assert.equal(domain.tenant('grace-centre').name,'Grace Centre');
  assert.equal(store.list('user','grace-centre')[0].role,'Owner');
  assert.equal(store.list('child','grace-centre').length,0);
  store.close();
});

test('care information is parent-owned and announcements reach the selected families',()=>{
  const {store,domain}=fixture();
  const parent=store.get('user','evangel','parent');
  const owner=store.get('user','evangel','owner');
  domain.care('evangel',parent,'emma',{allergies:'Peanuts',dietaryNeeds:'No groundnuts',medicalConditions:'',accessibilityNeeds:'Quiet arrival',emergencyInstructions:'Call parent',careConsent:true});
  assert.equal(store.get('child','evangel','emma').allergies,'Peanuts');
  assert.throws(()=>domain.care('evangel',parent,'abena',{careConsent:true}),/not found/i);
  const sent=domain.announce('evangel',owner,{title:'Sunday update',body:'Please arrive by 8 AM.',audience:'Kindergarten',requestKey:'announcement-one'});
  assert.equal(sent.recipients,2);
  assert.equal(store.list('notification','evangel').length,2);
  store.close();
});
