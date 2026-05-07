/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, @typescript-eslint/no-unused-vars */
import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileSpreadsheet,
  ListChecks,
  UserCheck,
  Table2,
  ChevronDown,
  Download,
  Calculator,
  Wrench,
  Search,
  RefreshCw,
  Trash2,
  PieChart,
  CalendarIcon,
  ArrowLeft,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { useAppData } from "../lib/contexts/AppDataContext";

// Import Input Table giao diện mới thay vì bảng cũ
import { TimesheetInputTable } from "../components/TimesheetInputTable";
import type { TimesheetInputRow } from "../components/TimesheetInputTable";
import { DataTable, DataTableRef } from "../components/DataTable";
import { Button } from "../components/ui/button";
import {
  getL07FromFileName,
  getCenterInfoByL07,
  getCenterInfoByAECode,
  mapL07,
} from "../lib/utils/center-utils";
import { generateUUID } from "../lib/utils/data-utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { Calendar } from "../components/ui/calendar";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "../components/ui/tooltip";

// ============================================================================
// 1. STYLES & TOKENS
// ============================================================================

const S = {
  appWrap:
    "flex-1 flex flex-col min-h-0 bg-transparent w-full h-full text-foreground items-center overflow-auto custom-scrollbar gap-8",
  mainCard:
    "bg-white soft-card force-light flex flex-col min-h-0 overflow-hidden w-full max-w-[1360px] flex-1 shrink-0 relative z-10",
  header:
    "p-6 flex flex-col md:flex-row items-center justify-between gap-6 border-b border-border bg-white z-20 shrink-0 relative",
  headerLeft: "flex items-center gap-5 relative z-10",
  logoBox:
    "w-14 h-14 bg-primary/20 rounded-full flex items-center justify-center text-primary shrink-0 border border-primary/30 shadow-inner",
  headerRight: "flex flex-wrap items-center gap-4 relative z-10",
  dateWrap:
    "flex items-center bg-white border border-border rounded-full p-1 shadow-sm px-4",
  dateInput:
    "px-2 py-2 bg-transparent text-[0.625rem] font-bold text-primary outline-none w-28 sm:w-auto appearance-none cursor-pointer uppercase tracking-widest focus:text-secondary transition-colors",
  btnDropdown:
    "soft-button bg-white border border-border text-foreground hover:bg-muted/30 flex items-center gap-3 px-6 h-12 shadow-sm transition-all",
};

// ...

// Trong hàm DataTable, phần pagination (dòng 267+)
// Tôi sẽ sửa lại phần return của DataTable cho đẹp hơn

// ============================================================================
// 2. CONFIGS & DICTIONARIES
// ============================================================================

const DEFAULT_SALARY_SCALES: Record<
  string,
  { ac: number; ad: number; summer: number; outing: number }
> = {
  S1: { ac: 33000, ad: 20000, summer: 29473.68, outing: 26315.79 },
  S2: { ac: 36000, ad: 20000, summer: 29473.68, outing: 26315.79 },
  S3: { ac: 40000, ad: 20000, summer: 29473.68, outing: 26315.79 },
  S4: { ac: 45000, ad: 20000, summer: 29473.68, outing: 26315.79 },
  S5: { ac: 50000, ad: 20000, summer: 29473.68, outing: 26315.79 },
  S6: { ac: 53000, ad: 20000, summer: 29473.68, outing: 26315.79 },
  S7: { ac: 20000, ad: 20000, summer: 0, outing: 0 },
  "S-CORP": { ac: 85714, ad: 0, summer: 0, outing: 0 },
  SDN1: { ac: 32000, ad: 18000, summer: 29473.68, outing: 26315.79 },
  SDN2: { ac: 36000, ad: 18000, summer: 29473.68, outing: 26315.79 },
  SDN3: { ac: 40000, ad: 18000, summer: 29473.68, outing: 26315.79 },
  SDN7: { ac: 20000, ad: 20000, summer: 0, outing: 0 },
};

const TASK_COLUMNS: Record<string, string> = {
  "in-class": "inClass",
  "in-class atls": "inClassAtls",
  demo: "demo",
  tutoring: "tutoring",
  "waiting class": "waitingClass",
  "club activity": "clubActivity",
  "parent meeting": "parentMeeting",
  pt: "pt",
  "placement test": "pt",
  "discovery camp": "discoveryCamp",
  outing: "outing",
  summer: "summer",
  "pick up/ drop off": "pickUpDropOff",
  "pick up/ drop off atls": "pickUpDropOffAtls",
  sms: "sms",
  "sms atls": "smsAtls",
  "progress/gradebook report": "progressReport",
  "gradebook report atls": "progressReportAtls",
  "progress report": "progressReport",
  "progress report atls": "progressReportAtls",
  "prepare lesson - tutoring": "prepareLessonTutoring",
  "prepare lesson - clubs": "prepareLessonClubs",
  "meeting/ training": "meetingTraining",
  "conduct test": "conductTest",
  "renewal projects": "renewalProjects",
  "support lxo": "supportLxo",
  "support ec": "supportEc",
  "support mkt": "supportMkt",
  lpar: "parentMeeting",
  ldem: "demo",
  lret: "tutoring",
  ldec: "clubActivity",
};

const ACADEMIC_FIELDS = [
  "inClass",
  "inClassAtls",
  "demo",
  "tutoring",
  "waitingClass",
  "clubActivity",
  "parentMeeting",
];
const ADMIN_FIELDS = [
  "pickUpDropOff",
  "pickUpDropOffAtls",
  "sms",
  "smsAtls",
  "progressReport",
  "progressReportAtls",
  "prepareLessonTutoring",
  "meetingTraining",
  "pt",
  "prepareLessonClubs",
  "renewalProjects",
  "supportLxo",
  "supportEc",
  "supportMkt",
  "conductTest",
];

