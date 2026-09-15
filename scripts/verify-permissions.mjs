import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const output=path.resolve(".sites-runtime/permissions");fs.mkdirSync(output,{recursive:true});
for(const file of ["hr","permissions"]){
  const source=fs.readFileSync(`lib/${file}.ts`,"utf8");
  const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,esModuleInterop:true}}).outputText.replace(/from ["']\.\/hr["']/g,'from "./hr.mjs"').replace(/from ["']\.\/permissions["']/g,'from "./permissions.mjs"');
  fs.writeFileSync(`${output}/${file}.mjs`,compiled);
}
const hr=await import(`${output}/hr.mjs`);
const p=await import(`${output}/permissions.mjs`);
let count=0;function check(name,fn){fn();count++;console.log("PASS",name);}
const org={owner:"site-owner",owner_email:"owner@example.com",owner_name:"Owner",created_at:"2026-09-12T00:00:00.000Z"};
const emp={...hr.blankEmployee(),id:"11111111-1111-4111-8111-111111111111",code:"E-1",name:"موظف",annualOpening:5,holidayOpening:1};
const snapshot={...hr.emptySnapshot,employees:[emp],access:p.noAccess,members:[],audit:[]};
const owner=p.resolveMembership(org,{userId:"site-owner",email:"owner@example.com",displayName:"Owner"},[]);
check("owner receives all permissions",()=>assert.equal(p.permissionCatalog.every(x=>p.hasPermission(owner,x.id)),true));
const hrMember={id:"11111111-1111-4111-8111-111111111112",email:"hr@example.com",userId:null,name:"HR",role:"hr",permissions:[],active:true,createdAt:"",updatedAt:""};
const hrAccess=p.resolveMembership(org,{userId:"u-hr",email:"hr@example.com",displayName:"HR User"},[hrMember]);
check("pending email member resolves and grants HR preset",()=>{assert.equal(hrAccess.memberId,"11111111-1111-4111-8111-111111111112");assert.equal(p.hasPermission(hrAccess,"employees.bulk"),true);assert.equal(p.hasPermission(hrAccess,"finance.create"),false);});
check("HR cannot create finance",()=>assert.throws(()=>p.authorizeAction(hrAccess,{action:"finance.add"},snapshot),p.AccessError));
check("HR can edit opening balances through leave permission",()=>assert.doesNotThrow(()=>p.authorizeAction(hrAccess,{action:"employee.save",employee:{...emp,annualOpening:6}},snapshot)));
const accountant=p.resolveMembership(org,{userId:"u-acc",email:"acc@example.com",displayName:"ACC"},[{id:"11111111-1111-4111-8111-111111111113",email:"acc@example.com",userId:"u-acc",name:"ACC",role:"accountant",permissions:[],active:true,createdAt:"",updatedAt:""}]);
check("accountant can pay but cannot bulk edit employees",()=>{assert.doesNotThrow(()=>p.authorizeAction(accountant,{action:"payment.add"},snapshot));assert.throws(()=>p.authorizeAction(accountant,{action:"employees.bulk",ids:[emp.id],patch:{department:"x"}},snapshot),p.AccessError);});
const viewer=p.resolveMembership(org,{userId:"u-v",email:"v@example.com",displayName:"V"},[{id:"11111111-1111-4111-8111-111111111114",email:"v@example.com",userId:"u-v",name:"V",role:"viewer",permissions:[],active:true,createdAt:"",updatedAt:""}]);
check("viewer cannot export or open restricted views",()=>{assert.equal(p.viewAllowed("employees",viewer),true);assert.equal(p.viewAllowed("reports",viewer),false);assert.throws(()=>p.authorizeAction(viewer,{action:"employee.save",employee:emp},snapshot),p.AccessError);});
check("suspended member cannot enter",()=>assert.throws(()=>p.resolveMembership(org,{userId:"u-s",email:"s@example.com",displayName:"S"},[{id:"11111111-1111-4111-8111-111111111115",email:"s@example.com",userId:"u-s",name:"S",role:"admin",permissions:[],active:false,createdAt:"",updatedAt:""}]),p.AccessError));
check("custom bulk permission implies update",()=>assert.equal(new Set(p.permissionsFor("custom",["employees.bulk"])).has("employees.update"),true));
check("owner account cannot be edited as member",()=>assert.throws(()=>p.planMemberSave({email:"owner@example.com",name:"Owner",role:"admin",permissions:[],active:true},owner,org,[]),p.AccessError));
check("admin cannot edit self membership",()=>{const admin={id:"11111111-1111-4111-8111-111111111116",email:"admin@example.com",userId:"u-admin",name:"Admin",role:"admin",permissions:[],active:true,createdAt:"",updatedAt:""};const access=p.resolveMembership(org,{userId:"u-admin",email:"admin@example.com",displayName:"Admin"},[admin]);assert.throws(()=>p.planMemberSave({id:"11111111-1111-4111-8111-111111111116",email:"admin@example.com",name:"Admin",role:"viewer",permissions:[],active:true},access,org,[admin]),p.AccessError);});
check("member email is immutable after creation",()=>{const adminAccess={...owner,isOwner:false,memberId:"admin",userId:"u-admin"};const member={id:"11111111-1111-4111-8111-111111111117",email:"old@example.com",userId:null,name:"Old",role:"viewer",permissions:[],active:true,createdAt:"",updatedAt:""};assert.throws(()=>p.planMemberSave({id:"11111111-1111-4111-8111-111111111117",email:"new@example.com",name:"New",role:"viewer",permissions:[],active:true},adminAccess,org,[member]),p.AccessError);});
console.log(`Verified ${count} permission checks.`);
