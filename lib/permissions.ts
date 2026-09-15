import { z } from "zod";
import type { Snapshot } from "./hr";

export const permissionCatalog = [
  {id:"employees.create",label:"إضافة موظفين",group:"الموظفون"},
  {id:"employees.update",label:"تعديل بيانات الموظفين",group:"الموظفون"},
  {id:"employees.bulk",label:"التحديث الجماعي",group:"الموظفون"},
  {id:"finance.create",label:"إضافة قروض والتزامات",group:"الشؤون المالية"},
  {id:"finance.pay",label:"تسجيل دفعات السداد",group:"الشؤون المالية"},
  {id:"finance.delete",label:"إلغاء سجل مالي بلا دفعات",group:"الشؤون المالية"},
  {id:"leaves.adjust",label:"تعديل أرصدة الإجازات",group:"الإجازات"},
  {id:"imports.run",label:"استيراد Excel ضمن الصلاحيات",group:"أدوات العمل"},
  {id:"exports.run",label:"تصدير التقارير والبيانات",group:"أدوات العمل"},
  {id:"audit.view",label:"عرض سجل العمليات",group:"الإدارة"},
  {id:"settings.manage",label:"تعديل إعدادات المنشأة",group:"الإدارة"},
  {id:"users.manage",label:"إدارة المستخدمين والصلاحيات",group:"الإدارة"},
  {id:"evaluations.conduct",label:"إجراء تقييم الأداء (المشرف المباشر)",group:"تقييم الأداء"},
  {id:"evaluations.approve",label:"مراجعة وتأكيد تقييم الأداء (مدير الإدارة)",group:"تقييم الأداء"},
  {id:"evaluations.manage",label:"إدارة مؤشرات المهن والتقييمات الشاملة (الموارد البشرية)",group:"تقييم الأداء"},
] as const;
export type Permission=typeof permissionCatalog[number]["id"];
export type Role="owner"|"admin"|"hr"|"accountant"|"viewer"|"custom";
export const roleLabels:Record<Role,string>={owner:"مالك التطبيق",admin:"مدير النظام",hr:"مسؤول الموارد البشرية",accountant:"مسؤول مالي",viewer:"عرض فقط",custom:"صلاحيات مخصّصة"};
export const allPermissions=permissionCatalog.map(p=>p.id);
export const rolePermissions:Record<Exclude<Role,"owner"|"custom">,Permission[]>={
  admin:[...allPermissions],
  hr:["employees.create","employees.update","employees.bulk","leaves.adjust","imports.run","exports.run","audit.view","evaluations.conduct","evaluations.approve","evaluations.manage"],
  accountant:["finance.create","finance.pay","imports.run","exports.run","audit.view"],
  viewer:[],
};
export type UserMember={id:string;email:string;userId:string|null;name:string;role:Role;permissions:Permission[];active:boolean;createdAt:string;updatedAt:string};
export type AccessContext={owner:string;memberId:string;userId:string;email:string;name:string;role:Role;permissions:Permission[];isOwner:boolean};
export const noAccess:AccessContext={owner:"",memberId:"",userId:"",email:"",name:"",role:"viewer",permissions:[],isOwner:false};
export const normalizeEmail=(v:string)=>v.trim().toLowerCase();
export class AccessError extends Error{status:number;constructor(message="ليست لديك صلاحية تنفيذ هذه العملية.",status=403){super(message);this.status=status;}}
export const hasPermission=(access:AccessContext|undefined,p:Permission)=>Boolean(access?.isOwner||access?.permissions.includes(p));
export function viewAllowed(view:string,access:AccessContext|undefined){const permission:Record<string,Permission>={users:"users.manage",settings:"settings.manage",import:"imports.run",activity:"audit.view",reports:"exports.run"};return !permission[view]||hasPermission(access,permission[view]);}
export function permissionsFor(role:Role,requested:Permission[]=[]):Permission[]{
  if(role==="owner")return [...allPermissions];if(role!=="custom")return[...rolePermissions[role]];
  const result=[...new Set(requested)];if(result.includes("employees.bulk")&&!result.includes("employees.update"))result.push("employees.update");return result;
}
export function authorizeAction(access:AccessContext,raw:Record<string,unknown>,s:Snapshot){
  const needed:Permission[]=[];const action=String(raw.action);
  if(action==="employee.save"){
    const e=raw.employee as Record<string,unknown>|undefined;
    const before=s.employees.find(x=>x.id===e?.id);needed.push(before?"employees.update":"employees.create");
    if(e&&((e.annualOpening??0)!==(before?.annualOpening??0)||(e.holidayOpening??0)!==(before?.holidayOpening??0)))needed.push("leaves.adjust");
  }else if(action==="employees.bulk"){
    needed.push("employees.update","employees.bulk");const patch=raw.patch as Record<string,unknown>|undefined;
    if(patch&&("annualOpening" in patch||"holidayOpening" in patch))needed.push("leaves.adjust");
  }else if(action==="employees.replace"){
    if(!access.isOwner)throw new AccessError("استبدال جميع بيانات الموظفين متاح لمالك التطبيق فقط.");
    needed.push("imports.run","employees.create","employees.update","employees.bulk");
  }else if(action==="employees.import"){
    needed.push("imports.run",raw.mode==="update"?"employees.update":"employees.create");if(raw.mode==="update")needed.push("employees.bulk");
    if(Array.isArray(raw.rows)&&raw.rows.some(row=>row&&typeof row==="object"&&("annualOpening" in row||"holidayOpening" in row)))needed.push("leaves.adjust");
  }else if(action==="finance.add")needed.push("finance.create");
  else if(action==="finances.import"){
    needed.push("imports.run","finance.create");if(Array.isArray(raw.rows)&&raw.rows.some(row=>row&&typeof row==="object"&&Number(row.paidFils)>0))needed.push("finance.pay");
  }else if(action==="payment.add")needed.push("finance.pay");
  else if(action==="finance.delete")needed.push("finance.delete");
  else if(action==="leave.add")needed.push("leaves.adjust");
  else if(action==="history.add")needed.push("employees.update");
  else if(action==="payroll.close")needed.push("finance.create");
  else if(action==="settings.save")needed.push("settings.manage");
  else if(action==="member.save")needed.push("users.manage");
  else if(action==="evaluation.save"){
    const ev=raw.evaluation as Record<string,unknown>|undefined;
    const isApproving=ev?.status==="معتمد";
    if(isApproving){
      if(!hasPermission(access,"evaluations.approve")&&!hasPermission(access,"evaluations.manage")){
        throw new AccessError("مراجعة وتأكيد تقييم الأداء يتطلب صلاحية مدير الإدارة أو الإدارة العليا.");
      }
    }else{
      if(!hasPermission(access,"evaluations.conduct")&&!hasPermission(access,"evaluations.approve")&&!hasPermission(access,"evaluations.manage")){
        throw new AccessError("إجراء تقييم الأداء يتطلب صلاحية المشرف المباشر أو مدير الإدارة.");
      }
    }
  }else if(action==="evaluation.approve"){
    if(!hasPermission(access,"evaluations.approve")&&!hasPermission(access,"evaluations.manage")){
      throw new AccessError("مراجعة وتأكيد التقييم يتطلب صلاحية مدير الإدارة.");
    }
  }else if(action==="jobKpi.save"||action==="jobKpi.delete"||action==="evaluation.delete")needed.push("evaluations.manage");
  else throw new AccessError("عملية غير مسموح بها.");
  if(needed.some(p=>!hasPermission(access,p)))throw new AccessError();
}
export type Organization={owner:string;owner_email:string;owner_name:string;created_at:string};
export function resolveMembership(organization:Organization,user:{userId:string;email:string;displayName:string},members:UserMember[]):AccessContext{
  if(user.userId===organization.owner)return{owner:organization.owner,memberId:"owner",userId:user.userId,email:user.email,name:user.displayName,role:"owner",permissions:[...allPermissions],isOwner:true};
  const match=members.find(m=>m.userId===user.userId)||members.find(m=>m.email===normalizeEmail(user.email)&&m.userId===null);
  if(!match||!match.active)throw new AccessError("لا تملك صلاحية الدخول إلى بيانات هذه المنشأة، أو تم إيقاف حسابك. تواصل مع مدير النظام.");
  return{owner:organization.owner,memberId:match.id,userId:user.userId,email:match.email,name:user.displayName,role:match.role,permissions:permissionsFor(match.role,match.permissions),isOwner:false};
}
const memberInput=z.object({id:z.string().uuid().optional(),email:z.string().trim().email("أدخل بريداً إلكترونياً صحيحاً").max(200),name:z.string().trim().max(120),role:z.enum(["admin","hr","accountant","viewer","custom"]),permissions:z.array(z.enum(permissionCatalog.map(p=>p.id) as [Permission,...Permission[]])).max(30),active:z.boolean()}).strict();
export function planMemberSave(raw:unknown,access:AccessContext,organization:Organization,members:UserMember[]){
  if(!hasPermission(access,"users.manage"))throw new AccessError();
  const payload=raw&&typeof raw==="object"?(({action,...rest})=>rest)(raw as Record<string,unknown>):raw;const value=memberInput.parse(payload);const email=normalizeEmail(value.email);const before=value.id?members.find(m=>m.id===value.id):undefined;
  if(value.id&&!before)throw new AccessError("المستخدم غير موجود.",404);
  if(email===normalizeEmail(organization.owner_email)||before?.userId===organization.owner)throw new AccessError("حساب المالك محمي ولا يمكن تغيير صلاحياته.");
  if(before&&(before.id===access.memberId||before.userId===access.userId))throw new AccessError("لا يمكنك تعديل صلاحيات حسابك الحالي. اطلب من المالك إجراء التعديل.");
  if(before&&email!==before.email)throw new AccessError("لتغيير البريد، أوقف المستخدم الحالي وأضف البريد الجديد.");
  if(members.some(m=>m.email===email&&m.id!==before?.id))throw new AccessError("هذا البريد مسجّل بالفعل. عدّل المستخدم الموجود.",409);
  const at=new Date().toISOString();const after:UserMember={id:before?.id||crypto.randomUUID(),email,name:value.name||email,role:value.role,permissions:permissionsFor(value.role,value.permissions),active:value.active,userId:before?.userId||null,createdAt:before?.createdAt||at,updatedAt:at};
  return {before,after};
}
