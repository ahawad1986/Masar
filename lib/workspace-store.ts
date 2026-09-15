import { database } from "@/db/raw";
import { defaultSettings, Snapshot, readableError } from "@/lib/hr";
import { AccessContext, AccessError, authorizeAction, hasPermission, noAccess, normalizeEmail, Organization, permissionsFor, planMemberSave, resolveMembership, UserMember } from "@/lib/permissions";
import { planMutation, Statement } from "@/lib/mutations";

type ChatUser={userId:string; email?:string; displayName?:string; fullName?:string|null};
const ORG_ID="primary";
const syntheticOwnerId="owner";

function parseJson<T>(value:unknown,fallback:T):T{try{return value?JSON.parse(String(value)) as T:fallback;}catch{return fallback;}}
function memberFromRow(row:any):UserMember{return {id:String(row.id),email:String(row.email),userId:row.user_id?String(row.user_id):null,name:String(row.name||row.email),role:String(row.role) as UserMember["role"],permissions:parseJson(row.permissions,[]),active:Number(row.active)!==0,createdAt:String(row.created_at),updatedAt:String(row.updated_at)};}
function orgFromRow(row:any):Organization{return {owner:String(row.owner),owner_email:String(row.owner_email),owner_name:String(row.owner_name),created_at:String(row.created_at)};}
function userEmail(user:ChatUser){return normalizeEmail(user.email||"");}
function userName(user:ChatUser){return user.fullName||user.displayName||user.email||"مستخدم";}
function ownerMember(org:Organization):UserMember{return {id:syntheticOwnerId,email:org.owner_email,userId:org.owner,name:org.owner_name,role:"owner",permissions:permissionsFor("owner"),active:true,createdAt:org.created_at,updatedAt:org.created_at};}

export type AuthorizedSnapshot={snapshot:Snapshot; owner:string; access:AccessContext; organization:Organization; members:UserMember[]};

export async function ensureOrganization(user:ChatUser){
  const db=database(); const email=userEmail(user);
  let row=await db.prepare("SELECT owner,owner_email,owner_name,created_at FROM organization_access WHERE id=?").bind(ORG_ID).first();
  if(row) return orgFromRow(row);
  const configured=normalizeEmail(process.env.MADAR_OWNER_EMAIL||"");
  const ownerEmail = email || configured || "ahawad1986@gmail.com";
  const at=new Date().toISOString();
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO organization_access (id,owner,owner_email,owner_name,created_at) VALUES (?,?,?,?,?)").bind(ORG_ID,user.userId,ownerEmail,userName(user),at),
    db.prepare("INSERT OR IGNORE INTO workspaces (owner,revision,settings) VALUES (?,0,'{}')").bind(user.userId)
  ]);
  row=await db.prepare("SELECT owner,owner_email,owner_name,created_at FROM organization_access WHERE id=?").bind(ORG_ID).first();
  if(!row) throw new AccessError("تعذّر تفعيل مساحة العمل.",503);
  return orgFromRow(row);
}

export async function loadAuthorizedSnapshot(user:ChatUser):Promise<AuthorizedSnapshot>{
  const db=database();
  const organization=await ensureOrganization(user);
  const owner=organization.owner;
  await db.prepare("INSERT OR IGNORE INTO workspaces (owner,revision,settings) VALUES (?,0,'{}')").bind(owner).run();
  const email=userEmail(user);
  let memberRows=(await db.prepare("SELECT * FROM members WHERE owner=? ORDER BY created_at").bind(owner).all()).results||[];
  if(user.userId!==owner){
    const pending=memberRows.find((r:any)=>!r.user_id && normalizeEmail(r.email)===email && Number(r.active)!==0);
    if(pending){
      await db.prepare("UPDATE members SET user_id=?, name=CASE WHEN name=email THEN ? ELSE name END, updated_at=? WHERE id=? AND owner=? AND user_id IS NULL AND active=1").bind(user.userId,userName(user),new Date().toISOString(),pending.id,owner).run();
      memberRows=(await db.prepare("SELECT * FROM members WHERE owner=? ORDER BY created_at").bind(owner).all()).results||[];
    }
  }
  const members=memberRows.map(memberFromRow);
  const access=resolveMembership(organization,{userId:user.userId,email,displayName:userName(user)},members);
  const queries=[
    "SELECT revision,settings FROM workspaces WHERE owner=?",
    "SELECT data FROM employees WHERE owner=? ORDER BY code",
    "SELECT data FROM finances WHERE owner=?",
    "SELECT data FROM payments WHERE owner=?",
    "SELECT data FROM leave_entries WHERE owner=?",
    "SELECT data FROM employment_history WHERE owner=? ORDER BY json_extract(data, '$.date') DESC, json_extract(data, '$.createdAt') DESC",
    "SELECT data FROM payroll_months WHERE owner=? ORDER BY month DESC",
    "SELECT data FROM audit WHERE owner=? ORDER BY at DESC LIMIT 300",
    "SELECT data FROM job_kpis WHERE owner=? ORDER BY job, json_extract(data, '$.title')",
    "SELECT data FROM performance_evaluations WHERE owner=? ORDER BY json_extract(data, '$.date') DESC",
  ];
  const result=await db.batch(queries.map(q=>db.prepare(q).bind(owner)));
  const row=result[0].results[0] as {revision:number;settings:string}|undefined;
  const parse=(i:number)=>(result[i].results||[]).map((r:any)=>JSON.parse(r.data));
  const full:Snapshot={revision:row?.revision||0,settings:{...defaultSettings,...parseJson(row?.settings,{})},employees:parse(1),finances:parse(2),payments:parse(3),leaves:parse(4),history:parse(5),payrollMonths:parse(6),audit:parse(7),jobKpis:parse(8),evaluations:parse(9),access,members:[ownerMember(organization),...members]};
  return {snapshot:filterSnapshot(full,access),owner,access,organization,members};
}

