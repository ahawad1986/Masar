import { Snapshot, Employee, employeeFields, balance, remaining, today, normalizeDigits } from "./hr";
import type { Workbook, CellValue } from "exceljs";
const ignoredImportFields=new Set<string>(["probationEnd","contractEnd","civilExpiry","residencyExpiry","passportExpiry"]);
export const employeeImportFields=employeeFields.filter(f=>!ignoredImportFields.has(f.key));

async function workbook(){const excelModule=await import("exceljs");const Excel=(excelModule as any).default||excelModule;return new Excel.Workbook();}
function addSheet(wb:Workbook,name:string,headers:string[],rows:unknown[][]){
  const sheet=wb.addWorksheet(name,{views:[{rightToLeft:true,state:"frozen",ySplit:1}]});
  sheet.addRow(headers);for(const row of rows)sheet.addRow(row);
  sheet.getRow(1).height=30;sheet.getRow(1).font={name:"Arial",bold:true,color:{argb:"FFFFFFFF"},size:11};sheet.getRow(1).fill={type:"pattern",pattern:"solid",fgColor:{argb:"FF6045E8"}};
  sheet.columns.forEach((c,i)=>{c.width=Math.min(40,Math.max(19,headers[i].length+5));});
  sheet.eachRow((r,i)=>{r.alignment={vertical:"middle",horizontal:"right",wrapText:true};if(i>1){r.height=26;r.font={name:"Arial",size:11};if(i%2===0)r.fill={type:"pattern",pattern:"solid",fgColor:{argb:"FFF4F2FF"}};r.eachCell(c=>{if(typeof c.value==="number")c.numFmt=Number.isInteger(c.value)?"#,##0":"#,##0.000";});}});
  if(rows.length)sheet.autoFilter={from:{row:1,column:1},to:{row:rows.length+1,column:headers.length}};
  return sheet;
}
async function download(wb:Workbook,name:string){const buffer=await wb.xlsx.writeBuffer();const blob=new Blob([buffer as unknown as BlobPart],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
export async function downloadTemplate(){const wb=await workbook();wb.creator="Masar HR";const sheet=addSheet(wb,"الموظفون",employeeImportFields.map(f=>f.label),[]);employeeImportFields.forEach((f,i)=>{sheet.getColumn(i+1).numFmt=f.type==="money"?"0.000":f.type==="days"?"0.0":"@";sheet.getCell(1,i+1).note=["code","name"].includes(f.key)?"حقل مطلوب عند إضافة موظف جديد.":f.type==="date"?"التاريخ بصيغة YYYY-MM-DD.":"اختياري. الخلية الفارغة لا تغيّر القيمة الحالية عند التحديث.";});addSheet(wb,"إرشادات",["البند","التعليمات"],[["الإضافة","الرقم الوظيفي واسم الموظف مطلوبان. استخدم رقماً فريداً لكل موظف."],["التحديث","اختر تحديث الموجودين. تتم المطابقة بالرقم الوظيفي وتُحفظ القيم الحالية عند ترك الخلايا فارغة."],["فترة التجربة","تُحسب تلقائياً بعد 100 يوم عمل من تاريخ التعيين."],["تواريخ الانتهاء","يتم تجاهل تواريخ انتهاء العقد والبطاقة والإقامة والجواز عند الاستيراد."],["المبالغ","الدينار الكويتي بحد أقصى ثلاث منازل عشرية."],["التواريخ","YYYY-MM-DD أو خلية تاريخ Excel صحيحة."],["الأرصدة","أيام صحيحة أو أنصاف أيام. القيم الافتتاحية تُستبدل ولا تُضاف إلى الافتتاحي السابق."],["الحالات","على رأس العمل / إجازة بدون راتب / موقوف / مستقيل / انتهت خدمته. كما يقبل الاستيراد Active وحالاتها الإنجليزية الشائعة."],["الرقم المدني","احتفظ به كنص من 12 رقماً للحفاظ على الأصفار."],["حد الاستيراد","1000 موظف في العملية الواحدة. القالب يحتوي رؤوس أعمدة فقط دون بيانات افتراضية."],["المعادلات","لا تستورد صيغاً؛ الصق القيم فقط."]]);await download(wb,"Masar_Employee_Template.xlsx");}
export async function exportWorkbook(s:Snapshot,kind="all"){
  const wb=await workbook();wb.creator="Masar HR";wb.created=new Date();
  if(kind==="all"||kind==="employees")addSheet(wb,"الموظفون",employeeFields.map(f=>f.label),s.employees.map(e=>employeeFields.map(f=>f.type==="money"?Number(e[f.key])/1000:e[f.key])));
  if(kind==="all"||kind==="finances"){
    addSheet(wb,"القروض والخصومات",["الرقم الوظيفي","الموظف","النوع","نوع القرض/الخصم","الرقم المرجعي","الوصف","أصل المبلغ د.ك","المسدد سابقا د.ك","المتبقي د.ك","القسط د.ك","عدد الأقساط","تاريخ أول قسط","الجهة الممولة","طريقة الخصم","نسبة الخصم","الأولوية","موقوف مؤقتاً","البداية","الاستحقاق","ملاحظات"],s.finances.map(f=>{const e=s.employees.find(e=>e.id===f.employeeId);return[e?.code,e?.name,f.kind==="loan"?"قرض/سلفة":"التزام/خصم",f.loanType||"",f.reference||f.id,f.title,f.amountFils/1000,(f.amountFils-remaining(f,s.payments))/1000,remaining(f,s.payments)/1000,f.installmentFils/1000,f.installmentsCount||"",f.firstInstallmentDate||"",f.lender||"",f.deductionMode==="percent"?"نسبة":"ثابت",f.deductionPercent||"",f.priority||"",f.paused?"نعم":"لا",f.startDate,f.dueDate,f.notes];}));
    addSheet(wb,"الدفعات",["الموظف","السجل","المبلغ د.ك","التاريخ","المرجع / ملاحظات"],s.payments.map(p=>{const f=s.finances.find(f=>f.id===p.financeId);return[s.employees.find(e=>e.id===f?.employeeId)?.name,f?.title,p.amountFils/1000,p.date,p.notes];}));
  }
  if(kind==="all"||kind==="history")addSheet(wb,"التاريخ الوظيفي",["الرقم الوظيفي","الموظف","التاريخ","نوع التغيير","البيانات القديمة","البيانات الجديدة","رقم القرار","السبب","ملاحظات","المستخدم"],(s.history||[]).map(h=>{const e=s.employees.find(e=>e.id===h.employeeId);return[e?.code,e?.name,h.date,h.type,h.oldValue,h.newValue,h.decisionNo,h.reason,h.notes,h.actor];}));
  if(kind==="all"||kind==="payroll")addSheet(wb,"إقفالات الشهر",["الشهر","العنوان","إجمالي الخصومات د.ك","وقت الإقفال","المستخدم","ملاحظات"],(s.payrollMonths||[]).map(m=>[m.month,m.title,m.deductionsFils/1000,m.closedAt,m.actor,m.notes]));
  if(kind==="all"||kind==="leaves"){
    addSheet(wb,"أرصدة الإجازات",["الرقم الوظيفي","الموظف","افتتاحي سنوي","سنوي متاح","افتتاحي بديل الأعياد","بديل الأعياد متاح"],s.employees.map(e=>[e.code,e.name,e.annualOpening,balance(e,s.leaves,"annual"),e.holidayOpening,balance(e,s.leaves,"holiday")]));
    addSheet(wb,"حركات الإجازات",["الموظف","نوع الرصيد","الأيام المضافة أو المخصومة","التاريخ","السبب"],s.leaves.map(l=>[s.employees.find(e=>e.id===l.employeeId)?.name,l.kind==="annual"?"سنوي":"بديل أعياد",l.days,l.date,l.reason]));
  }
  if(kind==="all"||kind==="audit"){
    addSheet(wb,"آخر العمليات",["التاريخ","بواسطة","العملية"],s.audit.map(a=>[a.at,a.actor,a.summary]));
    const details:unknown[][]=[];
    const labels:Record<string,string>={...Object.fromEntries(employeeFields.map(f=>[f.key,f.label])),loanType:"نوع القرض/الخصم",installmentsCount:"عدد الأقساط",firstInstallmentDate:"تاريخ أول قسط",lender:"الجهة الممولة",deductionMode:"طريقة الخصم",deductionPercent:"نسبة الخصم",priority:"الأولوية",paused:"إيقاف مؤقت",amountFils:"المبلغ د.ك",installmentFils:"القسط د.ك",balance:"الرصيد",days:"الأيام",reason:"السبب",date:"التاريخ",title:"الوصف",kind:"النوع",companyName:"المنشأة",sector:"القطاع",alertDays:"نافذة التنبيه",annualAllowance:"الاستحقاق المرجعي",policyNotes:"ملاحظات السياسة"};
    for(const a of s.audit)for(const c of a.changes||[]){const before=(c.before||{}) as Record<string,unknown>,after=(c.after||{}) as Record<string,unknown>;for(const key of new Set([...Object.keys(before),...Object.keys(after)])){if(!labels[key]||JSON.stringify(before[key])===JSON.stringify(after[key]))continue;const val=(v:unknown)=>v==null?"":key.endsWith("Fils")?Number(v)/1000:typeof v==="object"?JSON.stringify(v):v;details.push([a.at,a.summary,c.name,labels[key],val(before[key]),val(after[key])]);}}
    addSheet(wb,"تفاصيل التغييرات",["التاريخ","العملية","السجل","الحقل","قبل","بعد"],details);
  }
  if(kind==="all"||kind==="performance"||kind==="evaluations"){
    addSheet(wb,"تقييمات الأداء",["الرقم الوظيفي","الموظف","الإدارة","الوظيفة","سنة التقييم","فترة التقييم","تاريخ التقييم","نوع السجل","درجة المؤشرات %","نسبة خصم العقوبات %","عدد العقوبات","بيان العقوبات","النتيجة النهائية %","التقدير العام","حالة الاعتماد","المشرف المباشر","تاريخ المشرف","ملاحظات المشرف","مدير الإدارة","تاريخ اعتماد المدير","ملاحظات مدير الإدارة","نقاط القوة","مجالات التحسين","التوصيات","ملاحظات عامة"],(s.evaluations||[]).map(ev=>{
      const e=s.employees.find(emp=>emp.id===ev.employeeId);
      return [
        e?.code,
        e?.name,
        e?.department,
        e?.job,
        ev.evaluationYear||"",
        ev.period,
        ev.date,
        ev.isHistorical?"أرشيف تاريخي":"تقييم حالي",
        (ev.rawScore!=null?ev.rawScore:ev.overallScore)+"%",
        (ev.penaltyDeductionPercent||0)+"%",
        ev.penaltiesCount||0,
        ev.penaltyDetails||"",
        ev.overallScore+"%",
        ev.rating,
        ev.status,
        ev.supervisorName||ev.evaluator||"",
        ev.supervisorDate||ev.date,
        ev.supervisorNotes||"",
        ev.departmentHeadName||"",
        ev.departmentHeadDate||"",
        ev.departmentHeadNotes||"",
        ev.strengths||"",
        ev.improvements||"",
        ev.recommendations||"",
        ev.notes||""
      ];
    }));
    addSheet(wb,"مؤشرات الأداء للمهن",["المهنة / الوظيفة","المؤشر","الوصف والمعايير","المستهدف","الوزن %","وحدة القياس"],(s.jobKpis||[]).map(k=>[
      k.job,k.title,k.description,k.target,k.weight+"%",k.unit||"%"
    ]));
  }
  await download(wb,`Masar_${kind}_${today()}.xlsx`);
}
export type ImportedSheet={name:string;headers:string[];rows:string[][]};
export const financeFields=[{key:"code",label:"الرقم الوظيفي"},{key:"reference",label:"الرقم المرجعي"},{key:"title",label:"الوصف"},{key:"amountFils",label:"أصل المبلغ د.ك"},{key:"paidFils",label:"المسدد سابقا د.ك"},{key:"installmentFils",label:"القسط د.ك"},{key:"startDate",label:"البداية"},{key:"notes",label:"ملاحظات"}];
export async function downloadFinanceTemplate(kind:"loan"|"obligation"){
  const fields=kind==="loan"?financeFields:financeFields.filter(f=>f.key!=="installmentFils").map(f=>f.key==="title"?{...f,label:"نوع الخصم"}:f.key==="amountFils"?{...f,label:"قيمة الخصم د.ك"}:f);
  const wb=await workbook();const sheet=addSheet(wb,kind==="loan"?"القروض":"الخصومات",fields.map(f=>f.label),[]);
  fields.forEach((f,i)=>sheet.getColumn(i+1).numFmt=f.key.endsWith("Fils")?"0.000":"@");
  addSheet(wb,"إرشادات",["الحقل","التعليمات"],[["الرقم الوظيفي","يجب أن يكون الموظف مضافاً مسبقاً في مسار."],["الرقم المرجعي","رقم فريد للسجل المالي مثل المرجع الموجود في كشفك؛ يُرفض عند تكرار الاستيراد."],[kind==="loan"?"أصل المبلغ":"قيمة الخصم",kind==="loan"?"المبلغ الإجمالي بالدينار وليس المتبقي فقط.":"قيمة الخصم المطلوب تسجيلها بالدينار."],["المسدد سابقا","المبلغ المسدّد حتى تاريخ الرصيد الافتتاحي؛ اتركه فارغاً إذا لم توجد دفعات سابقة."],["البداية","تاريخ الرصيد الافتتاحي بصيغة YYYY-MM-DD."],["القسط",kind==="loan"?"مطلوب للقروض وأقل من أصل المبلغ أو يساويه.":"غير مطلوب للخصومات."],["الاستيراد","إضافة سجلات مالية جديدة فقط. الحد 500 سجل في الملف."]]);
  await download(wb,kind==="loan"?"Masar_Loans_Template.xlsx":"Masar_Deductions_Template.xlsx");
}
function textValue(value:CellValue):string{
  if(value===null||value===undefined)return "";
  if(value instanceof Date)return value.toISOString().slice(0,10);
  if(typeof value==="object"){
    if("formula" in value||"sharedFormula" in value)throw Error("يحتوي الملف على معادلات. الصق القيم فقط ثم أعد رفعه.");
    if("richText" in value)return value.richText.map(x=>x.text).join("");
    if("text" in value)return String(value.text);
    throw Error("خلية غير مدعومة أو تحتوي خطأ Excel. راجع الملف.");
  }
  return String(value).trim();
}
export async function parseWorkbook(file:File):Promise<ImportedSheet[]>{
  if(!/\.xlsx$/i.test(file.name))throw Error("استخدم ملف Excel بصيغة .xlsx. احفظ ملفات .xls بهذه الصيغة أولاً.");
  if(file.size>5*1024*1024)throw Error("حجم الملف أكبر من 5 ميجابايت. قسّمه إلى ملفات أصغر.");
  const wb=await workbook();await wb.xlsx.load(await file.arrayBuffer());
  const sheets:ImportedSheet[]=[];
  for(const sheet of wb.worksheets){
    if(sheet.rowCount>1001||sheet.columnCount>60)continue;
    const headers:string[]=[];for(let i=1;i<=sheet.columnCount;i++)headers.push(textValue(sheet.getRow(1).getCell(i).value)||`عمود ${i}`);
    const rows:string[][]=[];for(let r=2;r<=sheet.rowCount;r++){const row=headers.map((_,i)=>textValue(sheet.getRow(r).getCell(i+1).value));if(row.some(v=>v!==""))rows.push(row);}
    if(headers.length)sheets.push({name:sheet.name,headers,rows});
  }
  if(!sheets.length)throw Error("لا توجد ورقة مناسبة: الحد 1000 صف بيانات و60 عموداً لكل ورقة.");
  return sheets;
}
const normalizeHeader=(s:string)=>s.trim().replace(/[^\p{L}\p{N}]/gu,"").replace(/[أإآ]/g,"ا").toLowerCase();
export function guessMapping(headers:string[]){const aliases:Record<string,string>={id:"code",employeeid:"code",employeecode:"code",employeenumber:"code",fullname:"nameEn",arabicname:"name",employeename:"name",jobtitle:"jobEn",arabicjobtitle:"job",maindep:"department",subdep:"branch",hiredate:"startDate",salafterinc:"salaryFils",civilid:"civilId",officiallastdate:"officialLastDate",removedfrompayroll:"payrollRemoval",status2:"statusDetail",salary:"salaryFils",allowances:"allowancesFils",annualbalance:"annualOpening",holidaybalance:"holidayOpening","رصيدالاجازات":"annualOpening","رصيدالاجازاتالسنوية":"annualOpening","رصيدبديلالاعياد":"holidayOpening","الراتب":"salaryFils","البدلات":"allowancesFils","الاسمالعربي":"name","اسمالموظف":"name","تاريخالمباشرة":"startDate","الرقمالوظيفي":"code","كودالموظف":"code"};const taken=new Set<string>();return headers.map(h=>{const k=employeeImportFields.find(f=>normalizeHeader(f.label)===normalizeHeader(h)||normalizeHeader(f.key)===normalizeHeader(h))?.key||aliases[normalizeHeader(h)]||"skip";if(k!=="skip"&&taken.has(k))return"skip";taken.add(k);return k;});}
const importedStatuses:Record<string,Employee["status"]>={active:"على رأس العمل",unpaidleave:"إجازة بدون راتب",suspended:"موقوف",resigned:"مستقيل",resignation:"مستقيل",terminated:"انتهت خدمته",serviceended:"انتهت خدمته"};
export function mapRows(sheet:ImportedSheet,mapping:string[]):{rows:Partial<Employee>[];errors:string[]}{const result:Partial<Employee>[]=[],errors:string[]=[];if(!mapping.includes("code"))errors.push("اربط عمود الرقم الوظيفي أولاً.");if(new Set(mapping.filter(k=>k!=="skip")).size!==mapping.filter(k=>k!=="skip").length)errors.push("تم ربط أكثر من عمود بالحقل نفسه.");for(const [i,values] of sheet.rows.entries()){const row:Record<string,unknown>={};mapping.forEach((key,col)=>{if(key==="skip"||ignoredImportFields.has(key))return;let value=values[col]?.trim();if(value===undefined||value==="")return;value=normalizeDigits(value);const field=employeeImportFields.find(f=>f.key===key);if(field?.type==="money"||field?.type==="days"){const cleaned=value.replace(/,/g,"").replace(/٬/g,"").replace(/٫/g,".");const amount=Number(cleaned);if(!Number.isFinite(amount)||amount<0||(field.type==="money"&&!/^-?\d+(\.\d{1,3})?$/.test(cleaned))){errors.push(`صف ${i+2}: قيمة غير صحيحة في ${field.label}`);return;}row[key]=field.type==="money"?Math.round(amount*1000):amount;}else if(key==="status"){const status=importedStatuses[normalizeHeader(value)]||value;if(!(["على رأس العمل","إجازة بدون راتب","موقوف","مستقيل","انتهت خدمته"] as string[]).includes(status)){errors.push(`صف ${i+2}: حالة الموظف غير معروفة: ${value}`);return;}row[key]=status;}else row[key]=value;});if(!row.code)errors.push(`صف ${i+2}: الرقم الوظيفي مطلوب`);result.push(row as Partial<Employee>);}return{rows:result,errors};}
