/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { useAppData } from "../lib/contexts/AppDataContext";
import { CENTER_MAPPING } from "../lib/utils/center-utils";

// ==========================================
// 1. CONSTANTS & MAPPING PRE-CALCULATION
// ==========================================

const RAW_MAPPINGS = [
  { l07: "BN0001.LTT", keys: ["NSL", "BN01", "BN1"] },
  { l07: "BN0002.TSN", keys: ["TUS", "TSN", "BN02", "BN2"] },
  { l07: "HN0001.PHY", keys: ["HN1.PH", "PHY", "PH", "HN01","HN1"] },
  { l07: "HN0002.THA", keys: ["TH", "THA", "HN02", "HN2"] },
  { l07: "HN0003.HQV", keys: ["HQV", "HN03", "HN3"] },
  { l07: "HN0004.LGI", keys: ["LGI", "LG", "HN04", "HN4"] },
  { l07: "HN0005.NVL", keys: ["NVL", "HN05", "HN5"] },
  { l07: "HN0007.VQN", keys: ["VQ", "VQN", "HN07", "HN7"] },
  { l07: "HN0010.MDH", keys: ["MD", "MDH", "HN10"] },
  { l07: "HN0012.NHT", keys: ["NHT", "HM", "HN12"] },
  { l07: "HN0014.TMI", keys: ["TMI", "TM", "HN14"] },
  { l07: "HN0015.VPU", keys: ["VPU", "VP", "HN15"] },
  { l07: "HN0016.PDP", keys: ["PDP", "HN16"] },
  { l07: "HN0017.HNI", keys: ["HNI", "HN17"] },
  { l07: "HN0018.VTP", keys: [ "VTP", "HN18"] },
  { l07: "HN0019.NTN", keys: ["NT", "NTN", "HN19"] },
  { l07: "HN0021.NGD", keys: ["NGD", "HN21"] },
  { l07: "HN0022.NVO", keys: ["NVO", "HN22"] },
  { l07: "HN0023.LDM", keys: ["LD", "LDM", "HN23"] },
  { l07: "HN0024.TCY", keys: ["TC", "TCY", "HN24"] },
  { l07: "HN0025.LTT", keys: ["LTT", "HN25"] },
  { l07: "HN0026.VHG", keys: ["VH", "VHG", "Viet Hung", "HN26", "HN0026"] },
  { l07: "HN0027.OPK", keys: ["OP", "OPK", "OCEAN PARK", "HN27"] },
  { l07: "HN0028.PVD", keys: ["PVD", "HN28"] },
  { l07: "HN0029.VPH", keys: ["VPH", "HN29"] },
  { l07: "HN0030.AKH", keys: ["AKH", "HN30"] },
  { l07: "HN0031.AHG", keys: ["AHG", "HN31"] },
  { l07: "HN0032.LLQ", keys: ["LLQ", "HN32"] },
  { l07: "HN0033.DAH", keys: ["DAH", "DA", "HN33"] },
  { l07: "HN0034.HTN", keys: ["HTN", "HN34"] },
  { l07: "HY0001.ECP", keys: ["ECP", "HY01"] },
  { l07: "HP0001.LHP", keys: ["LHP", "HP1", "HP01"] },
  { l07: "HP0002.HBT", keys: ["HBT", "HP2", "HP02"] },
  { l07: "HP0003.VIN", keys: ["HP", "HP3", "HP03"] },
  { l07: "QN0001.HLG", keys: ["HLG", "QN", "HL", "QN01"] },
  { l07: "VIN001.CTG", keys: ["CTG", "CT", "VIN01", "VIN1"] },
  { l07: "VP0001.PCT", keys: ["PCT", "VP01", "VP1", "Vinh Phuc", "VP0001"] },
  { l07: "TH0001.TPU", keys: ["TPU", "TH01.TPU", "TH1"] },
  { l07: "TN0001.LNQ", keys: ["LNQ", "TN01.LNQ", "TN01", "TN1"] },
  { l07: "HN0200.ASP", keys: ["HN0.ASP", "ASP", "HN0200"] },
  { l07: "PT0001.HVG", keys: ["HVG", "PT01"] },
];

const PRE_CALCULATED_MAPPINGS = RAW_MAPPINGS.flatMap((m) =>
  m.keys.map((k) => ({
    l07: m.l07,
    key: k.toUpperCase(),
    regex: new RegExp(`(?:^|[^A-Z0-9À-ỹa-z])${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:[^A-Z0-9À-ỹa-z]|$)`, "i"),
  }))
).sort((a, b) => b.key.length - a.key.length);

const VALID_MAPPED_CENTERS = new Set(Object.values(CENTER_MAPPING));

