import { z } from "zod";
import type { AccessContext, UserMember } from "./permissions";

export const statuses = ["على رأس العمل", "إجازة بدون راتب", "موقوف", "مستقيل", "انتهت خدمته"] as const;
export const normalizeDigits = (v: string) => v.replace(/[٠-٩]/g,c=>String(c.charCodeAt(0)-1632)).replace(/[۰-۹]/g,c=>String(c.charCodeAt(0)-1776));
const short = z.string().trim().max(160,"النص أطول من المسموح");
export const dateSchema = z.string().refine(v=>v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0,10)===v,"استخدم تاريخاً صحيحاً بصيغة YYYY-MM-DD");
const moneySchema = z.number().int().min(0).max(99999999999);
const daysSchema = z.number().min(0).max(9999).multipleOf(0.5,"أدخل أياماً صحيحة أو أنصاف أيام");
export const employeeSchema = z.object({
  id: z.string().uuid(),
  photoDataUrl: z.string().max(700000,"صورة الموظف كبيرة؛ استخدم صورة أصغر من 500 كيلوبايت بعد الضغط").refine(v=>!v || /^data:image\/(png|jpeg|webp);base64,/i.test(v),"صيغة صورة الموظف غير مدعومة"),
  code: short.min(1,"الرقم الوظيفي مطلوب").transform(v=>normalizeDigits(v).toUpperCase()),
  name: short.min(2,"اسم الموظف مطلوب"),
  nameEn: short, department: short, branch: short, unit: short, job: short, jobEn: short, nationality: short, religion: short,
  civilId: z.string().transform(normalizeDigits).refine(v=>!v || /^\d{12}$/.test(v),"الرقم المدني يجب أن يتكون من 12 رقماً"),
  passport: short, phone: short, address: z.string().trim().max(500), email: z.string().max(160).refine(v=>!v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),"البريد الإلكتروني غير صحيح"),
  birthDate: dateSchema, gender: short, maritalStatus: short, qualification: short, grade: short, contractType: short, bankName: short, bankAccount: short, managerName: short,
  housingCode: short, housingLink: z.string().trim().max(500),
  startDate: dateSchema, probationEnd: dateSchema, contractEnd: dateSchema, civilExpiry: dateSchema, residencyExpiry: dateSchema, passportExpiry: dateSchema,
  officialLastDate: short, payrollRemoval: short, statusDetail: short,
  status: z.enum(statuses), salaryFils: moneySchema, allowanceType: short, allowancesFils: moneySchema, annualOpening: daysSchema, holidayOpening: daysSchema,
  notes: z.string().max(2000), createdAt: z.string(), updatedAt: z.string(),
});
export type Employee = z.infer<typeof employeeSchema>;
export type Finance = { id:string; employeeId:string; kind:"loan"|"obligation"; reference?:string; title:string; amountFils:number; installmentFils:number; startDate:string; dueDate:string; notes:string; loanType?:string; installmentsCount?:number; firstInstallmentDate?:string; lender?:string; deductionMode?:"fixed"|"percent"|"cash"; deductionPercent?:number; priority?:number; paused?:boolean; createdAt:string };
export type Payment = { id:string; financeId:string; amountFils:number; date:string; notes:string; createdAt:string };
export type LeaveEntry = {id:string; employeeId:string; kind:"annual"|"holiday"; days:number; date:string; reason:string; createdAt:string};
export type EmploymentEvent={id:string;employeeId:string;date:string;type:string;oldValue:string;newValue:string;decisionNo:string;reason:string;notes:string;actor:string;createdAt:string};
export type PayrollMonth={id:string;month:string;title:string;deductionsFils:number;notes:string;actor:string;closedAt:string;createdAt:string};
export type Audit = {id:string; at:string; actor:string; action:string; summary:string; changes?:{name:string;before:unknown;after:unknown}[]};
export type JobKpi = {
  id: string;
  job: string;
  title: string;
  description: string;
  target: string;
  weight: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
};
export type KpiScoreItem = {
  kpiId?: string;
  title: string;
  target?: string;
  weight: number;
  score: number;
  actual?: string;
  notes?: string;
};
export type PerformanceEvaluation = {
  id: string;
  employeeId: string;
  evaluationYear?: number;
  isHistorical?: boolean;
  evaluator: string; // المشرف المباشر
  supervisorName?: string;
  supervisorDate?: string;
  supervisorNotes?: string;
  departmentHeadName?: string;
  departmentHeadDate?: string;
  departmentHeadNotes?: string;
  period: string;
  date: string;
  status: "مسودة" | "بانتظار_مراجعة_المدير" | "معتمد" | "يحتاج_تعديل" | "قيد المراجعة";
  kpiScores: KpiScoreItem[];
  rawScore?: number;
  penaltiesCount?: number;
  penaltyDeductionPercent?: number;
  penaltyDetails?: string;
  overallScore: number;
  rating: string;
  strengths?: string;
  improvements?: string;
  recommendations?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
export type WorkforcePlan={id:string;department:string;section:string;job:string;currentCount:number;targetCount:number;budgetFils:number};
export type Settings = {companyName:string; sector:string; alertDays:number; annualAllowance:number; policyNotes:string; inputTypes:string[]; allowanceTypes:string[]; workforcePlans:WorkforcePlan[]; housingSystemUrl:string; aiQuickPrompt:string; securityPolicy:string; workflowRules:string; companies:string[]; currencies:string[]};
export type Snapshot = {revision:number; employees:Employee[]; finances:Finance[]; payments:Payment[]; leaves:LeaveEntry[]; history:EmploymentEvent[]; payrollMonths:PayrollMonth[]; jobKpis:JobKpi[]; evaluations:PerformanceEvaluation[]; audit:Audit[]; settings:Settings; access?:AccessContext; members?:UserMember[]};
export const defaultSettings:Settings = {companyName:"مساحة العمل",sector:"غير محدد",alertDays:60,annualAllowance:0,policyNotes:"",inputTypes:["غرامة تأخير","عقوبة إدارية","تكلفة أضرار","خصم غياب","خصم تأخير","اشتراك طبي","اشتراك نقابي","نفقة"],allowanceTypes:["بدل سكن","بدل انتقال","بدل هاتف","بدل طبيعة عمل","بدل طعام"],workforcePlans:[],housingSystemUrl:"",aiQuickPrompt:"",securityPolicy:"إغلاق الجلسة عند انتهاء جلسة تسجيل الدخول في ChatGPT/Sites. لا يخزّن مسار كلمات مرور داخلية.",workflowRules:"مسارات الاعتماد والقواعد قابلة للتوثيق هنا: القروض، الإجازات، العقوبات، المكافآت، التوقيع، والتصعيد.",companies:["الشركة الرئيسية"],currencies:["KWD"]};
export const blankEmployee = ():Employee=>({id:crypto.randomUUID(),photoDataUrl:"",code:"",name:"",nameEn:"",department:"",branch:"",unit:"",job:"",jobEn:"",nationality:"",religion:"",civilId:"",passport:"",phone:"",address:"",email:"",birthDate:"",gender:"",maritalStatus:"",qualification:"",grade:"",contractType:"",bankName:"",bankAccount:"",managerName:"",housingCode:"",housingLink:"",startDate:"",probationEnd:"",contractEnd:"",civilExpiry:"",residencyExpiry:"",passportExpiry:"",officialLastDate:"",payrollRemoval:"",statusDetail:"",status:"على رأس العمل",salaryFils:0,allowanceType:"",allowancesFils:0,annualOpening:0,holidayOpening:0,notes:"",createdAt:"",updatedAt:""});
export const emptySnapshot:Snapshot={revision:0,employees:[],finances:[],payments:[],leaves:[],history:[],payrollMonths:[],jobKpis:[],evaluations:[],audit:[],settings:defaultSettings};
export function calculateOverallScore(scores: KpiScoreItem[], penaltyDeductionPercent: number = 0): { rawScore: number; overallScore: number; rating: string } {
  if (!scores.length) return { rawScore: 0, overallScore: 0, rating: "غير محدد" };
  const totalWeight = scores.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);
  const weightedSum = scores.reduce((sum, s) => sum + ((Number(s.score) || 0) * (Number(s.weight) || 0)), 0);
  const raw = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : 0;
  const deduction = Math.max(0, Number(penaltyDeductionPercent) || 0);
  const finalScore = Math.max(0, Math.round((raw - deduction) * 10) / 10);
  let rating = "يحتاج إلى تحسين";
  if (finalScore >= 90) rating = "ممتاز (Excellent)";
  else if (finalScore >= 80) rating = "جيد جداً (Very Good)";
  else if (finalScore >= 70) rating = "جيد (Good)";
  else if (finalScore >= 60) rating = "مقبول (Fair)";
  return { rawScore: raw, overallScore: finalScore, rating };
}
export function balance(e:Employee, leaves:LeaveEntry[],kind:"annual"|"holiday"){return (kind==="annual"?e.annualOpening:e.holidayOpening)+leaves.filter(l=>l.employeeId===e.id&&l.kind===kind).reduce((n,l)=>n+l.days,0);}
export function remaining(f:Finance,payments:Payment[]){return f.amountFils-payments.filter(p=>p.financeId===f.id).reduce((n,p)=>n+p.amountFils,0);}
export const kwd=(fils:number)=>new Intl.NumberFormat("en-KW",{minimumFractionDigits:3,maximumFractionDigits:3}).format(fils/1000);
export const number=(v:number)=>new Intl.NumberFormat("en",{maximumFractionDigits:1}).format(v);
export const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kuwait",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
export function addWorkDays(value:string,count=100){if(!value)return "";const d=new Date(value+"T12:00:00Z");if(isNaN(d.getTime()))return "";let added=0;while(added<count){d.setUTCDate(d.getUTCDate()+1);const day=d.getUTCDay();if(day!==5&&day!==6)added++;}return d.toISOString().slice(0,10);}
export const displayDate=(value:string)=>value?new Intl.DateTimeFormat("ar-KW",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kuwait"}).format(new Date(value)):"—";
export const daysUntil=(v:string)=>v?Math.round((Date.parse(v)-Date.parse(today()))/86400000):Infinity;
export const normalizeSearch=(v:string)=>normalizeDigits(v).toLowerCase().replace(/[أإآ]/g,"ا").replace(/[ة]/g,"ه").replace(/[ى]/g,"ي").replace(/[^\p{L}\p{N}]+/gu," ").trim();
export function employeeSearchText(e:Employee){return normalizeSearch(Object.values(e).filter(v=>typeof v==="string"||typeof v==="number").join(" "));}
export function employeeMatchesSearch(e:Employee,query:string){const q=normalizeSearch(query);if(!q)return true;const text=employeeSearchText(e);return q.split(/\s+/).every(part=>text.includes(part));}
export function alerts(s:Snapshot){
  const documentAlerts=s.employees.filter(e=>e.status!=="انتهت خدمته").flatMap(e=>[["البطاقة / الإقامة",e.civilExpiry],["جواز السفر",e.passportExpiry],["انتهاء العقد",e.contractEnd],["انتهاء فترة التجربة",e.probationEnd]].filter(([,date])=>date&&daysUntil(date)<=s.settings.alertDays).map(([label,date])=>({employee:e,label,date,days:daysUntil(date)})));
  const leaveAlerts=s.employees.filter(e=>e.status!=="انتهت خدمته"&&balance(e,s.leaves,"annual")<=3).map(e=>({employee:e,label:"انخفاض رصيد الإجازة السنوية",date:today(),days:0}));
  const financeAlerts=s.finances.filter(f=>remaining(f,s.payments)>0&&f.dueDate&&daysUntil(f.dueDate)<0).map(f=>({employee:s.employees.find(e=>e.id===f.employeeId)!,label:"قسط أو التزام متأخر: "+f.title,date:f.dueDate,days:daysUntil(f.dueDate)})).filter(x=>x.employee);
  return [...documentAlerts,...leaveAlerts,...financeAlerts].sort((a,b)=>a.days-b.days);
}
export const employeeFields: {key:keyof Employee;label:string;type?:string}[]=[
{key:"code",label:"كود الموظف"},{key:"name",label:"الاسم بالكامل بالعربية"},{key:"nameEn",label:"الاسم بالكامل بالإنجليزية"},{key:"civilId",label:"الرقم المدني / الهوية"},{key:"birthDate",label:"تاريخ الميلاد",type:"date"},{key:"gender",label:"النوع"},{key:"religion",label:"الديانة"},{key:"phone",label:"رقم الهاتف"},{key:"address",label:"العنوان"},{key:"maritalStatus",label:"الحالة الاجتماعية"},{key:"qualification",label:"المؤهل"},{key:"nationality",label:"الجنسية"},{key:"startDate",label:"تاريخ التعيين",type:"date"},{key:"probationEnd",label:"نهاية فترة التجربة (تلقائي)",type:"date"},{key:"contractEnd",label:"انتهاء العقد",type:"date"},{key:"department",label:"الإدارة"},{key:"branch",label:"القسم"},{key:"unit",label:"الوحدة"},{key:"job",label:"الوظيفة بالعربية"},{key:"jobEn",label:"الوظيفة بالإنجليزية"},{key:"grade",label:"الدرجة الوظيفية"},{key:"contractType",label:"نوع التعاقد"},{key:"salaryFils",label:"الراتب الأساسي بالدينار",type:"money"},{key:"allowanceType",label:"نوع البدل"},{key:"allowancesFils",label:"البدلات بالدينار",type:"money"},{key:"bankName",label:"البنك"},{key:"bankAccount",label:"رقم الحساب"},{key:"managerName",label:"المدير المباشر"},{key:"housingCode",label:"كود السكن"},{key:"housingLink",label:"رابط ملف السكن"},{key:"passport",label:"رقم جواز السفر"},{key:"email",label:"البريد الإلكتروني",type:"email"},{key:"civilExpiry",label:"انتهاء البطاقة والإقامة",type:"date"},{key:"passportExpiry",label:"انتهاء جواز السفر",type:"date"},{key:"officialLastDate",label:"آخر يوم عمل رسمي"},{key:"payrollRemoval",label:"تاريخ الاستبعاد من الرواتب"},{key:"status",label:"حالة الموظف"},{key:"statusDetail",label:"تفاصيل الحالة"},{key:"annualOpening",label:"الرصيد المرحل السنوي",type:"days"},{key:"holidayOpening",label:"الرصيد المرحل للأيام البديلة",type:"days"},{key:"notes",label:"ملاحظات ومرفقات"}];
export function validateEmployee(raw:unknown,all:Employee[],leaves:LeaveEntry[]=[]):Employee{
  const e=employeeSchema.parse(raw);
  e.probationEnd=addWorkDays(e.startDate,100);
  e.residencyExpiry=e.civilExpiry;
  if(all.some(x=>x.id!==e.id&&x.code===e.code)) throw Error("الرقم الوظيفي مكرر: "+e.code);
  if(e.civilId&&all.some(x=>x.id!==e.id&&x.civilId===e.civilId))throw Error("الرقم المدني مكرر للموظف: "+e.name);
  if(balance(e,leaves,"annual")<0||balance(e,leaves,"holiday")<0)throw Error("التغيير سيجعل رصيد الإجازات سالباً للموظف: "+e.name);
  return e;
}
export function readableError(e:unknown){if(e instanceof z.ZodError)return e.issues.map(x=>x.message).join(" · ");return e instanceof Error?e.message:"تعذرت العملية. حاول مرة أخرى.";}