const DETAIL_COLUMNS = [
  { key: "id", label: "No.", type: "text" as const },
  { key: "center", label: "Center", type: "text" as const },
  {
    key: "employeeId",
    label: "ID Number",
    type: "text" as const,
    headerClassName: "leading-[16.4px]",
  },
  { key: "fullName", label: "Full Name", type: "text" as const },
  { key: "maAE", label: "Mã AE", type: "text" as const },
  { key: "date", label: "Date", type: "text" as const },
  { key: "taskType", label: "Type", type: "text" as const },
  { key: "classCode", label: "Class", type: "text" as const },
  { key: "from", label: "From", type: "text" as const },
  { key: "to", label: "To", type: "text" as const },
  { key: "duration", label: "Duration", type: "text" as const },
  { key: "workingHours", label: "Quy ra số giờ làm", type: "number" as const },
  { key: "notes", label: "Notes", type: "text" as const },
];

const BASE_TASK_COLUMNS = [
  { key: "inClass", label: "In-class", type: "number" as const },
  { key: "inClassAtls", label: "In-class ATLS", type: "number" as const },
  { key: "demo", label: "Demo", type: "number" as const },
  { key: "tutoring", label: "Tutoring", type: "number" as const },
  { key: "waitingClass", label: "Waiting class", type: "number" as const },
  { key: "clubActivity", label: "Club activity", type: "number" as const },
  { key: "parentMeeting", label: "Parent meeting", type: "number" as const },
  { key: "pickUpDropOff", label: "Pick up/ Drop off", type: "number" as const },
  {
    key: "pickUpDropOffAtls",
    label: "Pick up/ Drop off ATLS",
    type: "number" as const,
  },
  { key: "sms", label: "SMS", type: "number" as const },
  { key: "smsAtls", label: "SMS ATLS", type: "number" as const },
  {
    key: "progressReport",
    label: "Progress/Gradebook Report",
    type: "number" as const,
  },
  {
    key: "progressReportAtls",
    label: "Gradebook Report ATLS",
    type: "number" as const,
    headerSpanClassName: "leading-[19px] text-[14px] font-bold",
  },
  {
    key: "prepareLessonTutoring",
    label: "Prepare lesson - Tutoring",
    type: "number" as const,
  },
  {
    key: "meetingTraining",
    label: "Meeting/ Training",
    type: "number" as const,
  },
  { key: "pt", label: "PT", type: "number" as const },
  { key: "discoveryCamp", label: "Discovery Camp", type: "number" as const },
  { key: "outing", label: "Outing", type: "number" as const },
  { key: "summer", label: "Summer", type: "number" as const },
  {
    key: "prepareLessonClubs",
    label: "Prepare lesson - Clubs",
    type: "number" as const,
  },
  { key: "conductTest", label: "Conduct test", type: "number" as const },
  {
    key: "renewalProjects",
    label: "Renewal Projects",
    type: "number" as const,
  },
  { key: "supportLxo", label: "Support LXO", type: "number" as const },
  { key: "supportEc", label: "Support EC", type: "number" as const },
  { key: "supportMkt", label: "Support MKT", type: "number" as const },
  { key: "totalHours", label: "Total Hours", type: "number" as const },
  { key: "academicHours", label: "Academic Hours", type: "number" as const },
  {
    key: "adminHours",
    label: "Admin Hours",
    type: "number" as const,
    cellClassName: "text-xs",
    headerSpanClassName: "text-xs no-underline leading-[11px] text-[#49780f]",
  },
];

const SALARY_COLUMNS = [
  { key: "deductionHours", label: "Deduction Hours", type: "number" as const },
  { key: "baseSalary", label: "Base Salary", type: "currency" as const },
  { key: "totalSalary", label: "Total Salary", type: "currency" as const },
];

const EMPLOYEE_COLUMNS = [
  { key: "id", label: "No.", type: "text" as const, width: 60 },
  { key: "center", label: "L07", type: "text" as const, width: 100 },
  {
    key: "employeeId",
    label: "ID Number",
    type: "text" as const,
    width: 120,
    headerClassName: "leading-[16.4px]",
  },
  { key: "fullName", label: "Name", type: "text" as const, width: 220 },
  {
    key: "salaryScale",
    label: "Salary Scale",
    type: "text" as const,
    width: 120,
  },
  { key: "from", label: "From", type: "text" as const, width: 100 },
  { key: "to", label: "To", type: "text" as const, width: 100 },
  ...BASE_TASK_COLUMNS,
  { key: "className", label: "Class Name", type: "text" as const, width: 150 },
  { key: "noteDays", label: "Note", type: "text" as const, width: 220 },
];

const CENTER_COLUMNS = [
  { key: "id", label: "No.", type: "text" as const, width: 60 },
  { key: "l07", label: "L07 (Center)", type: "text" as const, width: 150 },
  {
    key: "business",
    label: "Business",
    type: "text" as const,
    width: 120,
    headerClassName: "leading-[16.4px]",
  },
  {
    key: "salaryScale",
    label: "Salary Scale",
    type: "text" as const,
    width: 120,
  },
  { key: "from", label: "From", type: "text" as const, width: 100 },
  { key: "to", label: "To", type: "text" as const, width: 100 },
  {
    key: "chargeLxo",
    label: "Charge LXO",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "chargeEc",
    label: "Charge EC",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "chargePtDemo",
    label: "Charge PT-DEMO",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "chargeMktLocal",
    label: "Charge MKT Local",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "chargeRenewal",
    label: "Charge Renewal",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "chargeDiscovery",
    label: "Charge Discovery",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "chargeSummerOuting",
    label: "Charge Summer Outing",
    type: "currency" as const,
    width: 140,
  },
  {
    key: "totalSalary",
    label: "Total Salary",
    type: "currency" as const,
    width: 160,
  },
];

// ============================================================================
// 3. UTILITIES & PARSERS
// ============================================================================

const parseAnyDate = (dateVal: any): Date | null => {
  if (dateVal === null || dateVal === undefined || dateVal === "") return null;
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null;
    return new Date(
      dateVal.getFullYear(),
      dateVal.getMonth(),
      dateVal.getDate(),
    );
  }
  if (typeof dateVal === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + Math.floor(dateVal) * 86400000);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const str = String(dateVal).trim();
  const clean = str
    .replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*[,\s]+/i, "")
    .trim();
  const matchIso = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matchIso)
    return new Date(
      parseInt(matchIso[1], 10),
      parseInt(matchIso[2], 10) - 1,
      parseInt(matchIso[3], 10),
    );
  const matchDmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchDmy) {
    const p1 = parseInt(matchDmy[1], 10),
      p2 = parseInt(matchDmy[2], 10),
      year = parseInt(matchDmy[3], 10);
    let day = p1,
      month = p2 - 1;
    if (p1 <= 12 && p2 > 12) {
      month = p1 - 1;
      day = p2;
    }
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const d2 = new Date(clean);
  if (!isNaN(d2.getTime()))
    return new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return null;
};

