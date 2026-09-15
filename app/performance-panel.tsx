"use client";
import { useState, useMemo } from "react";
import { 
  Snapshot, 
  JobKpi, 
  PerformanceEvaluation, 
  KpiScoreItem, 
  calculateOverallScore, 
  today, 
  displayDate 
} from "@/lib/hr";
import { Avatar, Choice, Field, NoData, Pager, SaveButton } from "./ui-parts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { exportWorkbook } from "@/lib/excel";
import { toast } from "sonner";
import {
  Award,
  Plus,
  Search,
  Sliders,
  Trash2,
  Edit,
  Eye,
  ArrowDownToLine,
  TrendingUp,
  Target,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Printer,
  BookOpen,
  Clock,
  CheckCheck,
  AlertTriangle,
  History,
  UserCheck,
  FileCheck,
  ShieldCheck,
  Undo2
} from "lucide-react";

// Standard KPI templates by profession for quick setup
export const PRESET_JOB_KPIS: Record<string, Omit<JobKpi, "id" | "createdAt" | "updatedAt">[]> = {
  "محاسب": [
    { job: "محاسب", title: "دقة إعداد القيود والتسويات والتقارير المالية", description: "خلو القيود اليومية وحسابات الأستاذ من الأخطاء المحاسبية", target: "99%", weight: 30, unit: "%" },
    { job: "محاسب", title: "الالتزام بجدول الإقفال المالي الشهري", description: "إتمام عمليات الإقفال المالي في الموعد المحدد دون تأخير", target: "اليوم الـ 3 من الشهر", weight: 25, unit: "يوم" },
    { job: "محاسب", title: "مطابقة الحسابات البنكية وحسابات الموردين والعملاء", description: "مطابقة دورية لجميع كشوف الحسابات ومعالجة الفروقات فورياً", target: "100%", weight: 25, unit: "%" },
    { job: "محاسب", title: "الامتثال للسياسات المالية واللوائح المحاسبية", description: "الالتزام الصارم بالضوابط الداخلية والصلاحيات المعتمدة", target: "بدون مخالفات", weight: 20, unit: "معيار" },
  ],
  "مندوب مبيعات": [
    { job: "مندوب مبيعات", title: "تحقيق المستهدف البيعي الشهري / السنوي", description: "الوصول إلى أرقام المبيعات المعتمدة في الخطة البيعية", target: "100% من التارجت", weight: 40, unit: "%" },
    { job: "مندوب مبيعات", title: "استقطاب عملاء جدد وتوسيع قاعدة العملاء", description: "فتح حسابات جديدة لعملاء معتمدين شهرياً", target: "10 عملاء شهرياً", weight: 25, unit: "عميل" },
    { job: "مندوب مبيعات", title: "سرعة الرد ومتابعة عروض الأسعار والفرص", description: "التواصل الفعال مع العملاء المحتملين وإغلاق الصفقات", target: "خلال 24 ساعة", weight: 20, unit: "ساعة" },
    { job: "مندوب مبيعات", title: "معدل التحصيل ومتابعة المستحقات المالية", description: "تحصيل فواتير المبيعات في الآجال المتفق عليها", target: "95%", weight: 15, unit: "%" },
  ],
  "مسؤول موارد بشرية": [
    { job: "مسؤول موارد بشرية", title: "دقة واكتمال مسيرات الرواتب والمستحقات في مواعيدها", description: "إعداد كشوف الرواتب والخصومات والسلف دون أخطاء وفي الموعد", target: "100% في الموعد", weight: 30, unit: "%" },
    { job: "مسؤول موارد بشرية", title: "سرعة إنجاز إجراءات التوظيف ومباشرة العمل", description: "تقليص زمن سد الشواغر الوظيفية واستكمال مسوغات التعيين", target: "أقل من 20 يوم", weight: 25, unit: "يوم" },
    { job: "مسؤول موارد بشرية", title: "تحديث ملفات الموظفين والامتثال لقانون العمل واللوائح", description: "تجديد الإقامات والبطاقات المدنية والعقود قبل موعد انتهائها", target: "بدون غرامات", weight: 25, unit: "%" },
    { job: "مسؤول موارد بشرية", title: "معدل رضا الموظفين والاستجابة للطلبات والشكاوى", description: "معالجة طلبات الإجازات والشهادات والاستفسارات بمهنية وسرعة", target: "90% رضا", weight: 20, unit: "%" },
  ],
  "مدير مشاريع": [
    { job: "مدير مشاريع", title: "تسليم المشاريع في المواعيد المحددة (On-time Delivery)", description: "الالتزام بالجدول الزمني ومعالم المشروع المتفق عليها", target: "95%", weight: 35, unit: "%" },
    { job: "مدير مشاريع", title: "الالتزام بالميزانية التقديرية للمشروع (Budget Adherence)", description: "عدم تجاوز التكاليف المعتمدة للمشروع", target: "انحراف أقل من 5%", weight: 25, unit: "%" },
    { job: "مدير مشاريع", title: "جودة المخرجات وإدارة المخاطر والتغييرات", description: "تطبيق معايير الجودة وتسجيل ومتابعة المخاطر استباقياً", target: "90%", weight: 20, unit: "%" },
    { job: "مدير مشاريع", title: "إدارة التواصل وتنسيق الفريق ورضا أصحاب المصلحة", description: "تقارير تقدم دورية وتنسيق فعال بين جميع الأطراف", target: "تقييم 4.5/5", weight: 20, unit: "درجة" },
  ],
  "مهندس برمجيات": [
    { job: "مهندس برمجيات", title: "جودة الكود وانخفاض نسبة العيوب والأخطاء (Code Quality)", description: "كتابة كود نظيف، قابل للصيانة وتغطية الاختبارات البرمجية", target: "أقل من 2 عيب حرج", weight: 35, unit: "خلل" },
    { job: "مهندس برمجيات", title: "إنجاز المهام البرمجية والسباقات في الموعد (Sprint Completion)", description: "الالتزام بخطة العمل ومواعيد إطلاق التحديثات", target: "90%", weight: 30, unit: "%" },
    { job: "مهندس برمجيات", title: "مراجعة الكود والتوثيق والتعاون البرمجي", description: "المشاركة الفعالة في Code Reviews وتوثيق الوظائف والمكتبات", target: "100% مراجعات", weight: 20, unit: "%" },
    { job: "مهندس برمجيات", title: "التطوير التقني المستمر وحل المشكلات المعقدة", description: "اقتراح تحسينات معمارية وحلول ذكية للأداء والأمان", target: "مبادرتان فصلياً", weight: 15, unit: "مبادرة" },
  ],
  "خدمة عملاء": [
    { job: "خدمة عملاء", title: "معدل رضا العملاء (Customer Satisfaction - CSAT)", description: "حصول الموظف على تقييمات إيجابية من العملاء بعد الخدمة", target: "90% فأعلى", weight: 35, unit: "%" },
    { job: "خدمة عملاء", title: "متوسط سرعة الاستجابة والرد على الاتصالات والاستفسارات", description: "تقليل زمن الانتظار والرد الفوري على القنوات المعتمدة", target: "أقل من دقيقتين", weight: 25, unit: "دقيقة" },
    { job: "خدمة عملاء", title: "حل المشكلات والشكاوى من أول اتصال (First Contact Resolution)", description: "معالجة التذاكر واستفسارات العميل جذرياً دون تصعيد متكرر", target: "80%", weight: 25, unit: "%" },
    { job: "خدمة عملاء", title: "الالتزام بساعات الدوام وجودة أسلوب المحادثة", description: "الالتزام التام بالبروتوكول المهني ومدونة السلوك", target: "98%", weight: 15, unit: "%" },
  ]
};