const L07_INFO: Record<string, { aeCode: string; mktAeCode?: string }> = {
"BN0001.LTT": { aeCode: "Ngo Si Lien" }, 
"BN0002.TSN": { aeCode: "Tu Son" },
"HN0001.PHY": { aeCode: "Pho Hue Junior" },
"HN0002.THA": { aeCode: "Thai Ha" },
"HN0003.HQV": { aeCode: "Hoang Quoc Viet" }, 
"HN0004.LGI": { aeCode: "Lieu Giai" },
"HN0005.NVL": { aeCode: "Nguyen Van Linh" }, 
"HN0007.VQN": { aeCode: "Van Quan" },
"HN0010.MDH": { aeCode: "My Dinh" }, 
"HN0012.NHT": { aeCode: "Hoang Mai" },
"HN0014.TMI": { aeCode: "Tan Mai" },
"HN0015.VPU": { aeCode: "Van Phu" },
"HN0016.PDP": { aeCode: "Phan Dinh Phung" }, 
"HN0017.HNI": { aeCode: "Ham Nghi" },
"HN0018.VTP": { aeCode: "Vu Tong Phan" }, 
"HN0019.NTN": { aeCode: "Nguyen Tuan" },
"HN0021.NGD": { aeCode: "Ngoai Giao Doan" }, 
"HN0022.NVO": { aeCode: "Nguyen Van Loc" },
"HN0023.LDM": { aeCode:  "Linh Dam" }, 
"HN0024.TCY": { aeCode: "TIMES CITY" },
"HN0025.LTT": { aeCode: "Le Trong Tan" },
"HN0026.VHG": { aeCode: "Viet Hung" },
"HN0027.OPK": { aeCode: "Ocepark" },
"HN0028.PVD": { aeCode: "Pham Van Dong" },
"HN0029.VPH": { aeCode: "Vu Pham Ham" },
"HN0030.AKH": { aeCode: "An Khanh" },
"HN0031.AHG": { aeCode: "An Hung" },
"HN0032.LLQ": { aeCode: "Xuan Dieu (đổi thành Lạc Long Quân)" },
"HN0033.DAH": { aeCode: "HN33.DAH" },
"HN0034.HTN": { aeCode: "HN34.HTN" },
"HY0001.ECP": { aeCode: "Ecopark"},
"HP0001.LHP": { aeCode: "Hai Phong 1"},
"HP0002.HBT": { aeCode: "Hai Phong 2"},
"HP0003.VIN": { aeCode: "Hai Phong 3"},
"QN0001.HLG": { aeCode: "Ha Long" },
"VIN001.CTG": { aeCode: "Vinh"},
"VP0001.PCT": { aeCode: "Vinh Phuc" },
"TH0001.TPU": { aeCode: "TH01.TPU", mktAeCode: "MKT TH01.TPU" },
"TN0001.LNQ": { aeCode: "TN01.LNQ", mktAeCode: "MKT TN01.LNQ" },
"PT0001.HVG": { aeCode: "PT01.HVG" },
"AA": { aeCode: "Apollo Advance -South" },
"HN0200.ASP": { aeCode: "ASP - HN" },
"MKT LOCAL NORTH": { aeCode: "MKT LOCAL NORTH" },
"ZHN0000.GY": { aeCode: "Cambridge" },
"MKT HP": { aeCode: "MKT HP" },
 };

// ==========================================
// 2. HELPERS
// ==========================================

const getVal = (obj: any, searchKeys: string[]) => {
  if (!obj) return "";
  const objKeys = Object.keys(obj);
  for (const k of searchKeys) {
    const normSearch = k.toLowerCase().replace(/\s/g, "");
    const foundKey = objKeys.find((ok) => {
      const normOk = ok.toLowerCase().replace(/\s/g, "");
      return normOk === normSearch;
    });
    if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null && obj[foundKey] !== "") return obj[foundKey];
  }
  return "";
};

