// Bounded verification of financial arithmetic, imports, ownership and atomic writes.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import ts from "typescript";
import ExcelJS from "exceljs";

const output=path.resolve(".sites-runtime/verification");fs.mkdirSync(output,{recursive:true});
for(const file of ["hr","mutations","excel"]){const source=fs.readFileSync(`lib/${file}.ts`,"utf8");const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,esModuleInterop:true}}).outputText.replace(/from ["']\.\/hr["']/g,'from "./hr.mjs"');fs.writeFileSync(`${output}/${file}.mjs`,compiled);}
const hr=await import(`${output}/hr.mjs`),{planMutation}=await import(`${output}/mutations.mjs`),excel=await import(`${output}/excel.mjs`);
const db=new DatabaseSync(":memory:");for(const name of fs.readdirSync("drizzle").filter(n=>n.endsWith(".sql")).sort())db.exec(fs.readFileSync(`drizzle/${name}`,"utf8"));db.exec("PRAGMA optimize");
const owner="test-owner",other="other-owner";for(const o of [owner,other])db.prepare("INSERT INTO workspaces(owner) VALUES(?)").run(o);
function snapshot(o=owner){const w=db.prepare("SELECT revision,settings FROM workspaces WHERE owner=?").get(o);const rows=table=>db.prepare(`SELECT data FROM ${table} WHERE owner=?`).all(o).map(x=>JSON.parse(x.data));return{revision:w.revision,settings:{...hr.defaultSettings,...JSON.parse(w.settings)},employees:rows("employees"),finances:rows("finances"),payments:rows("payments"),leaves:rows("leave_entries"),history:rows("employment_history"),payrollMonths:rows("payroll_months"),audit:rows("audit")};}
function apply(raw,{o=owner,expected=snapshot(o).revision}={}){const p=planMutation(snapshot(o),raw,o,"اختبار آلي");db.exec("BEGIN");try{db.prepare("UPDATE workspaces SET revision=CASE WHEN revision=? THEN revision+1 ELSE NULL END WHERE owner=?").run(expected,o);for(const q of p.statements)db.prepare(q.sql).run(...q.params);db.exec("COMMIT");}catch(e){db.exec("ROLLBACK");throw e;}return snapshot(o);}
let count=0;function check(label,fn){fn();count++;console.log("PASS",label);}
let s=apply({action:"employee.save",employee:{...hr.blankEmployee(),code:"t-01",name:"موظف اختبار",civilId:"012345678901",salaryFils:750125,annualOpening:20,holidayOpening:3}});const employee=s.employees[0];
check("employee normalization and exact 3-decimal KWD",()=>{assert.equal(employee.code,"T-01");assert.equal(hr.kwd(employee.salaryFils),"750.125");});
check("civil IDs retain leading zeros",()=>assert.equal(employee.civilId,"012345678901"));
check("employee search accepts partial names and Arabic digits",()=>{assert.equal(hr.employeeMatchesSearch(employee,"موظف"),true);assert.equal(hr.employeeMatchesSearch(employee,"٣٤٥٦"),true);assert.equal(hr.employeeMatchesSearch({...employee,name:"أحمد علي"},"احمد"),true);});
check("duplicate civil ID rejected before write",()=>assert.throws(()=>apply({action:"employee.save",employee:{...hr.blankEmployee(),name:"اختبار تكرار",code:"T-02",civilId:employee.civilId}}),/مكرر/));
s=apply({action:"finances.import",kind:"loan",rows:[{code:employee.code,reference:"TEST-LOAN-1",title:"قرض اختبار",amountFils:1000500,paidFils:250125,installmentFils:100050,startDate:"2026-09-01",dueDate:"2027-09-01",notes:""}]});const f=s.finances[0];
check("imported outstanding equals principal minus opening paid",()=>assert.equal(hr.remaining(f,s.payments),750375));
check("same finance reference cannot be imported twice",()=>assert.throws(()=>apply({action:"finances.import",kind:"loan",rows:[{code:employee.code,reference:"TEST-LOAN-1",title:"مكرر",amountFils:1000,paidFils:0,installmentFils:100,startDate:"2026-09-01",dueDate:"",notes:""}]}),/مكرر/));
s=apply({action:"payment.add",payment:{financeId:f.id,amountFils:100050,date:"2026-09-12",notes:"اختبار"}});
check("installment subtraction is exact in fils",()=>assert.equal(hr.remaining(f,s.payments),650325));
check("overpayment rejected",()=>assert.throws(()=>apply({action:"payment.add",payment:{financeId:f.id,amountFils:650326,date:"2026-09-12",notes:""}}),/تتجاوز/));
check("paid finance record cannot be deleted",()=>assert.throws(()=>apply({action:"finance.delete",id:f.id}),/دفعات/));
s=apply({action:"leave.add",ids:[employee.id],entry:{kind:"holiday",days:2,date:"2026-09-12",reason:"رصيد اختبار"}});
s=apply({action:"leave.add",ids:[employee.id],entry:{kind:"annual",days:-2.5,date:"2026-09-12",reason:"إجازة اختبار"}});
check("leave ledgers remain independent",()=>{assert.equal(hr.balance(employee,s.leaves,"annual"),17.5);assert.equal(hr.balance(employee,s.leaves,"holiday"),5);});
check("insufficient leave balance rejected",()=>assert.throws(()=>apply({action:"leave.add",ids:[employee.id],entry:{kind:"holiday",days:-6,date:"2026-09-12",reason:"اختبار"}}),/غير كاف/));
check("mass update cannot make leave negative",()=>assert.throws(()=>apply({action:"employees.bulk",ids:[employee.id],patch:{annualOpening:0}}),/سالب/));
s=apply({action:"employees.import",mode:"update",rows:[{code:employee.code,department:"قسم اختبار"}]});
check("Excel update preserves unmapped fields and balances",()=>{assert.equal(s.employees[0].salaryFils,750125);assert.equal(s.employees[0].name,employee.name);assert.equal(s.employees[0].department,"قسم اختبار");assert.equal(hr.balance(s.employees[0],s.leaves,"annual"),17.5);});
const rev=s.revision;
check("stale revision rolls back every write",()=>{assert.throws(()=>apply({action:"employees.bulk",ids:[employee.id],patch:{department:"تغيير مرفوض"}},{expected:rev-1}),/NOT NULL/);assert.equal(snapshot().employees[0].department,"قسم اختبار");assert.equal(snapshot().revision,rev);});
check("owner-scoped reads are isolated",()=>assert.equal(snapshot(other).employees.length,0));
check("another owner cannot reference the employee",()=>assert.throws(()=>apply({action:"leave.add",ids:[employee.id],entry:{kind:"annual",days:1,date:"2026-09-12",reason:"اختبار"}},{o:other}),/غير موجود/));
check("invalid real calendar date rejected",()=>assert.equal(hr.dateSchema.safeParse("2026-02-31").success,false));
check("bulk request rejects unsupported fields",()=>assert.throws(()=>apply({action:"employees.bulk",ids:[employee.id],patch:{id:"invalid"}})));
check("duplicate row references blocked in batch",()=>assert.throws(()=>apply({action:"employees.import",mode:"add",rows:[{code:"T-99",name:"صف اختبار"},{code:"T-99",name:"تكرار"}]}),/مكرر/));
check("Arabic and English column mapping",()=>assert.deepEqual(excel.guessMapping(["الرقم الوظيفي","اسم الموظف","salary","civil_id"]),["code","name","salaryFils","civilId"]));
check("anonymized employee workbook maps every supported column",()=>{const headers=["A","ID#","Full Name","Arabic Name","Job Title","Arabic Job Title","Main Dep","Sub Dep","Unit","Hire Date","Tenure till Today","Sal after Inc","Nationality","Religion","Civil ID#","Birth Date","Gender","Official Last Date","Removed from Payroll","Status","Status 2","Grade"];assert.deepEqual(excel.guessMapping(headers),["skip","code","nameEn","name","jobEn","job","department","branch","unit","startDate","skip","salaryFils","nationality","religion","civilId","birthDate","gender","officialLastDate","payrollRemoval","status","statusDetail","grade"]);const result=excel.mapRows({name:"Sheet1",headers,rows:[["1","E001","Employee One","موظف واحد","Accountant","محاسب","Finance","Accounts","HQ","2020-01-01","6 years","750.125","Kuwaiti","Muslim","900000000001","1990-05-10","Male","2026-12-31","12-2026","Active","R - Transfer","G5"]]},excel.guessMapping(headers));assert.equal(result.errors.length,0);assert.equal(result.rows[0].status,"على رأس العمل");assert.equal(result.rows[0].salaryFils,750125);assert.equal(result.rows[0].officialLastDate,"2026-12-31");});
check("Arabic numeric input maps to exact fils",()=>{const result=excel.mapRows({headers:["الرقم الوظيفي","الراتب"],rows:[["T-01","٧٥٠٫١٢٥"]]},["code","salaryFils"]);assert.equal(result.errors.length,0);assert.equal(result.rows[0].salaryFils,750125);});
check("more than three currency decimals rejected",()=>assert.ok(excel.mapRows({headers:["code","salary"],rows:[["T-01","1.2345"]]},["code","salaryFils"]).errors.length));
let downloaded;globalThis.document={createElement(){return{click(){}};}};const create=URL.createObjectURL;URL.createObjectURL=blob=>{downloaded=blob;return"blob:verification";};URL.revokeObjectURL=()=>{};
await excel.downloadTemplate();let wb=new ExcelJS.Workbook();await wb.xlsx.load(await downloaded.arrayBuffer());
check("employee template has headers only and instructions",()=>{assert.equal(wb.worksheets[0].actualRowCount,1);assert.equal(wb.worksheets[0].getCell("A1").value,"كود الموظف");assert.equal(wb.worksheets[0].views[0].rightToLeft,true);});
await excel.downloadFinanceTemplate("loan");wb=new ExcelJS.Workbook();await wb.xlsx.load(await downloaded.arrayBuffer());
check("financial template contains opening paid amount",()=>assert.equal(wb.worksheets[0].getCell("E1").value,"المسدد سابقا د.ك"));
await excel.exportWorkbook(snapshot(),"all");wb=new ExcelJS.Workbook();await wb.xlsx.load(await downloaded.arrayBuffer());
check("full workbook includes all ledgers, performance reports, and audit",()=>{assert.equal(wb.worksheets.length,11);assert.ok(wb.getWorksheet("الموظفون").getRow(2).values.includes("012345678901"));assert.equal(wb.getWorksheet("القروض والخصومات").getCell("I2").value,650.325);});
const file=new File([await downloaded.arrayBuffer()],"test.xlsx",{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});const parsed=await excel.parseWorkbook(file);
check("real XLSX parsing preserves civil IDs",()=>assert.ok(parsed[0].rows[0].includes("012345678901")));
const badWb=new ExcelJS.Workbook();const sheet=badWb.addWorksheet("اختبار");sheet.addRow(["code","name"]);sheet.addRow(["T-1",{formula:'"test"',result:"test"}]);const badFile=new File([await badWb.xlsx.writeBuffer()],"formula.xlsx");await assert.rejects(()=>excel.parseWorkbook(badFile),/معادلات/);count++;console.log("PASS Excel formulas rejected before import");
URL.createObjectURL=create;
console.log(`Verified ${count} meaningful checks. No real employee data used.`);
db.close();