export function filterSnapshot(s:Snapshot,access:AccessContext):Snapshot{
  const auditAllowed=hasPermission(access,"audit.view");
  const usersAllowed=hasPermission(access,"users.manage");
  const audit=auditAllowed?s.audit.filter(a=>usersAllowed || a.action!=="member.save"):[];
  return {...s,audit,members:usersAllowed?s.members:undefined,access};
}

export function assertExport(access:AccessContext,kind:string|null){
  if(!hasPermission(access,"exports.run")) throw new AccessError("لا تملك صلاحية تصدير البيانات.");
  if(kind==="audit" && !hasPermission(access,"audit.view")) throw new AccessError("لا تملك صلاحية عرض سجل العمليات.");
}

export async function applyWorkspaceMutation(user:ChatUser, raw:Record<string,unknown>, revision:number, requestId:string){
  const db=database();
  const loaded=await loadAuthorizedSnapshot(user);
  const {snapshot:s,owner,access,organization,members}=loaded;
  const done=await db.prepare("SELECT id FROM operations WHERE id=? AND owner=?").bind(requestId,owner).first();
  if(done) return await loadAuthorizedSnapshot(user);
  if(s.revision!==revision) throw new AccessError("تغيّرت البيانات في جلسة أخرى. حدّث الصفحة ثم راجع التغييرات وأعد المحاولة.",409);
  authorizeAction(access,raw,s);
  let statements:Statement[]=[]; let event:any; const at=new Date().toISOString();
  if(raw.action==="member.save"){
    const planned=planMemberSave(raw,access,organization,members);
    const after=planned.after;
    statements.push({sql:"INSERT INTO members (id,owner,email,user_id,name,role,permissions,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, role=excluded.role, permissions=excluded.permissions, active=excluded.active, updated_at=excluded.updated_at WHERE members.owner=excluded.owner",params:[after.id,owner,after.email,after.userId,after.name,after.role,JSON.stringify(after.permissions),after.active?1:0,after.createdAt,after.updatedAt]});
    event={id:crypto.randomUUID(),at,actor:access.name||userName(user),action:"member.save",summary:(planned.before?"تحديث صلاحيات: ":"إضافة مستخدم: ")+after.email,changes:[{name:after.email,before:planned.before,after}]};
    statements.push({sql:"INSERT INTO audit (id,owner,at,data) VALUES (?,?,?,?)",params:[event.id,owner,at,JSON.stringify(event)]});
  }else{
    const plan=planMutation(s,raw,owner,access.name||userName(user));
    statements=plan.statements; event=plan.event;
  }
  const batch=[
    db.prepare("UPDATE workspaces SET revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE owner=?").bind(revision,owner),
    ...statements.map(x=>db.prepare(x.sql).bind(...x.params)),
    db.prepare("INSERT INTO operations (id,owner,at) VALUES (?,?,?)").bind(requestId,owner,at)
  ];
  await db.batch(batch);
  return await loadAuthorizedSnapshot(user);
}

export function responseError(e:unknown){
  if(e instanceof AccessError) return {status:e.status,error:e.message};
  const msg=readableError(e);
  if(/constraint|UNIQUE|NOT NULL/i.test(msg))return {status:409,error:"تعارض في البيانات أو سجل مكرر. حدّث الصفحة وراجع الرقم الوظيفي والمدني."};
  if(/D1_|DATABASE_UNAVAILABLE|SQLITE_|fetch failed/i.test(msg))return {status:503,error:"تعذّر الحفظ. احتفظ بالمدخلات وحاول مرة أخرى."};
  return {status:400,error:msg};
}
