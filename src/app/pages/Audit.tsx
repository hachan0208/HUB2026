/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { useAppData } from "../lib/contexts/AppDataContext";
import { useTeacherTaAuditLogic } from "../hooks/useTeacherTaAuditLogic";
import { DataTable, Column } from "../components/DataTable";
import {
  ShieldCheck,
  PlayCircle,
  Calendar,
  Trash2,
  Settings,
  Search,
  UploadCloud,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  Download,
  AlertCircle,
  FileText,
  PlusCircle,
  CheckCircle2,
  Users,
  Wrench,
  BadgeCheck,
} from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "../components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

export function Audit() {
  const { appData, updateAppData } = useAppData();

  const fromDate = appData.Timesheet_Dates?.from || "";
  const toDate = appData.Timesheet_Dates?.to || "";
  const rosterData = appData.Q_Roster || [];

  const { state, computed, actions } = useTeacherTaAuditLogic(
    rosterData,
    fromDate,
    toDate,
  );
  const { fileNameA, fileNameConfig, isProcessing, errorMsg } = state;
  const { auditResults } = computed;
  const { handleUploadFileA, handleUploadFileConfig, clearData } = actions;

  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "detail">("main");
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search term to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const initialMonth = useMemo(() => {
    if (fromDate) {
      const fd = new Date(fromDate);
      const year = fd.getFullYear();
      const month = fd.getMonth() + 1;
      return `${year}-${month.toString().padStart(2, "0")}`;
    }
    return "";
  }, [fromDate]);

  const [monthIntent, setMonthIntent] = useState<string | null>(null);
  const selectedMonth = monthIntent ?? initialMonth;

  // Reset intent when context month changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMonthIntent(null);
  }, [initialMonth]);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setMonthIntent(v);
    if (v) {
      const [yearStr, monthStr] = v.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear--;
      }

      const pmStr = String(prevMonth).padStart(2, "0");
      const cmStr = String(month).padStart(2, "0");

      const newFrom = `${prevYear}-${pmStr}-21`;
      const newTo = `${year}-${cmStr}-20`;

      updateAppData(
        (prev) => ({
          ...prev,
          Timesheet_Dates: { from: newFrom, to: newTo },
        }),
        false,
      );
    }
  };
  const [isConfigHidden, setIsConfigHidden] = useState(false);
  const location = useLocation();

  // Handle deep linking for tabs
  useEffect(() => {
    if (location.state?.activeTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(location.state.activeTab);
      if (location.state.activeTab === "detail") {
        setIsConfigHidden(true);
      }
    }
  }, [location]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedDetailRow(null);
  };

  const onFileAChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUploadFileA(file);
    e.target.value = "";
    toast.success("Đã tải File Timesheet Giáo Viên");
  };

  const onFileConfigChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleUploadFileConfig(file);
    e.target.value = "";
    toast.success("Đã tải File Cấu Hình Sĩ Số");
  };

  const handleClearAudit = () => {
    clearData();
    setShowClearDialog(false);
    toast.success("Đã xoá dữ liệu đối soát");
  };

  // ----- MAIN DATA -----
  const mainData = useMemo(() => {
    return (
      auditResults.results?.map((r) => ({
        ...r,
        diffValue: r.actualTA - r.expected,
      })) || []
    );
  }, [auditResults.results]);

  const mainColumns: Column[] = useMemo(() => [
    {
      key: "displayCenter",
      label: "Mã AE",
      group: "Thông Tin Chung",
      sortable: true,
      filterable: true,
      width: 120,
    },
    {
      key: "className",
      label: "Lớp",
      group: "Thông Tin Chung",
      sortable: true,
      filterable: true,
      width: 200,
      render: (val: string, row: any) => (
        <div className="font-bold text-foreground flex items-center gap-1.5 whitespace-nowrap">
          {val}
          {row.isKDG && (
            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-[9px] font-black uppercase tracking-widest border border-primary/20">
              KDG
            </span>
          )}
        </div>
      ),
    },

    {
      key: "teacherHours",
      label: "TEACHER CỦA LỚP (A)",
      group: "Giáo Viên (Nguồn 1)",
      sortable: true,
      type: "number",
      width: 150,
      headerStyle: { backgroundColor: "#f8f8f8" },
      render: (val: any) => typeof val === "number" ? val.toFixed(2) : Number(val || 0).toFixed(2),
    },
    {
      key: "expected",
      label: "ALLOWED TAs",
      group: "Giáo Viên (Nguồn 1)",
      sortable: true,
      type: "number",
      width: 140,
      render: (val: any, row: any) => (
        <div className="flex flex-col">
          <span className="text-slate-700 font-bold text-xs">
            {typeof val === "number" ? val.toFixed(2) : Number(val || 0).toFixed(2)}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium">
            {row.teacherHours > 0
              ? Number(row.expected / row.teacherHours || 0).toFixed(1)
              : 0}{" "}
            TAs Rule
          </span>
        </div>
      ),
    },
    {
      key: "actualTA",
      label: "TA THỰC TẾ (B)",
      group: "TA (Nguồn 2)",
      sortable: true,
      type: "number",
      width: 173,
      headerStyle: {
        paddingLeft: "0px",
        paddingRight: "0px",
        paddingBottom: "0px",
        paddingTop: "0px",
        height: "38.6667px",
        lineHeight: "13.8px",
      },
      headerLabelStyle: {
        fontWeight: "normal",
        fontSize: "10px",
        lineHeight: "12.8px",
      },
      render: (val: any) => (
        <span className="text-emerald-600 font-bold bg-emerald-50/50 px-2 py-1 rounded">
          {typeof val === "number" ? val.toFixed(2) : Number(val || 0).toFixed(2)}
        </span>
      ),
    },
    {
      key: "numStudents",
      label: "STUDENTS",
      group: "Đối Soát",
      sortable: true,
      width: 100,
      align: "center",
      render: (val: any) => (
        <span
          className={`font-mono font-bold ${val && val !== 0 ? "text-primary" : "text-muted-foreground/30"}`}
        >
          {val && val !== 0 ? val : "-"}
        </span>
      ),
    },
    {
      key: "diffValue",
      label: "Độ Lệch",
      group: "Đối Soát",
      sortable: true,
      type: "number",
      width: 150,
      render: (_: any, row: any) => (
        <span
          className={`font-bold ${row.statusColor === "emerald" ? "text-emerald-600" : row.statusColor === "amber" ? "text-amber-600" : "text-rose-600"}`}
        >
          {row.diffText}
        </span>
      ),
    },
    {
      key: "status",
      label: "TRẠNG THÁI",
      sortable: true,
      filterable: true,
      width: 200,
      headerDivStyle: {
        height: "46.0729px",
      },
      render: (val: string, row: any) => (
        <div className="flex items-center gap-2 w-full pr-2">
          <span
            className={`px-3 py-1 rounded-full text-[0.625rem] font-bold uppercase tracking-widest flex items-center justify-center truncate tabular-nums shrink-0 ${
              row.statusColor === "emerald"
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm w-[75px]"
                : row.statusColor === "amber"
                  ? "bg-amber-100 text-amber-700 border border-amber-200 shadow-sm flex-1 min-w-[120px]"
                  : "bg-rose-100 text-rose-700 border border-rose-200 shadow-sm flex-1 min-w-[120px]"
            }`}
            title={val}
          >
            {val}
          </span>
          {row.statusColor !== "emerald" && (
            <div className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-colors group/btn shrink-0">
              <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
            </div>
          )}
        </div>
      ),
    },
  ], []);

  // ----- DETAIL DATA -----
  const [selectedDetailRow, setSelectedDetailRow] = useState<any>(null);

  const detailData = useMemo(() => {
    // Flatmap details - keeping all rows for detailed view, especially those with discrepancies
    const resultsToMap =
      auditResults.results?.filter(
        (r) => r.statusColor !== "Khớp" && r.statusColor !== "emerald",
      ) || [];

    // 1. Flatten all sessions
    const allSessions: any[] = [];
    resultsToMap.forEach((row) => {
      row.alignedRows?.forEach((r: any) => {
        allSessions.push({
          ...r,
          _parentClassName: row.className,
          _parentCenter: row.displayCenter || row.center,
          _parentStatus: row.status,
        });
      });
    });

    // 2. Sort by Date then Class (Using faster compare)
    allSessions.sort((a, b) => {
      const dateA = a.fullDate || "";
      const dateB = b.fullDate || "";
      if (dateA !== dateB) return dateA < dateB ? -1 : 1;
      const clsA = a._parentClassName || "";
      const clsB = b._parentClassName || "";
      return clsA < clsB ? -1 : 1;
    });

    // 3. Map with merge logic via rowSpans
    const finalData: any[] = [];
    const len = allSessions.length;
    let i = 0;
    while (i < len) {
      const current = allSessions[i];
      let j = i + 1;

      while (
        j < len &&
        allSessions[j].fullDate === current.fullDate &&
        allSessions[j]._parentClassName === current._parentClassName
      ) {
        j++;
      }

      const span = j - i;
      let totalTaHoursForSpan = 0;
      let totalTeacherHoursForSpan = 0;
      let allowedTAs = 0;
      let maxStudentsInSpan = 0;
      const uniqueTAs = new Set();

      for (let k = i; k < j; k++) {
        const sess = allSessions[k];

        if (sess.ta) {
          if (sess.ta.hours) {
            totalTaHoursForSpan += sess.ta.hours;
            if (sess.ta.id) uniqueTAs.add(sess.ta.id);
          }
          const sNum = parseInt(sess.ta.numStudents) || 0;
          if (sNum > maxStudentsInSpan) maxStudentsInSpan = sNum;
        }

        if (sess.teacher) {
          if (sess.teacher.hours) {
            totalTeacherHoursForSpan += sess.teacher.hours;
            allowedTAs = sess.teacher.allowedTAs || allowedTAs;
          }
          const sNum = parseInt(sess.teacher.numStudents) || 0;
          if (sNum > maxStudentsInSpan) maxStudentsInSpan = sNum;
        }
      }

      const actualTAsCount = uniqueTAs.size;
      const sessionStatus =
        actualTAsCount > allowedTAs ||
        totalTaHoursForSpan > totalTeacherHoursForSpan * allowedTAs + 0.05
          ? "Cần check lại"
          : "Khớp";

      if (totalTaHoursForSpan <= totalTeacherHoursForSpan + 0.05) {
        i = j;
        continue;
      }

      const formattedTeacherHours =
        totalTeacherHoursForSpan > 0
          ? totalTeacherHoursForSpan.toFixed(2).replace(".", ",")
          : "0,00";
      const formattedAllowedTAs = String(allowedTAs).replace(".", ",");
      const formattedMaxStudents =
        maxStudentsInSpan > 0 ? String(maxStudentsInSpan) : "0";

      for (let k = i; k < j; k++) {
        const s = allSessions[k];
        const isFirst = k === i;
        finalData.push({
          isFirstInGroup: isFirst,
          id: `detail_${k}_${s._parentClassName}`,
          className: isFirst ? s._parentClassName || "-" : "",
          dateStr: isFirst ? s.date || "-" : "",
          center: isFirst ? s._parentCenter || "-" : "",
          teacherName: isFirst ? s.teacher?.name || "-" : "",
          teacherHours: isFirst ? formattedTeacherHours : "",
          taId: s.ta?.id || "-",
          taName: s.ta?.name || "-",
          taHours:
            s.ta && s.ta.hours > 0
              ? s.ta.hours.toFixed(2).replace(".", ",")
              : "0,00",
          numStudents: isFirst ? formattedMaxStudents : "",
          allowedTAs: isFirst ? formattedAllowedTAs : "",
          actualTAs: isFirst ? actualTAsCount : "",
          variance: isFirst ? sessionStatus : "",
          _fullDate: s.date || "",
          _fullClassName: s._parentClassName || "",
          _rowSpans: isFirst
            ? {
                className: span,
                dateStr: span,
                center: span,
                teacherName: span,
                teacherHours: span,
                numStudents: span,
                allowedTAs: span,
                actualTAs: span,
                variance: span,
              }
            : {
                className: 0,
                dateStr: 0,
                center: 0,
                teacherName: 0,
                teacherHours: 0,
                numStudents: 0,
                allowedTAs: 0,
                actualTAs: 0,
                variance: 0,
              },
        });
      }
      i = j;
    }

    return finalData;
  }, [auditResults.results]);

  // Helper to capitalize names
  const capitalizeName = (name: string) => {
    if (!name || name === "-") return name;
    return name
      .toLowerCase()
      .split(" ")
      .filter((word) => word.length > 0)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const detailColumns: Column[] = useMemo(() => [
    {
      key: "className",
      label: "Lớp",
      group: "Thông Tin Chung",
      sortable: true,
      filterable: true,
      width: 140,
    },
    {
      key: "dateStr",
      label: "DATE",
      group: "Thông Tin Chung",
      sortable: true,
      filterable: true,
      width: 100,
    },

    // Group: Giáo Viên (Nguồn 1)
    {
      key: "teacherName",
      label: "TEACHER CỦA LỚP",
      group: "Giáo Viên (Nguồn 1)",
      sortable: true,
      filterable: true,
      width: 160,
      render: (val: string) => (
        <span className="font-semibold text-primary/80">
          {capitalizeName(val)}
        </span>
      ),
    },
    {
      key: "teacherHours",
      label: "Giờ dạy (h)",
      group: "Giáo Viên (Nguồn 1)",
      sortable: true,
      filterable: true,
      width: 90,
      align: "center",
      render: (val: string) => (
        <span className="font-mono font-bold text-primary">{val}</span>
      ),
    },

    // Group: TA (Nguồn 2)
    {
      key: "taId",
      label: "ID NUMBER",
      group: "TA (Nguồn 2)",
      sortable: true,
      filterable: true,
      width: 120,
      render: (val: string) => (
        <span className="font-mono text-[0.7rem] text-muted-foreground">
          {val}
        </span>
      ),
    },
    {
      key: "taName",
      label: "FULL NAME",
      group: "TA (Nguồn 2)",
      sortable: true,
      filterable: true,
      width: 180,
      render: (val: string) => (
        <span className="text-emerald-700 font-semibold font-sans tracking-tight">
          {capitalizeName(val)}
        </span>
      ),
    },
    {
      key: "taHours",
      label: "Giờ làm (h)",
      group: "TA (Nguồn 2)",
      sortable: true,
      filterable: true,
      width: 90,
      align: "center",
      render: (val: string) => (
        <span className="font-mono text-emerald-600 font-bold">{val}</span>
      ),
    },

    // Group: Đối Soát
    {
      key: "numStudents",
      label: "Number of Student",
      group: "Đối Soát",
      sortable: true,
      filterable: true,
      width: 100,
      align: "center",
      render: (val: any) => (
        <span
          className={`font-mono font-bold ${val && val !== "0" ? "text-primary" : "text-muted-foreground/30"}`}
        >
          {val && val !== "0" ? val : "-"}
        </span>
      ),
    },
    {
      key: "allowedTAs",
      label: "Allowed TAs",
      group: "Đối Soát",
      sortable: true,
      filterable: true,
      width: 90,
      align: "center",
      render: (val: any) => (
        <span className="font-mono font-bold text-slate-600">{val}</span>
      ),
    },
    {
      key: "actualTAs",
      label: "Actual TAs",
      group: "Đối Soát",
      sortable: true,
      filterable: true,
      width: 90,
      align: "center",
      render: (val: any) => (
        <span className="font-mono font-bold text-emerald-600">{val}</span>
      ),
    },
    {
      key: "variance",
      label: "CHÊNH LỆCH",
      group: "Đối Soát",
      sortable: true,
      filterable: true,
      width: 110,
      align: "center",
      render: (val: string) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[0.6rem] font-black tracking-widest border uppercase ${
            val?.includes("Khớp")
              ? "bg-emerald-50 text-emerald-600 border-emerald-100"
              : "bg-rose-50 text-rose-600 border-rose-100"
          }`}
        >
          {val}
        </span>
      ),
    },
  ], []);

  const handleExportExcel = () => {
    if (!auditResults.results || auditResults.results.length === 0) {
      toast.error("Không có dữ liệu để xuất!");
      return;
    }

    // Main Report Export
    const exportData = mainData.map((row: any) => ({
      "Mã AE": row.displayCenter || row.center,
      Lớp: row.className,
      KDG: row.isKDG ? "Có" : "Không",
      "Teacher Của Lớp (A)": row.teacherHours,
      "TA Thực Tế (B)": row.actualTA,
      "Trạng Thái": row.status,
    }));

    // Details Export
    const exportDetails = detailData.map((row: any) => ({
      "Mã AE": row.center,
      Lớp: row.className,
      "Ngày Lịch": row.dateStr,
      "A - Sĩ Số": row.numStudents,
      "ALLOWED TAs": row.allowedTAs,
      "A - Giờ": row.teacherHours,
      "B - ID TA": row.taId,
      "B - Tên TA": row.taName,
      "B - Giờ": row.taHours,
      "Trạng Thái Lớp": row.rowStatus,
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(exportData);
    const ws2 = XLSX.utils.json_to_sheet(exportDetails);

    XLSX.utils.book_append_sheet(wb, ws1, "Báo_Cáo_Tong_Hop");
    XLSX.utils.book_append_sheet(wb, ws2, "Chi_Tiet_Đoi_Soat");
    XLSX.writeFile(wb, `Audit_Report.xlsx`);
  };

  const navigate = useNavigate();

  const handleMainRowClick = (row: any) => {
    if (row.className) {
      setSearchTerm(""); // No filtering on row click as requested
      setActiveTab("detail");
      setIsConfigHidden(true);
    }
  };

  const handleDetailRowClick = (row: any) => {
    if (row._fullClassName) {
      // Navigate to Source Data (Roster Gốc) in TimesheetHub
      navigate("/centers", {
        state: {
          activeTab: "roster_raw",
          searchTerm: row._fullClassName,
          filterDate: row._fullDate, // Pass the specific date
          filterCenter: row.center, // Pass the center code
          from: "audit",
        },
      });
      toast.success(
        `Đang nhảy về dữ liệu nguồn của lớp ${row._fullClassName} ngày ${row._fullDate} tại ${row.center}`,
      );
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col min-h-0 bg-transparent px-8 mx-0 pt-0 pb-8 mb-0 gap-8 items-center overflow-hidden"
    >
      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-[1750px] flex-1 min-h-0 min-w-0 mt-0 px-0 pb-[25px]">
        {/* Left Panel - Source Selection (Swapped back to left) */}
        {!isConfigHidden && (
          <motion.div
            key="audit-config"
            initial={{ x: -320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -320, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-full lg:w-80 bg-white border border-border p-6 flex flex-col gap-5 relative lg:flex-none shrink-0 z-[60] min-h-0 overflow-hidden mb-1.5 rounded-3xl"
          >
            <div className="absolute inset-0 pattern-dots opacity-[0.05] pointer-events-none" />

            <div className="flex items-center justify-between relative z-10 shrink-0 mb-4 pb-1.5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-sm text-primary">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-primary/40 block mb-0.5">
                    SOURCE SETUP
                  </h2>
                  <p className="text-[0.75rem] font-black uppercase tracking-tight text-foreground">
                    Audit Config
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 flex-1 relative z-10 overflow-auto custom-scrollbar pr-2 -mr-2">
              {activeTab === "detail" && selectedDetailRow && (
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/20 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[0.6rem] font-black uppercase tracking-widest text-primary">
                      SESSION CONTEXT
                    </p>
                    <button
                      onClick={() => {
                        setSelectedDetailRow(null);
                        setSearchTerm("");
                      }}
                      className="text-primary hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-black text-foreground">
                      {selectedDetailRow._fullDate}
                    </p>
                    <p className="text-[0.65rem] font-bold text-primary/70 uppercase tracking-tight truncate">
                      {selectedDetailRow._fullClassName}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-primary/10">
                    <p className="text-[0.55rem] font-black text-primary/40 uppercase tracking-widest mb-1">
                      Rule Info
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-[0.65rem] font-bold text-foreground">
                        Sĩ số: {selectedDetailRow.numStudents}
                      </span>
                      <span className="text-[0.65rem] font-black text-primary">
                        ALLOWED TAs: {selectedDetailRow.allowedTAs} TAs
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[0.65rem] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2 px-1">
                  <FileText className="w-3.5 h-3.5" /> File Timesheet (A)
                </label>
                <label
                  htmlFor="upload-file-a-audit"
                  className={`flex flex-col items-center justify-center p-3 border-2 border-dashed ${fileNameA ? "bg-primary/5 border-primary/40" : "bg-muted/20 border-border hover:bg-primary/5"} rounded-2xl cursor-pointer transition-colors relative shadow-inner group overflow-hidden`}
                >
                  <input
                    type="file"
                    id="upload-file-a-audit"
                    className="hidden"
                    accept=".xlsx, .xls, .csv"
                    onChange={onFileAChange}
                  />
                  {!fileNameA ? (
                    <div className="text-center py-4">
                      <PlusCircle className="w-10 h-10 text-muted-foreground/30 mb-3 mx-auto group-hover:scale-110 transition-transform" />
                      <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest block">
                        Tải File GV
                      </span>
                    </div>
                  ) : (
                    <div className="w-full flex items-center gap-3 px-3 py-1">
                      <div className="w-8 h-8 bg-primary/20 rounded-xl flex items-center justify-center shrink-0 text-primary">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.625rem] font-bold text-[#8b6580] truncate leading-tight uppercase tracking-wider">
                          {fileNameA}
                        </p>
                        <p className="text-[8px] font-bold text-[#5e3843] uppercase mt-0.5">
                          Dữ liệu đã sẵn sàng
                        </p>
                      </div>
                    </div>
                  )}
                </label>
              </div>

              <div className="space-y-3">
                <label className="text-[0.65rem] font-black uppercase tracking-widest text-emerald-700/60 flex items-center gap-2 px-1">
                  <Users className="w-3.5 h-3.5" /> Dữ liệu Lớp Học (B)
                </label>
                <div
                  className={`flex flex-col items-center justify-center p-3 border-2 border-dashed ${rosterData?.length > 0 ? "bg-emerald-50/50 border-emerald-400/40" : "bg-muted/20 border-border"} rounded-2xl relative shadow-inner group overflow-hidden`}
                >
                  {!rosterData?.length ? (
                    <div className="text-center py-4">
                      <Users className="w-10 h-10 text-muted-foreground/30 mb-3 mx-auto" />
                      <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest block">
                        Chưa có Roster
                      </span>
                    </div>
                  ) : (
                    <div className="w-full flex items-center gap-3 px-3 py-1">
                      <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0 text-emerald-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.625rem] font-bold text-emerald-700 truncate leading-tight uppercase tracking-wider">
                          {rosterData.length} dòng
                        </p>
                        <p className="text-[8px] font-bold text-emerald-600/40 uppercase mt-0.5">
                          Lấy từ bảng Roster Gốc
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[0.65rem] font-black uppercase tracking-widest text-amber-600/60 flex items-center gap-2 px-1">
                  <BadgeCheck className="w-3.5 h-3.5" /> File Sĩ Số (Config)
                </label>
                <label
                  htmlFor="upload-file-config-audit"
                  className={`flex flex-col items-center justify-center p-3 border-2 border-dashed ${fileNameConfig ? "bg-amber-50/50 border-amber-400/40" : "bg-muted/20 border-border hover:bg-amber-50"} rounded-2xl cursor-pointer transition-colors relative shadow-inner group overflow-hidden`}
                >
                  <input
                    type="file"
                    id="upload-file-config-audit"
                    className="hidden"
                    accept=".xlsx, .xls, .csv"
                    onChange={onFileConfigChange}
                  />
                  {!fileNameConfig ? (
                    <div className="text-center py-4">
                      <PlusCircle className="w-10 h-10 text-muted-foreground/30 mb-3 mx-auto group-hover:scale-110 transition-transform" />
                      <span className="text-[0.625rem] font-bold text-muted-foreground uppercase tracking-widest block">
                        Tải File Sĩ Số
                      </span>
                    </div>
                  ) : (
                    <div className="w-full flex items-center gap-3 px-3 py-1">
                      <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 text-amber-600">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[0.625rem] font-bold text-amber-700 truncate leading-tight uppercase tracking-wider">
                          {fileNameConfig}
                        </p>
                        <p className="text-[8px] font-bold text-amber-600/40 uppercase mt-0.5">
                          Dữ liệu sĩ số OK
                        </p>
                      </div>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Bottom Info Card - Empty as requested to remove the div */}
            <div className="mt-auto pt-4 border-t border-border relative z-10" />
          </motion.div>
        )}

        {/* Right Panel - Results (Expanded to fill remaining space) */}
        <div className="flex-1 bg-slate-50/50 soft-card force-light flex flex-col min-h-0 min-w-0 mb-[6px] relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100">
          <div className="px-6 md:px-8 pt-[17px] pb-[15px] h-[88.3px] flex flex-wrap gap-4 items-center justify-between border-b border-border bg-white shrink-0 relative z-50 rounded-t-3xl">
            <div className="flex flex-wrap items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsConfigHidden(!isConfigHidden)}
                    className="w-10 h-10 flex items-center justify-center bg-white border border-border rounded-xl shadow-sm text-primary hover:bg-primary/5 transition-all shrink-0 hover:scale-105 active:scale-95"
                  >
                    {isConfigHidden ? (
                      <Settings className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5 rotate-90" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#d1435b]">
                    {isConfigHidden
                      ? "HIỆN BẢNG CẤU HÌNH"
                      : "THU GỌN BẢNG CẤU HÌNH"}
                  </p>
                </TooltipContent>
              </Tooltip>

              <div className="flex items-center bg-[#f8f9fa] border border-border rounded-full p-1 shadow-sm">
                <button
                  onClick={() => setActiveTab("main")}
                  className={`px-6 py-2 text-[0.65rem] font-bold uppercase tracking-wider rounded-full transition-all ${
                    activeTab === "main"
                      ? "bg-white text-[#d1435b] border border-slate-900 shadow-sm"
                      : "bg-transparent text-slate-500 hover:text-slate-700"
                  } cursor-pointer`}
                >
                  Báo Cáo Đối Soát
                </button>
                <button
                  onClick={() => setActiveTab("detail")}
                  className={`px-6 py-2 text-[0.65rem] font-bold uppercase tracking-wider rounded-full transition-all ${
                    activeTab === "detail"
                      ? "bg-white text-[#d1435b] border border-slate-900 shadow-sm"
                      : "bg-transparent text-slate-500 hover:text-slate-700"
                  } cursor-pointer`}
                >
                  Chi Tiết Lệch
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 h-[52.6px]">
              <div className="bg-slate-50 border-0 border-transparent m-0 p-3 rounded-2xl flex items-center gap-3 w-[202px]">
                <div className="w-8 h-8 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-primary shadow-sm shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div className="flex flex-col pr-0 w-[202px] text-left text-[13px] leading-[20px] h-[32.6px]">
                  <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-[0.15em] leading-none mb-1">
                    Kỳ đối soát
                  </span>
                  <input
                    id="monthPickerAudit"
                    type="month"
                    value={selectedMonth}
                    onChange={handleMonthChange}
                    className="relative bg-transparent border-none p-0 text-[13px] font-normal leading-[21px] text-slate-700 outline-none cursor-pointer uppercase tracking-widest w-[146px] hover:text-[#d1435b] transition-colors focus:ring-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  />
                </div>
              </div>

              <AnimatePresence>
                {(searchTerm || selectedDetailRow) && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={clearAllFilters}
                    className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-full text-[0.65rem] font-bold uppercase tracking-widest hover:bg-rose-100 transition-colors flex items-center gap-2 shadow-sm"
                  >
                    <Trash2 className="w-3 h-3" />
                    Thoát Lọc
                  </motion.button>
                )}
              </AnimatePresence>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="px-3 h-9 rounded-full flex items-center justify-center border border-border bg-white text-[#d1435b] transition-all hover:bg-muted shadow-sm">
                    <Wrench className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 p-2 rounded-2xl shadow-xl border-border"
                >
                  <DropdownMenuLabel className="text-[0.6rem] font-black uppercase tracking-widest text-muted-foreground/40 px-3 py-2">
                    Công cụ & Thao tác
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => setIsSearchVisible(!isSearchVisible)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <Search className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-bold text-slate-700">
                      Tìm kiếm nhanh
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={handleExportExcel}
                    disabled={
                      !auditResults.results || auditResults.results.length === 0
                    }
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-700">
                      Xuất báo cáo Excel
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => setShowClearDialog(true)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer text-rose-500 focus:text-rose-600 focus:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="text-xs font-bold">
                      Xóa dữ liệu đối soát
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <AnimatePresence>
                {isSearchVisible && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 220, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 bg-muted/30 border border-border rounded-full text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buttons moved into Settings Dropdown as per request */}
            </div>
          </div>

          {!fileNameA ||
          !auditResults.results ||
          auditResults.results.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-primary/10 relative z-10 w-full h-full p-6 bg-transparent">
              <p className="font-serif text-2xl text-muted-foreground/60 italic text-center max-w-sm">
                {isProcessing
                  ? "Hệ thống đang đối soát dữ liệu..."
                  : "Chưa có báo cáo để hiển thị"}
              </p>
              <p className="text-[0.625rem] font-bold uppercase opacity-40 tracking-[0.3em] mt-4 text-center">
                VUI LÒNG TẢI FILE Timesheet (A) VÀ File Lớp Học (B)
              </p>
            </div>
          ) : activeTab === "main" ? (
            <DataTable
              columns={mainColumns}
              data={mainData}
              isEditable={false}
              showRowNumber={true}
              hideSearch={false}
              showFooter={true}
              externalSearchTerm={debouncedSearch}
              onExternalSearchChange={setSearchTerm}
              onRowClick={handleMainRowClick}
              storageKey="audit_main_v2"
              headerClassName="bg-slate-50 border-b border-border text-[0.7rem] font-black uppercase tracking-[0.2em] text-primary/80 py-3"
              className="border-t-0 flex-1"
            />
          ) : (
            <DataTable
              columns={detailColumns}
              data={detailData}
              isEditable={false}
              showRowNumber={true}
              hideSearch={false}
              showFooter={true}
              externalSearchTerm={debouncedSearch}
              onExternalSearchChange={setSearchTerm}
              onRowClick={handleDetailRowClick}
              storageKey="audit_detail_v2"
              headerClassName="bg-slate-50 border-b border-border text-[0.7rem] font-black uppercase tracking-[0.2em] text-primary/80 py-3"
              className="border-t-0 flex-1"
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}
