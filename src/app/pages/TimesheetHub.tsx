/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
import { useMemo, useRef, useState, useEffect } from "react";
import { useLocation } from "react-router";
import { useAppData } from "../lib/contexts/AppDataContext";
import { useTimesheetCalculations } from "../hooks/useTimesheetCalculations";
import {
  FileText,
  Users,
  Building2,
  Settings,
  Download,
  Search,
  ChevronDown,
  ArrowLeft,
  XCircle,
  UploadCloud,
} from "lucide-react";
import { DataTable } from "../components/DataTable";
import TimesheetSummaryPage from "./TimesheetSummary";
import { useNavigate } from "react-router";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "../components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { motion, AnimatePresence } from "motion/react";
import * as XLSX from "xlsx";
import {
  CENTER_COLUMNS,
  DETAIL_COLUMNS,
  EMPLOYEE_COLUMNS,
} from "../constants/timesheet-columns";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

export function TimesheetHub() {
  const { appData, updateAppData } = useAppData();
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<
    "roster_raw" | "employee" | "center"
  >("roster_raw");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [fromAudit, setFromAudit] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [targetDate, setTargetDate] = useState("");
  const [targetCenter, setTargetCenter] = useState("");

  const handleClearFilters = useMemo(
    () => () => {
      setSearchTerm("");
      setTargetDate("");
      setTargetCenter("");
      setShowSearch(false);
      if (tableRef.current) {
        tableRef.current.clearAllFilters();
      }
    },
    [],
  );

  // Handle deep linking and navigation resets
  useEffect(() => {
    const state = location.state as any;
    const hasAuditState =
      state &&
      (state.activeTab ||
        state.searchTerm ||
        state.filterDate ||
        state.filterCenter ||
        state.from === "audit");

    if (hasAuditState) {
      if (state.activeTab) setActiveTab(state.activeTab);
      if (state.searchTerm) {
        setSearchTerm(state.searchTerm);
        setShowSearch(true);
      }
      if (state.filterDate) setTargetDate(state.filterDate);
      if (state.filterCenter) setTargetCenter(state.filterCenter);
      if (state.from === "audit") {
        setFromAudit(true);
        setTimeout(() => {
          if (tableRef.current) tableRef.current.clearAllFilters();
        }, 150);
      }
    } else if (!fromAudit) {
      handleClearFilters();
      setFromAudit(false);
      setActiveTab("roster_raw");
    }
  }, [location.key, fromAudit, handleClearFilters, location.state]);

  const handleBackToAudit = () => {
    navigate("/audit", { state: { activeTab: "detail" } });
  };

  const [view, setView] = useState<"final" | "upload">("final");
  const [fromDate, setFromDate] = useState(appData.Timesheet_Dates?.from || "");
  const [toDate, setToDate] = useState(appData.Timesheet_Dates?.to || "");
  const [selectedMonth, setSelectedMonth] = useState("");

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSelectedMonth(v);
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
      setFromDate(newFrom);
      setToDate(newTo);
    } else {
      setFromDate("");
      setToDate("");
    }
  };

  useEffect(() => {
    updateAppData(
      (prev) => ({
        ...prev,
        Timesheet_Dates: { from: fromDate, to: toDate },
      }),
      false,
    );
  }, [fromDate, toDate, updateAppData]);

  const { processedRosterData, employeeSummary, centerSummary } =
    useTimesheetCalculations(
      appData.Q_Roster || [],
      appData.Q_Salary_Scale || [],
      appData.Q_Staff || [],
      appData.Q_Cache || [],
      appData.Timesheet_Dates?.from || "",
      appData.Timesheet_Dates?.to || "",
    );

  const tabs = useMemo(
    () =>
      [
        { id: "roster_raw", label: "Roster Gốc", icon: FileText },
        { id: "employee", label: "Số Giờ Làm Việc", icon: Users },
        { id: "center", label: "Total Payment", icon: Building2 },
      ] as const,
    [],
  );

  const currentData = useMemo(() => {
    if (activeTab === "roster_raw") return processedRosterData;
    if (activeTab === "employee") return employeeSummary;
    if (activeTab === "center") return centerSummary;
    return [];
  }, [activeTab, processedRosterData, employeeSummary, centerSummary]);

  const columns = useMemo(() => {
    if (activeTab === "roster_raw") return DETAIL_COLUMNS;
    if (activeTab === "employee") return EMPLOYEE_COLUMNS;
    if (activeTab === "center") return CENTER_COLUMNS;
    return [];
  }, [activeTab]);

  const searchData = useMemo(() => {
    let data = currentData;

    // 1. If we have a target date (from audit or manually set), filter by date first
    if (targetDate) {
      data = data.filter((row: any) => {
        const rowDate = String(row.date || "").trim();
        const tDate = String(targetDate).trim();
        return rowDate === tDate || rowDate.includes(tDate);
      });
    }

    // 2. If we have a target center (from audit), filter by center
    if (targetCenter) {
      data = data.filter((row: any) => {
        const rowCenter = String(row.center || "")
          .trim()
          .toUpperCase();
        const tCenter = String(targetCenter).trim().toUpperCase();
        return rowCenter === tCenter || rowCenter.includes(tCenter);
      });
    }

    // 3. If we have a search term (class name)
    if (debouncedSearchTerm) {
      const lowerSearch = debouncedSearchTerm.toLowerCase().trim();
      data = data.filter((row: any) => {
        const classCode = String(row.classCode || "").toLowerCase();
        const className = String(row.className || "").toLowerCase();

        // Exact or partial match for class
        if (classCode.includes(lowerSearch) || className.includes(lowerSearch))
          return true;

        // Match other fields
        return Object.values(row).some((val) =>
          String(val).toLowerCase().includes(lowerSearch),
        );
      });
    }

    return data;
  }, [currentData, debouncedSearchTerm, targetDate, targetCenter]);

  const handleExportExcel = () => {
    if (currentData.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(currentData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    XLSX.writeFile(wb, `Timesheet_Hub_${activeTab}.xlsx`);
  };

  const tableRef = useRef<any>(null);

  return (
    <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
      <AnimatePresence initial={false}>
        {view === "final" && (
          <motion.div
            key="final"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ y: "100%", opacity: 0 }}
            className="absolute inset-0 flex flex-col min-h-0 bg-transparent px-8 mx-0 pb-8 pt-0 gap-4 items-center overflow-auto custom-scrollbar"
          >
            <div className="bg-white soft-card force-light flex-1 flex flex-col min-h-0 relative z-10 w-full max-w-[1240px] px-0 mt-2 ml-0 mb-0 shadow-sm rounded-3xl overflow-hidden border border-border/50">
              <div className="absolute inset-0 striped-pattern opacity-[0.03] pointer-events-none rounded-3xl overflow-hidden" />

              <div className="px-[20px] py-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-border bg-muted/10 shrink-0 relative">
          <div className="absolute inset-0 pattern-dots opacity-[0.05] pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10 shrink-0">
            {fromAudit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleBackToAudit}
                    className="w-8 h-8 bg-white border border-border rounded-lg flex items-center justify-center text-primary hover:bg-primary/5 transition-all shadow-sm hover:scale-105 active:scale-95 group shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Quay lại Bảng Đối Soát</TooltipContent>
              </Tooltip>
            )}
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0 border border-primary/30 shadow-inner hidden sm:flex">
              <Users className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex flex-col items-start gap-1">
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 sm:gap-3 px-4 h-9 border border-primary/20 rounded-xl bg-primary/5 text-primary hover:bg-primary/10 transition-all group justify-center relative shadow-sm">
                        {(() => {
                          const active = tabs.find((t) => t.id === activeTab);
                          const Icon = active?.icon || FileText;
                          return (
                            <>
                              <Icon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              <span className="text-[0.75rem] font-bold uppercase tracking-widest">
                                {active?.label}
                              </span>
                            </>
                          );
                        })()}
                        <ChevronDown className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Chuyển bảng dữ liệu</TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                  align="start"
                  className="w-56 border border-primary/10 shadow-2xl p-1.5 bg-white rounded-xl"
                >
                  <DropdownMenuLabel className="font-bold uppercase text-[0.6rem] tracking-widest text-primary/60 px-2 py-1.5">
                    Chọn bảng dữ liệu
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-primary/10 mx-1" />
                  {tabs.map((tab) => (
                    <DropdownMenuItem
                      key={tab.id}
                      onSelect={() => {
                        setActiveTab(tab.id as any);
                        setTargetDate("");
                        setTargetCenter("");
                        setFromAudit(false);
                      }}
                      className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                        activeTab === tab.id
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-primary/5"
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      <span className="text-[0.65rem] font-bold uppercase tracking-wider">
                        {tab.label}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <p className="text-[0.6rem] font-bold text-muted-foreground uppercase tracking-[0.1em] mt-0.5 truncate ml-1">
                SUMMARY DATA • {currentData.length || 0} RECORDS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10 shrink-0 justify-start sm:justify-end flex-wrap xl:flex-nowrap">
            {/* TAB CHỌN NGÀY VÀ ĐƯỢC CHUYỂN LÊN TRÊN ĐÂY */}
            <div className="flex items-center flex-wrap sm:flex-nowrap bg-white/50 border border-slate-200 rounded-xl p-1 shadow-sm px-2 hover:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 transition-all duration-500 group/month h-9 gap-y-2">
              <div className="flex items-center gap-2 px-1 h-full w-[147px] text-[15px] leading-[14px] relative group/month">
                <div className="w-6 h-6 bg-primary/5 rounded-md flex items-center justify-center text-primary shrink-0 group-hover/month:bg-primary group-hover/month:text-white transition-all duration-500 group-hover/month:rotate-3 shadow-inner">
                  <CalendarIcon className="w-3.5 h-3.5" />
                </div>
                <div className="flex flex-col justify-center">
                  <label
                    htmlFor="monthPicker"
                    className="text-[9px] font-black uppercase tracking-[0.1em] text-muted-foreground/40 leading-none mb-0.5 group-hover/month:text-primary/50 transition-colors"
                  >
                    Data Period
                  </label>
                  <div className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-primary leading-none">
                    {selectedMonth
                      ? `${selectedMonth.split("-")[1]}.${selectedMonth.split("-")[0]}`
                      : "MM.YYYY"}
                  </div>
                </div>
                <input
                  id="monthPicker"
                  type="month"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                  title="Chọn tháng dữ liệu"
                />
              </div>

              <div className="w-[1px] h-4 bg-border/50 mx-1 hidden sm:block" />

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    id="fromDate"
                    name="fromDate"
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-transparent text-[10px] font-bold outline-none uppercase tracking-wider transition-colors h-full ${fromDate ? "text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                  >
                    <CalendarIcon className="w-3 h-3 opacity-70" />
                    {fromDate
                      ? format(new Date(`${fromDate}T00:00:00`), "dd/MM/yyyy")
                      : "Từ ngày"}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 z-[10000] border-border/50 shadow-2xl rounded-2xl overflow-hidden"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={
                      fromDate ? new Date(`${fromDate}T00:00:00`) : undefined
                    }
                    onSelect={(d) =>
                      setFromDate(d ? format(d, "yyyy-MM-dd") : "")
                    }
                    initialFocus
                    className="p-3 pointer-events-auto bg-white"
                  />
                </PopoverContent>
              </Popover>

              <div className="w-[1px] h-4 bg-border/50 mx-1 hidden sm:block" />

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    id="toDate"
                    name="toDate"
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md bg-transparent text-[10px] font-bold outline-none uppercase tracking-wider transition-colors h-full ${toDate ? "text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"}`}
                  >
                    <CalendarIcon className="w-3 h-3 opacity-70" />
                    {toDate
                      ? format(new Date(`${toDate}T00:00:00`), "dd/MM/yyyy")
                      : "Đến ngày"}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0 z-[10000] border-border/50 shadow-2xl rounded-2xl overflow-hidden"
                  align="end"
                >
                  <Calendar
                    mode="single"
                    selected={
                      toDate ? new Date(`${toDate}T00:00:00`) : undefined
                    }
                    onSelect={(d) =>
                      setToDate(d ? format(d, "yyyy-MM-dd") : "")
                    }
                    initialFocus
                    className="p-3 pointer-events-auto bg-white"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <button
              onClick={() => setView("upload")}
              className="flex items-center gap-2 px-5 h-9 border border-primary/20 rounded-xl bg-primary/5 text-primary font-bold text-[0.625rem] uppercase tracking-widest hover:bg-primary/10 transition-colors shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Roster
            </button>

            <AnimatePresence>
              {showSearch && (
                <motion.div
                  initial={{ opacity: 0, x: 20, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  className="relative group hidden sm:block w-full sm:w-auto"
                >
                  <input
                    type="text"
                    placeholder="TÌM KIẾM..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-white border border-border rounded-xl pl-8 pr-3 py-1.5 text-xs w-full sm:w-48 uppercase font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all sm:focus:w-64 shadow-sm h-9"
                    autoFocus
                  />
                  <Search className="w-3.5 h-3.5 text-primary/40 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-primary transition-colors" />
                </motion.div>
              )}
            </AnimatePresence>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button className="flex w-9 h-9 items-center justify-center rounded-full border border-border bg-white text-muted-foreground hover:text-primary transition-all group shadow-sm">
                      <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Cài đặt & Thao tác</TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                align="end"
                className="w-56 border border-primary/10 shadow-2xl p-2 bg-white rounded-xl"
              >
                <DropdownMenuLabel className="text-[0.6rem] font-bold uppercase tracking-widest text-primary/60 px-2 py-1.5">
                  Thao tác nâng cao
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                <div className="p-1">
                  <DropdownMenuItem
                    onSelect={() => setShowSearch(!showSearch)}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider">
                      Tìm kiếm nhanh
                    </span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onSelect={handleExportExcel}
                    disabled={currentData.length === 0}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider">
                      Xuất Excel
                    </span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 relative z-10 w-full overflow-hidden">
          {currentData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-primary/10 p-12">
              <div className="w-28 h-28 bg-primary/5 rounded-none flex items-center justify-center mb-8 border border-primary/10 shadow-inner">
                <Users className="w-12 h-12 text-primary/20" />
              </div>
              <p className="font-bold uppercase text-xl tracking-tight text-primary/40">
                Chưa có dữ liệu {tabs.find((t) => t.id === activeTab)?.label}
              </p>
              <p className="text-[0.625rem] font-bold uppercase opacity-40 tracking-widest mt-2 text-center max-w-md">
                Vui lòng vào phần Summary để tải lên dữ liệu.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
              {/* Search Result Feedback when empty */}
              {searchTerm && searchData.length === 0 && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-500 rounded-3xl overflow-hidden">
                  <div className="bg-white p-8 rounded-2xl border-2 border-primary/10 shadow-2xl flex flex-col items-center text-center max-w-lg scale-100 animate-in zoom-in-95 duration-300 relative overflow-hidden">
                    <div className="absolute inset-0 pattern-dots opacity-[0.03] pointer-events-none" />
                    <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-6 border border-rose-100 text-rose-500 shadow-inner relative z-10">
                      <XCircle className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-normal font-serif text-foreground tracking-tight mb-3 relative z-10">
                      Không tìm thấy{" "}
                      <span className="font-bold font-script text-primary text-3xl lowercase">
                        dữ liệu
                      </span>
                    </h3>
                    <p className="text-[0.65rem] font-bold text-muted-foreground uppercase tracking-[0.2em] leading-relaxed mb-8 relative z-10 px-4">
                      Lớp{" "}
                      <span className="text-primary font-black px-2 py-0.5 bg-primary/5 rounded-md border border-primary/10">
                        {searchTerm}
                      </span>{" "}
                      {targetCenter ? `tại ${targetCenter}` : ""}{" "}
                      {targetDate ? `ngày ${targetDate}` : ""} không có bản ghi
                      nào trong {tabs.find((t) => t.id === activeTab)?.label}{" "}
                      cho khoảng thời gian này.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 w-full relative z-10">
                      <button
                        onClick={handleClearFilters}
                        className="flex-1 py-3.5 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95"
                      >
                        Xóa Lọc & Xem Tất Cả
                      </button>
                      {fromAudit && (
                        <button
                          onClick={handleBackToAudit}
                          className="flex-1 py-3.5 bg-slate-100 border border-border text-foreground text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-200 transition-all hover:scale-[1.02] active:scale-95"
                        >
                          Quay lại Đối Soát
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Search Info Banner when results found */}
              {searchTerm && searchData.length > 0 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[50] animate-in slide-in-from-top-4 fade-in duration-300">
                  <div className="bg-primary/10 border border-primary/20 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg flex items-center gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest whitespace-nowrap">
                      Đang tìm: {searchTerm}{" "}
                      {targetCenter ? `[${targetCenter}]` : ""}{" "}
                      {targetDate ? `(${targetDate})` : ""} •{" "}
                      {searchData.length} kết quả
                    </span>
                    <button
                      onClick={handleClearFilters}
                      className="p-1 hover:bg-primary/20 rounded-full text-primary transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <DataTable
                ref={tableRef}
                columns={columns as any}
                data={searchData}
                isEditable={false}
                showRowNumber={true}
                storageKey={`timesheet_hub_${activeTab}`}
                hideSearch={true}
                showFooter={true}
                headerClassName="bg-white border-b border-[#E2E8F0] text-[0.8em] font-black uppercase tracking-[0.15em] text-slate-500"
                className="!rounded-none border-t border-border flex-1"
                rowHeight={48}
              />
            </div>
          )}
        </div>
      </div>
          </motion.div>
        )}
        {view === "upload" && (
          <motion.div
            key="upload"
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-0 flex flex-col"
          >
            <TimesheetSummaryPage onSwitchToFinal={() => setView("final")} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