const parseAnyDate = (dateVal: any): Date | null => {
  if (dateVal === null || dateVal === undefined || dateVal === "") return null;
  const nowYear = new Date().getFullYear();
  if (dateVal instanceof Date) {
    if (isNaN(dateVal.getTime())) return null;
    return new Date(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate());
  }
  if (typeof dateVal === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + Math.floor(dateVal) * 86400000);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const str = String(dateVal).trim();
  if (/^\d{5}$/.test(str)) {
    const num = parseInt(str, 10);
    if (num > 30000 && num < 60000) {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const d = new Date(excelEpoch.getTime() + num * 86400000);
      return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
  }
  const clean = str.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*[,\s]+/i, "").trim();
  const matchIso = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (matchIso) return new Date(parseInt(matchIso[1], 10), parseInt(matchIso[2], 10) - 1, parseInt(matchIso[3], 10));
  
  const matchDmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (matchDmy) {
    const p1 = parseInt(matchDmy[1], 10),
      p2 = parseInt(matchDmy[2], 10);
    let year = parseInt(matchDmy[3], 10);
    if (year < 100) year += 2000;
    
    let day = p1, month = p2 - 1;
    if (p1 <= 12 && p2 > 12) { month = p1 - 1; day = p2; }
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  
  const matchNoYear = clean.match(/^(\d{1,2})[-/](\d{1,2})$/);
  if (matchNoYear) {
    const p1 = parseInt(matchNoYear[1], 10), p2 = parseInt(matchNoYear[2], 10);
    let day = p1, month = p2 - 1;
    if (p1 <= 12 && p2 > 12) { month = p1 - 1; day = p2; }
    const d = new Date(nowYear, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  
  const d2 = new Date(clean);
  if (!isNaN(d2.getTime()) && d2.getFullYear() > 2000) return new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  return null;
};

const resolveCenterCode = (input: string): string => {
  const normalized = String(input).trim().toUpperCase();
  if (!normalized) return "";
  if (VALID_MAPPED_CENTERS.has(normalized)) return normalized;
  if (CENTER_MAPPING[normalized]) return CENTER_MAPPING[normalized];
  
  // Exact match first
  for (const mapping of PRE_CALCULATED_MAPPINGS) {
    if (mapping.key === normalized) {
      return mapping.l07;
    }
  }

  // Regex word boundary match
  for (const mapping of PRE_CALCULATED_MAPPINGS) {
    if (mapping.regex.test(input)) {
      return mapping.l07;
    }
  }

  return input; // Fallback to raw if unmatched
};

const getL07FromFileName = (fileName: string): string => {
  const name = String(fileName);
  for (const mapping of PRE_CALCULATED_MAPPINGS) {
    if (mapping.regex.test(name)) return mapping.l07;
  }
  return "";
};

const parseTimeStrToHours = (val: any): number => {
  if (!val) return 0;
  if (val instanceof Date)
    return (val.getHours() * 3600 + val.getMinutes() * 60 + val.getSeconds()) / 86400;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const str = val.trim().replace(",", ".");
    if (str.includes(":")) {
      const p = str.split(":");
      return (parseInt(p[0]) || 0) / 24 + (parseInt(p[1]) || 0) / 1440 + parseInt(p[2] || "0") / 86400;
    }
    const parsed = parseFloat(str);
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
};

// ==========================================
// 3. HOOK
// ==========================================

export function useTeacherTaAuditLogic(rosterData: any[], fromDate: string, toDate: string) {
  const { appData, updateAppData } = useAppData();
  const fileAData = useMemo(() => appData.Q_TeacherHours || [], [appData.Q_TeacherHours]);
  const fileNameA = appData.Q_TeacherHoursFileName || "";
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fuzzyThreshold, setFuzzyThreshold] = useState(75);

  // NGUỒN 1: File Timesheet của Giáo Viên
  const handleUploadFileA = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg("");
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

      const rawData = XLSX.utils.sheet_to_json(firstSheet, {
        header: 1,
        defval: "",
      }) as any[][];
      
      updateAppData((prev) => ({
        ...prev,
        Q_TeacherHours: rawData,
        Q_TeacherHoursFileName: file.name,
      }));
    } catch (error) {
      console.error("Lỗi upload file A:", error);
      setErrorMsg("Lỗi đọc File A. Vui lòng kiểm tra định dạng file!");
    } finally {
      setIsProcessing(false);
    }
  };

  // NGUỒN 2: File Danh Sách TA (Roster / Source 2)
  const handleUploadFileB = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg("");
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      const rosterData = XLSX.utils.sheet_to_json(firstSheet, {
        defval: "",
      });
      
      updateAppData((prev) => ({
        ...prev,
        Q_Roster: rosterData,
        Q_RosterFileName: file.name
      } as any));
    } catch (error) {
      console.error("Lỗi upload file B:", error);
      setErrorMsg("Lỗi đọc File Roster. Vui lòng kiểm tra định dạng file!");
    } finally {
      setIsProcessing(false);
    }
  };

  // NGUỒN 3: File Audit Config (Student Counts / Source 3)
  const handleUploadFileConfig = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg("");
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      
      // Look for a sheet with relevant names
      const targetSheetName = workbook.SheetNames.find(s => 
        s.toLowerCase().includes("check tas") || 
        s.toLowerCase().includes("danh sách lớp") || 
        s.toLowerCase().includes("schedule") ||
        s.toLowerCase().includes("sĩ số")
      ) || workbook.SheetNames[0];
      
      const sheet = workbook.Sheets[targetSheetName];
      
      // Auto-detect header row
      const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
      let headerRowIndex = 0;
      let maxCols = 0;
      
      // Look through first 20 rows to find the row with the most columns which usually is the header
      for (let i = 0; i < Math.min(20, rawData.length); i++) {
        const row = rawData[i];
        if (!row) continue;
        const colsCount = row.filter((c: any) => c !== undefined && c !== null && String(c).trim() !== "").length;
        if (colsCount > maxCols && colsCount >= 3) {
          maxCols = colsCount;
          headerRowIndex = i;
        }
      }

      const configData = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        range: headerRowIndex
      });
      
      updateAppData((prev) => ({
        ...prev,
        Q_CheckTAs: configData,
        Q_CheckTAsFileName: file.name
      } as any));
    } catch (error) {
      console.error("Lỗi upload file Config:", error);
      setErrorMsg("Lỗi đọc File Config. Vui lòng kiểm tra định dạng file!");
    } finally {
      setIsProcessing(false);
    }
  };

  const auditResults = useMemo(() => {
    if (fileAData.length === 0) return { results: [], summary: { sumTeacher: 0, sumActualTA: 0, sumExpected: 0 }, missingCenters: [], error: null };
    if (!rosterData || rosterData.length === 0) return { results: [], summary: { sumTeacher: 0, sumActualTA: 0, sumExpected: 0 }, missingCenters: [], error: "NO_ROSTER_B" };

    const fDate = fromDate ? new Date(fromDate + "T00:00:00") : null;
    const tDate = toDate ? new Date(toDate + "T23:59:59") : null;
    const INVALID_TEACHERS = ["cố vấn", "no teacher", "tba", "to be assigned", "không có"];
    const validClassRegex = /(KDG\s*[1-3]|PRI\s*[1-3])/i;
    const normalizeStr = (str: string) => String(str).replace(/\s+/g, "").toUpperCase();

    const checkTAsData = appData.Q_CheckTAs || [];
    const checkTAsMap: Record<string, number> = {};
    const classSizeMap: Record<string, number> = {};
    
    // AE Config fallback removed


    checkTAsData.forEach((row: any) => {
      const clsName = String(getVal(row, ["Class Name", "Lớp", "Class", "Mã lớp", "Tên lớp", "Classcode"]) || "").trim();
      const centerRaw = String(getVal(row, ["Center Name", "Mã AE", "Center", "Center Code", "L07", "Trung tâm", "Mã Chi Nhánh", "Branch"]) || "");
      const sessionDate = getVal(row, ["Session Date", "Ngày", "Date", "Ngày học", "Session", "SessionDate", "Date of Class", "ScheduleDate"]) || "";
      const numStudents = parseInt(String(getVal(row, ["Number of Student", "Number of Students", "No of Student", "Sĩ số", "Sỹ số", "Students", "Số HV", "Số học viên", "Sĩ số lớp", "Total Students", "Số lượng học viên", "Sĩ số thực tế", "Sỹ số thực tế", "Actual Size", "Class Size", "Size", "Số lượng", "Sĩ số cơ sở", "HV thực tế", "Tổng học viên", "Current Class Size", "Sĩ số hiện tại", "SL HV", "HV"]) || "").replace(/[^0-9]/g, ""), 10) || 0;

      const parsedDate = parseAnyDate(sessionDate);
      const normCls = normalizeStr(clsName);
      const centerL07 = resolveCenterCode(centerRaw);
      const normCenter = normalizeStr(centerL07);

      if (numStudents > 0 && normCls) {
        // Fallback map by Class + Center
        const classKey = `${normCenter}_${normCls}`;
        if (!classSizeMap[classKey] || classSizeMap[classKey] < numStudents) {
          classSizeMap[classKey] = numStudents;
        }
        // Also map just by Class Name as it's usually unique enough and Center might be missing
        if (!classSizeMap[normCls] || classSizeMap[normCls] < numStudents) {
          classSizeMap[normCls] = numStudents;
        }
      }

      if (parsedDate && normCls) {
        const dateStr = `${String(parsedDate.getDate()).padStart(2, "0")}/${String(parsedDate.getMonth() + 1).padStart(2, "0")}/${parsedDate.getFullYear()}`;
        const key = `${normCenter}_${normCls}_${dateStr}`;
        checkTAsMap[key] = numStudents;
        
        // Also map without center
        const keyNoCenter = `${normCls}_${dateStr}`;
        checkTAsMap[keyNoCenter] = numStudents;
      }
    });

    const getAllowedTAs = (className: string, numStudents: number): number => {
      const normClass = className.toLowerCase();
      
      // KDG - Kindergarten
      if (normClass.includes("kdg1") || normClass.includes("kdg2")) return numStudents < 15 ? 2 : 3;
      if (normClass.includes("kdg3")) return numStudents < 13 ? 1 : 2;
      
      // PRI - Primary
      if (normClass.includes("pri1")) return numStudents < 15 ? 1 : 2;
      if (normClass.includes("pri2") || normClass.includes("pri3")) return 1;
      
      return 1; // Default to 1 TA for other class types if not explicitly specified
    };

    const combinedMap: Record<string, any> = {};
    const centersInB = new Set<string>();
    const centersOnlyInA = new Set<string>();

    // --- BƯỚC 1: QUÉT BẢNG B (ROSTER TA GỐC) ---
    rosterData.forEach((row) => {
      let centerL07 = getL07FromFileName(row._sourceFile || "");
      if (!centerL07) {
        const centerCol = String(getVal(row, ["center", "cơ sở", "l07", "chi nhánh"]) || "");
        centerL07 = resolveCenterCode(centerCol);
      }

      if (!VALID_MAPPED_CENTERS.has(centerL07)) return;
      centersInB.add(centerL07);

      const classB = String(getVal(row, ["class", "lớp", "class name", "mã lớp"]) || "").trim().toUpperCase();
      if (!validClassRegex.test(normalizeStr(classB))) return;

      const rawTypeVal = String(getVal(row, ["type", "task type", "tk_type", "loại công việc"]) || "");
      const taskTypeRaw = rawTypeVal.toLowerCase().replace(/[\s-]/g, "");
      if (taskTypeRaw && !taskTypeRaw.includes("inclass")) return;

      const dateBVal = getVal(row, ["date", "ngày", "tk_date"]);
      const rowDateB = parseAnyDate(dateBVal);
      if (!rowDateB) return;
      if (fDate && rowDateB < fDate) return;
      if (tDate && rowDateB > tDate) return;

      const dateStr = `${String(rowDateB.getDate()).padStart(2, "0")}/${String(rowDateB.getMonth() + 1).padStart(2, "0")}/${rowDateB.getFullYear()}`;

      const fromVal = getVal(row, ["from", "từ"]);
      const toVal = getVal(row, ["to", "đến"]);
      let durHours = 0;
      
      // Ignoring student count from Roster data per user request
      const numStudentsR = 0;

      // FIRST priority: "quy ra số giờ làm" or variants - if they exist as a value, use them.
      const directDuration = getVal(row, ["quy ra số giờ làm", "số giờ quy đổi", "workingHours", "converted hours", "hours", "giờ làm"]);
      if (directDuration !== undefined && directDuration !== "" && !isNaN(parseFloat(String(directDuration).replace(",", ".")))) {
        const parsed = parseFloat(String(directDuration).replace(",", "."));
        // Heuristic: if it's very small and has many decimals, it might be an Excel time serial
        const isExcelTime = parsed > 0 && parsed <= 1 && String(directDuration).length > 5;
        durHours = isExcelTime ? parsed * 24 : parsed;
      } 
      else if (fromVal && toVal) {
        const hF = parseTimeStrToHours(fromVal);
        const hT = parseTimeStrToHours(toVal);
        durHours = hT >= hF ? (hT - hF) * 24 : (hT + 1 - hF) * 24;
      } else {
        const durRaw = getVal(row, ["duration", "tk_duration", "thời lượng"]);
        if (typeof durRaw === "number") {
          durHours = durRaw > 0 && durRaw <= 1 ? durRaw * 24 : durRaw;
        } else if (typeof durRaw === "string") {
          const strVal = durRaw.trim().replace(",", ".");
          if (strVal.includes(":")) {
            const p = strVal.split(":");
            durHours = (parseInt(p[0]) || 0) + (parseInt(p[1]) || 0) / 60;
          } else {
            const parsed = parseFloat(strVal);
            if (!isNaN(parsed)) {
              durHours = (parsed > 0 && parsed <= 1 && strVal.length > 4) ? parsed * 24 : parsed;
            }
          }
        }
      }

      if (durHours <= 0) return;

      // Filter: status must NOT be duplicate or false
      if (String(getVal(row, ["check", "status"]) || "").toUpperCase().includes("DUPLICATE")) return;
      
      let isRowInvalid = false;
      Object.keys(row).forEach(k => {
        if (k.toLowerCase().startsWith("check") && String(row[k]).toUpperCase().includes("FALSE")) {
          isRowInvalid = true;
        }
      });
      if (isRowInvalid) return;

      const rawId = String(getVal(row, ["id", "id number", "tk_id"]) || "").trim();
      const fullName = String(getVal(row, ["full name", "name", "tên"]) || "").trim();

      // IF the ID or Name is clearly a class name or a date, this is likely a subheader/subtotal row parsed incorrectly
      const rawIdUpper = rawId.toUpperCase();
      if (rawIdUpper.includes("ATLS") || rawIdUpper.includes("ECP") || rawIdUpper.includes("KDG") || rawIdUpper.includes("PRI") || rawIdUpper.includes("TOTAL") || rawIdUpper.includes("TỔNG")) return;

      const key = `${normalizeStr(centerL07)}_${normalizeStr(classB)}`;

      if (!combinedMap[key]) {
        combinedMap[key] = {
          center: centerL07,
          className: classB,
          teacherHours: 0,
          actualTA: 0,
          expectedTA: 0,
          numStudents: 0,
          isKDG: /(KDG)/i.test(normalizeStr(classB)),
          taDetails: [],
          teacherDetails: [],
          dailyMap: {},
        };
      }
      if (numStudentsR > combinedMap[key].numStudents) {
        combinedMap[key].numStudents = numStudentsR;
      }
      combinedMap[key].actualTA += durHours;
      combinedMap[key].taDetails.push({
        dateObj: rowDateB.getTime(),
        dateStr: dateStr,
        id: rawId,
        name: fullName,
        type: rawTypeVal,
        hours: durHours,
        numStudents: numStudentsR
      });

      if (!combinedMap[key].dailyMap[dateStr]) {
        combinedMap[key].dailyMap[dateStr] = { ta: [], teacher: [] };
      }
      combinedMap[key].dailyMap[dateStr].ta.push({ id: rawId, name: fullName, hours: durHours, numStudents: numStudentsR });
    });

    // --- BƯỚC 2: QUÉT BẢNG A (GIÁO VIÊN) ---
    let headerRowIndex = -1;
    for (let i = 0; i < Math.min(20, fileAData.length); i++) {
      const row = fileAData[i];
      if (!row) continue;
      const rowArr = Array.isArray(row) ? row : Object.values(row);
      const rowStr = rowArr.map((c: any) => String(c).toLowerCase()).join(" ");

      let matchScore = 0;
      if (rowStr.includes("class") || rowStr.includes("lớp") || rowStr.includes("mã")) matchScore++;
      if (rowStr.includes("teacher") || rowStr.includes("giáo viên") || rowStr.includes("gv")) matchScore++;
      if (rowStr.includes("type") || rowStr.includes("loại")) matchScore++;
      if (rowStr.includes("total") || rowStr.includes("tổng")) matchScore++;

      if (matchScore >= 2) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex !== -1) {
      const rawMainHeader = fileAData[headerRowIndex];
      const rawSubHeader = fileAData[headerRowIndex + 1] || [];
      const mainHeader = Array.isArray(rawMainHeader) ? rawMainHeader : Object.values(rawMainHeader);
      const subHeader = Array.isArray(rawSubHeader) ? rawSubHeader : Object.values(rawSubHeader);

      const colMap: any = { teacher: -1, center: -1, className: -1, type: -1, total: -1, numStudents: -1, dates: [] };

      mainHeader.forEach((h: any, idx: number) => {
        const hStr = String(h).trim().toLowerCase().replace(/\s+/g, " ");
        if (hStr.includes("teacher") || hStr === "giáo viên" || hStr === "tên gv") colMap.teacher = idx;
        else if (hStr.includes("center") || hStr.includes("cơ sở") || hStr.includes("location")) colMap.center = idx;
        else if (hStr.includes("class") || hStr.includes("lớp") || hStr.includes("event note")) colMap.className = idx;
        else if (hStr.includes("type") || hStr.includes("loại")) colMap.type = idx;
        else if (hStr === "total" || hStr === "grand total" || hStr === "tổng") colMap.total = idx;
        else if (hStr.includes("student") || hStr.includes("size") || hStr.includes("sĩ số") || hStr.includes("sỹ số") || hStr.includes("số lượng") || hStr.includes("số hv")) colMap.numStudents = idx;
      });

      subHeader.forEach((h: any, idx: number) => {
        const hStr = String(h).trim().toLowerCase().replace(/\s+/g, " ");
        if (colMap.teacher === -1 && (hStr.includes("teacher") || hStr.includes("giáo viên"))) colMap.teacher = idx;
        if (colMap.center === -1 && (hStr.includes("center") || hStr.includes("cơ sở"))) colMap.center = idx;
        if (colMap.className === -1 && (hStr.includes("class") || hStr.includes("lớp"))) colMap.className = idx;
        if (colMap.type === -1 && (hStr.includes("type") || hStr.includes("loại"))) colMap.type = idx;
        if (colMap.numStudents === -1 && (hStr.includes("student") || hStr.includes("size") || hStr.includes("sĩ số") || hStr.includes("sỹ số") || hStr.includes("số lượng") || hStr.includes("số hv"))) colMap.numStudents = idx;
      });

      const numCols = Math.max(mainHeader.length, subHeader.length);
      let hasSubheaderDates = false;

      for (let idx = 0; idx < numCols; idx++) {
        if ([colMap.teacher, colMap.center, colMap.className, colMap.type, colMap.total, colMap.numStudents].includes(idx)) continue;
        if (parseAnyDate(subHeader[idx])) {
          hasSubheaderDates = true;
          break;
        }
      }

      for (let idx = 0; idx < numCols; idx++) {
        if ([colMap.teacher, colMap.center, colMap.className, colMap.type, colMap.total, colMap.numStudents].includes(idx)) continue;
        const cellVal = hasSubheaderDates ? subHeader[idx] : mainHeader[idx];
        if (!cellVal) continue;
        const colDate = parseAnyDate(cellVal);
        const isDayNum = /^0?([1-9]|[12]\d|3[01])$/.test(String(cellVal).trim());
        if (colDate || isDayNum) {
          colMap.dates.push({ index: idx, dateObj: colDate, isDayNum: isDayNum, keyStr: String(cellVal).trim() });
        }
      }

        const startRow = hasSubheaderDates ? headerRowIndex + 2 : headerRowIndex + 1;

        for (let i = startRow; i < fileAData.length; i++) {
          const rawRow = fileAData[i];
          if (!rawRow) continue;
          const row = Array.isArray(rawRow) ? rawRow : Object.values(rawRow);
          if (row.length === 0) continue;

          const centerCodeA = String(row[colMap.center] || "");
          const mappedCenterA = resolveCenterCode(centerCodeA);

          if (!VALID_MAPPED_CENTERS.has(mappedCenterA)) continue;
          if (!centersInB.has(mappedCenterA)) {
            centersOnlyInA.add(mappedCenterA);
            continue;
          }

          const typeRaw = colMap.type !== -1 ? String(row[colMap.type] || "") : "normal";
          const type = typeRaw.toLowerCase().replace(/[\s-]/g, "");
          if (type && !type.includes("normal")) continue;

          const classNameRaw = String(row[colMap.className] || "").trim().toUpperCase();
          if (!validClassRegex.test(normalizeStr(classNameRaw))) continue;

          const teacher = String(row[colMap.teacher] || "").trim().toLowerCase();
          if (!teacher || teacher === "total" || teacher === "grand total" || INVALID_TEACHERS.some((inv) => teacher.includes(inv))) continue;

          let numStudentsA = 0;
          if (colMap.numStudents !== -1) {
            numStudentsA = parseInt(String(row[colMap.numStudents] || "").trim(), 10) || 0;
            if (numStudentsA > 0) {
              const classKeyA = `${normalizeStr(mappedCenterA)}_${normalizeStr(classNameRaw)}`;
              if (!classSizeMap[classKeyA] || classSizeMap[classKeyA] < numStudentsA) {
                classSizeMap[classKeyA] = numStudentsA;
              }
            }
          }

          let calcHours = 0;
          const detailsForThisRow: any[] = [];
          
          colMap.dates.forEach((dInfo: any) => {
            const cellValStr = String(row[dInfo.index] || "").replace(",", ".");
            const cellVal = parseFloat(cellValStr);
            if (isNaN(cellVal) || cellVal <= 0) return;

            let colDate = dInfo.dateObj;
            let inRange = true;

            if (dInfo.isDayNum && !colDate) {
              const dayNum = parseInt(dInfo.keyStr, 10);
              if (fDate) colDate = new Date(fDate.getFullYear(), fDate.getMonth(), dayNum);
              else if (tDate) colDate = new Date(tDate.getFullYear(), tDate.getMonth(), dayNum);
            }

            if (colDate) {
              if (fDate && colDate < fDate) inRange = false;
              if (tDate && colDate > tDate) inRange = false;
            }

            if (inRange) {
              const dateStrFormat = colDate ? `${String(colDate.getDate()).padStart(2, "0")}/${String(colDate.getMonth() + 1).padStart(2, "0")}/${colDate.getFullYear()}` : dInfo.keyStr;
              const keyNoTeacher = `${normalizeStr(mappedCenterA)}_${normalizeStr(classNameRaw)}_${dateStrFormat}`;
              const keyWithTeacher = `${keyNoTeacher}_${normalizeStr(teacher)}`;
              
              let numStudents = numStudentsA > 0 ? numStudentsA : checkTAsMap[keyWithTeacher];
              if (numStudents === undefined || numStudents === 0) numStudents = checkTAsMap[keyNoTeacher];
              
              // Second fallback: Use classSizeMap if session-specific data is missing
              if (numStudents === undefined || numStudents === 0) {
                const classKeyFallback = `${normalizeStr(mappedCenterA)}_${normalizeStr(classNameRaw)}`;
                numStudents = classSizeMap[classKeyFallback] || 0;
              }
              
              const allowedTAs = getAllowedTAs(classNameRaw, numStudents || 0);

              calcHours += cellVal;
              detailsForThisRow.push({
                dateObj: colDate ? colDate.getTime() : 0,
                dateStr: dateStrFormat,
                name: teacher,
                hours: cellVal,
                allowedTAs: allowedTAs,
                numStudents: numStudents || 0
              });
            }
          });

          if (colMap.dates.length === 0 && !fDate && !tDate) {
              const tVal = parseFloat(String(row[colMap.total] || '').replace(',', '.'));
              if (tVal > 0) { 
                 calcHours += tVal; 
                 detailsForThisRow.push({ dateObj: 0, dateStr: 'Tổng hợp', name: teacher, hours: tVal, allowedTAs: 0, numStudents: 0 }); 
              }
          }

          if (calcHours <= 0) continue;

          const key = `${normalizeStr(mappedCenterA)}_${normalizeStr(classNameRaw)}`;
          if (!combinedMap[key]) {
            combinedMap[key] = {
              center: mappedCenterA,
              className: classNameRaw,
              teacherHours: 0,
              actualTA: 0,
              expectedTA: 0,
              numStudents: 0,
              isKDG: /(KDG)/i.test(normalizeStr(classNameRaw)),
              taDetails: [],
              teacherDetails: [],
              dailyMap: {},
            };
          }

          combinedMap[key].teacherHours += calcHours;

          // Group by Center + Class
          detailsForThisRow.forEach((d: any) => {
            if (d.numStudents > combinedMap[key].numStudents) {
              combinedMap[key].numStudents = d.numStudents;
            }
            const keyDateStr = d.dateStr;

            if (!combinedMap[key].dailyMap[keyDateStr]) {
              combinedMap[key].dailyMap[keyDateStr] = { ta: [], teacher: [] };
            }
            
            combinedMap[key].expectedTA += (d.hours * d.allowedTAs);
            combinedMap[key].teacherDetails.push(d);
            combinedMap[key].dailyMap[keyDateStr].teacher.push({ 
              name: d.name, 
              hours: d.hours, 
              allowedTAs: d.allowedTAs, 
              numStudents: d.numStudents 
            });
          });
        }
      }

      // --- BƯỚC 2.5: RE-CHECK FOR MISSING NUM STUDENTS IN TA ROWS ---
      Object.keys(combinedMap).forEach(key => {
        const data = combinedMap[key];
        Object.keys(data.dailyMap).forEach(dateStr => {
          const dayData = data.dailyMap[dateStr];
          
          // Find if any teacher or TA has numStudents
          let foundNum = 0;
          dayData.teacher.forEach((t: any) => { if (t.numStudents > foundNum) foundNum = t.numStudents; });
          dayData.ta.forEach((ta: any) => { if (ta.numStudents > foundNum) foundNum = ta.numStudents; });
          
          if (foundNum === 0) {
            // Check session maps
            const normCenter = normalizeStr(data.center);
            const normCls = normalizeStr(data.className);
            const sKey = `${normCenter}_${normCls}_${dateStr}`;
            // Also try without center if center was missing in File B
            const sKeyNoCenter = `${normCls}_${dateStr}`;
            foundNum = checkTAsMap[sKey] || checkTAsMap[sKeyNoCenter] || 0;
          }
          
          if (foundNum === 0) {
            // Check class map
            const normCls = normalizeStr(data.className);
            const classKey = `${normalizeStr(data.center)}_${normCls}`;
            foundNum = classSizeMap[classKey] || classSizeMap[normCls] || 0;
          }

          if (foundNum > 0) {
            if (foundNum > data.numStudents) data.numStudents = foundNum;
            
            dayData.teacher.forEach((t: any) => { 
                if (!t.numStudents) {
                    t.numStudents = foundNum; 
                    t.allowedTAs = getAllowedTAs(data.className, foundNum);
                }
            });
            dayData.ta.forEach((ta: any) => { 
                if (!ta.numStudents) {
                    ta.numStudents = foundNum; 
                }
            });
          }
        });
      });

      // --- BƯỚC 3: ĐÁNH GIÁ KẾT QUẢ ---
    const results: any[] = [];
    let sumTeacher = 0, sumActualTA = 0, sumExpected = 0;

    Object.keys(combinedMap).forEach((k) => {
      const data = combinedMap[k];
      if (data.teacherHours === 0 && data.actualTA === 0) return;

      sumTeacher += data.teacherHours;
      sumActualTA += data.actualTA;
      
      let expected = 0;
      Object.keys(data.dailyMap).forEach((dKey) => {
          data.dailyMap[dKey].teacher.forEach((t: any) => {
              expected += t.hours * (t.allowedTAs || (data.isKDG ? 2 : 1));
          });
      });
      // Fallback if no teacher sessions (shouldn't happen if teacherHours > 0 but just in case)
      if (expected === 0 && data.teacherHours > 0) {
          expected = data.isKDG ? data.teacherHours * 2 : data.teacherHours;
      }
      sumExpected += expected;

      let status = "Khớp";
      let statusColor = "emerald";
      let diffText = "";
      
      const ratio = data.actualTA / expected;
      const diff1x = data.actualTA - expected;

      if (data.teacherHours === 0) {
        status = "Thừa giờ (Không có Lịch GV)";
        statusColor = "rose";
        diffText = `+${data.actualTA.toFixed(2)}`;
      } else if (data.actualTA === 0) {
        status = "Thiếu TA hoàn toàn";
        statusColor = "rose";
        diffText = `-${expected.toFixed(2)}`;
      } else {
        if (ratio >= 0.8 && ratio <= 1.2) { 
           diffText = diff1x > 0 ? `+${diff1x.toFixed(2)}` : diff1x.toFixed(2); 
        } 
        else if (ratio < 0.8) { 
           status = 'Thiếu giờ TA'; 
           statusColor = 'rose'; 
           diffText = diff1x.toFixed(2); 
        } 
        else { 
           status = 'Thừa giờ TA'; 
           statusColor = 'rose'; 
           diffText = `+${diff1x.toFixed(2)}`; 
        }
      }

      data.taDetails.sort((a: any, b: any) => a.dateObj - b.dateObj);
      data.teacherDetails.sort((a: any, b: any) => a.dateObj - b.dateObj);

      const displayAeName = L07_INFO[data.center]?.aeCode || data.center;
      const displayIds = Array.from(new Set(data.taDetails.map((td: any) => td.id).filter(Boolean))).join(", ");

      // Build alignedRows for integrated comparison view
      const sortedDates = Object.keys(data.dailyMap).sort((a, b) => {
        const d1 = parseAnyDate(a)?.getTime() || 0;
        const d2 = parseAnyDate(b)?.getTime() || 0;
        return d1 - d2;
      });

      const alignedRows: any[] = [];
      sortedDates.forEach(date => {
        const dayData = data.dailyMap[date];
        const maxRows = Math.max(dayData.ta.length, dayData.teacher.length);
        for (let i = 0; i < maxRows; i++) {
          alignedRows.push({
            date: i === 0 ? date : "",
            fullDate: date, // Keep full date for reliable grouping in UI
            isFirstOfDay: i === 0,
            rowSpan: maxRows,
            teacher: dayData.teacher[i] || null,
            ta: dayData.ta[i] || null
          });
        }
      });

      results.push({ ...data, expected, displayCenter: displayAeName, displayIds, diffText, status, statusColor, compareKey: k, alignedRows });
    });

    results.sort((a, b) => {
      const rank: any = { rose: 1, amber: 2, emerald: 3 };
      if (rank[a.statusColor] !== rank[b.statusColor]) return rank[a.statusColor] - rank[b.statusColor];
      return a.center.localeCompare(b.center);
    });

    return { results, summary: { sumTeacher, sumActualTA, sumExpected }, missingCenters: Array.from(centersOnlyInA), error: null };
  }, [fileAData, rosterData, fromDate, toDate, appData.Q_CheckTAs]);

  const fileNameB = appData.Q_RosterFileName || "";
  const fileNameConfig = appData.Q_CheckTAsFileName || "";

  const clearData = () => {
    updateAppData((prev) => ({
      ...prev,
      Q_TeacherHours: [],
      Q_TeacherHoursFileName: "",
      Q_Roster: [],
      Q_RosterFileName: "",
      Q_CheckTAs: [],
      Q_CheckTAsFileName: "",
    }));
  };

  return {
    state: { fileAData, fileNameA, fileNameB, fileNameConfig, isProcessing, errorMsg, fuzzyThreshold },
    computed: { auditResults },
    actions: { handleUploadFileA, handleUploadFileB, handleUploadFileConfig, setErrorMsg, clearData, setFuzzyThreshold },
  };
}