const getVal = (obj: any, searchKeys: string[]) => {
  for (const k in obj) {
    if (searchKeys.includes(k.trim().toLowerCase())) return obj[k];
  }
  return undefined;
};

const normalizeId = (id: string) => String(id).replace(/^0+/, "").trim();

const parseTimeStrToHours = (val: any): number => {
  if (!val) return 0;
  if (val instanceof Date)
    return (
      (val.getHours() * 3600 + val.getMinutes() * 60 + val.getSeconds()) / 86400
    );
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const str = val.trim();
    if (str.includes(":")) {
      const p = str.split(":");
      return (
        (parseInt(p[0]) || 0) / 24 +
        (parseInt(p[1]) || 0) / 1440 +
        parseInt(p[2] || "0") / 86400
      );
    }
    const parsed = parseFloat(str);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
};

const formatTime12Hour = (val: any): string => {
  if (!val) return "";
  if (val instanceof Date) {
    let h = val.getHours();
    const m = String(val.getMinutes()).padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  }
  let timeStr = String(val).trim();
  if (!timeStr.includes(":") && !isNaN(parseFloat(timeStr))) {
    const totalMinutes = Math.round(parseFloat(timeStr) * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    timeStr = `${h}:${String(m).padStart(2, "0")}`;
  }
  if (timeStr.toLowerCase().includes("m")) return timeStr;
  const parts = timeStr.split(":");
  if (parts.length >= 2) {
    let h = parseInt(parts[0], 10);
    const m = parts[1].padStart(2, "0");
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    h = h ? h : 12;
    return `${h}:${m} ${ampm}`;
  }
  return timeStr;
};

const formatDurationFromHours = (hours: number): string => {
  if (!hours || isNaN(hours)) return "";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// ============================================================================
// 4. MAIN APP (Trái tim điều hướng dữ liệu)
// ============================================================================

// Center Mapping from File A to File B
const CENTER_MAPPING_A_TO_B: Record<string, string> = {
  "BN1.NSL": "BN0001.LTT",
  "BN2.TUS": "BN0002.TSN",
  "HN1.PH": "HN0001.PHY",
  "HN2.TH": "HN0002.THA",
  "HN3.HQV": "HN0003.HQV",
  "HN4.LG": "HN0004.LGI",
  "HN5.NVL": "HN0005.NVL",
  "HN7.VQ": "HN0007.VQN",
  "HN10.TG": "HN0010.MDH",
  "HN12.NHT": "HN0012.NHT",
  "HN14.TM": "HN0014.TMI",
  "HN15.VP": "HN0015.VPU",
  "HN16.PDP": "HN0016.PDP",
  "HN17.HNI": "HN0017.HNI",
  "HN18.VTP": "HN0018.VTP",
  "HN19.NT": "HN0019.NTN",
  "HN21.NGD": "HN0021.NGD",
  "HN22.NVO": "HN0022.NVO",
  "HN23.LD": "HN0023.LDM",
  "HN24.TC": "HN0024.TCY",
  "HN25.LTT": "HN0025.LTT",
  "HN26.VH": "HN0026.VHG",
  "HN27.OP": "HN0027.OPK",
  "HN28.PVD": "HN0028.PVD",
  "HN29.VPH": "HN0029.VPH",
  "HN30.AKH": "HN0030.AKH",
  "HN31.AHG": "HN0031.AHG",
  "HN32.LLQ": "HN0032.LLQ",
  "HN33.DAH": "HN0033.DAH",
  "HN34.HTN": "HN0034.HTN",
  "HY01.ECP": "HY0001.ECP",
  "HP1.LHP": "HP0001.LHP",
  "HP2.HBT": "HP0002.HBT",
  "HP3.VIN": "HP0003.VIN",
  "QN01.HL": "QN0001.HLG",
  "VIN01.CT": "VIN001.CTG",
  "VP01.PCT": "VP0001.PCT",
  "TH01.TPU": "TH0001.TPU",
  "TN01.LNQ": "TN0001.LNQ",
  "ASP.HN": "HN0200.ASP",
};

export default function TimesheetSummaryPage({ onSwitchToFinal }: { onSwitchToFinal?: () => void }) {
  const { appData, updateAppData } = useAppData();

  // STATE: Tabs
  const [activeTab, setActiveTab] = useState<"files">("files");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const tableRef = useRef<DataTableRef>(null);

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setSelectedMonth(v);
    if (v) {
      const [yearStr, monthStr] = v.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      
      let prevYear = year;
      let prevMonth = month - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear--;
      }
      
      const pmStr = String(prevMonth).padStart(2, '0');
      const cmStr = String(month).padStart(2, '0');
      
      setFromDate(`${prevYear}-${pmStr}-21`);
      setToDate(`${year}-${cmStr}-20`);
    } else {
      setFromDate("");
      setToDate("");
    }
  };

  // DATA FROM CONTEXT
  const rosterData = appData.Q_Roster || [];
  const teacherHoursData = (appData as any).Q_TeacherHours || [];
  const salaryScaleData = appData.Q_Salary_Scale || [];
  const staffData = appData.Q_Staff || [];
  const cacheData = appData.Q_Cache || [];
  const inputRows = appData.Timesheet_InputList || [
    { id: "1", l07: "", aeCode: "", bus: "", url: "", status: "pending" },
  ];

  // LOGIC: Bảng Input
  const handleAddRow = () => {
    updateAppData((prev) => ({
      ...prev,
      Timesheet_InputList: [
        ...inputRows,
        {
          id: generateUUID(),
          l07: "",
          aeCode: "",
          bus: "",
          url: "",
          status: "pending",
        },
      ],
    }));
  };
  const handleUpdateRow = (
    id: string,
    field: keyof TimesheetInputRow,
    val: any,
  ) => {
    updateAppData(
      (prev) => ({
        ...prev,
        Timesheet_InputList: (prev.Timesheet_InputList || []).map((r) =>
          r.id === id ? { ...r, [field]: val } : r,
        ),
      }),
      false,
    ); // No history for typing
  };
  const handleClearRow = (id: string) => {
    updateAppData((prev) => ({
      ...prev,
      Timesheet_InputList: (prev.Timesheet_InputList || []).map((r) =>
        r.id === id
          ? {
              ...r,
              url: "",
              fileName: undefined,
              sheetName: undefined,
              status: "pending",
              count: undefined,
              date: undefined,
              columnMapping: undefined,
            }
          : r,
      ),
    }));
  };
  const handleClearAll = () => {
    updateAppData((prev) => ({
      ...prev,
      Timesheet_InputList: (prev.Timesheet_InputList || []).map((r) => ({
        ...r,
        url: "",
        fileName: undefined,
        sheetName: undefined,
        status: "pending",
        count: undefined,
        date: undefined,
        columnMapping: undefined,
      })),
      Q_Roster: [],
      Q_Salary_Scale: [],
      Q_Staff: [],
      Q_Cache: [],
    }));
    toast?.success("Đã xóa toàn bộ dữ liệu (đã giữ lại thông tin center).");
  };

  const handleClearEmptyL07 = () => {
    updateAppData((prev) => ({
      ...prev,
      Timesheet_InputList: (prev.Timesheet_InputList || []).filter(
        (r) => r.l07 && r.l07.trim() !== ""
      ),
    }));
    toast?.success("Đã xóa các dòng chưa có mã L07.");
  };

  useEffect(() => {
    if (rosterData.length === 0) return;

    // Build unique list of L07, Mã AE, bus from rosterData
    const centerSet = new Map<string, { l07: string; aeCode: string; bus: string }>();
    rosterData.forEach((t) => {
      const rawCenterCol = String(getVal(t, ["center", "location", "cơ sở"]) || "").trim();
      const rawAECol = String(getVal(t, ["mã ae", "ae"]) || "").trim();
      const info =
        getCenterInfoByAECode(rawAECol) ||
        getCenterInfoByL07(rawCenterCol) ||
        getCenterInfoByL07(mapL07(rawCenterCol));
      
      const l07 = info?.l07 || rawCenterCol || rawAECol || "UNKNOWN";
      const aeCode = info?.aeCode || rawAECol || "";
      const bus = info?.bus || "";
      const key = `${l07}|${aeCode}|${bus}`;
      
      if (!centerSet.has(key)) {
        centerSet.set(key, { l07, aeCode, bus });
      }
    });

    const existingKeys = new Set(inputRows.map((r) => `${r.l07}|${r.aeCode}|${r.bus}`));
    let hasChanges = false;
    let newInputs = [...inputRows];

    // Check if the only row is completely empty
    if (centerSet.size > 0 && newInputs.length === 1 && !newInputs[0].l07 && !newInputs[0].url) {
      newInputs = [];
      hasChanges = true;
    }

    centerSet.forEach((val, key) => {
      if (!existingKeys.has(key)) {
        newInputs.push({
          id: generateUUID(),
          l07: val.l07,
          aeCode: val.aeCode,
          bus: val.bus,
          url: "",
          status: "pending",
        });
        hasChanges = true;
      }
    });

    if (hasChanges) {
      updateAppData(
        (prev) => ({
          ...prev,
          Timesheet_InputList: newInputs,
        }),
        false
      );
    }
  }, [rosterData]);

  const handleRecalculate = () => {
    setRefreshKey((prev) => prev + 1);
    toast?.success("Đã tổng hợp lại dữ liệu.");
  };

  const handleUploadFiles = async (files: File[]) => {
    const currentInputs = appData.Timesheet_InputList || [];
    const updatedInputs = [...currentInputs];
    const toProcess: { id: string; file: File }[] = [];

    for (const file of files) {
      const l07 = getL07FromFileName(file.name) || "";
      const centerInfo = l07 ? getCenterInfoByL07(l07) : null;
      const aeCode = centerInfo?.aeCode || "";

      // Match by L07 or aeCode
      const matchIndex = updatedInputs.findIndex((r) => {
        const matchL07 = l07 && r.l07 && r.l07.toLowerCase() === l07.toLowerCase();
        const matchAE = aeCode && r.aeCode && r.aeCode.toLowerCase() === aeCode.toLowerCase();
        return matchL07 || matchAE;
      });

      if (matchIndex !== -1) {
        updatedInputs[matchIndex] = {
          ...updatedInputs[matchIndex],
          status: "processing",
        };
        toProcess.push({ id: updatedInputs[matchIndex].id, file });
      } else {
        toast?.error(`Bỏ qua file ${file.name} vì không tìm thấy L07/Mã AE tương ứng trong bảng.`);
      }
    }

    if (updatedInputs !== currentInputs) {
      updateAppData((prev) => ({
        ...prev,
        Timesheet_InputList: updatedInputs,
      }));
    }

    toProcess.forEach((p, i) => {
      setTimeout(() => {
        handleUploadFile(p.id, p.file);
      }, 100 * (i + 1));
    });
  };

  // LOGIC: Đọc File (XLSX, CSV)
  const handleUploadFile = async (rowId: string, file: File) => {
    handleUpdateRow(rowId, "status", "processing");
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      let isSalary = false,
        isStaff = false,
        isCache = false,
        isRoster = false;
      const fn = file.name.toLowerCase();
      if (fn.includes("salary")) isSalary = true;
      else if (fn.includes("staff")) isStaff = true;
      else if (fn.includes("cache")) isCache = true;
      else isRoster = true;

      let foundData = false;

      workbook.SheetNames.forEach((sheetName) => {
        const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          defval: "",
        });
        if (json.length > 0) {
          foundData = true;
          json.forEach((r: any) => {
            r._sourceFile = file.name;
            r._rowId = rowId;
          });
          const headers = Object.keys(json[0] as any).map((k) =>
            k.toLowerCase().trim(),
          );

          // Nhận diện tự động qua cột và cập nhật vào AppData
          updateAppData((prev) => {
            const next = { ...prev };
            if (headers.includes("academic price") || isSalary)
              next.Q_Salary_Scale = [...(next.Q_Salary_Scale || []), ...json];
            else if (headers.includes("bank account number") || isStaff)
              next.Q_Staff = [...(next.Q_Staff || []), ...json];
            else if (headers.includes("today") || isCache)
              next.Q_Cache = [...(next.Q_Cache || []), ...json];
            else next.Q_Roster = [...(next.Q_Roster || []), ...json];
            return next;
          });
        }
      });

      if (foundData) {
        handleUpdateRow(rowId, "status", "success");
        handleUpdateRow(rowId, "fileName", file.name);
        const d = new Date();
        handleUpdateRow(
          rowId,
          "date",
          `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")} ${d.getDate()}/${d.getMonth() + 1}`,
        );
        toast?.success(`Đọc thành công file ${file.name}`);
      } else {
        throw new Error("File trống hoặc không hợp lệ");
      }
    } catch (err) {
      handleUpdateRow(rowId, "status", "error");
      toast?.error(`Lỗi đọc file: ${file.name}`);
    }
  };

  // LOGIC LÕI: Tính Lương và Dội Giờ (Đã FIX bug 290h)
  const computedData = useMemo(() => {
    if (rosterData.length === 0)
      return {
        processedRosterData: [],
        employeeSummary: [],
        centerSummary: [],
      };
    let skipped = 0;
    const fDate = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const tDate = toDate ? new Date(toDate + "T23:59:59") : null;

    const getSalaryRate = (id: string, name: string) => {
      const nid = normalizeId(id);
      const row = salaryScaleData.find((s) => {
        const sid = normalizeId(getVal(s, ["id", "id number"]) || "");
        const sn = String(getVal(s, ["full name", "name"]))
          .trim()
          .toLowerCase();
        return (sid && sid === nid) || (sn && sn === name.toLowerCase());
      });
      const sCode = String(getVal(row || {}, ["s code", "scale"]) || "S1")
        .trim()
        .toUpperCase();
      const def = DEFAULT_SALARY_SCALES[sCode] || DEFAULT_SALARY_SCALES["S1"];
      let ac = def.ac,
        ad = def.ad;
      const su = def.summer,
        ou = def.outing;
      if (row) {
        const rAc = getVal(row, ["academic price", "academic"]);
        const rAd = getVal(row, ["administrative price", "admin"]);
        if (rAc !== undefined && rAc !== "")
          ac = parseFloat(String(rAc).replace(/,/g, "")) || 0;
        if (rAd !== undefined && rAd !== "")
          ad = parseFloat(String(rAd).replace(/,/g, "")) || 0;
      }
      return { ac, ad, su, ou, sCode };
    };

    const details: any[] = [];
    const empGroup: Record<string, any> = {};
    const cenGroup: Record<string, any> = {};

    rosterData.forEach((t) => {
      let invalid = false;
      if (String(getVal(t, ["check"]) || "").toUpperCase() === "DUPLICATE")
        invalid = true;
      for (const k in t) {
        if (
          k.toLowerCase().startsWith("check") &&
          String(t[k]).toUpperCase().includes("FALSE")
        ) {
          invalid = true;
          break;
        }
      }
      if (invalid) {
        skipped++;
        return;
      }

      const dStr = getVal(t, ["date", "ngày", "ngày làm việc", "tk_date"]);
      const rd = parseAnyDate(dStr);
      if (!rd || (fDate && rd < fDate) || (tDate && rd > tDate)) {
        skipped++;
        return;
      }

      const rawId = String(
        getVal(t, ["id", "id number", "tk_id"]) || "",
      ).trim();
      if (!rawId) {
        skipped++;
        return;
      }

      let fullName = getVal(t, ["full name", "name"]);
      const staff =
        staffData.find(
          (s) =>
            normalizeId(getVal(s, ["id", "id number"]) || "") ===
            normalizeId(rawId),
        ) || {};
      if (!fullName)
        fullName =
          staff["Full Name (VN)"] || staff["Full Name (EN)"] || "Unknown";
      fullName = String(fullName).toUpperCase();

      const taskType = getVal(t, ["type", "task type", "tk_type"]);
      if (!taskType) {
        skipped++;
        return;
      }

      // Tham chiếu ngược từ file upload để lấy L07 / AE / Bus nếu có
      const rowInfo = inputRows.find((ir) => ir.id === t._rowId);
      const rawCenterCol = String(
        getVal(t, ["center", "location", "cơ sở"]) || "",
      ).trim();
      const rawAECol = String(getVal(t, ["mã ae", "ae"]) || "").trim();

      // Lấy thông tin từ AE Code trước (phù hợp với logic "center trong excel = mã ae")
      const centerInfo =
        getCenterInfoByAECode(rawAECol) ||
        getCenterInfoByAECode(rawCenterCol) ||
        getCenterInfoByL07(rowInfo?.l07 || rawCenterCol);

      const center =
        centerInfo?.l07 || rowInfo?.l07 || rawCenterCol || "UNKNOWN";
      const maAE =
        centerInfo?.aeCode || rowInfo?.aeCode || rawAECol || "UNKNOWN";
      const business =
        centerInfo?.bus ||
        rowInfo?.bus ||
        String(getVal(t, ["business"]) || "UNKNOWN");

      const classCode = String(getVal(t, ["class", "lớp"]) || "");
      const from = getVal(t, ["from", "từ"]) || "";
      const to = getVal(t, ["to", "đến"]) || "";
      const durRaw = getVal(t, ["duration", "tk_duration"]);
      const notes = String(getVal(t, ["notes", "ghi chú"]) || "");

      // TÍNH GIỜ (Chống lỗi 290h)
      let hours = 0;
      if (from !== undefined && from !== "" && to !== undefined && to !== "") {
        const hF = parseTimeStrToHours(from);
        const hT = parseTimeStrToHours(to);
        hours = hT >= hF ? (hT - hF) * 24 : (hT + 1 - hF) * 24;
      } else if (durRaw !== undefined && durRaw !== "") {
        const strVal = String(durRaw).trim().replace(",", ".");
        if (strVal.includes(":")) {
          const p = strVal.split(":");
          hours = (parseFloat(p[0]) || 0) + (parseFloat(p[1]) || 0) / 60;
        } else {
          const parsed = parseFloat(strVal);
          if (!isNaN(parsed)) {
            hours =
              parsed > 0 && parsed <= 1 && strVal.length > 4
                ? parsed * 24
                : parsed;
          }
        }
      }

      if (isNaN(hours) || hours <= 0) return;

      const { ac, ad, su, ou, sCode } = getSalaryRate(rawId, fullName);
      const ds = `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, "0")}-${String(rd.getDate()).padStart(2, "0")}`;

      details.push({
        id: details.length + 1,
        center,
        employeeId: rawId,
        fullName,
        maAE,
        date: ds,
        taskType,
        classCode,
        from: formatTime12Hour(from),
        to: formatTime12Hour(to),
        duration: formatDurationFromHours(hours),
        workingHours: hours,
        notes,
      });

      const empKey = `${center}_${rawId}`;
      const cenKey = `${center}|${business}|${t._sourceFile}|${sCode}`;
      const ctr = () => ({
        inClass: 0,
        inClassAtls: 0,
        demo: 0,
        tutoring: 0,
        waitingClass: 0,
        clubActivity: 0,
        parentMeeting: 0,
        pickUpDropOff: 0,
        pickUpDropOffAtls: 0,
        sms: 0,
        smsAtls: 0,
        progressReport: 0,
        progressReportAtls: 0,
        prepareLessonTutoring: 0,
        meetingTraining: 0,
        pt: 0,
        discoveryCamp: 0,
        outing: 0,
        summer: 0,
        prepareLessonClubs: 0,
        conductTest: 0,
        renewalProjects: 0,
        supportLxo: 0,
        supportEc: 0,
        supportMkt: 0,
        totalHours: 0,
        academicHours: 0,
        adminHours: 0,
      });

      if (!empGroup[empKey])
        empGroup[empKey] = {
          employeeId: rawId,
          fullName,
          maAE,
          center,
          salaryScale: sCode,
          acRate: ac,
          adRate: ad,
          suRate: su,
          ouRate: ou,
          from: fromDate || "Tất cả",
          to: toDate || "Tất cả",
          ...ctr(),
          classNames: new Set<string>(),
          noteDates: new Set<string>(),
        };
      if (!cenGroup[cenKey])
        cenGroup[cenKey] = {
          l07: center,
          business,
          maAE,
          sourceFile: t._sourceFile,
          salaryScale: sCode,
          acRate: ac,
          adRate: ad,
          suRate: su,
          ouRate: ou,
          from: fromDate || "Tất cả",
          to: toDate || "Tất cả",
          ...ctr(),
        };

      const col =
        TASK_COLUMNS[
          String(taskType).trim().toLowerCase().replace(/\s+/g, " ")
        ];
      if (col) {
        [empGroup[empKey], cenGroup[cenKey]].forEach((g) => {
          g[col] += hours;
          g.totalHours += hours;
          if (ACADEMIC_FIELDS.includes(col)) g.academicHours += hours;
          if (ADMIN_FIELDS.includes(col)) g.adminHours += hours;
        });

        // Collect class name and dates if inClass or inClassAtls
        if ((col === "inClass" || col === "inClassAtls") && hours > 0) {
          if (classCode) empGroup[empKey].classNames.add(classCode);
          empGroup[empKey].noteDates.add(ds);
        }
      }
    });

    if (skipped > 0) {
      // Logic skipped count moved to useEffect below
    }

    const finalize = (obj: any) =>
      Object.values(obj).map((r: any, idx) => {
        const ded =
          (r.inClass + r.inClassAtls + r.clubActivity + r.parentMeeting) / 2;
        const salary =
          r.academicHours * r.acRate +
          (r.adminHours - ded) * r.adRate +
          r.summer * r.suRate +
          r.outing * r.ouRate +
          r.discoveryCamp * r.suRate;

        const chargeLxo = r.supportLxo * r.adRate;
        const chargeEc = r.supportEc * r.adRate;
        const chargePtDemo = r.pt * r.adRate + r.demo * r.acRate;
        const chargeMktLocal = r.supportMkt * r.adRate;
        const chargeRenewal = r.renewalProjects * r.adRate;
        const chargeDiscovery = r.discoveryCamp * r.suRate;
        const chargeSummerOuting = r.summer * r.suRate + r.outing * r.ouRate;

        return {
          ...r,
          id: idx + 1,
          deductionHours: ded,
          baseSalary: salary,
          totalSalary: Math.round(salary),
          chargeLxo: Math.round(chargeLxo),
          chargeEc: Math.round(chargeEc),
          chargePtDemo: Math.round(chargePtDemo),
          chargeMktLocal: Math.round(chargeMktLocal),
          chargeRenewal: Math.round(chargeRenewal),
          chargeDiscovery: Math.round(chargeDiscovery),
          chargeSummerOuting: Math.round(chargeSummerOuting),
          className: r.classNames
            ? Array.from(r.classNames as Set<string>).join(", ")
            : "",
          noteDays: r.noteDates
            ? Array.from(r.noteDates as Set<string>)
                .sort()
                .map((d: string) => {
                  const parts = d.split("-");
                  return `${parts[2]}/${parts[1]}`;
                })
                .join(", ")
            : "",
        };
      });

    return {
      processedRosterData: details,
      employeeSummary: finalize(empGroup),
      centerSummary: finalize(cenGroup),
      skippedCount: skipped,
    };
  }, [
    rosterData,
    salaryScaleData,
    staffData,
    cacheData,
    fromDate,
    toDate,
    inputRows,
    refreshKey,
  ]);

  useEffect(() => {
    updateAppData(
      (prev: any) => ({
        ...prev,
        TA_Employee_Summary: {
          headers: EMPLOYEE_COLUMNS.map((c) => c.label),
          data: computedData.employeeSummary,
        },
        TA_Center_Summary: {
          headers: CENTER_COLUMNS.map((c) => c.label),
          data: computedData.centerSummary,
        },
      }),
      false,
    );
  }, [computedData.employeeSummary, computedData.centerSummary]);

  // Điều phối View
  const activeColumns: any[] = [];

  const computedTaComparison = useMemo(() => {
    if (!teacherHoursData || teacherHoursData.length === 0) return [];

    const rosterSums: Record<string, number> = {};
    computedData.processedRosterData.forEach((r) => {
      if (!r.center) return;
      const key = String(r.center).trim().toUpperCase();
      // File B (Roster) total working hours per center
      rosterSums[key] = (rosterSums[key] || 0) + (r.workingHours || 0);
    });

    const centerGroups: Record<
      string,
      {
        centerA: string;
        centerB: string;
        teacherHours: number;
        expectedTa: number;
      }
    > = {};

    teacherHoursData.forEach((row: any) => {
      const typeObjKey =
        Object.keys(row).find(
          (k) => k.toLowerCase() === "type" || k.toLowerCase().includes("type"),
        ) || "";
      const typeRaw = typeObjKey ? row[typeObjKey] : "";
      const type = String(typeRaw).trim().toLowerCase();
      if (type !== "normal class") return;

      const classNameObjKey =
        Object.keys(row).find(
          (k) =>
            k.toLowerCase().includes("class name") ||
            k.toLowerCase().includes("event note"),
        ) || "";
      const classNameRaw = classNameObjKey ? row[classNameObjKey] : "";
      const className = String(classNameRaw).trim();
      const upperClass = className.toUpperCase();

      if (
        !["KDG1", "KDG2", "KDG3", "PRI1", "PRI2", "PRI3"].some((k) =>
          upperClass.includes(k),
        )
      )
        return;

      const teacherObjKey =
        Object.keys(row).find(
          (k) =>
            k.toLowerCase().includes("teacher") ||
            k.toLowerCase().includes("giáo viên"),
        ) || "";
      const teacherRaw = teacherObjKey ? row[teacherObjKey] : "";
      const teacher = String(teacherRaw).trim().toLowerCase();
      if (
        teacher === "" ||
        teacher.includes("cố vấn học tập") ||
        teacher.includes("no teacher") ||
        teacher.includes("no teacher yet")
      )
        return;

      const centerObjKey =
        Object.keys(row).find((k) => k.toLowerCase().includes("center")) || "";
      const centerRaw = centerObjKey ? row[centerObjKey] : "";
      const centerA = String(centerRaw).trim().toUpperCase();
      if (!centerA) return;

      const centerB = CENTER_MAPPING_A_TO_B[centerA]
        ? CENTER_MAPPING_A_TO_B[centerA].toUpperCase()
        : centerA;

      const isKdg = upperClass.includes("KDG");
      const taMultiplier = isKdg ? 2 : 1;

      // Tìm cột Total
      const totalObjKey =
        Object.keys(row).find((k) => k.toLowerCase() === "total") || "";
      let rowSum = 0;

      if (totalObjKey) {
        const tVal = row[totalObjKey];
        if (typeof tVal === "number") rowSum = tVal;
        else if (typeof tVal === "string")
          rowSum = parseFloat(tVal.replace(/,/g, "."));
      } else {
        // Fallback: tính tổng các ngày
        Object.entries(row).forEach(([k, v]) => {
          if (
            k.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/) ||
            (!isNaN(Number(k)) && Number(k) > 40000)
          ) {
            let hrMatch = 0;
            if (typeof v === "string")
              hrMatch = parseFloat(v.replace(/,/g, "."));
            else if (typeof v === "number") hrMatch = v;
            if (!isNaN(hrMatch)) rowSum += hrMatch;
          }
        });
      }

      if (rowSum > 0 && !isNaN(rowSum)) {
        const key = centerB;
        if (!centerGroups[key])
          centerGroups[key] = {
            centerA,
            centerB,
            teacherHours: 0,
            expectedTa: 0,
          };
        centerGroups[key].teacherHours += rowSum;
        centerGroups[key].expectedTa += rowSum * taMultiplier;
      }
    });

    const result = Object.values(centerGroups).map((g) => {
      const actualTa = rosterSums[g.centerB] || 0;
      const diff = g.expectedTa - actualTa;
      let status = "Khớp";
      if (Math.abs(diff) > 2) status = "Lệch";
      else if (Math.abs(diff) > 0) status = "Sấp sỉ";

      return { ...g, actualTa, diff, status };
    });

    // Thêm các center có trong roster nhưng không có trong File A
    Object.keys(rosterSums).forEach((bKey) => {
      if (!centerGroups[bKey] && rosterSums[bKey] > 0) {
        const centerA =
          Object.keys(CENTER_MAPPING_A_TO_B).find(
            (k) => CENTER_MAPPING_A_TO_B[k].toUpperCase() === bKey,
          ) || bKey;
        result.push({
          centerA,
          centerB: bKey,
          teacherHours: 0,
          expectedTa: 0,
          actualTa: rosterSums[bKey],
          diff: -rosterSums[bKey],
          status: "Lệch",
        });
      }
    });

    return result;
  }, [teacherHoursData, computedData.processedRosterData]);

  const activeData: any[] = [];

  const handleUploadFileA = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const allRows: any[] = [];

      workbook.SheetNames.forEach((sheetName) => {
        const rawData: any[][] = XLSX.utils.sheet_to_json(
          workbook.Sheets[sheetName],
          { header: 1, defval: "" },
        );
        if (rawData.length < 1) return;

        let headerRowIdx = -1;
        for (let i = 0; i < Math.min(10, rawData.length); i++) {
          const row = rawData[i] || [];
          if (
            row.some(
              (c) =>
                String(c).toLowerCase() === "center code" ||
                String(c).toLowerCase() === "center" ||
                String(c).toLowerCase().includes("class name"),
            )
          ) {
            headerRowIdx = i;
            break;
          }
        }

        if (headerRowIdx !== -1) {
          const headers = rawData[headerRowIdx];
          for (let i = headerRowIdx + 1; i < rawData.length; i++) {
            const row = rawData[i] || [];
            if (row.join("").trim() === "") continue;
            const obj: any = {};
            for (let j = 0; j < headers.length; j++) {
              const key = String(headers[j] || "").trim();
              if (key) {
                obj[key] = row[j];
              }
            }
            allRows.push(obj);
          }
        } else {
          const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
            defval: "",
          });
          allRows.push(...json);
        }
      });
      console.log("Parsed File A:", allRows.slice(0, 5));
      updateAppData((prev) => ({ ...prev, Q_TeacherHours: allRows }) as any);
      toast?.success(`Tải lên File A thành công (${allRows.length} dòng)`);
      if (e.target) e.target.value = "";
    } catch (err) {
      console.error(err);
      toast?.error("Lỗi khi đọc File A");
    }
  };

  const handleExport = () => {
    if (activeData.length === 0) {
      toast?.error("Không có dữ liệu");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(activeData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    XLSX.writeFile(wb, `Timesheet_Export_${activeTab}.xlsx`);
  };

  const TAB_LABELS: Record<string, string> = {
    files: "Data",
  };
  const TAB_ICONS: Record<string, React.ReactNode> = {
    files: <FileSpreadsheet className="w-5 h-5 text-primary" />,
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-transparent px-4 pt-0 pb-6 md:px-6 gap-4 items-center overflow-auto custom-scrollbar">
      <input
        type="file"
        id="fileA"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleUploadFileA}
      />
      {/* Floating Header Card */}
      <div
        className="mx-auto w-full max-w-[1360px] px-4 sm:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-3xl shadow-xl shadow-primary/5 shrink-0 relative z-[90] mb-2 border-0"
        style={{ borderWidth: "0px" }}
      >
        <div className="absolute inset-0 striped-pattern opacity-[0.05] pointer-events-none rounded-3xl overflow-hidden" />

        <div className="flex items-center gap-3 sm:gap-4 relative z-10 shrink-0 w-full sm:w-auto justify-center sm:justify-start flex-wrap">
          <div className="w-10 h-10 bg-primary/20 rounded-full flex flex-col sm:flex-row items-center justify-center text-primary shrink-0 border border-primary/30 shadow-inner">
            <Calculator className="w-5 h-5 text-primary" />
          </div>
          <div className="py-1 px-0 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
              <h2
                className="font-display text-foreground tracking-tight flex items-center gap-1 font-bold m-0 p-0 flex-wrap justify-center sm:justify-start"
                style={{ fontSize: "18px" }}
              >
                <span className="text-xl sm:text-2xl leading-none">File Roster</span>
                <span className="not-italic font-script text-primary text-3xl sm:text-4xl lowercase inline-block transform sm:-translate-y-0.5">
                  centers
                </span>
              </h2>
              <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md text-[0.6rem] font-bold uppercase tracking-widest mt-1 sm:mt-0">
                Live System
              </div>
            </div>
            <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] sm:tracking-[0.2em] text-muted-foreground mt-0.5">
              FILE DATA FROM CENTERS
            </p>
          </div>
        </div>

        <div className={`flex flex-wrap items-center gap-3 relative z-10 justify-center sm:justify-end w-full sm:w-auto`}>
          {onSwitchToFinal && (
            <button
              onClick={onSwitchToFinal}
              className="flex items-center gap-2 px-5 h-9 border border-primary/20 rounded-xl bg-primary/5 text-primary hover:bg-primary/10 transition-all font-bold text-[0.625rem] uppercase tracking-widest shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Bảng Timesheet
            </button>
          )}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className="flex w-9 h-9 items-center justify-center rounded-full border border-border bg-white text-muted-foreground hover:text-primary transition-all group shadow-sm">
                    <Wrench className="w-4 h-4 group-hover:rotate-45 transition-transform duration-500" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Cài đặt</TooltipContent>
            </Tooltip>
            <DropdownMenuContent
              align="end"
              className="w-64 border border-primary/10 shadow-2xl p-2 bg-white rounded-2xl"
            >
              <DropdownMenuLabel className="text-[0.625rem] font-bold uppercase tracking-widest text-primary/60 px-3 py-2">
                Tiện ích
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-primary/5 mx-1" />
              <DropdownMenuItem
                onSelect={handleClearAll}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-rose-50 transition-colors text-rose-500"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-rose-500">
                  Xóa toàn bộ trang
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-primary/5 mx-1" />
              {activeTab === "files" && (
                <>
                  <DropdownMenuItem
                    onSelect={() => {
                      setActiveTab("files");
                      (
                        document.querySelector(
                          'input[type="file"]:not(#fileA)',
                        ) as HTMLInputElement
                      )?.click();
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                    <span className="text-[0.6875rem] font-bold uppercase tracking-wider">
                      Upload Nhiều File
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={handleAddRow}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
                  >
                    <ListChecks className="w-4 h-4 text-primary" />
                    <span className="text-[0.6875rem] font-bold uppercase tracking-wider">
                      Thêm mới 1 dòng file
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-primary/5 mx-1" />
                </>
              )}
              <DropdownMenuItem
                onSelect={handleExport}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
              >
                <Download className="w-4 h-4 text-primary" />
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider">
                  Xuất Excel
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setSearchTerm("")}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-primary/5 transition-colors"
              >
                <RefreshCw className="w-4 h-4 text-primary" />
                <span className="text-[0.6875rem] font-bold uppercase tracking-wider">
                  Xóa tìm kiếm
                </span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Content Card */}
      <div className="w-full max-w-[1360px] bg-white rounded-[2.5rem] shadow-xl shadow-primary/5 overflow-hidden flex-1 relative flex flex-col border border-primary/10 p-0">
          <TimesheetInputTable
            rows={inputRows}
            onAddRow={handleAddRow}
            onUpdateRow={handleUpdateRow}
            onClearRow={handleClearRow}
            onClearAll={handleClearAll}
            onClearEmptyL07={handleClearEmptyL07}
            onUploadFile={handleUploadFile}
            onUploadFiles={handleUploadFiles}
            onRefresh={handleRecalculate}
          />
      </div>
    </div>
  );
}
