import { z } from "zod";
import { Employee, Finance, Payment, LeaveEntry, EmploymentEvent, PayrollMonth, JobKpi, PerformanceEvaluation, Snapshot, Audit, balance, remaining, employeeSchema, dateSchema, validateEmployee, blankEmployee } from "./hr";

export type Statement={sql:string;params:(string|number|null)[]};
const uuid=z.string().uuid();
const money=z.number().int().positive().max(99999999999);
const date=dateSchema.refine(v=>!!v,"التاريخ مطلوب");
export function planMutation(s:Snapshot,raw:Record<string,unknown>,owner:string,actor:string):{statements:Statement[];event:Audit}{
  const statements:Statement[]=[];
  const at=new Date().toISOString();
  const event:Audit={id:crypto.randomUUID(),at,actor,action:String(raw.action),summary:""};
  function stmt(sql:string,...params:(string|number|null)[]){statements.push({sql,params});}
  function employee(id:string){const e=s.employees.find(e=>e.id===id);if(!e)throw Error("الموظف غير موجود");return e;}
  function writeEmployee(e:Employee){
    stmt("INSERT INTO employees (id,owner,code,civil_id,data) VALUES (?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET code=excluded.code,civil_id=excluded.civil_id,data=excluded.data WHERE employees.owner=excluded.owner",e.id,owner,e.code,e.civilId||null,JSON.stringify(e));
  }
  function history(e:Employee,before:Employee|null,type:string,summary:string){
    const changed=before?["department","branch","job","salaryFils","allowanceType","allowancesFils","grade","contractType","managerName","status"].filter(k=>JSON.stringify((before as any)[k])!==JSON.stringify((e as any)[k])):[];
    if(before&&!changed.length)return;
    const record:EmploymentEvent={id:crypto.randomUUID(),employeeId:e.id,date:at.slice(0,10),type,oldValue:before?changed.map(k=>k+": "+String((before as any)[k]||"—")).join(" | "):"",newValue:before?changed.map(k=>k+": "+String((e as any)[k]||"—")).join(" | "):summary,decisionNo:"",reason:summary,notes:"",actor,createdAt:at};
    stmt("INSERT INTO employment_history (id,owner,employee_id,data) VALUES (?,?,?,?)",record.id,owner,e.id,JSON.stringify(record));
  }
  if(raw.action==="employee.save"){
    const e=validateEmployee(raw.employee,s.employees,s.leaves);
    const before=s.employees.find(x=>x.id===e.id);
    if(!before)e.id=crypto.randomUUID();
    e.createdAt=before?.createdAt||at;e.updatedAt=at;
    writeEmployee(e);history(e,before||null,before?"تعديل بيانات وظيفية":"تعيين / إضافة موظف",before?"تغيير من ملف الموظف":"إنشاء ملف الموظف");
    event.summary=(before?"تعديل ملف ":"إضافة موظف: ")+e.name;
    event.changes=[{name:e.name,before:before||null,after:e}];
  } else if(raw.action==="employees.replace"){
    const rows=z.array(employeeSchema).min(1).max(1000).parse(raw.rows);
    const seenCodes=new Set<string>(),seenCivilIds=new Set<string>();
    const employees:Employee[]=[];
    for(const rawEmployee of rows){
      const e=validateEmployee({...blankEmployee(),...rawEmployee,id:crypto.randomUUID(),createdAt:at,updatedAt:at},employees,[]);
      if(seenCodes.has(e.code))throw Error("الرقم الوظيفي مكرر داخل الملف: "+e.code);
      if(e.civilId&&seenCivilIds.has(e.civilId))throw Error("الرقم المدني مكرر داخل الملف: "+e.civilId);
      seenCodes.add(e.code);if(e.civilId)seenCivilIds.add(e.civilId);employees.push(e);
    }
    stmt("DELETE FROM payments WHERE owner=?",owner);
    stmt("DELETE FROM finances WHERE owner=?",owner);
    stmt("DELETE FROM leave_entries WHERE owner=?",owner);
    stmt("DELETE FROM employment_history WHERE owner=?",owner);
    stmt("DELETE FROM payroll_months WHERE owner=?",owner);
    stmt("DELETE FROM employees WHERE owner=?",owner);
    for(const e of employees)writeEmployee(e);
    event.summary="استبدال بيانات العمل واستيراد "+employees.length+" موظف";
    event.changes=[{name:"بيانات الموظفين",before:{employees:s.employees.length,finances:s.finances.length,payments:s.payments.length,leaves:s.leaves.length,history:s.history.length,payrollMonths:s.payrollMonths.length},after:{employees:employees.length,finances:0,payments:0,leaves:0,history:0,payrollMonths:0}}];
  } else if(raw.action==="employees.import"){
    const rows=z.array(employeeSchema.partial().extend({code:employeeSchema.shape.code})).min(1).max(1000).parse(raw.rows);
    const mode=z.enum(["add","update"]).parse(raw.mode);
    const seen=new Set<string>();
    const result=[...s.employees];
    event.changes=[];
    for(const row of rows){
      if(seen.has(row.code))throw Error("رقم وظيفي مكرر داخل الملف: "+row.code);
      seen.add(row.code);
      const before=s.employees.find(x=>x.code===row.code);
      if(mode==="add"&&before)throw Error("الموظف موجود بالفعل: "+row.code+". اختر تحديث الموجودين.");
      if(mode==="update"&&!before)throw Error("الرقم الوظيفي غير موجود: "+row.code);
      const {probationEnd:_probationEnd,contractEnd:_contractEnd,civilExpiry:_civilExpiry,residencyExpiry:_residencyExpiry,passportExpiry:_passportExpiry,...imported}=row;
      const e=validateEmployee({...blankEmployee(),...before,...imported,id:before?.id||crypto.randomUUID(),createdAt:before?.createdAt||at,updatedAt:at},result,s.leaves);
      const i=result.findIndex(x=>x.id===e.id);if(i<0)result.push(e);else result[i]=e;
      writeEmployee(e);history(e,before||null,mode==="add"?"تعيين / إضافة موظف":"تحديث من Excel",mode==="add"?"استيراد موظف جديد":"تحديث بيانات موظف");event.changes.push({name:e.name,before:before||null,after:e});
    }
    event.summary=(mode==="add"?"استيراد ":"تحديث من Excel: ")+rows.length+" موظف";
  } else if(raw.action==="employees.bulk"){
    const ids=z.array(uuid).min(1).max(500).parse(raw.ids);
    if(new Set(ids).size!==ids.length)throw Error("تكرار في الموظفين المحددين");
    const patch=employeeSchema.pick({department:true,branch:true,status:true,salaryFils:true,allowanceType:true,allowancesFils:true,annualOpening:true,holidayOpening:true}).partial().strict().parse(raw.patch);
    if(!Object.keys(patch).length)throw Error("حدد حقلاً واحداً على الأقل");
    event.changes=[];
    for(const id of ids){const before=employee(id);const e=validateEmployee({...before,...patch,updatedAt:at},s.employees,s.leaves);writeEmployee(e);history(e,before,"تحديث جماعي","تحديث جماعي للبيانات الوظيفية");event.changes.push({name:e.name,before,after:e});}
    event.summary="تحديث جماعي لـ "+ids.length+" موظف";
  } else if(raw.action==="finances.import"){
    const kind=z.enum(["loan","obligation"]).parse(raw.kind);
    const rows=z.array(z.object({code:z.string().min(1),reference:z.string().trim().min(1).max(100),title:z.string(),amountFils:money,paidFils:z.number().int().min(0),installmentFils:z.number().int().min(0),startDate:date,dueDate:dateSchema,notes:z.string().max(2000)})).min(1).max(500).parse(raw.rows);
    const temp={...s,finances:[...s.finances],payments:[...s.payments]};event.changes=[];
    for(const row of rows){
      const e=s.employees.find(e=>e.code===row.code.toUpperCase());if(!e)throw Error("موظف غير موجود: "+row.code);
      if(row.paidFils>row.amountFils)throw Error("المبلغ المسدد يتجاوز الأصل: "+row.reference);
      const plan=planMutation(temp,{action:"finance.add",finance:{...row,kind,employeeId:e.id}},owner,actor);
      statements.push(...plan.statements.slice(0,-1));event.changes.push(...plan.event.changes||[]);
      const f=JSON.parse(plan.statements[0].params[3] as string) as Finance;temp.finances.push(f);
      if(row.paidFils>0){const paymentPlan=planMutation(temp,{action:"payment.add",payment:{financeId:f.id,amountFils:row.paidFils,date:row.startDate,notes:"مبلغ مسدّد افتتاحي من استيراد Excel"}},owner,actor);statements.push(...paymentPlan.statements.slice(0,-1));event.changes.push(...paymentPlan.event.changes||[]);temp.payments.push(JSON.parse(paymentPlan.statements[0].params[3] as string));}
    }
    event.summary="استيراد "+rows.length+" "+(kind==="loan"?"قرض":"خصم")+" من Excel";
  } else if(raw.action==="finance.add"){
    const data=z.object({employeeId:uuid,employeeIds:z.array(uuid).max(500).optional(),kind:z.enum(["loan","obligation"]),title:z.string().trim().min(2).max(160),amountFils:money,installmentFils:z.number().int().min(0).max(99999999999),startDate:date,dueDate:dateSchema,notes:z.string().max(2000), loanType:z.string().max(120).optional(), installmentsCount:z.number().int().min(0).max(600).optional(), firstInstallmentDate:dateSchema.optional(), lender:z.string().max(160).optional(), deductionMode:z.enum(["fixed","percent","cash"]).optional(), deductionPercent:z.number().min(0).max(100).optional(), priority:z.number().int().min(0).max(999).optional(), paused:z.boolean().optional()}).parse(raw.finance);
    const employeeIds=[...new Set(data.employeeIds?.length?data.employeeIds:[data.employeeId])];
    if(data.kind==="loan")data.installmentsCount=data.installmentFils>0?Math.ceil(data.amountFils/data.installmentFils):0;
    else{data.installmentFils=data.amountFils;data.installmentsCount=0;data.loanType=data.title;data.deductionMode=undefined;data.deductionPercent=0;data.priority=0;data.paused=false;}
    if(employeeIds.length>1){event.changes=[];for(const employeeId of employeeIds){const e=employee(employeeId);if(e.status==="انتهت خدمته")throw Error("يوجد موظف منتهي الخدمة ضمن الاختيار");const f:Finance={...data,employeeId,employeeIds:undefined,reference:"FIN-"+crypto.randomUUID().slice(0,8).toUpperCase(),id:crypto.randomUUID(),createdAt:at} as Finance;stmt("INSERT INTO finances (id,owner,employee_id,data) VALUES (?,?,?,?)",f.id,owner,f.employeeId,JSON.stringify(f));event.changes.push({name:e.name,before:null,after:f});}event.summary=(data.kind==="loan"?"إضافة قرض جماعي لـ ":"إضافة خصم جماعي لـ ")+employeeIds.length+" موظف";stmt("INSERT INTO audit (id,owner,at,data) VALUES (?,?,?,?)",event.id,owner,at,JSON.stringify(event));return{statements,event};}
    const e=employee(data.employeeId);
    if(e.status==="انتهت خدمته")throw Error("الموظف منتهي الخدمة. عدّل حالته أولاً إذا لزم الأمر.");
    if(data.installmentFils>data.amountFils)throw Error("القسط أكبر من أصل المبلغ");
    if(data.kind==="loan"&&data.installmentFils<=0)throw Error("أدخل قيمة القسط");
    if(data.dueDate&&data.dueDate<data.startDate)throw Error("تاريخ الاستحقاق يسبق تاريخ البداية");
    const reference=z.string().trim().max(100).parse((raw.finance as Record<string,unknown>).reference||"")||"FIN-"+crypto.randomUUID().slice(0,8).toUpperCase();
    if(s.finances.some(f=>f.reference===reference))throw Error("الرقم المرجعي للسجل المالي مكرر: "+reference);
    const f:Finance={...data,reference,id:crypto.randomUUID(),createdAt:at};
    stmt("INSERT INTO finances (id,owner,employee_id,data) VALUES (?,?,?,?)",f.id,owner,f.employeeId,JSON.stringify(f));
    event.summary=(f.kind==="loan"?"إضافة قرض: ":"إضافة خصم: ")+e.name;
    event.changes=[{name:e.name,before:null,after:f}];
  } else if(raw.action==="payment.add"){
    const data=z.object({financeId:uuid,amountFils:money,date,notes:z.string().max(2000)}).parse(raw.payment);
    const f=s.finances.find(x=>x.id===data.financeId);if(!f)throw Error("السجل المالي غير موجود");
    if(data.amountFils>remaining(f,s.payments))throw Error("الدفعة تتجاوز المبلغ المتبقي");
    const p:Payment={...data,id:crypto.randomUUID(),createdAt:at};
    stmt("INSERT INTO payments (id,owner,finance_id,data) VALUES (?,?,?,?)",p.id,owner,p.financeId,JSON.stringify(p));
    event.summary="تسجيل دفعة: "+employee(f.employeeId).name;
    event.changes=[{name:f.title,before:null,after:p}];
  } else if(raw.action==="finance.delete"){
    const id=uuid.parse(raw.id);const f=s.finances.find(x=>x.id===id);if(!f)throw Error("السجل غير موجود");
    if(s.payments.some(x=>x.financeId===id))throw Error("لا يمكن حذف سجل عليه دفعات");
    stmt("DELETE FROM finances WHERE id=? AND owner=?",id,owner);
    event.summary="إلغاء سجل مالي: "+f.title;event.changes=[{name:f.title,before:f,after:null}];
  } else if(raw.action==="leave.add"){
    const ids=z.array(uuid).min(1).max(500).parse(raw.ids);
    if(new Set(ids).size!==ids.length)throw Error("تكرار في الموظفين المحددين");
    const data=z.object({kind:z.enum(["annual","holiday"]),days:z.number().min(-9999).max(9999).multipleOf(0.5).refine(v=>v!==0,"عدد الأيام لا يمكن أن يكون صفراً"),date,reason:z.string().trim().min(2,"سبب الحركة مطلوب").max(500)}).parse(raw.entry);
    event.changes=[];
    for(const id of ids){
      const e=employee(id);const before=balance(e,s.leaves,data.kind);
      if(before+data.days<0)throw Error("الرصيد غير كافٍ للموظف: "+e.name+" ("+before+" يوم)");
      const l:LeaveEntry={...data,id:crypto.randomUUID(),employeeId:id,createdAt:at};
      stmt("INSERT INTO leave_entries (id,owner,employee_id,data) VALUES (?,?,?,?)",l.id,owner,id,JSON.stringify(l));
      event.changes.push({name:e.name,before:{balance:before},after:{balance:before+data.days,entry:l}});
    }
    event.summary=(data.days>0?"إضافة ":"خصم ")+Math.abs(data.days)+" يوم "+(data.kind==="annual"?"إجازة سنوية":"بديل أعياد")+" لـ "+ids.length+" موظف";
  } else if(raw.action==="history.add"){
    const data=z.object({employeeId:uuid,date,type:z.string().trim().min(2).max(120),oldValue:z.string().max(1000),newValue:z.string().max(1000),decisionNo:z.string().max(100),reason:z.string().max(500),notes:z.string().max(2000)}).parse(raw.history);
    const e=employee(data.employeeId);const h:EmploymentEvent={...data,id:crypto.randomUUID(),actor,createdAt:at};
    stmt("INSERT INTO employment_history (id,owner,employee_id,data) VALUES (?,?,?,?)",h.id,owner,h.employeeId,JSON.stringify(h));
    event.summary="إضافة سجل وظيفي: "+e.name+" - "+h.type;event.changes=[{name:e.name,before:null,after:h}];
  } else if(raw.action==="payroll.close"){
    const data=z.object({month:z.string().regex(/^\d{4}-\d{2}$/),title:z.string().trim().min(2).max(120),deductionsFils:z.number().int().min(0).max(999999999999),notes:z.string().max(2000)}).parse(raw.month);
    if(s.payrollMonths.some(m=>m.month===data.month))throw Error("هذا الشهر مقفل بالفعل.");
    const m:PayrollMonth={...data,id:crypto.randomUUID(),actor,closedAt:at,createdAt:at};
    stmt("INSERT INTO payroll_months (id,owner,month,data) VALUES (?,?,?,?)",m.id,owner,m.month,JSON.stringify(m));
    event.summary="إقفال شهر الخصومات: "+data.month;event.changes=[{name:data.month,before:null,after:m}];
  } else if(raw.action==="settings.save"){
    const settings=z.object({companyName:z.string().trim().min(2).max(120),sector:z.enum(["غير محدد","القطاع الأهلي","القطاع الحكومي","قطاع آخر"]),alertDays:z.number().int().min(1).max(365),annualAllowance:z.number().min(0).max(365).multipleOf(0.5),policyNotes:z.string().max(3000),inputTypes:z.array(z.string().trim().min(1).max(120)).max(80).default([]),allowanceTypes:z.array(z.string().trim().min(1).max(120)).max(80).default([]),workforcePlans:z.array(z.object({id:z.string().max(80),department:z.string().trim().min(1).max(120),section:z.string().trim().max(120),job:z.string().trim().min(1).max(120),currentCount:z.number().int().min(0).max(100000),targetCount:z.number().int().min(0).max(100000),budgetFils:z.number().int().min(0).max(999999999999)})).max(500).default([]),housingSystemUrl:z.string().trim().max(500).default(""),aiQuickPrompt:z.string().max(1000).default(""),securityPolicy:z.string().max(3000).default(""),workflowRules:z.string().max(5000).default(""),companies:z.array(z.string().trim().min(1).max(120)).max(20).default([]),currencies:z.array(z.string().trim().min(1).max(12)).max(10).default(["KWD"])}).parse(raw.settings);
    stmt("UPDATE workspaces SET settings=? WHERE owner=?",JSON.stringify(settings),owner);
    event.summary="تحديث إعدادات المنشأة";event.changes=[{name:"الإعدادات",before:s.settings,after:settings}];
  } else if(raw.action==="jobKpi.save"){
    const schema=z.object({
      id:z.string().uuid().optional(),
      job:z.string().trim().min(1,"المهنة / الوظيفة مطلوبة").max(120),
      title:z.string().trim().min(2,"اسم المؤشر مطلوب").max(160),
      description:z.string().max(1000).default(""),
      target:z.string().trim().max(100).default("100%"),
      weight:z.number().min(1).max(100),
      unit:z.string().trim().max(50).default("%"),
    });
    const data=schema.parse(raw.kpi);
    const id=data.id||crypto.randomUUID();
    const before=s.jobKpis.find(k=>k.id===id);
    const kpi:JobKpi={
      id,
      job:data.job,
      title:data.title,
      description:data.description||"",
      target:data.target||"100%",
      weight:data.weight,
      unit:data.unit||"%",
      createdAt:before?.createdAt||at,
      updatedAt:at
    };
    stmt("INSERT INTO job_kpis (id,owner,job,data) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET job=excluded.job,data=excluded.data WHERE job_kpis.owner=excluded.owner",kpi.id,owner,kpi.job,JSON.stringify(kpi));
    event.summary=(before?"تعديل مؤشر أداء: ":"إضافة مؤشر أداء: ")+kpi.title+" للمهنة: "+kpi.job;
    event.changes=[{name:kpi.title,before:before||null,after:kpi}];
  } else if(raw.action==="jobKpi.delete"){
    const id=uuid.parse(raw.id);
    const target=s.jobKpis.find(k=>k.id===id);
    if(!target)throw Error("مؤشر الأداء غير موجود");
    stmt("DELETE FROM job_kpis WHERE id=? AND owner=?",id,owner);
    event.summary="حذف مؤشر أداء: "+target.title+" للمهنة: "+target.job;
    event.changes=[{name:target.title,before:target,after:null}];
  } else if(raw.action==="evaluation.save"){
    const schema=z.object({
      id:z.string().uuid().optional(),
      employeeId:uuid,
      evaluationYear:z.number().int().min(1970).max(2100).optional(),
      isHistorical:z.boolean().default(false),
      evaluator:z.string().trim().min(1,"اسم المقيّم مطلوب").max(120),
      supervisorName:z.string().max(120).optional(),
      supervisorDate:z.string().optional(),
      supervisorNotes:z.string().max(2000).optional(),
      departmentHeadName:z.string().max(120).optional(),
      departmentHeadDate:z.string().optional(),
      departmentHeadNotes:z.string().max(2000).optional(),
      period:z.string().trim().min(1,"فترة التقييم مطلوبة").max(100),
      date:date,
      status:z.enum(["مسودة","بانتظار_مراجعة_المدير","معتمد","يحتاج_تعديل","قيد المراجعة"]).default("بانتظار_مراجعة_المدير"),
      kpiScores:z.array(z.object({
        kpiId:z.string().optional(),
        title:z.string().trim().min(1),
        target:z.string().optional(),
        weight:z.number().min(0).max(100),
        score:z.number().min(0).max(100),
        actual:z.string().optional(),
        notes:z.string().optional(),
      })).min(1,"يجب تضمين مؤشر أداء واحد على الأقل في التقييم"),
      rawScore:z.number().min(0).max(100).optional(),
      penaltiesCount:z.number().int().min(0).max(100).default(0),
      penaltyDeductionPercent:z.number().min(0).max(100).default(0),
      penaltyDetails:z.string().max(2000).default(""),
      overallScore:z.number().min(0).max(100),
      rating:z.string().max(100),
      strengths:z.string().max(2000).default(""),
      improvements:z.string().max(2000).default(""),
      recommendations:z.string().max(2000).default(""),
      notes:z.string().max(2000).default(""),
    });
    const data=schema.parse(raw.evaluation);
    const emp=employee(data.employeeId);
    const id=data.id||crypto.randomUUID();
    const before=s.evaluations.find(ev=>ev.id===id);
    const evaluation:PerformanceEvaluation={
      ...data,
      id,
      createdAt:before?.createdAt||at,
      updatedAt:at,
    };
    stmt("INSERT INTO performance_evaluations (id,owner,employee_id,data) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET employee_id=excluded.employee_id,data=excluded.data WHERE performance_evaluations.owner=excluded.owner",evaluation.id,owner,evaluation.employeeId,JSON.stringify(evaluation));
    event.summary=(before?"تعديل تقييم أداء: ":"تسجيل تقييم أداء: ")+emp.name+" ("+evaluation.period+")";
    event.changes=[{name:emp.name+" - "+evaluation.period,before:before||null,after:evaluation}];
  } else if(raw.action==="evaluation.approve"){
    const id=uuid.parse(raw.id||raw.evaluationId);
    const target=s.evaluations.find(ev=>ev.id===id);
    if(!target)throw Error("التقييم غير موجود");
    const managerName=z.string().trim().min(1,"اسم مدير الإدارة مطلوب").max(120).parse(raw.departmentHeadName||actor);
    const managerNotes=z.string().max(2000).optional().parse(raw.departmentHeadNotes||"");
    const decision=z.enum(["معتمد","يحتاج_تعديل"]).default("معتمد").parse(raw.decision||"معتمد");
    const emp=s.employees.find(e=>e.id===target.employeeId);
    const updated:PerformanceEvaluation={
      ...target,
      status:decision,
      departmentHeadName:managerName,
      departmentHeadDate:raw.departmentHeadDate?String(raw.departmentHeadDate):(raw.date?String(raw.date):at.slice(0,10)),
      departmentHeadNotes:managerNotes||target.departmentHeadNotes||"",
      penaltyDeductionPercent:raw.penaltyDeductionPercent!==undefined?Number(raw.penaltyDeductionPercent):target.penaltyDeductionPercent,
      overallScore:raw.overallScore!==undefined?Number(raw.overallScore):target.overallScore,
      rating:raw.rating?String(raw.rating):target.rating,
      updatedAt:at,
    };
    stmt("INSERT INTO performance_evaluations (id,owner,employee_id,data) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET employee_id=excluded.employee_id,data=excluded.data WHERE performance_evaluations.owner=excluded.owner",updated.id,owner,updated.employeeId,JSON.stringify(updated));
    event.summary=(decision==="معتمد"?"اعتماد وتأكيد تقييم أداء: ":"إعادة تقييم أداء للتعديل: ")+(emp?.name||"موظف")+" ("+target.period+") بواسطة "+managerName;
    event.changes=[{name:(emp?.name||"موظف")+" - "+target.period,before:target,after:updated}];
  } else if(raw.action==="evaluation.delete"){
    const id=uuid.parse(raw.id);
    const target=s.evaluations.find(ev=>ev.id===id);
    if(!target)throw Error("التقييم غير موجود");
    const emp=s.employees.find(e=>e.id===target.employeeId);
    stmt("DELETE FROM performance_evaluations WHERE id=? AND owner=?",id,owner);
    event.summary="حذف تقييم أداء: "+(emp?.name||target.employeeId)+" ("+target.period+")";
    event.changes=[{name:target.period,before:target,after:null}];
  } else throw Error("عملية غير مدعومة");
  stmt("INSERT INTO audit (id,owner,at,data) VALUES (?,?,?,?)",event.id,owner,at,JSON.stringify(event));
  return {statements,event};
}
