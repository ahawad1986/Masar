"use client";
import { useMemo, useState } from "react";
import { ShieldCheck, UserPlus, Save, Ban, CheckCircle2 } from "lucide-react";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { permissionCatalog, roleLabels, permissionsFor, Role, UserMember, Permission } from "@/lib/permissions";
import { Snapshot, readableError } from "@/lib/hr";
import { Choice, Field, NoData, SaveButton } from "./ui-parts";

type Commit=(b:Record<string,unknown>)=>Promise<boolean>;
const editableRoles:Role[]=["admin","hr","accountant","viewer","custom"];
const groups=[...new Set(permissionCatalog.map(p=>p.group))];

export default function UsersPanel({s,busy,commit}:{s:Snapshot;busy:boolean;commit:Commit}){
  const [editing,setEditing]=useState<UserMember|null>(null);
  const members=s.members||[];
  return <div className="users-layout">
    <section className="panel">
      <div className="panel-heading"><div><h2>المستخدمون والصلاحيات</h2><p>أضف البريد وحدد الدور أو الصلاحيات التفصيلية.</p></div><Button className="primary-button" onClick={()=>setEditing(blankMember())}><UserPlus size={17}/>إضافة مستخدم</Button></div>
      <div className="notice permissions-note"><strong>طريقة التفعيل</strong><p>بعد حفظ المستخدم هنا، شارك رابط التطبيق من زر «مشاركة» في الموقع مع نفس البريد حتى يستطيع فتحه. جميع المستخدمين النشطين يستطيعون عرض بيانات الموظفين الأساسية والرواتب والسجلات المالية والإجازات، أما الأزرار التالية فتتبع الصلاحيات المحددة.</p></div>
      {members.length?<Table><TableHeader><TableRow><TableHead>المستخدم</TableHead><TableHead>الدور</TableHead><TableHead>الحالة</TableHead><TableHead>الصلاحيات</TableHead><TableHead>إجراء</TableHead></TableRow></TableHeader><TableBody>{members.map(m=><TableRow key={m.id}><TableCell><strong>{m.name}</strong><small className="block" dir="ltr">{m.email}</small></TableCell><TableCell>{roleLabels[m.role]}</TableCell><TableCell>{m.active?<span className="status active">نشط</span>:<span className="status overdue">موقوف</span>}</TableCell><TableCell>{m.role==="owner"?"كل الصلاحيات":m.role==="viewer"?"عرض فقط":m.permissions.map(p=>permissionCatalog.find(x=>x.id===p)?.label).filter(Boolean).slice(0,4).join("، ")}{m.permissions.length>4&&"…"}</TableCell><TableCell>{m.role==="owner"?<span className="muted">محمي</span>:<Button variant="outline" size="sm" onClick={()=>setEditing(m)}>تعديل</Button>}</TableCell></TableRow>)}</TableBody></Table>:<NoData title="لا يوجد مستخدمون بعد" description="ابدأ بإضافة مستخدم وتحديد دوره." icon={<ShieldCheck/>}/>}
    </section>
    <RoleGuide/>
    <MemberDialog member={editing} close={()=>setEditing(null)} busy={busy} commit={commit}/>
  </div>;
}

function blankMember():UserMember{return {id:"",email:"",userId:null,name:"",role:"viewer",permissions:[],active:true,createdAt:"",updatedAt:""};}

function MemberDialog({member,close,busy,commit}:{member:UserMember|null;close:()=>void;busy:boolean;commit:Commit}){
  const [prevMember,setPrevMember]=useState<UserMember|null>(member);
  const [v,setV]=useState<UserMember>(()=>member||blankMember()),[error,setError]=useState("");
  if(member!==prevMember){setPrevMember(member);setV(member||blankMember());}
  if(!member)return null;
  const perms=v.role==="custom"?v.permissions:permissionsFor(v.role);
  const toggle=(p:Permission,checked:boolean)=>setV({...v,role:"custom",permissions:checked?[...new Set([...v.permissions,p])]:v.permissions.filter(x=>x!==p)});
  return <Dialog open onOpenChange={open=>{if(!open&&!busy)close();}}><DialogContent className="app-dialog large-dialog" dir="rtl"><DialogHeader><DialogTitle>{v.id?"تعديل صلاحيات مستخدم":"إضافة مستخدم"}</DialogTitle><DialogDescription>احفظ البريد والدور، ثم شارك رابط التطبيق مع نفس البريد من إعدادات المشاركة.</DialogDescription></DialogHeader>
    <form onSubmit={async e=>{e.preventDefault();setError("");try{const ok=await commit({action:"member.save",id:v.id||undefined,email:v.email,name:v.name,role:v.role,permissions:v.role==="custom"?v.permissions:permissionsFor(v.role),active:v.active});if(ok)close();}catch(err){setError(readableError(err));}}}>
      <div className="form-grid"><Field label="البريد الإلكتروني *"><input dir="ltr" required type="email" value={v.email} disabled={!!v.id} onChange={e=>setV({...v,email:e.target.value})}/></Field><Field label="الاسم"><input value={v.name} maxLength={120} onChange={e=>setV({...v,name:e.target.value})}/></Field><Field label="الدور"><Choice label="الدور" value={v.role} onChange={role=>setV({...v,role:role as Role,permissions:permissionsFor(role as Role,v.permissions)})} options={editableRoles.map(r=>({value:r,label:roleLabels[r]}))}/></Field><label className="check-line"><Checkbox checked={v.active} onCheckedChange={c=>setV({...v,active:c===true})}/>{v.active?<><CheckCircle2 size={16}/>مستخدم نشط</>:<><Ban size={16}/>مستخدم موقوف</>}</label></div>
      <div className="permission-grid">{groups.map(g=><div className="permission-group" key={g}><h3>{g}</h3>{permissionCatalog.filter(p=>p.group===g).map(p=><label className="check-line" key={p.id}><Checkbox checked={perms.includes(p.id)} disabled={v.role!=="custom"} onCheckedChange={c=>toggle(p.id,c===true)}/>{p.label}</label>)}</div>)}</div>
      {error&&<p className="error-box">{error}</p>}<div className="form-footer"><Button variant="ghost" type="button" onClick={close}>إلغاء</Button><SaveButton busy={busy}><Save size={16}/>حفظ الصلاحيات</SaveButton></div>
    </form>
  </DialogContent></Dialog>;
}

function RoleGuide(){
  return <aside className="panel role-guide"><h2>الأدوار الجاهزة</h2><dl><div><dt>مدير النظام</dt><dd>كل العمليات وإدارة المستخدمين.</dd></div><div><dt>الموارد البشرية</dt><dd>الموظفون، الإجازات، الاستيراد، التقارير وسجل العمليات.</dd></div><div><dt>مسؤول مالي</dt><dd>القروض والالتزامات والدفعات والتقارير.</dd></div><div><dt>عرض فقط</dt><dd>يرى البيانات دون تعديل أو تصدير.</dd></div><div><dt>صلاحيات مخصّصة</dt><dd>اختر الأزرار والعمليات المتاحة يدويًا.</dd></div></dl></aside>;
}