export default function PerformancePanel({
  s,
  busy,
  commit,
  canManage = true,
  canConduct = true,
  canApprove = true,
  currentUser = "المشرف المباشر",
}: {
  s: Snapshot;
  busy: boolean;
  commit: (body: Record<string, unknown>) => Promise<boolean>;
  canManage?: boolean;
  canConduct?: boolean;
  canApprove?: boolean;
  currentUser?: string;
}) {
  const [activeTab, setActiveTab] = useState<"evaluations" | "kpis" | "insights">("evaluations");

  // Evaluations state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState("all");
  const [filterRating, setFilterRating] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState<"all" | "current" | "historical">("all");
  const [evalPage, setEvalPage] = useState(1);

  // Modals state
  const [editingEvaluation, setEditingEvaluation] = useState<PerformanceEvaluation | null>(null);
  const [isNewEvalOpen, setIsNewEvalOpen] = useState(false);
  const [isHistoricalEntry, setIsHistoricalEntry] = useState(false);
  const [viewingEvaluation, setViewingEvaluation] = useState<PerformanceEvaluation | null>(null);
  const [approvalModalEval, setApprovalModalEval] = useState<PerformanceEvaluation | null>(null);
  const [historyTrackerEmpId, setHistoryTrackerEmpId] = useState<string>("");

  // KPI management state
  const [selectedJob, setSelectedJob] = useState<string>("");
  const [editingKpi, setEditingKpi] = useState<JobKpi | null>(null);
  const [isNewKpiOpen, setIsNewKpiOpen] = useState(false);
  const [kpiSearch, setKpiSearch] = useState("");

  const evaluations = useMemo(() => s.evaluations || [], [s.evaluations]);
  const jobKpis = useMemo(() => s.jobKpis || [], [s.jobKpis]);

  // Available professions from employees + existing KPIs + presets
  const allProfessions = useMemo(() => {
    const set = new Set<string>();
    s.employees.forEach(e => { if (e.job?.trim()) set.add(e.job.trim()); });
    jobKpis.forEach(k => { if (k.job?.trim()) set.add(k.job.trim()); });
    Object.keys(PRESET_JOB_KPIS).forEach(j => set.add(j));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ar"));
  }, [s.employees, jobKpis]);

  // Set default selected job if none
  const currentJob = selectedJob || allProfessions[0] || "محاسب";

  // Distinct evaluation years (supports both historical and current)
  const distinctYears = useMemo(() => {
    const set = new Set<string>();
    evaluations.forEach(ev => {
      if (ev.evaluationYear) set.add(String(ev.evaluationYear));
      else if (ev.period) {
        const match = ev.period.match(/\b(20\d{2})\b/);
        if (match) set.add(match[1]);
      } else if (ev.date) {
        set.add(ev.date.slice(0, 4));
      }
    });
    // Add current and previous year by default if empty
    const currentYr = new Date().getFullYear();
    set.add(String(currentYr));
    set.add(String(currentYr - 1));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [evaluations]);

  // Filtered evaluations
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(ev => {
      const emp = s.employees.find(e => e.id === ev.employeeId);
      const text = `${emp?.name || ""} ${emp?.code || ""} ${emp?.job || ""} ${emp?.department || ""} ${ev.period} ${ev.evaluator} ${ev.supervisorName || ""} ${ev.departmentHeadName || ""}`.toLowerCase();
      if (searchQuery && !text.includes(searchQuery.toLowerCase())) return false;
      if (filterYear !== "all") {
        const evYear = String(ev.evaluationYear || ev.date.slice(0, 4));
        if (evYear !== filterYear) return false;
      }
      if (filterType === "historical" && !ev.isHistorical) return false;
      if (filterType === "current" && ev.isHistorical) return false;
      if (filterRating !== "all" && !ev.rating.includes(filterRating)) return false;
      if (filterStatus !== "all" && ev.status !== filterStatus) return false;
      return true;
    });
  }, [evaluations, s.employees, searchQuery, filterYear, filterType, filterRating, filterStatus]);

  // KPIs for selected profession
  const currentJobKpis = useMemo(() => {
    return jobKpis.filter(k => k.job === currentJob && (!kpiSearch || k.title.includes(kpiSearch) || k.description.includes(kpiSearch)));
  }, [jobKpis, currentJob, kpiSearch]);

  const totalCurrentJobWeight = useMemo(() => {
    return currentJobKpis.reduce((sum, k) => sum + (Number(k.weight) || 0), 0);
  }, [currentJobKpis]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = evaluations.length;
    if (!total) {
      return {
        avgScore: 0,
        approvedCount: 0,
        pendingApprovalCount: 0,
        historicalCount: 0,
        withPenaltiesCount: 0,
        topCount: 0,
        needsImprovementCount: 0
      };
    }
    const approved = evaluations.filter(e => e.status === "معتمد");
    const pending = evaluations.filter(e => e.status === "بانتظار_مراجعة_المدير");
    const historical = evaluations.filter(e => e.isHistorical);
    const withPenalties = evaluations.filter(e => (e.penaltyDeductionPercent || 0) > 0);
    const avg = Math.round((evaluations.reduce((acc, e) => acc + (Number(e.overallScore) || 0), 0) / total) * 10) / 10;
    const top = evaluations.filter(e => e.overallScore >= 90).length;
    const needsImp = evaluations.filter(e => e.overallScore < 70).length;
    return {
      avgScore: avg,
      approvedCount: approved.length,
      pendingApprovalCount: pending.length,
      historicalCount: historical.length,
      withPenaltiesCount: withPenalties.length,
      topCount: top,
      needsImprovementCount: needsImp
    };
  }, [evaluations]);

  // Export handler
  const handleExport = async () => {
    try {
      await exportWorkbook(s, "evaluations");
      toast.success("تم تصدير تقييمات ومؤشرات الأداء وسجل الجزاءات إلى Excel بنجاح");
    } catch {
      toast.error("حدث خطأ أثناء تصدير البيانات");
    }
  };

  // Seed preset KPIs for current job
  const handleSeedPresets = async () => {
    const presets = PRESET_JOB_KPIS[currentJob];
    if (!presets || !presets.length) {
      toast.info(`لا توجد مؤشرات جاهزة محفوظة مسبقاً للمهنة: ${currentJob}. يمكنك إضافتها يدوياً.`);
      return;
    }
    const existingTitles = new Set(jobKpis.filter(k => k.job === currentJob).map(k => k.title.trim()));
    const toAdd = presets.filter(p => !existingTitles.has(p.title.trim()));
    if (!toAdd.length) {
      toast.info("جميع المؤشرات المقترحة لهذه المهنة مضافة بالفعل.");
      return;
    }
    let successCount = 0;
    for (const item of toAdd) {
      const ok = await commit({ action: "jobKpi.save", kpi: item });
      if (ok) successCount++;
    }
    if (successCount > 0) {
      toast.success(`تمت إضافة ${successCount} مؤشرات أداء قياسية للمهنة: ${currentJob}`);
    }
  };

  // Delete KPI
  const handleDeleteKpi = async (kpi: JobKpi) => {
    if (!confirm(`هل أنت متأكد من حذف مؤشر الأداء: "${kpi.title}"؟`)) return;
    const ok = await commit({ action: "jobKpi.delete", id: kpi.id });
    if (ok) toast.success("تم حذف مؤشر الأداء بنجاح");
  };

  // Delete Evaluation
  const handleDeleteEval = async (ev: PerformanceEvaluation) => {
    const emp = s.employees.find(e => e.id === ev.employeeId);
    if (!confirm(`هل أنت متأكد من حذف تقييم الموظف: "${emp?.name || ''}" لفترة "${ev.period}"؟`)) return;
    const ok = await commit({ action: "evaluation.delete", id: ev.id });
    if (ok) toast.success("تم حذف التقييم بنجاح");
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Metric Cards */}
      <div className="metrics-grid">
        <div className="metric violet">
          <div className="metric-top">
            <span>متوسط تقييم الأداء العام</span>
            <span className="metric-icon"><Award size={20} /></span>
          </div>
          <div className="metric-value">
            <strong dir="ltr">{metrics.avgScore}%</strong>
          </div>
          <div className="metric-bottom">
            <span>إجمالي {evaluations.length} تقييماً مسجلاً</span>
          </div>
        </div>

        <div className="metric mint">
          <div className="metric-top">
            <span>التقييمات المعتمدة</span>
            <span className="metric-icon"><CheckCircle2 size={20} /></span>
          </div>
          <div className="metric-value">
            <strong dir="ltr">{metrics.approvedCount}</strong>
          </div>
          <div className="metric-bottom">
            <span>معتمدة رسمياً من مدير الإدارة</span>
          </div>
        </div>

        <div className="metric peach">
          <div className="metric-top">
            <span>بانتظار مراجعة وتأكيد المدير</span>
            <span className="metric-icon"><Clock size={20} /></span>
          </div>
          <div className="metric-value">
            <strong dir="ltr" className={metrics.pendingApprovalCount > 0 ? "text-amber-700" : ""}>
              {metrics.pendingApprovalCount}
            </strong>
          </div>
          <div className="metric-bottom">
            <span>أجراها المشرف المباشر وتنتظر التأكيد</span>
          </div>
        </div>

        <div className="metric blue">
          <div className="metric-top">
            <span>أرشيف السنوات السابقة</span>
            <span className="metric-icon"><History size={20} /></span>
          </div>
          <div className="metric-value">
            <strong dir="ltr">{metrics.historicalCount}</strong>
          </div>
          <div className="metric-bottom">
            <span>{metrics.withPenaltiesCount > 0 ? `${metrics.withPenaltiesCount} تقييم متضمن خصم جزاءات` : "تاريخ محفوظ لكل موظف"}</span>
          </div>
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "evaluations"
                ? "bg-primary text-white shadow-sm"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
            }`}
            onClick={() => setActiveTab("evaluations")}
          >
            <Award size={17} />
            <span>سجل تقييمات الأداء</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-black/15 font-mono">{evaluations.length}</span>
            {metrics.pendingApprovalCount > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold animate-pulse">
                {metrics.pendingApprovalCount} بانتظار المدير
              </span>
            )}
          </button>

          <button
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "kpis"
                ? "bg-primary text-white shadow-sm"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
            }`}
            onClick={() => setActiveTab("kpis")}
          >
            <Sliders size={17} />
            <span>مؤشرات الأداء للمهن (Job KPIs)</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-black/15 font-mono">{jobKpis.length}</span>
          </button>

          <button
            type="button"
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === "insights"
                ? "bg-primary text-white shadow-sm"
                : "bg-card text-muted-foreground hover:bg-accent hover:text-foreground border border-border"
            }`}
            onClick={() => setActiveTab("insights")}
          >
            <BarChart3 size={17} />
            <span>تحليلات ومستوى الأداء</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <ArrowDownToLine size={15} />
            <span>تصدير Excel</span>
          </Button>

          {activeTab === "evaluations" && (canConduct || canManage) && (
            <>
              <Button
                variant="outline"
                className="gap-1.5 border-primary/40 text-primary hover:bg-accent"
                size="sm"
                disabled={!s.employees.length}
                onClick={() => {
                  setEditingEvaluation(null);
                  setIsHistoricalEntry(true);
                  setIsNewEvalOpen(true);
                }}
              >
                <History size={15} />
                <span>إدخال تقييم سنة سابقة</span>
              </Button>

              <Button
                className="primary-button gap-1.5"
                size="sm"
                disabled={!s.employees.length}
                onClick={() => {
                  setEditingEvaluation(null);
                  setIsHistoricalEntry(false);
                  setIsNewEvalOpen(true);
                }}
              >
                <Plus size={16} />
                <span>إجراء تقييم جديد (المشرف)</span>
              </Button>
            </>
          )}

          {canManage && activeTab === "kpis" && (
            <Button
              className="primary-button gap-1.5"
              size="sm"
              onClick={() => {
                setEditingKpi(null);
                setIsNewKpiOpen(true);
              }}
            >
              <Plus size={16} />
              <span>إضافة مؤشر للمهنة</span>
            </Button>
          )}
        </div>
      </div>

      {/* TAB 1: Evaluations List */}
      {activeTab === "evaluations" && (
        <section className="panel space-y-4">
          <div className="panel-heading">
            <div>
              <h2 className="text-lg font-bold">سجل تقييمات الموظفين</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                إدارة ومتابعة تقارير الأداء الدوري والسنوي للموظفين واحتساب الدرجات الموزونة
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="search-control sm:col-span-2 lg:col-span-1">
              <Search size={17} />
              <input
                aria-label="البحث في التقييمات"
                placeholder="ابحث بالاسم، الرقم، المشرف، الإدارة…"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setEvalPage(1); }}
              />
            </div>

            <Choice
              label="السنة"
              value={filterYear}
              onChange={v => { setFilterYear(v); setEvalPage(1); }}
              options={[
                { value: "all", label: "جميع السنوات" },
                ...distinctYears.map(y => ({ value: y, label: `سنة ${y}` }))
              ]}
            />

            <Choice
              label="نوع السجل"
              value={filterType}
              onChange={v => { setFilterType(v as "all" | "current" | "historical"); setEvalPage(1); }}
              options={[
                { value: "all", label: "الكل (حالي + أرشيف)" },
                { value: "current", label: "تقييمات حالية فقط" },
                { value: "historical", label: "أرشيف السنوات السابقة" }
              ]}
            />

            <Choice
              label="التقدير العام"
              value={filterRating}
              onChange={v => { setFilterRating(v); setEvalPage(1); }}
              options={[
                { value: "all", label: "جميع التقديرات" },
                { value: "ممتاز", label: "ممتاز (90%+)" },
                { value: "جيد جداً", label: "جيد جداً (80-89%)" },
                { value: "جيد", label: "جيد (70-79%)" },
                { value: "مقبول", label: "مقبول (60-69%)" },
                { value: "يحتاج", label: "يحتاج إلى تحسين (<60%)" }
              ]}
            />

            <Choice
              label="حالة الاعتماد"
              value={filterStatus}
              onChange={v => { setFilterStatus(v); setEvalPage(1); }}
              options={[
                { value: "all", label: "جميع الحالات" },
                { value: "معتمد", label: "معتمد (مدير الإدارة)" },
                { value: "بانتظار_مراجعة_المدير", label: "بانتظار مراجعة وتأكيد المدير" },
                { value: "يحتاج_تعديل", label: "يحتاج تعديل من المشرف" },
                { value: "قيد المراجعة", label: "قيد المراجعة" },
                { value: "مسودة", label: "مسودة" }
              ]}
            />
          </div>

          {filteredEvaluations.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الموظف</TableHead>
                      <TableHead>الوظيفة / الإدارة</TableHead>
                      <TableHead>فترة / سنة التقييم</TableHead>
                      <TableHead>النتيجة والخصومات</TableHead>
                      <TableHead>التقدير العام</TableHead>
                      <TableHead>حالة الاعتماد</TableHead>
                      <TableHead>المشرف / المدير</TableHead>
                      <TableHead className="text-center">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvaluations.slice((evalPage - 1) * 10, evalPage * 10).map(ev => {
                      const emp = s.employees.find(e => e.id === ev.employeeId);
                      const isExcellent = ev.overallScore >= 90;
                      const isGood = ev.overallScore >= 75;
                      const isLow = ev.overallScore < 60;
                      const hasPenalties = (ev.penaltyDeductionPercent || 0) > 0;
                      const needsApproval = ev.status === "بانتظار_مراجعة_المدير";

                      return (
                        <TableRow key={ev.id} className={needsApproval ? "bg-amber-50/30" : undefined}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <Avatar name={emp?.name || "موظف"} src={emp?.photoDataUrl} />
                              <div>
                                <strong className="block text-sm font-semibold text-foreground">
                                  {emp?.name || "غير محدد"}
                                </strong>
                                <small className="text-xs text-muted-foreground font-mono">
                                  {emp?.code || "—"}
                                </small>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="text-sm">{emp?.job || "—"}</div>
                            <small className="text-xs text-muted-foreground">{emp?.department || "—"}</small>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
                                {ev.period}
                              </span>
                              {ev.isHistorical && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200 block w-fit">
                                  <History size={11} />
                                  أرشيف سابق {ev.evaluationYear ? `(${ev.evaluationYear})` : ""}
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <div className="w-28 space-y-1">
                              <div className="flex justify-between items-baseline text-xs font-bold">
                                <span>{ev.overallScore}%</span>
                                {hasPenalties && (
                                  <span className="text-[10px] text-rose-700 font-semibold" title={`خصم جزاءات: -${ev.penaltyDeductionPercent}% (${ev.penaltiesCount || 0} عقوبة)`}>
                                    (-{ev.penaltyDeductionPercent}%)
                                  </span>
                                )}
                              </div>
                              <Progress 
                                value={ev.overallScore} 
                                className={`h-2 ${isExcellent ? "bg-emerald-100" : isGood ? "bg-blue-100" : isLow ? "bg-rose-100" : "bg-amber-100"}`}
                              />
                              {hasPenalties && (
                                <small className="text-[10px] text-rose-600 block leading-tight">
                                  خصم {ev.penaltyDeductionPercent}% جزاءات
                                </small>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                isExcellent
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : isGood
                                  ? "bg-blue-100 text-blue-800 border border-blue-300"
                                  : isLow
                                  ? "bg-rose-100 text-rose-800 border border-rose-300"
                                  : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}
                            >
                              {ev.rating}
                            </span>
                          </TableCell>

                          <TableCell>
                            {ev.status === "معتمد" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 size={13} className="text-emerald-600" />
                                معتمد
                              </span>
                            ) : ev.status === "بانتظار_مراجعة_المدير" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                                <Clock size={13} className="text-amber-700" />
                                بانتظار المدير
                              </span>
                            ) : ev.status === "يحتاج_تعديل" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-900 border border-rose-300">
                                <AlertTriangle size={13} className="text-rose-600" />
                                يحتاج تعديل
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                                {ev.status}
                              </span>
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="text-xs font-medium text-foreground">
                              المشرف: {ev.supervisorName || ev.evaluator}
                            </div>
                            {ev.departmentHeadName ? (
                              <small className="text-[11px] text-emerald-700 font-semibold block">
                                تأكيد: {ev.departmentHeadName}
                              </small>
                            ) : (
                              <small className="text-xs text-muted-foreground block">{displayDate(ev.date)}</small>
                            )}
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              {/* Department Head Quick Review Button */}
                              {(canApprove || canManage) && (ev.status === "بانتظار_مراجعة_المدير" || ev.status === "يحتاج_تعديل") && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  title="مراجعة وتأكيد مدير الإدارة"
                                  onClick={() => setApprovalModalEval(ev)}
                                  className="h-8 px-2 gap-1 text-xs border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 font-bold"
                                >
                                  <ShieldCheck size={14} className="text-amber-700" />
                                  <span>تأكيد</span>
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="icon"
                                title="عرض تقرير التقييم"
                                onClick={() => setViewingEvaluation(ev)}
                                className="h-8 w-8 text-primary hover:bg-accent"
                              >
                                <Eye size={16} />
                              </Button>

                              {(canConduct || canManage) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="تعديل التقييم"
                                  onClick={() => {
                                    setEditingEvaluation(ev);
                                    setIsHistoricalEntry(!!ev.isHistorical);
                                    setIsNewEvalOpen(true);
                                  }}
                                  className="h-8 w-8 text-muted-foreground hover:bg-accent"
                                >
                                  <Edit size={16} />
                                </Button>
                              )}

                              {canManage && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="حذف التقييم"
                                  onClick={() => handleDeleteEval(ev)}
                                  className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                                >
                                  <Trash2 size={16} />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <Pager page={evalPage} setPage={setEvalPage} total={filteredEvaluations.length} />
            </>
          ) : (
            <NoData
              icon={<Award size={32} />}
              title={evaluations.length ? "لا توجد تقييمات مطابقة لمعايير البحث" : "لم يتم تسجيل أي تقييمات أداء بعد"}
              description={
                evaluations.length
                  ? "جرّب تغيير كلمات البحث أو إعادة ضبط الفلاتر."
                  : "ابدأ بإجراء تقييم أداء جديد لموظف واستند إلى مؤشرات الأداء المحددة لمهنته."
              }
            >
              {canManage && (
                <Button
                  className="primary-button mt-2"
                  disabled={!s.employees.length}
                  onClick={() => {
                    setEditingEvaluation(null);
                    setIsNewEvalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>إجراء تقييم أداء الآن</span>
                </Button>
              )}
            </NoData>
          )}
        </section>
      )}

      {/* TAB 2: Job KPIs Management */}
      {activeTab === "kpis" && (
        <section className="panel space-y-4">
          <div className="panel-heading flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">مؤشرات الأداء للمهن (Job KPIs)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                تحديد وضبط بطاقات مؤشرات الأداء الرئيسية (KPIs) لكل مهنة ووظيفة في المنشأة
              </p>
            </div>

            {canManage && (
              <div className="flex items-center gap-2">
                {PRESET_JOB_KPIS[currentJob] && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSeedPresets}
                    className="gap-1.5 text-primary border-primary/30 hover:bg-accent"
                  >
                    <Sparkles size={15} />
                    <span>اقتراح مؤشرات قياسية لـ «{currentJob}»</span>
                  </Button>
                )}
                <Button
                  className="primary-button gap-1.5"
                  size="sm"
                  onClick={() => {
                    setEditingKpi(null);
                    setIsNewKpiOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>إضافة مؤشر للمهنة</span>
                </Button>
              </div>
            )}
          </div>

          {/* Profession Selector & Search */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border border-border">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                اختر المهنة / الوظيفة المطلوبة:
              </label>
              <Choice
                label="المهنة"
                value={currentJob}
                onChange={v => setSelectedJob(v)}
                options={allProfessions.map(p => ({
                  value: p,
                  label: `${p} (${jobKpis.filter(k => k.job === p).length} مؤشر)`
                }))}
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                بحث في مؤشرات هذه المهنة:
              </label>
              <div className="search-control">
                <Search size={16} />
                <input
                  aria-label="بحث في المؤشرات"
                  placeholder="ابحث بعنوان المؤشر أو الوصف…"
                  value={kpiSearch}
                  onChange={e => setKpiSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="sm:col-span-1 flex flex-col justify-end">
              <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
                <span className="text-xs font-medium text-muted-foreground">مجموع أوزان المؤشرات:</span>
                <span
                  className={`font-mono text-sm font-bold px-2 py-0.5 rounded ${
                    totalCurrentJobWeight === 100
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {totalCurrentJobWeight}% / 100%
                </span>
              </div>
              {totalCurrentJobWeight !== 100 && (
                <small className="text-[11px] text-amber-700 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  يُفضّل أن يكون مجموع أوزان مؤشرات المهنة 100%
                </small>
              )}
            </div>
          </div>

          {/* KPIs List */}
          {currentJobKpis.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {currentJobKpis.map(k => (
                <div
                  key={k.id}
                  className="p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-base text-foreground leading-snug">
                        {k.title}
                      </h3>
                      <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-accent text-primary">
                        الوزن: {k.weight}%
                      </span>
                    </div>

                    {k.description && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {k.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed border-border text-xs">
                      <span className="text-muted-foreground">المستهدف:</span>
                      <strong className="text-foreground bg-muted px-2 py-0.5 rounded font-mono">
                        {k.target || "100%"}
                      </strong>
                      <span className="text-muted-foreground mr-auto">الوحدة: {k.unit || "%"}</span>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center justify-end gap-1.5 pt-3 mt-2 border-t border-border">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingKpi(k);
                          setIsNewKpiOpen(true);
                        }}
                      >
                        <Edit size={14} className="ml-1" />
                        تعديل
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2.5 text-xs text-rose-600 hover:bg-rose-50"
                        onClick={() => handleDeleteKpi(k)}
                      >
                        <Trash2 size={14} className="ml-1" />
                        حذف
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <NoData
              icon={<Target size={32} />}
              title={`لا توجد مؤشرات أداء مسجلة للمهنة: «${currentJob}»`}
              description="قم بإضافة مؤشرات تقييم مخصصة لهذه المهنة، أو استخدم المؤشرات القياسية المقترحة."
            >
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                {PRESET_JOB_KPIS[currentJob] && (
                  <Button variant="outline" onClick={handleSeedPresets} className="gap-1.5 text-primary border-primary">
                    <Sparkles size={16} />
                    <span>تطبيق المؤشرات المقترحة لـ «{currentJob}»</span>
                  </Button>
                )}
                {canManage && (
                  <Button
                    className="primary-button gap-1.5"
                    onClick={() => {
                      setEditingKpi(null);
                      setIsNewKpiOpen(true);
                    }}
                  >
                    <Plus size={16} />
                    <span>إضافة مؤشر يدوي للمهنة</span>
                  </Button>
                )}
              </div>
            </NoData>
          )}
        </section>
      )}

      {/* TAB 3: Insights & Performance Distribution */}
      {activeTab === "insights" && (
        <section className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rating distribution card */}
            <div className="panel space-y-3">
              <div className="panel-heading">
                <h2 className="text-base font-bold">توزيع مستويات الأداء للموظفين</h2>
              </div>
              <div className="space-y-3">
                {[
                  { label: "ممتاز (90% - 100%)", min: 90, max: 100, color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50" },
                  { label: "جيد جداً (80% - 89%)", min: 80, max: 89.9, color: "bg-blue-500", text: "text-blue-700", bg: "bg-blue-50" },
                  { label: "جيد (70% - 79%)", min: 70, max: 79.9, color: "bg-sky-500", text: "text-sky-700", bg: "bg-sky-50" },
                  { label: "مقبول (60% - 69%)", min: 60, max: 69.9, color: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" },
                  { label: "يحتاج إلى تحسين (أقل من 60%)", min: 0, max: 59.9, color: "bg-rose-500", text: "text-rose-700", bg: "bg-rose-50" }
                ].map(tier => {
                  const count = evaluations.filter(e => e.overallScore >= tier.min && e.overallScore <= tier.max).length;
                  const pct = evaluations.length ? Math.round((count / evaluations.length) * 100) : 0;
                  return (
                    <div key={tier.label} className={`p-3 rounded-lg border border-border/60 ${tier.bg}`}>
                      <div className="flex items-center justify-between text-xs font-semibold mb-1">
                        <span className={tier.text}>{tier.label}</span>
                        <span className="font-mono">{count} موظف ({pct}%)</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Performers Card */}
            <div className="panel space-y-3">
              <div className="panel-heading">
                <h2 className="text-base font-bold">أعلى الموظفين أداءً (Top Performers)</h2>
              </div>
              <div className="space-y-2.5">
                {evaluations
                  .slice()
                  .sort((a, b) => b.overallScore - a.overallScore)
                  .slice(0, 5)
                  .map(ev => {
                    const emp = s.employees.find(e => e.id === ev.employeeId);
                    return (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-card"
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar name={emp?.name || "موظف"} src={emp?.photoDataUrl} />
                          <div>
                            <strong className="block text-sm text-foreground">{emp?.name || "غير محدد"}</strong>
                            <small className="text-xs text-muted-foreground">{emp?.job || "—"} · {ev.period}</small>
                          </div>
                        </div>
                        <div className="text-left">
                          <span className="block font-mono font-bold text-sm text-emerald-700">{ev.overallScore}%</span>
                          <span className="text-[11px] text-muted-foreground">{ev.rating}</span>
                        </div>
                      </div>
                    );
                  })}
                {!evaluations.length && (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    ستظهر قائمة المتميزين هنا فور تسجيل واعتماد تقييمات الأداء.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Historical Employee Progression Timeline */}
          <div className="panel space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="text-base font-bold flex items-center gap-2">
                  <History size={18} className="text-primary" />
                  السجل والمسار التاريخي لتقييمات الموظف عبر السنوات
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  استعراض تطور الأداء والنتائج الصافية بعد خصومات الجزاءات للموظف عبر السنوات السابقة والحالية
                </p>
              </div>

              <div className="w-64">
                <select
                  aria-label="اختر الموظف لاستعراض سجله التاريخي"
                  className="w-full text-xs font-semibold px-3 py-2 rounded-lg border border-border bg-card text-foreground"
                  value={historyTrackerEmpId || (s.employees[0]?.id || "")}
                  onChange={e => setHistoryTrackerEmpId(e.target.value)}
                >
                  {s.employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.code || emp.job || "موظف"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(() => {
              const currentEmpId = historyTrackerEmpId || s.employees[0]?.id;
              const targetEmp = s.employees.find(e => e.id === currentEmpId);
              const empEvals = evaluations
                .filter(ev => ev.employeeId === currentEmpId)
                .sort((a, b) => {
                  const yA = a.evaluationYear || Number(a.date.slice(0, 4)) || 0;
                  const yB = b.evaluationYear || Number(b.date.slice(0, 4)) || 0;
                  return yB - yA;
                });

              if (!targetEmp) {
                return (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    لا يوجد موظفون مسجلون في النظام حالياً.
                  </p>
                );
              }

              if (!empEvals.length) {
                return (
                  <div className="text-center py-8 bg-muted/20 border border-dashed border-border rounded-xl space-y-2">
                    <History size={28} className="mx-auto text-muted-foreground/60" />
                    <p className="text-xs font-medium text-muted-foreground">
                      لم يتم تسجيل تقييمات سابقة أو حالية للموظف: <strong>{targetEmp.name}</strong> بعد.
                    </p>
                    {(canConduct || canManage) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs text-primary border-primary/40 mt-1"
                        onClick={() => {
                          setEditingEvaluation(null);
                          setIsHistoricalEntry(true);
                          setIsNewEvalOpen(true);
                        }}
                      >
                        <History size={13} />
                        <span>إدخال تقييم سنة سابقة له الآن</span>
                      </Button>
                    )}
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border">
                    <Avatar name={targetEmp.name} src={targetEmp.photoDataUrl} />
                    <div>
                      <strong className="block text-sm text-foreground">{targetEmp.name}</strong>
                      <small className="text-xs text-muted-foreground">
                        {targetEmp.job || "—"} · {targetEmp.department || "—"} · الرقم الوظيفي: {targetEmp.code || "—"}
                      </small>
                    </div>
                    <div className="mr-auto text-left">
                      <span className="text-xs text-muted-foreground block">إجمالي التقييمات المحفوظة</span>
                      <strong className="text-sm font-bold text-foreground font-mono">{empEvals.length} سنوات / فترات</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {empEvals.map(ev => {
                      const yr = ev.evaluationYear || ev.date.slice(0, 4);
                      const hasPenalties = (ev.penaltyDeductionPercent || 0) > 0;
                      return (
                        <div
                          key={ev.id}
                          className="p-3.5 rounded-xl border border-border bg-card space-y-2.5 shadow-xs hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-black text-base text-foreground">
                                سنة {yr}
                              </span>
                              {ev.isHistorical && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                                  أرشيف
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                                ev.status === "معتمد"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-amber-100 text-amber-800 border border-amber-300"
                              }`}
                            >
                              {ev.status === "معتمد" ? "معتمد رسمياً" : ev.status}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-lg bg-muted/50 border border-border/70 space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-muted-foreground">درجة المؤشرات (Raw):</span>
                              <span className="font-mono font-semibold text-foreground">
                                {ev.rawScore != null ? `${ev.rawScore}%` : `${ev.overallScore}%`}
                              </span>
                            </div>
                            {hasPenalties ? (
                              <div className="flex justify-between items-center text-xs text-rose-700">
                                <span className="flex items-center gap-1 font-medium">
                                  <AlertTriangle size={12} />
                                  خصم الجزاءات ({ev.penaltiesCount || 0} عقوبة):
                                </span>
                                <span className="font-mono font-bold">-{ev.penaltyDeductionPercent}%</span>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                                <span>سجل الانضباط:</span>
                                <span className="text-emerald-700 font-medium">نظيف (بدون خصم)</span>
                              </div>
                            )}
                            <div className="pt-1.5 border-t border-border flex justify-between items-center">
                              <span className="text-xs font-bold text-foreground">النتيجة النهائية:</span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-black font-mono text-primary">{ev.overallScore}%</span>
                                <span className="text-xs font-bold text-muted-foreground">({ev.rating})</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-[11px] text-muted-foreground space-y-0.5">
                            <div>المشرف المباشر: <strong className="text-foreground">{ev.supervisorName || ev.evaluator}</strong></div>
                            {ev.departmentHeadName && (
                              <div>تأكيد مدير الإدارة: <strong className="text-emerald-700">{ev.departmentHeadName}</strong></div>
                            )}
                          </div>

                          <div className="pt-2 border-t border-border flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-primary gap-1 px-2"
                              onClick={() => setViewingEvaluation(ev)}
                            >
                              <Eye size={13} />
                              عرض التقرير
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* DIALOG: Add / Edit Job KPI */}
      <Dialog open={isNewKpiOpen} onOpenChange={open => { if (!open && !busy) setIsNewKpiOpen(false); }}>
        <DialogContent className="app-dialog" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingKpi ? "تعديل مؤشر أداء المهنة" : "إضافة مؤشر أداء جديد للمهنة"}
            </DialogTitle>
            <DialogDescription>
              حدد اسم المؤشر ومستهدفه ووزنه النسبي لتطبيقه على شاغلي هذه المهنة
            </DialogDescription>
          </DialogHeader>

          <KpiForm
            initial={editingKpi}
            defaultJob={currentJob}
            allProfessions={allProfessions}
            busy={busy}
            onSave={async (kpiData) => {
              const ok = await commit({ action: "jobKpi.save", kpi: kpiData });
              if (ok) {
                toast.success(editingKpi ? "تم تعديل مؤشر الأداء بنجاح" : "تمت إضافة مؤشر الأداء للمهنة بنجاح");
                setIsNewKpiOpen(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* DIALOG: Add / Edit Evaluation */}
      <Dialog open={isNewEvalOpen} onOpenChange={open => { if (!open && !busy) setIsNewEvalOpen(false); }}>
        <DialogContent className="app-dialog large-dialog max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingEvaluation
                ? "تعديل تقييم أداء الموظف"
                : isHistoricalEntry
                ? "إدخال تقييم سنة سابقة (حفظ الأرشيف التاريخي للموظف)"
                : "إجراء تقييم أداء وظيفي جديد (المشرف المباشر)"}
            </DialogTitle>
            <DialogDescription>
              {isHistoricalEntry
                ? "سجل بيانات ودرجة التقييم لسنة سابقة لحفظ تاريخ الموظف المهني مع رصد أي جزاءات أو عقوبات معتمدة"
                : "قيّم كل مؤشر أداء حسب الإنجاز الفعلي، ورصد نسبة خصم الجزاءات إن وجدت، ثم أرسل التقييم لمدير الإدارة للمراجعة والتأكيد"}
            </DialogDescription>
          </DialogHeader>

          <EvaluationForm
            initial={editingEvaluation}
            isHistoricalInitial={isHistoricalEntry}
            s={s}
            busy={busy}
            canConduct={canConduct}
            canApprove={canApprove}
            currentUser={currentUser}
            onSave={async (evalData) => {
              const ok = await commit({ action: "evaluation.save", evaluation: evalData });
              if (ok) {
                toast.success(
                  editingEvaluation
                    ? "تم تعديل التقييم بنجاح"
                    : evalData.isHistorical
                    ? "تم حفظ تقييم السنة السابقة في الأرشيف التاريخي بنجاح"
                    : evalData.status === "معتمد"
                    ? "تم اعتماد وحفظ تقييم الأداء بنجاح"
                    : "تم حفظ التقييم وإرساله لمدير الإدارة للمراجعة والتأكيد بنجاح"
                );
                setIsNewEvalOpen(false);
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* DIALOG: Department Head Review & Approval */}
      <Dialog open={!!approvalModalEval} onOpenChange={open => { if (!open && !busy) setApprovalModalEval(null); }}>
        <DialogContent className="app-dialog large-dialog max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          {approvalModalEval && (
            <DepartmentHeadApprovalModal
              ev={approvalModalEval}
              s={s}
              currentUser={currentUser}
              busy={busy}
              onClose={() => setApprovalModalEval(null)}
              onCommit={async (payload) => {
                const ok = await commit(payload);
                if (ok) {
                  setApprovalModalEval(null);
                }
                return ok;
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG: View Evaluation Details / Printable Report */}
      <Dialog open={!!viewingEvaluation} onOpenChange={open => { if (!open) setViewingEvaluation(null); }}>
        <DialogContent className="app-dialog large-dialog max-w-3xl max-h-[90vh] overflow-y-auto print:p-0 print:border-none" dir="rtl">
          {viewingEvaluation && (
            <EvaluationReportView
              ev={viewingEvaluation}
              s={s}
              onClose={() => setViewingEvaluation(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ----------------------------------------------------------------------
// FORM: Add / Edit Job KPI
// ----------------------------------------------------------------------
function KpiForm({
  initial,
  defaultJob,
  allProfessions,
  busy,
  onSave
}: {
  initial: JobKpi | null;
  defaultJob: string;
  allProfessions: string[];
  busy: boolean;
  onSave: (kpi: Partial<JobKpi>) => Promise<void>;
}) {
  const [job, setJob] = useState(initial?.job || defaultJob);
  const [customJob, setCustomJob] = useState("");
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [target, setTarget] = useState(initial?.target || "100%");
  const [weight, setWeight] = useState(initial?.weight || 25);
  const [unit, setUnit] = useState(initial?.unit || "%");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const selectedJobFinal = (job === "_custom" ? customJob : job).trim();
    if (!selectedJobFinal) {
      setError("يرجى تحديد المهنة أو الوظيفة");
      return;
    }
    if (!title.trim()) {
      setError("اسم مؤشر الأداء مطلوب");
      return;
    }
    if (weight <= 0 || weight > 100) {
      setError("يجب أن يكون وزن المؤشر بين 1 و 100");
      return;
    }
    try {
      await onSave({
        id: initial?.id,
        job: selectedJobFinal,
        title: title.trim(),
        description: description.trim(),
        target: target.trim() || "100%",
        weight: Number(weight),
        unit: unit.trim() || "%"
      });
    } catch (err: any) {
      setError(err?.message || "تعذر حفظ مؤشر الأداء");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="form-grid">
        <Field label="المهنة / الوظيفة *" wide>
          <div className="space-y-2">
            <Choice
              label="اختر المهنة"
              value={job}
              onChange={v => setJob(v)}
              options={[
                ...allProfessions.map(p => ({ value: p, label: p })),
                { value: "_custom", label: "+ مهنة جديدة أخرى…" }
              ]}
            />
            {job === "_custom" && (
              <input
                required
                placeholder="اكتب اسم المهنة الجديدة (مثال: أخصائي تسويق، مراقب جودة…)"
                value={customJob}
                onChange={e => setCustomJob(e.target.value)}
              />
            )}
          </div>
        </Field>

        <Field label="اسم مؤشر الأداء (KPI) *" wide>
          <input
            required
            minLength={2}
            maxLength={160}
            placeholder="مثال: دقة إعداد التقارير المالية، تحقيق المبيعات…"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </Field>

        <Field label="المستهدف (Target) *">
          <input
            required
            maxLength={80}
            placeholder="مثال: 95%، 10 مهام شهرياً، دون أخطاء…"
            value={target}
            onChange={e => setTarget(e.target.value)}
          />
        </Field>

        <Field label="الوزن النسبي (%) *" hint="نسبة مساهمة هذا المؤشر في التقييم الكلي">
          <input
            type="number"
            required
            min={1}
            max={100}
            step={1}
            value={weight}
            onChange={e => setWeight(Number(e.target.value))}
          />
        </Field>

        <Field label="وحدة القياس" hint="مثال: %، مهمة، يوم، عميل">
          <input
            maxLength={40}
            placeholder="%"
            value={unit}
            onChange={e => setUnit(e.target.value)}
          />
        </Field>

        <Field label="الوصف والمعايير التفصيلية للمؤشر" wide>
          <textarea
            rows={3}
            maxLength={800}
            placeholder="اشرح كيفية قياس هذا المؤشر وما هي معايير النجاح والامتياز…"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </Field>
      </div>

      {error && <p role="alert" className="error-box">{error}</p>}

      <div className="form-footer">
        <SaveButton busy={busy}>{initial ? "حفظ التعديلات" : "إضافة المؤشر للمهنة"}</SaveButton>
      </div>
    </form>
  );
}

// ----------------------------------------------------------------------
// FORM: Add / Edit Employee Performance Evaluation
// ----------------------------------------------------------------------
function EvaluationForm({
  initial,
  isHistoricalInitial = false,
  s,
  busy,
  canConduct = true,
  canApprove = false,
  currentUser = "",
  onSave
}: {
  initial: PerformanceEvaluation | null;
  isHistoricalInitial?: boolean;
  s: Snapshot;
  busy: boolean;
  canConduct?: boolean;
  canApprove?: boolean;
  currentUser?: string;
  onSave: (ev: Partial<PerformanceEvaluation>) => Promise<void>;
}) {
  const [employeeId, setEmployeeId] = useState(initial?.employeeId || s.employees[0]?.id || "");
  const [isHistorical, setIsHistorical] = useState(initial?.isHistorical ?? isHistoricalInitial);
  
  const currentYear = new Date().getFullYear();
  const [evaluationYear, setEvaluationYear] = useState<number>(() => {
    if (initial?.evaluationYear) return initial.evaluationYear;
    if (isHistoricalInitial) return currentYear - 1;
    return currentYear;
  });

  const [period, setPeriod] = useState(
    initial?.period || (isHistoricalInitial ? `${currentYear - 1} - التقييم السنوي` : `${currentYear} - التقييم السنوي`)
  );
  const [date, setDate] = useState(initial?.date || today());

  // Direct Supervisor Info
  const [supervisorName, setSupervisorName] = useState(
    initial?.supervisorName || initial?.evaluator || (canConduct && currentUser ? currentUser : s.access?.name || "المشرف المباشر")
  );
  const [supervisorDate, setSupervisorDate] = useState(initial?.supervisorDate || initial?.date || today());
  const [supervisorNotes, setSupervisorNotes] = useState(initial?.supervisorNotes || "");

  // Department Head Info
  const [departmentHeadName, setDepartmentHeadName] = useState(
    initial?.departmentHeadName || (canApprove && currentUser ? currentUser : "")
  );
  const [departmentHeadDate, setDepartmentHeadDate] = useState(
    initial?.departmentHeadDate || (canApprove ? today() : "")
  );
  const [departmentHeadNotes, setDepartmentHeadNotes] = useState(initial?.departmentHeadNotes || "");

  // Status
  const [status, setStatus] = useState<PerformanceEvaluation["status"]>(() => {
    if (initial?.status) return initial.status;
    if (isHistoricalInitial) return "معتمد";
    if (canApprove) return "معتمد";
    return "بانتظار_مراجعة_المدير";
  });

  // Penalties & Disciplinary fields
  const [penaltiesCount, setPenaltiesCount] = useState<number>(initial?.penaltiesCount || 0);
  const [penaltyDeductionPercent, setPenaltyDeductionPercent] = useState<number>(initial?.penaltyDeductionPercent || 0);
  const [penaltyDetails, setPenaltyDetails] = useState<string>(initial?.penaltyDetails || "");

  // Quick Historical Archive Mode (allows inserting overall score directly without dissecting into granular KPIs if from old paper file)
  const [quickHistoricalMode, setQuickHistoricalMode] = useState<boolean>(Boolean(isHistoricalInitial && !initial));
  const [quickRawScore, setQuickRawScore] = useState<number>(initial?.rawScore || 85);

  const selectedEmployee = s.employees.find(e => e.id === employeeId);

  // Auto-detect disciplinary actions from finances / history for this employee in this year
  const detectedDisciplinary = useMemo(() => {
    if (!employeeId) return [];
    const list: { source: string; date: string; title: string; amount?: number }[] = [];
    const targetYrStr = String(evaluationYear);

    // Scan employment history
    (s.history || []).forEach(h => {
      if (h.employeeId === employeeId) {
        const hYear = (h.date || "").slice(0, 4);
        const text = `${h.type || ""} ${h.reason || ""} ${h.notes || ""} ${h.decisionNo || ""}`.toLowerCase();
        if (text.includes("إنذار") || text.includes("عقوبة") || text.includes("جزاء") || text.includes("خصم") || text.includes("مخالفة") || text.includes("لفت نظر")) {
          if (!targetYrStr || hYear === targetYrStr || !hYear) {
            list.push({
              source: "سجل حركات الموظف",
              date: h.date || "—",
              title: h.reason || h.notes || h.type || "إجراء انضباطي"
            });
          }
        }
      }
    });

    // Scan finances for deduction penalties
    (s.finances || []).forEach(f => {
      if (f.employeeId === employeeId) {
        const fDate = f.startDate || f.dueDate || "";
        const fYear = fDate.slice(0, 4);
        const text = `${f.title || ""} ${f.notes || ""} ${f.kind || ""}`.toLowerCase();
        if (text.includes("جزاء") || text.includes("عقوبة") || text.includes("إنذار") || text.includes("مخالفة") || text.includes("غرامة") || text.includes("خصم")) {
          if (!targetYrStr || fYear === targetYrStr || !fYear) {
            list.push({
              source: "المالية والالتزامات (خصم / جزاء)",
              date: fDate || "—",
              title: f.title || f.notes || "خصم جزاء",
              amount: f.amountFils ? Math.round((f.amountFils / 1000) * 1000) / 1000 : undefined
            });
          }
        }
      }
    });

    return list;
  }, [employeeId, evaluationYear, s.history, s.finances]);

  // Import detected penalties helper
  const handleImportDetectedPenalties = () => {
    if (!detectedDisciplinary.length) return;
    const count = detectedDisciplinary.length;
    setPenaltiesCount(count);
    // Suggested rule: 2.5% per warning/penalty, max 25%
    const suggestedDeduction = Math.min(25, Math.round(count * 2.5 * 10) / 10);
    setPenaltyDeductionPercent(suggestedDeduction);
    const summary = detectedDisciplinary
      .map(d => `${d.date} (${d.source}): ${d.title}${d.amount ? ` - خصم ${d.amount} ر.س` : ""}`)
      .join(" | ");
    setPenaltyDetails(prev => (prev ? `${prev} | ${summary}` : summary));
    toast.success(`تم استيراد ${count} عقوبة/إنذار واحتساب نسبة خصم مقترحة ${suggestedDeduction}%`);
  };

  // Initialize KPI scores: either from initial or matching job KPIs
  const [kpiScores, setKpiScores] = useState<KpiScoreItem[]>(() => {
    if (initial?.kpiScores?.length) return initial.kpiScores;
    const matchingKpis = s.jobKpis.filter(k => k.job === selectedEmployee?.job);
    if (matchingKpis.length) {
      return matchingKpis.map(k => ({
        kpiId: k.id,
        title: k.title,
        target: k.target,
        weight: k.weight,
        score: 85,
        actual: "",
        notes: ""
      }));
    }
    // Fallback standard KPIs if none defined
    return [
      { title: "جودة العمل ودقة المخرجات", weight: 30, score: 85, target: "95%", actual: "", notes: "" },
      { title: "الإنتاجية وإنجاز المهام في المواعيد", weight: 25, score: 80, target: "100%", actual: "", notes: "" },
      { title: "الالتزام بالحضور وسياسات العمل", weight: 25, score: 90, target: "100%", actual: "", notes: "" },
      { title: "التعاون وروح الفريق والمبادرة", weight: 20, score: 85, target: "ممتاز", actual: "", notes: "" }
    ];
  });

  const [strengths, setStrengths] = useState(initial?.strengths || "");
  const [improvements, setImprovements] = useState(initial?.improvements || "");
  const [recommendations, setRecommendations] = useState(initial?.recommendations || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  const [error, setError] = useState("");

  // When changing employee, offer to load that employee's profession KPIs
  const handleEmployeeChange = (newEmpId: string) => {
    setEmployeeId(newEmpId);
    const emp = s.employees.find(e => e.id === newEmpId);
    if (!emp) return;
    const matchingKpis = s.jobKpis.filter(k => k.job === emp.job);
    if (matchingKpis.length > 0) {
      setKpiScores(matchingKpis.map(k => ({
        kpiId: k.id,
        title: k.title,
        target: k.target,
        weight: k.weight,
        score: 85,
        actual: "",
        notes: ""
      })));
    }
  };

  // Live calculation of overall score & rating including penalty deduction
  const { overallScore, rating, rawScore } = useMemo(() => {
    if (isHistorical && quickHistoricalMode) {
      const raw = Math.min(100, Math.max(0, Number(quickRawScore) || 0));
      const deduction = Math.max(0, Number(penaltyDeductionPercent) || 0);
      const net = Math.max(0, Math.min(100, Math.round((raw - deduction) * 10) / 10));
      let r = "يحتاج إلى تحسين";
      if (net >= 90) r = "ممتاز";
      else if (net >= 80) r = "جيد جداً";
      else if (net >= 70) r = "جيد";
      else if (net >= 60) r = "مقبول";
      return { overallScore: net, rating: r, rawScore: raw };
    }

    return calculateOverallScore(kpiScores, Number(penaltyDeductionPercent) || 0);
  }, [kpiScores, penaltyDeductionPercent, isHistorical, quickHistoricalMode, quickRawScore]);

  const totalWeight = useMemo(() => {
    return kpiScores.reduce((sum, k) => sum + (Number(k.weight) || 0), 0);
  }, [kpiScores]);

  // Update a specific KPI score item
  const updateKpiItem = (index: number, patch: Partial<KpiScoreItem>) => {
    setKpiScores(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  // Add ad-hoc KPI row
  const addKpiRow = () => {
    setKpiScores(prev => [
      ...prev,
      { title: "مؤشر إضافي جديد", weight: 10, score: 80, target: "100%", actual: "", notes: "" }
    ]);
  };

  // Remove KPI row
  const removeKpiRow = (index: number) => {
    if (kpiScores.length <= 1) {
      toast.error("يجب الإبقاء على مؤشر أداء واحد على الأقل");
      return;
    }
    setKpiScores(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveWithStatus = async (targetStatus?: PerformanceEvaluation["status"]) => {
    setError("");
    if (!employeeId) {
      setError("يرجى اختيار الموظف المراد تقييمه");
      return;
    }

    if (!isHistorical || !quickHistoricalMode) {
      if (!kpiScores.length) {
        setError("يجب إضافة مؤشر أداء واحد على الأقل");
        return;
      }
    }

    const finalStatus = targetStatus || status;

    // In historical archive mode, if using quick mode, formulate a consolidated KPI entry
    const finalKpiScores = (isHistorical && quickHistoricalMode)
      ? [
          {
            title: `التقييم التاريخي الإجمالي لسنة ${evaluationYear}`,
            target: "100%",
            weight: 100,
            score: rawScore,
            actual: `سجل تاريخي محفوظ (${rawScore}%)`,
            notes: "أرشيف سنوات سابقة"
          }
        ]
      : kpiScores;

    try {
      await onSave({
        id: initial?.id,
        employeeId,
        period: period.trim(),
        evaluationYear: Number(evaluationYear) || Number(date.slice(0, 4)),
        isHistorical: Boolean(isHistorical),
        date,
        evaluator: supervisorName.trim() || evaluatorNameFallback(currentUser, s),
        status: finalStatus,
        kpiScores: finalKpiScores,
        rawScore,
        penaltyDeductionPercent: Number(penaltyDeductionPercent) || 0,
        penaltiesCount: Number(penaltiesCount) || 0,
        penaltyDetails: penaltyDetails.trim(),
        overallScore,
        rating,
        supervisorName: supervisorName.trim(),
        supervisorDate,
        supervisorNotes: supervisorNotes.trim(),
        departmentHeadName: departmentHeadName.trim(),
        departmentHeadDate: departmentHeadDate || (finalStatus === "معتمد" ? today() : ""),
        departmentHeadNotes: departmentHeadNotes.trim(),
        strengths: strengths.trim(),
        improvements: improvements.trim(),
        recommendations: recommendations.trim(),
        notes: notes.trim()
      });
    } catch (err: any) {
      setError(err?.message || "تعذر حفظ تقييم الأداء");
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSaveWithStatus(); }} className="space-y-6">
      {/* Historical & Year Controls Banner */}
      <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-bold text-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isHistorical}
                onChange={e => {
                  const val = e.target.checked;
                  setIsHistorical(val);
                  if (val && !initial) {
                    setEvaluationYear(currentYear - 1);
                    setPeriod(`${currentYear - 1} - التقييم السنوي`);
                    setStatus("معتمد");
                  } else if (!val && !initial) {
                    setEvaluationYear(currentYear);
                    setPeriod(`${currentYear} - التقييم السنوي`);
                    setStatus(canApprove ? "معتمد" : "بانتظار_مراجعة_المدير");
                  }
                }}
                className="rounded border-border text-primary focus:ring-primary w-4 h-4"
              />
              <span className="flex items-center gap-1.5 text-blue-800">
                <History size={15} />
                تسجيل كـ «تقييم سنة سابقة» (حفظ الأرشيف التاريخي للموظف)
              </span>
            </label>
          </div>

          {isHistorical && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={quickHistoricalMode}
                  onChange={e => setQuickHistoricalMode(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-3.5 h-3.5"
                />
                <span>إدخال سريع للنتيجة الإجمالية (بدون تفكيك المؤشرات)</span>
              </label>
            </div>
          )}
        </div>

        {isHistorical && (
          <p className="text-xs text-blue-700 bg-blue-50/70 p-2.5 rounded-lg border border-blue-200">
            <strong>ملاحظة الأرشيف التاريخي:</strong> يمكنك إدخال التقييمات السابقة للموظف من الملفات القديمة ليحتفظ النظام بتاريخ أدائه التراكمي ومقارنة تطوره عبر السنوات.
          </p>
        )}
      </div>

      {/* Main Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-card p-3.5 rounded-xl border border-border">
        <Field label="الموظف المراد تقييمه *">
          <Choice
            label="اختر الموظف"
            value={employeeId}
            onChange={handleEmployeeChange}
            options={s.employees.map(e => ({
              value: e.id,
              label: `${e.name} (${e.code || "بدون كود"}) - ${e.job || "بدون وظيفة"}`
            }))}
          />
        </Field>

        <Field label="سنة التقييم *" hint="السنة المالية / الإدارية للتقييم">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              required
              min={2010}
              max={currentYear + 2}
              value={evaluationYear}
              onChange={e => {
                const yr = Number(e.target.value);
                setEvaluationYear(yr);
                if (period.includes(" - ")) {
                  const part = period.split(" - ")[1] || "التقييم السنوي";
                  setPeriod(`${yr} - ${part}`);
                }
              }}
              className="w-full text-xs font-mono font-bold"
            />
            {isHistorical && (
              <div className="flex gap-1">
                <button
                  type="button"
                  className="px-2 py-1 text-[11px] rounded bg-muted hover:bg-muted/80 text-foreground"
                  onClick={() => {
                    setEvaluationYear(currentYear - 1);
                    setPeriod(`${currentYear - 1} - التقييم السنوي`);
                  }}
                >
                  {currentYear - 1}
                </button>
                <button
                  type="button"
                  className="px-2 py-1 text-[11px] rounded bg-muted hover:bg-muted/80 text-foreground"
                  onClick={() => {
                    setEvaluationYear(currentYear - 2);
                    setPeriod(`${currentYear - 2} - التقييم السنوي`);
                  }}
                >
                  {currentYear - 2}
                </button>
              </div>
            )}
          </div>
        </Field>

        <Field label="فترة التقييم *">
          <input
            required
            list="evaluation-periods-list"
            placeholder="مثال: 2024 - التقييم السنوي"
            value={period}
            onChange={e => setPeriod(e.target.value)}
          />
          <datalist id="evaluation-periods-list">
            <option value={`${evaluationYear} - التقييم السنوي`} />
            <option value={`${evaluationYear} - النصف الأول H1`} />
            <option value={`${evaluationYear} - النصف الثاني H2`} />
            <option value={`${evaluationYear} - الربع الأول Q1`} />
            <option value={`${evaluationYear} - الربع الثاني Q2`} />
            <option value={`${evaluationYear} - الربع الثالث Q3`} />
            <option value={`${evaluationYear} - الربع الرابع Q4`} />
          </datalist>
        </Field>

        <Field label="تاريخ تسجيل التقييم *">
          <input
            type="date"
            required
            value={date}
            onChange={e => setDate(e.target.value)}
          />
        </Field>
      </div>

      {/* Selected Employee Context Banner */}
      {selectedEmployee && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-accent/40 border border-primary/20 text-xs">
          <div className="flex items-center gap-2">
            <Avatar name={selectedEmployee.name} src={selectedEmployee.photoDataUrl} small />
            <span>
              <strong>{selectedEmployee.name}</strong> · الوظيفة: <strong>{selectedEmployee.job || "غير محدد"}</strong> · الإدارة: {selectedEmployee.department || "غير محدد"}
            </span>
          </div>
          <span className="text-muted-foreground font-mono">الرقم الوظيفي: {selectedEmployee.code || "—"}</span>
        </div>
      )}

      {/* DISCIPLINARY & PENALTIES DEDUCTION SECTION */}
      <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 dark:bg-rose-950/20 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rose-200/80 pb-2">
          <div>
            <h3 className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-rose-600" />
              سجل العقوبات والإنذارات ونسبة الخصم من التقييم النهائي
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              يتم رصد العقوبات والإنذارات التي حصل عليها الموظف خلال سنة التقييم لخصم نسبتها تلقائياً من النتيجة الإجمالية
            </p>
          </div>

          {detectedDisciplinary.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleImportDetectedPenalties}
              className="gap-1.5 text-xs text-rose-700 border-rose-300 bg-card hover:bg-rose-100"
            >
              <Sparkles size={13} />
              <span>استيراد ({detectedDisciplinary.length}) جزاء مسجل في النظام واقتراح الخصم</span>
            </Button>
          )}
        </div>

        {detectedDisciplinary.length > 0 && (
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <span className="font-bold flex items-center gap-1">
              <AlertCircle size={13} className="text-amber-600" />
              تنبيه: تم العثور على {detectedDisciplinary.length} حركة جزاء/خصم/إنذار مسجلة للموظف في سنة {evaluationYear}:
            </span>
            <ul className="list-disc list-inside text-[11px] space-y-0.5 text-muted-foreground mr-1">
              {detectedDisciplinary.map((d, idx) => (
                <li key={idx}>
                  {d.date}: {d.title} ({d.source}){d.amount ? ` - خصم ${d.amount} ر.س` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field
            label="عدد العقوبات والإنذارات"
            hint="إجمالي الإنذارات والجزاءات خلال السنة"
          >
            <div className="relative">
              <input
                type="number"
                min={0}
                max={50}
                value={penaltiesCount}
                onChange={e => {
                  const c = Math.max(0, Number(e.target.value));
                  setPenaltiesCount(c);
                  // Auto suggest 2.5% per penalty if deduction was 0
                  if (penaltyDeductionPercent === 0 && c > 0) {
                    setPenaltyDeductionPercent(Math.min(25, Math.round(c * 2.5 * 10) / 10));
                  }
                }}
                className="w-full text-xs font-mono font-bold"
              />
            </div>
          </Field>

          <Field
            label="نسبة الخصم من التقييم النهائي (%) *"
            hint="تُخصم مباشرة من درجة المؤشرات الفنية"
          >
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={50}
                step={0.5}
                required
                value={penaltyDeductionPercent}
                onChange={e => setPenaltyDeductionPercent(Math.max(0, Number(e.target.value)))}
                className="w-full text-xs font-mono font-bold text-rose-700"
              />
              <span className="text-xs font-bold text-rose-700">%</span>
            </div>
          </Field>

          <Field label="تفاصيل العقوبات والإنذارات المسجلة" wide>
            <input
              placeholder="مثال: إنذار كتابي أول بتاريخ 12/03 بسبب التأخير، جزاء خصم يوم بتاريخ 18/07…"
              value={penaltyDetails}
              onChange={e => setPenaltyDetails(e.target.value)}
              className="text-xs"
            />
          </Field>
        </div>
      </div>

      {/* QUICK HISTORICAL ARCHIVE SCORE ENTRY (IF ENABLED) */}
      {isHistorical && quickHistoricalMode ? (
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <History size={16} className="text-blue-600" />
              الدرجة الإجمالية المحفوظة من ملف التقييم التاريخي
            </h3>
            <span className="text-xs text-muted-foreground">أرشيف سريع</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="درجة التقييم الفنية المسجلة سابقاً (قبل الخصم) *" hint="الدرجة الكلية من 0 إلى 100">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  required
                  value={quickRawScore}
                  onChange={e => setQuickRawScore(Math.min(100, Math.max(0, Number(e.target.value))))}
                  className="w-32 text-center text-sm font-mono font-black p-2 rounded border border-blue-300 bg-card"
                />
                <span className="text-sm font-bold text-muted-foreground">%</span>
              </div>
            </Field>

            <div className="flex items-center">
              <p className="text-xs text-muted-foreground">
                يمكنك التبديل إلى تفكيك المؤشرات الفردية (KPIs) في أي وقت بإلغاء خيار «إدخال سريع» بأعلى الصفحة.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* GRANULAR KPI SCORES SECTION */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Target size={16} className="text-primary" />
                مؤشرات الأداء التخصصية ودرجات التقييم (المشرف المباشر)
              </h3>
              <p className="text-xs text-muted-foreground">
                سجّل الأداء الفعلي والدرجة (من 0 إلى 100) لكل مؤشر حسب الإنجاز
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addKpiRow}
                className="gap-1 text-xs"
              >
                <Plus size={14} />
                إضافة مؤشر إضافي
              </Button>
            </div>
          </div>

          {/* KPIs Scoring Table */}
          <div className="overflow-x-auto border border-border rounded-xl">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[30%]">مؤشر الأداء</TableHead>
                  <TableHead className="w-[12%] text-center">المستهدف</TableHead>
                  <TableHead className="w-[10%] text-center">الوزن %</TableHead>
                  <TableHead className="w-[18%]">الأداء الفعلي المحقق</TableHead>
                  <TableHead className="w-[12%] text-center">الدرجة (0-100)</TableHead>
                  <TableHead className="w-[14%]">ملاحظات</TableHead>
                  <TableHead className="w-[4%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpiScores.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <input
                        required
                        className="w-full text-xs font-semibold p-1.5 rounded border border-border bg-card"
                        value={item.title}
                        onChange={e => updateKpiItem(idx, { title: e.target.value })}
                        placeholder="عنوان المؤشر…"
                      />
                    </TableCell>

                    <TableCell className="text-center">
                      <input
                        className="w-full text-center text-xs p-1.5 rounded border border-border bg-card font-mono"
                        value={item.target || ""}
                        onChange={e => updateKpiItem(idx, { target: e.target.value })}
                        placeholder="100%"
                      />
                    </TableCell>

                    <TableCell className="text-center">
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className="w-16 text-center text-xs font-mono font-bold p-1.5 rounded border border-border bg-card"
                        value={item.weight}
                        onChange={e => updateKpiItem(idx, { weight: Number(e.target.value) })}
                      />
                    </TableCell>

                    <TableCell>
                      <input
                        className="w-full text-xs p-1.5 rounded border border-border bg-card"
                        value={item.actual || ""}
                        onChange={e => updateKpiItem(idx, { actual: e.target.value })}
                        placeholder="المنجز فعلياً…"
                      />
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          required
                          className="w-16 text-center text-xs font-bold font-mono p-1.5 rounded border border-primary/40 bg-accent/30 text-primary"
                          value={item.score}
                          onChange={e => updateKpiItem(idx, { score: Number(e.target.value) })}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <input
                        className="w-full text-xs p-1.5 rounded border border-border bg-card"
                        value={item.notes || ""}
                        onChange={e => updateKpiItem(idx, { notes: e.target.value })}
                        placeholder="ملاحظات المقيّم…"
                      />
                    </TableCell>

                    <TableCell className="text-center">
                      <button
                        type="button"
                        title="حذف هذا المؤشر"
                        onClick={() => removeKpiRow(idx)}
                        className="text-muted-foreground hover:text-rose-600 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE SCORE & DEDUCTION SUMMARY BANNER */}
      <div className="p-4 rounded-xl bg-accent/50 border border-primary/30 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground block">درجة المؤشرات الفنية (Raw):</span>
          <span className="font-mono text-base font-bold text-foreground">
            {rawScore}%
          </span>
          {!isHistorical && (
            <small className={`block text-[11px] ${totalWeight === 100 ? "text-emerald-700" : "text-amber-700"}`}>
              مجموع الأوزان: {totalWeight}% {totalWeight !== 100 && "(يُفضل 100%)"}
            </small>
          )}
        </div>

        {penaltyDeductionPercent > 0 && (
          <div className="space-y-1 text-rose-700">
            <span className="text-xs block flex items-center gap-1 font-semibold">
              <AlertTriangle size={13} />
              خصم العقوبات والإنذارات:
            </span>
            <span className="font-mono text-base font-bold">
              -{penaltyDeductionPercent}%
            </span>
            <small className="block text-[11px] text-muted-foreground font-mono">
              ({penaltiesCount} عقوبات مسجلة)
            </small>
          </div>
        )}

        <div className="flex items-center gap-6">
          <div className="text-center">
            <span className="text-xs text-muted-foreground block">النتيجة الصافية النهائية</span>
            <strong className="text-2xl font-black font-mono text-primary">{overallScore}%</strong>
          </div>

          <div className="text-center">
            <span className="text-xs text-muted-foreground block">التقدير العام النهائي</span>
            <span className="inline-block mt-0.5 px-3 py-1 rounded-full text-xs font-bold bg-primary text-white">
              {rating}
            </span>
          </div>
        </div>
      </div>

      {/* TWO-STEP WORKFLOW & APPROVAL SIGN-OFF SECTION */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h3 className="text-xs font-bold flex items-center gap-1.5 text-foreground">
            <ShieldCheck size={16} className="text-primary" />
            مسار التقييم والصلاحيات: المشرف المباشر ومدير الإدارة
          </h3>
          <span className="text-xs text-muted-foreground">
            المشرف المباشر للتقييم ثم مدير الإدارة للمراجعة والتأكيد
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Step 1: المشرف المباشر */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <UserCheck size={14} className="text-blue-600" />
                المرحلة الأولى: إعداد تقييم المشرف المباشر
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                إجراء التقييم
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label="اسم المشرف المباشر *">
                <input
                  required
                  value={supervisorName}
                  onChange={e => setSupervisorName(e.target.value)}
                  className="text-xs"
                />
              </Field>

              <Field label="تاريخ إجراء التقييم">
                <input
                  type="date"
                  value={supervisorDate}
                  onChange={e => setSupervisorDate(e.target.value)}
                  className="text-xs"
                />
              </Field>
            </div>

            <Field label="مرئيات وتوصيات المشرف المباشر" wide>
              <textarea
                rows={2}
                placeholder="مرئيات المشرف حول التزام وأداء الموظف خلال الفترة…"
                value={supervisorNotes}
                onChange={e => setSupervisorNotes(e.target.value)}
                className="text-xs"
              />
            </Field>
          </div>

          {/* Step 2: مدير الإدارة */}
          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <FileCheck size={14} className="text-emerald-600" />
                المرحلة الثانية: مراجعة وتأكيد مدير الإدارة
              </h4>
              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                status === "معتمد" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
              }`}>
                {status === "معتمد" ? "تم التأكيد والاعتماد" : "بانتظار التأكيد"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Field label="اسم مدير الإدارة (المراجع والمؤكد)">
                <input
                  placeholder="اسم مدير الإدارة المختصة…"
                  value={departmentHeadName}
                  onChange={e => setDepartmentHeadName(e.target.value)}
                  className="text-xs"
                />
              </Field>

              <Field label="تاريخ المراجعة والتأكيد">
                <input
                  type="date"
                  value={departmentHeadDate}
                  onChange={e => setDepartmentHeadDate(e.target.value)}
                  className="text-xs"
                />
              </Field>
            </div>

            <Field label="ملاحظات وتأكيد مدير الإدارة" wide>
              <textarea
                rows={2}
                placeholder="ملاحظات مدير الإدارة عند مراجعة واعتماد التقييم…"
                value={departmentHeadNotes}
                onChange={e => setDepartmentHeadNotes(e.target.value)}
                className="text-xs"
              />
            </Field>
          </div>
        </div>
      </div>

      {/* Qualitative Feedback Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
        <Field label="نقاط القوة والإنجازات البارزة" wide>
          <textarea
            rows={3}
            maxLength={1000}
            placeholder="أبرز الإنجازات والمهام المتميزة التي حققها الموظف خلال فترة التقييم…"
            value={strengths}
            onChange={e => setStrengths(e.target.value)}
          />
        </Field>

        <Field label="مجالات وفرص التحسين والتطوير" wide>
          <textarea
            rows={3}
            maxLength={1000}
            placeholder="الجوانب التي تحتاج إلى عناية أو تدريب أو تطوير للأداء المستقبلي…"
            value={improvements}
            onChange={e => setImprovements(e.target.value)}
          />
        </Field>

        <Field label="توصيات المقيّم (ترقية، مكافأة، خطة تدريب)" wide>
          <textarea
            rows={2}
            maxLength={1000}
            placeholder="توصيات المشرف / مدير الإدارة بشأن الترقية، المكافأة، أو خطة التطوير المهني…"
            value={recommendations}
            onChange={e => setRecommendations(e.target.value)}
          />
        </Field>

        <Field label="ملاحظات ختامية إضافية" wide>
          <textarea
            rows={2}
            maxLength={1000}
            placeholder="أي ملاحظات إضافية حول التقييم…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </Field>
      </div>

      {error && <p role="alert" className="error-box">{error}</p>}

      {/* FOOTER ACTIONS ALIGNED WITH ROLES */}
      <div className="form-footer flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span>الحالة الحالية:</span>
          <span className={`px-2 py-0.5 rounded font-bold ${
            status === "معتمد"
              ? "bg-emerald-100 text-emerald-800"
              : status === "بانتظار_مراجعة_المدير"
              ? "bg-amber-100 text-amber-800"
              : "bg-muted text-muted-foreground"
          }`}>
            {status === "بانتظار_مراجعة_المدير" ? "بانتظار مراجعة وتأكيد مدير الإدارة" : status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isHistorical ? (
            <Button
              type="button"
              className="primary-button gap-1.5"
              disabled={busy}
              onClick={() => handleSaveWithStatus("معتمد")}
            >
              <History size={15} />
              <span>حفظ في الأرشيف التاريخي كتقييم معتمد</span>
            </Button>
          ) : (
            <>
              {/* Draft button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => handleSaveWithStatus("مسودة")}
              >
                حفظ كمسودة
              </Button>

              {/* Submit to department head review */}
              <Button
                type="button"
                variant="outline"
                className="text-blue-700 border-blue-300 hover:bg-blue-50 gap-1.5 text-xs font-semibold"
                disabled={busy}
                onClick={() => handleSaveWithStatus("بانتظار_مراجعة_المدير")}
              >
                <UserCheck size={14} />
                <span>إرسال لمدير الإدارة للمراجعة والتأكيد</span>
              </Button>

              {/* Final department head approval */}
              {(canApprove || initial?.status === "بانتظار_مراجعة_المدير") && (
                <Button
                  type="button"
                  className="primary-button bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
                  disabled={busy}
                  onClick={() => {
                    if (!departmentHeadName) {
                      setDepartmentHeadName(currentUser || "مدير الإدارة");
                    }
                    if (!departmentHeadDate) {
                      setDepartmentHeadDate(today());
                    }
                    handleSaveWithStatus("معتمد");
                  }}
                >
                  <FileCheck size={15} />
                  <span>تأكيد واعتماد مدير الإدارة نهائياً</span>
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </form>
  );
}

function evaluatorNameFallback(currentUser: string, s: Snapshot): string {
  return currentUser || s.access?.name || "المشرف المباشر";
}

// ----------------------------------------------------------------------
// MODAL: Department Head Review & Approval Dialog
// ----------------------------------------------------------------------
function DepartmentHeadApprovalModal({
  ev,
  s,
  currentUser,
  busy,
  onClose,
  onCommit
}: {
  ev: PerformanceEvaluation;
  s: Snapshot;
  currentUser: string;
  busy: boolean;
  onClose: () => void;
  onCommit: (payload: any) => Promise<boolean>;
}) {
  const emp = s.employees.find(e => e.id === ev.employeeId);
  const [headName, setHeadName] = useState(ev.departmentHeadName || currentUser || "مدير الإدارة");
  const [headDate, setHeadDate] = useState(ev.departmentHeadDate || today());
  const [headNotes, setHeadNotes] = useState(ev.departmentHeadNotes || "");
  const [penaltyDeduction, setPenaltyDeduction] = useState<number>(ev.penaltyDeductionPercent || 0);

  // Recalculate if penalty deduction is modified by head of department
  const { overallScore, rating } = useMemo(() => {
    return calculateOverallScore(ev.kpiScores, penaltyDeduction);
  }, [ev.kpiScores, penaltyDeduction]);

  const handleApprove = async () => {
    const ok = await onCommit({
      action: "evaluation.approve",
      evaluationId: ev.id,
      departmentHeadName: headName.trim(),
      departmentHeadDate: headDate,
      departmentHeadNotes: headNotes.trim(),
      penaltyDeductionPercent: penaltyDeduction,
      overallScore,
      rating
    });
    if (ok) {
      toast.success(`تم تأكيد واعتماد تقييم الموظف: ${emp?.name || ""} بنجاح`);
    }
  };

  const handleReject = async () => {
    const ok = await onCommit({
      action: "evaluation.save",
      evaluation: {
        ...ev,
        status: "مسودة",
        departmentHeadName: headName.trim(),
        departmentHeadDate: headDate,
        departmentHeadNotes: `[مطلوب مراجعة وتعديل من المشرف]: ${headNotes.trim()}`
      }
    });
    if (ok) {
      toast.info("تمت إعادة التقييم للمشرف المباشر لإجراء التعديلات المطلوبة");
    }
  };

  return (
    <div className="space-y-5" dir="rtl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileCheck size={20} className="text-emerald-600" />
          مراجعة وتأكيد تقييم الأداء (مدير الإدارة)
        </DialogTitle>
        <DialogDescription>
          بصفتك مدير الإدارة المختصة، راجع التقييم المعد من قبل المشرف المباشر وتأكد من سلامة المعايير ونسبة خصم الجزاءات قبل الاعتماد النهائي
        </DialogDescription>
      </DialogHeader>

      {/* Employee & Summary Strip */}
      <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={emp?.name || "موظف"} src={emp?.photoDataUrl} />
          <div>
            <strong className="block text-sm text-foreground">{emp?.name || "غير محدد"}</strong>
            <small className="text-xs text-muted-foreground">
              {emp?.job || "—"} · الإدارة: {emp?.department || "—"} · الرقم الوظيفي: {emp?.code || "—"}
            </small>
          </div>
        </div>

        <div className="text-left font-mono">
          <span className="text-xs text-muted-foreground block">{ev.period}</span>
          <span className="text-sm font-bold text-foreground">سنة {ev.evaluationYear || ev.date.slice(0, 4)}</span>
        </div>
      </div>

      {/* Scores breakdown card */}
      <div className="p-3.5 rounded-xl border border-primary/20 bg-accent/30 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div>
          <span className="text-[11px] text-muted-foreground block">درجة المؤشرات (Raw)</span>
          <strong className="text-base font-mono font-bold text-foreground">
            {ev.rawScore != null ? `${ev.rawScore}%` : `${ev.overallScore}%`}
          </strong>
        </div>

        <div>
          <span className="text-[11px] text-rose-700 block font-medium">خصم الجزاءات ({ev.penaltiesCount || 0})</span>
          <strong className="text-base font-mono font-bold text-rose-700">
            -{penaltyDeduction}%
          </strong>
        </div>

        <div>
          <span className="text-[11px] text-primary block font-medium">النتيجة النهائية الصافية</span>
          <strong className="text-xl font-mono font-black text-primary">
            {overallScore}%
          </strong>
        </div>

        <div>
          <span className="text-[11px] text-muted-foreground block">التقدير النهائي</span>
          <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary text-white">
            {rating}
          </span>
        </div>
      </div>

      {/* Direct Supervisor review notes */}
      <div className="p-3 rounded-xl bg-card border border-border space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-muted-foreground border-b border-border pb-1">
          <span className="font-semibold text-foreground flex items-center gap-1">
            <UserCheck size={13} className="text-blue-600" />
            المشرف المباشر: {ev.supervisorName || ev.evaluator}
          </span>
          <span>تاريخ التقييم: {displayDate(ev.supervisorDate || ev.date)}</span>
        </div>
        {ev.supervisorNotes ? (
          <p className="text-muted-foreground leading-relaxed">
            <strong>ملاحظات المشرف:</strong> {ev.supervisorNotes}
          </p>
        ) : (
          <p className="text-muted-foreground italic">لم تسجل ملاحظات خاصة من المشرف المباشر.</p>
        )}
        {ev.penaltyDetails && (
          <p className="text-rose-700 pt-1 border-t border-border">
            <strong>تفاصيل العقوبات المرصودة:</strong> {ev.penaltyDetails}
          </p>
        )}
      </div>

      {/* Department head approval inputs */}
      <div className="space-y-3 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="اسم مدير الإدارة (المعتمد) *">
            <input
              required
              value={headName}
              onChange={e => setHeadName(e.target.value)}
              className="text-xs"
            />
          </Field>

          <Field label="تاريخ التأكيد والاعتماد *">
            <input
              type="date"
              required
              value={headDate}
              onChange={e => setHeadDate(e.target.value)}
              className="text-xs"
            />
          </Field>
        </div>

        <Field label="تعديل نسبة خصم الجزاءات (إن لزم)" hint="إذا رأى مدير الإدارة تعديل نسبة الخصم">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={penaltyDeduction}
              onChange={e => setPenaltyDeduction(Math.max(0, Number(e.target.value)))}
              className="w-28 text-center text-xs font-mono font-bold text-rose-700"
            />
            <span className="text-xs text-muted-foreground">% خصم من النتيجة الإجمالية</span>
          </div>
        </Field>

        <Field label="ملاحظات وتأكيد مدير الإدارة" wide>
          <textarea
            rows={3}
            placeholder="اكتب ملاحظات وتوجيهات مدير الإدارة وتأكيد الاعتماد…"
            value={headNotes}
            onChange={e => setHeadNotes(e.target.value)}
            className="text-xs"
          />
        </Field>
      </div>

      {/* Modal Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
        <Button
          type="button"
          variant="outline"
          className="text-rose-700 border-rose-300 hover:bg-rose-50 text-xs gap-1.5"
          disabled={busy}
          onClick={handleReject}
        >
          <Undo2 size={14} />
          <span>إعادة للمشرف المباشر للتعديل</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={busy}>
            إلغاء
          </Button>
          <Button
            type="button"
            className="primary-button bg-emerald-700 hover:bg-emerald-800 text-white gap-1.5"
            disabled={busy}
            onClick={handleApprove}
          >
            <CheckCheck size={16} />
            <span>تأكيد واعتماد التقييم نهائياً</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// VIEW: Detailed Evaluation Report (Printable & Exportable)
// ----------------------------------------------------------------------
function EvaluationReportView({
  ev,
  s,
  onClose
}: {
  ev: PerformanceEvaluation;
  s: Snapshot;
  onClose: () => void;
}) {
  const emp = s.employees.find(e => e.id === ev.employeeId);
  const isExcellent = ev.overallScore >= 90;
  const isGood = ev.overallScore >= 75;
  const hasPenalties = (ev.penaltyDeductionPercent || 0) > 0;
  const yr = ev.evaluationYear || ev.date.slice(0, 4);

  return (
    <div className="space-y-6" id="evaluation-report-view">
      {/* Top action bar */}
      <div className="flex items-center justify-between border-b border-border pb-3 print:hidden">
        <div className="flex items-center gap-2">
          <BookOpen size={20} className="text-primary" />
          <h2 className="text-lg font-bold">تقرير تقييم الأداء الوظيفي المعتمد</h2>
          {ev.isHistorical && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
              أرشيف تاريخي - سنة {yr}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => window.print()}
          >
            <Printer size={15} />
            طباعة التقرير
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>

      {/* Header Sheet */}
      <div className="p-5 rounded-2xl bg-gradient-to-l from-primary/10 via-accent/30 to-background border border-primary/20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Avatar name={emp?.name || "موظف"} src={emp?.photoDataUrl} />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-foreground">{emp?.name || "غير محدد"}</h1>
                {ev.isHistorical && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">
                    أرشيف سنوات سابقة
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span>الرقم الوظيفي: <strong>{emp?.code || "—"}</strong></span>
                <span>•</span>
                <span>الوظيفة: <strong>{emp?.job || "—"}</strong></span>
                <span>•</span>
                <span>الإدارة: <strong>{emp?.department || "—"}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasPenalties && (
              <div className="text-center bg-card p-3 rounded-xl border border-rose-200 shadow-xs">
                <span className="text-[11px] text-rose-700 block font-semibold">خصم الجزاءات</span>
                <strong className="text-xl font-black font-mono text-rose-700">-{ev.penaltyDeductionPercent}%</strong>
              </div>
            )}
            <div className="text-center bg-card p-3 rounded-xl border border-border shadow-xs">
              <span className="text-[11px] text-muted-foreground block">النتيجة الصافية</span>
              <strong className="text-2xl font-black font-mono text-primary">{ev.overallScore}%</strong>
            </div>
            <div className="text-center bg-card p-3 rounded-xl border border-border shadow-xs">
              <span className="text-[11px] text-muted-foreground block">التقدير العام</span>
              <span
                className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  isExcellent
                    ? "bg-emerald-100 text-emerald-800"
                    : isGood
                    ? "bg-blue-100 text-blue-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {ev.rating}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-border/60 text-xs">
          <div>
            <span className="text-muted-foreground block">فترة وسنة التقييم:</span>
            <strong className="text-foreground">{ev.period} ({yr})</strong>
          </div>
          <div>
            <span className="text-muted-foreground block">تاريخ التقييم:</span>
            <strong className="text-foreground">{displayDate(ev.date)}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block">المشرف المباشر:</span>
            <strong className="text-foreground">{ev.supervisorName || ev.evaluator}</strong>
          </div>
          <div>
            <span className="text-muted-foreground block">حالة الاعتماد:</span>
            <strong className={`font-bold ${ev.status === "معتمد" ? "text-emerald-700" : "text-amber-700"}`}>
              {ev.status === "معتمد" ? "معتمد رسمياً من مدير الإدارة" : ev.status}
            </strong>
          </div>
        </div>
      </div>

      {/* Disciplinary Deductions Alert if present */}
      {hasPenalties && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-rose-900 dark:text-rose-200 font-bold">
            <span className="flex items-center gap-1.5">
              <AlertTriangle size={15} className="text-rose-600" />
              أثر العقوبات والإنذارات على النتيجة النهائية
            </span>
            <span className="font-mono">
              درجة المؤشرات: {ev.rawScore != null ? `${ev.rawScore}%` : `${ev.overallScore}%`} - {ev.penaltyDeductionPercent}% = {ev.overallScore}%
            </span>
          </div>
          <p className="text-muted-foreground">
            حصل الموظف خلال السنة على <strong>{ev.penaltiesCount || 1}</strong> عقوبات/إنذارات تم خصم <strong>{ev.penaltyDeductionPercent}%</strong> بموجبها من التقييم النهائي.
          </p>
          {ev.penaltyDetails && (
            <p className="text-rose-700 font-medium">
              تفاصيل العقوبات: {ev.penaltyDetails}
            </p>
          )}
        </div>
      )}

      {/* KPI Scores Breakdown Table */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-foreground">تفاصيل مؤشرات الأداء والأوزان والدرجات المحققة</h3>
        <div className="overflow-x-auto border border-border rounded-xl">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>مؤشر الأداء</TableHead>
                <TableHead className="text-center">المستهدف</TableHead>
                <TableHead className="text-center">الوزن %</TableHead>
                <TableHead>المحقق فعلياً</TableHead>
                <TableHead className="text-center">الدرجة</TableHead>
                <TableHead className="text-center">الموزون</TableHead>
                <TableHead>ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ev.kpiScores.map((item, i) => {
                const weightedVal = Math.round((item.score * (item.weight / 100)) * 10) / 10;
                return (
                  <TableRow key={i}>
                    <TableCell>
                      <strong className="text-xs font-semibold text-foreground">{item.title}</strong>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">{item.target || "—"}</TableCell>
                    <TableCell className="text-center text-xs font-mono font-bold">{item.weight}%</TableCell>
                    <TableCell className="text-xs">{item.actual || "—"}</TableCell>
                    <TableCell className="text-center text-xs font-mono font-bold text-primary">
                      {item.score}%
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono font-bold text-muted-foreground">
                      {weightedVal}%
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{item.notes || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Qualitative Feedback Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
          <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-600" />
            نقاط القوة والإنجازات البارزة
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {ev.strengths || "لم تسجل ملاحظات خاصة بنقاط القوة."}
          </p>
        </div>

        <div className="p-3.5 rounded-xl border border-border bg-card space-y-1.5">
          <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
            <TrendingUp size={14} className="text-amber-600" />
            فرص ومجالات التحسين والتطوير
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {ev.improvements || "لم تسجل مجالات تحسين خاصة."}
          </p>
        </div>

        {ev.recommendations && (
          <div className="sm:col-span-2 p-3.5 rounded-xl border border-primary/30 bg-accent/20 space-y-1.5">
            <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
              <Award size={14} />
              توصيات وقرارات التقييم (الترقية والمكافأة وخطة التطوير)
            </h4>
            <p className="text-xs text-foreground leading-relaxed">
              {ev.recommendations}
            </p>
          </div>
        )}

        {ev.notes && (
          <div className="sm:col-span-2 p-3 rounded-xl border border-border bg-muted/30 text-xs text-muted-foreground">
            <strong>ملاحظات إضافية:</strong> {ev.notes}
          </div>
        )}
      </div>

      {/* Two-Tier Approval Hierarchy Card */}
      <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3 text-xs">
        <h4 className="font-bold text-foreground flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-primary" />
          توثيق ومسار اعتماد التقييم
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-border bg-card space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-semibold text-foreground">المشرف المباشر (إجراء التقييم)</span>
              <span>{displayDate(ev.supervisorDate || ev.date)}</span>
            </div>
            <strong className="block text-foreground">{ev.supervisorName || ev.evaluator}</strong>
            {ev.supervisorNotes && (
              <p className="text-[11px] text-muted-foreground mt-1">«{ev.supervisorNotes}»</p>
            )}
          </div>

          <div className="p-3 rounded-lg border border-border bg-card space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-semibold text-emerald-800">مدير الإدارة (المراجعة والتأكيد)</span>
              <span>{displayDate(ev.departmentHeadDate || ev.date)}</span>
            </div>
            <strong className="block text-foreground">{ev.departmentHeadName || "إدارة القسم المختص"}</strong>
            {ev.departmentHeadNotes ? (
              <p className="text-[11px] text-muted-foreground mt-1">«{ev.departmentHeadNotes}»</p>
            ) : (
              <span className="text-[11px] text-emerald-700 font-medium">تمت المراجعة والتأكيد النهائي.</span>
            )}
          </div>
        </div>
      </div>

      {/* Signatures block for printing */}
      <div className="pt-6 border-t border-dashed border-border grid grid-cols-3 gap-4 text-center text-xs">
        <div>
          <span className="block text-muted-foreground mb-6">علم وتوقيع الموظف</span>
          <span className="block border-t border-muted-foreground/40 pt-1 font-semibold">{emp?.name || "الموظف"}</span>
        </div>
        <div>
          <span className="block text-muted-foreground mb-6">توقيع المشرف المباشر</span>
          <span className="block border-t border-muted-foreground/40 pt-1 font-semibold">{ev.supervisorName || ev.evaluator}</span>
        </div>
        <div>
          <span className="block text-muted-foreground mb-6">تأكيد واعتماد مدير الإدارة</span>
          <span className="block border-t border-muted-foreground/40 pt-1 font-semibold">{ev.departmentHeadName || "مدير الإدارة"}</span>
        </div>
      </div>
    </div>
  );
}
