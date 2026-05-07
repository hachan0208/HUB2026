/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { 
  parseAnyDate, 
  formatTime12Hour, 
  normalizeId, 
  getVal, 
  parseTimeStrToHours, 
  generateUUID 
} from "../lib/utils/data-utils";
import { getCenterInfoByAECode, getCenterInfoByL07, mapL07 } from "../lib/utils/center-utils";
import { DEFAULT_SALARY_SCALES, TASK_COLUMNS, ACADEMIC_FIELDS } from "../constants/timesheet-logic";
import { useAppData } from "../lib/contexts/AppDataContext";

export function useTimesheetCalculations(rosterData: any[], salaryScaleData: any[], staffData: any[], cacheData: any[], fromDateStr: string, toDateStr: string) {
  const { appData } = useAppData();

  const sheet1Data = appData?.Sheet1_AE?.data;
  const holdData = appData?.Hold_AE?.data;
  const bankNorthData = appData?.Bank_North_AE?.data;
  const checkTAsData = appData?.Q_CheckTAs;

  return useMemo(() => {
    if (rosterData.length === 0)
      return {
        processedRosterData: [],
        employeeSummary: [],
        centerSummary: [],
      };
    
    const fDate = fromDateStr ? new Date(fromDateStr + "T00:00:00") : null;
    const tDate = toDateStr ? new Date(toDateStr + "T23:59:59") : null;

    // Pre-calculate lookups for performance
    const staffLookup = new Map();
    staffData.forEach(s => {
      const sid = normalizeId(getVal(s, ["id", "id number"]));
      const sn = String(getVal(s, ["full name", "name"])).trim().toLowerCase();
      if (sid) staffLookup.set(sid, s);
      if (sn) staffLookup.set(sn, s);
    });

    const salaryScaleLookup = new Map();
    salaryScaleData.forEach(s => {
      const sid = normalizeId(getVal(s, ["id", "id number"]));
      const sn = String(getVal(s, ["full name", "name"])).trim().toLowerCase();
      if (sid) salaryScaleLookup.set(sid, s);
      if (sn) salaryScaleLookup.set(sn, s);
    });

    const getSalaryRate = (id: string, name: string) => {
      const nid = normalizeId(id);
      const row = salaryScaleLookup.get(nid) || salaryScaleLookup.get(name.toLowerCase());
      
      const sCode = String(getVal(row || {}, ["s code", "scale"]) || "S1").trim().toUpperCase();
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

    const normalizeStr = (str: string) => String(str).replace(/\s+/g, "").toUpperCase();
    const classSizeMap: Record<string, number> = {};
    const checkTAsMap: Record<string, number> = {};

    const aeConfigData = [
      ...(sheet1Data || []),
      ...(holdData || []),
      ...(bankNorthData || []),
    ];
    aeConfigData.forEach((row: any) => {
      const clsName = String(getVal(row, ["Class Name", "Lớp", "Class", "Mã lớp"]) || "").trim();
      const centerRaw = String(getVal(row, ["Center Name", "Mã AE", "Center", "L07", "Trung tâm", "Center Code"]) || "");
      const numStudents = parseInt(String(getVal(row, ["Number of Student", "Sĩ số", "Sỹ số", "Students", "Số HV", "Số học viên", "Sĩ số lớp", "Total Students", "Số lượng học viên", "Sĩ số thực tế", "Sỹ số thực tế", "Actual Size", "Class Size", "Size", "Số lượng", "Sĩ số cơ sở"]) || ""), 10) || 0;
      
      if (numStudents > 0 && clsName) {
          const centerL07 = mapL07(centerRaw);
          const classKey = `${normalizeStr(centerL07)}_${normalizeStr(clsName)}`;
          if (!classSizeMap[classKey] || classSizeMap[classKey] < numStudents) {
              classSizeMap[classKey] = numStudents;
          }
      }
    });

    const safeCheckTAsData = checkTAsData || [];
    safeCheckTAsData.forEach((row: any) => {
      const clsName = String(getVal(row, ["Class Name", "Lớp", "Class", "Mã lớp"]) || "").trim();
      const centerRaw = String(getVal(row, ["Center Name", "Mã AE", "Center", "Center Code", "L07", "Trung tâm"]) || "");
      const sessionDate = getVal(row, ["Session Date", "Ngày", "Date", "Ngày học", "Session", "SessionDate"]);
      const numStudents = parseInt(String(getVal(row, ["Number of Student", "Number of Students", "No of Student", "Sĩ số", "Sỹ số", "Students", "Số HV", "Số học viên", "Sĩ số lớp", "Total Students", "Số lượng học viên", "Sĩ số thực tế", "Sỹ số thực tế", "Actual Size", "Class Size", "Size", "Số lượng", "Sĩ số cơ sở"]) || ""), 10) || 0;

      const parsedDate = parseAnyDate(sessionDate);
      const normCls = normalizeStr(clsName);
      const centerL07 = mapL07(centerRaw);
      const normCenter = normalizeStr(centerL07);

      if (numStudents > 0 && normCls) {
        const classKey = `${normCenter}_${normCls}`;
        if (!classSizeMap[classKey] || classSizeMap[classKey] < numStudents) {
          classSizeMap[classKey] = numStudents;
        }
      }

      if (parsedDate && clsName) {
        const dateStr = `${String(parsedDate.getDate()).padStart(2, "0")}/${String(parsedDate.getMonth() + 1).padStart(2, "0")}/${parsedDate.getFullYear()}`;
        const key = `${normCenter}_${normCls}_${dateStr}`;
        checkTAsMap[key] = numStudents;
      }
    });

    const details: any[] = [];
    const empGroup: Record<string, any> = {};
    const cenGroup: Record<string, any> = {};

    rosterData.forEach((t) => {
      let invalid = false;
      if (String(getVal(t, ["check"]) || "").toUpperCase() === "DUPLICATE")
        invalid = true;
      for (const k in t) {
        if (k.toLowerCase().startsWith("check") && String(t[k]).toUpperCase().includes("FALSE")) {
          invalid = true;
        }
      }
      if (invalid) {
        return;
      }

      const rawEid = String(getVal(t, ["id", "id number", "teacher id", "emp id"]) || "").trim();
      const rawName = String(getVal(t, ["full name", "name", "teacher name"]) || "").trim();
      const kId = rawEid.toUpperCase();
      
      // Bỏ qua các dòng có vẻ là tiêu đề / nhóm (không phải NV)
      // Các mã lớp học thường có chứa dấu chấm (vd HN01.KDG.01) hoặc các từ khóa nhóm
      if (
        ["ATLS", "ECP", "KDG", "PRI", "TOTAL", "TỔNG", "CLASS", "IELTS", "LỚP"].some((kw) =>
          kId.includes(kw)
        ) || (kId.includes(".") && !rawName)
      ) {
        return;
      }

      let empId = normalizeId(rawEid);
      if (!empId && !rawName) {
        return;
      }

      let effName = rawName;
      if (!empId || !effName) {
        const sMatch = staffLookup.get(empId) || staffLookup.get(rawName.toLowerCase());
        if (sMatch) {
          if (!empId) empId = normalizeId(getVal(sMatch, ["id", "id number"]));
          if (!effName) effName = getVal(sMatch, ["full name", "name"]);
        }
        if (!empId) empId = rawName;
        if (!effName) effName = empId;
      }

      const rawType = String(getVal(t, ["type", "task type", "task"]) || "").trim();
      const taskField = TASK_COLUMNS[rawType.toLowerCase()] || "adminHours";

      const rCen = String(getVal(t, ["center code", "office code", "l07", "center"]) || "").trim();
      let l07 = mapL07(rCen);
      if (l07 === rCen) {
        l07 = rCen.split(".")[0];
        if (l07.includes("-")) l07 = l07.split("-")[0];
      }
      
      let aeCode = "";
      
      const centerByAe = getCenterInfoByAECode(l07);
      if (centerByAe) {
        l07 = centerByAe.l07;
      }
      
      const matchStaff = staffLookup.get(empId);
      if (matchStaff && getVal(matchStaff, ["l07", "center"])) {
        const staffRawCen = String(getVal(matchStaff, ["l07", "center"])).trim();
        let sL07 = mapL07(staffRawCen);
        if (sL07 === staffRawCen) {
           sL07 = staffRawCen.split(".")[0];
           if (sL07.includes("-")) sL07 = sL07.split("-")[0];
        }

        if (sL07) {
          const staffCenterAe = getCenterInfoByAECode(sL07);
          if (staffCenterAe) {
            l07 = staffCenterAe.l07;
          } else {
            l07 = sL07;
          }
        }
      }
      if (!l07) l07 = "UNKNOWN";
      
      const finalCenterInfo = getCenterInfoByL07(l07);
      if (finalCenterInfo) {
        aeCode = finalCenterInfo.aeCode;
      }

      const rawDate = parseAnyDate(getVal(t, ["date", "ngay"]));
      if (!rawDate) {
        return;
      }
      
      if (fDate && rawDate < fDate) return;
      if (tDate && rawDate > tDate) return;

      const dateStr = `${String(rawDate.getDate()).padStart(2, "0")}/${String(rawDate.getMonth() + 1).padStart(2, "0")}/${rawDate.getFullYear()}`;

      const startVal = getVal(t, ["start", "from", "start time"]);
      const endVal = getVal(t, ["end", "to", "end time"]);
      const fromStr = formatTime12Hour(startVal);
      const toStr = formatTime12Hour(endVal);

      let durationHours = 0;
      if (startVal !== undefined && startVal !== "" && endVal !== undefined && endVal !== "") {
        const sH = parseTimeStrToHours(startVal);
        const eH = parseTimeStrToHours(endVal);
        // Handle normal and overnight shifts (To - From)
        durationHours = eH >= sH ? (eH - sH) * 24 : (eH + 1 - sH) * 24;
      } else {
        // Fallback to duration column if times are missing
        durationHours = parseFloat(getVal(t, ["duration"]) || "0");
      }
      // Ensure duration is always calculated as To - From if both exist, 
      // but the above code already favors times if they exist.

      let classSize = 0;
      const classSizeVal = getVal(t, [
        "class size",
        "sĩ số",
        "sỹ số",
        "no of students",
        "number of student",
        "number of students",
        "students",
        "số hv",
        "số học viên",
        "sĩ số lớp",
        "total students",
        "số lượng học viên",
        "sĩ số thực tế",
        "sỹ số thực tế",
        "actual size",
        "size",
        "số lượng",
        "sĩ số cơ sở",
      ]);
      if (classSizeVal) classSize = parseInt(String(classSizeVal), 10) || 0;

      // Fallback: look up in checkTAsMap / classSizeMap if classSize is 0
      if (classSize === 0) {
        const rawClassCode = String(getVal(t, ["class code", "class", "lớp"]) || "");
        const rawL07 = String(getVal(t, ["l07", "center", "cơ sở"]) || "");
        const normCls = normalizeStr(rawClassCode);
        const normCenter = normalizeStr(mapL07(rawL07) || aeCode);
        if (normCls && normCenter && dateStr) {
           const key = `${normCenter}_${normCls}_${dateStr}`;
           if (checkTAsMap[key]) classSize = checkTAsMap[key];
           if (classSize === 0 && classSizeMap[`${normCenter}_${normCls}`]) {
              classSize = classSizeMap[`${normCenter}_${normCls}`];
           }
        }
      }

      let actHours = durationHours;
      if (rawType.toLowerCase() === "tutorial" || rawType.toLowerCase().includes("tutoring")) {
        const c1 = cacheData.find(c => String(getVal(c, ["code", "mã lớp"])).toLowerCase() === String(getVal(t, ["class code", "lớp"])).toLowerCase());
        const hasPT = String(getVal(t, ["pt name", "gvpt"])).trim() !== "";
        if (classSize > 0) {
          if (classSize === 1) actHours = 0.5;
          else if (classSize <= 4) actHours = 1;
          else if (classSize <= 8) actHours = 1.5;
          else actHours = 2;
        } else if (c1 || hasPT) {
          actHours = 1;
        } else {
          actHours = 1;
        }
      } else if (rawType.toLowerCase().includes("club")) {
        if (classSize > 0 && classSize <= 10) actHours = 1;
        else if (classSize > 10) actHours = 1.5;
        else actHours = 1.5;
      } else if (rawType.toLowerCase().includes("demo")) {
        if (classSize > 0) {
          if (classSize <= 5) actHours = Math.round((durationHours + 0.25) * 100) / 100;
          else actHours = Math.round((durationHours + 0.5) * 100) / 100;
        } else {
          actHours = Math.round((durationHours + 0.5) * 100) / 100;
        }
      }

      if (rawType.toLowerCase().includes("admin") && !actHours) {
        actHours = 1;
      }

      const rates = getSalaryRate(empId, effName);
      let money = 0;
      if (taskField === "summer") money = actHours * rates.su;
      else if (taskField === "outing") money = actHours * rates.ou;
      else if (ACADEMIC_FIELDS.includes(taskField)) money = actHours * rates.ac;
      else money = actHours * rates.ad;

      const detailRow = {
        id: generateUUID(),
        center: l07,
        employeeId: empId,
        fullName: effName,
        maAE: aeCode,
        date: dateStr,
        taskType: rawType,
        classCode: String(getVal(t, ["class code", "class", "lớp"]) || ""),
        from: fromStr,
        to: toStr,
        duration: durationHours,
        workingHours: actHours,
        notes: String(getVal(t, ["note", "ghi chú"]) || ""),
      };
      details.push(detailRow);

      if (!empGroup[empId]) {
        empGroup[empId] = {
          id: generateUUID(),
          center: l07,
          employeeId: empId,
          fullName: effName,
          salaryScale: rates.sCode,
          from: fromDateStr,
          to: toDateStr,
          className: detailRow.classCode,
          noteDays: new Set(),
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
          prepareLessonClubs: 0,
          meetingTraining: 0,
          pt: 0,
          discoveryCamp: 0,
          outing: 0,
          summer: 0,
          conductTest: 0,
          renewalProjects: 0,
          supportLxo: 0,
          supportEc: 0,
          supportMkt: 0,
          totalHours: 0,
          academicHours: 0,
          adminHours: 0,
          baseSalary: 0,
          totalSalary: 0,
          deductionHours: 0,
          _rates: rates,
        };
      }
      const eRow = empGroup[empId];
      if (ACADEMIC_FIELDS.includes(taskField)) eRow.academicHours += actHours;
      else eRow.adminHours += actHours;
      eRow.totalHours += actHours;

      if (eRow[taskField] !== undefined) eRow[taskField] += actHours;
      else eRow.adminHours += actHours;

      eRow.baseSalary += money;
      eRow.totalSalary += money;
      if (detailRow.notes) eRow.noteDays.add(`${dateStr}: ${detailRow.notes}`);

      const cenId = `${l07}|${rates.sCode}`;

      if (!cenGroup[cenId]) {
        let centerBusiness = "";
        const centerInfoForBus = getCenterInfoByL07(l07);
        if (centerInfoForBus) centerBusiness = centerInfoForBus.bus;
        
        cenGroup[cenId] = {
          id: generateUUID(),
          l07: l07,
          business: centerBusiness,
          salaryScale: rates.sCode,
          acRate: rates.ac,
          adRate: rates.ad,
          suRate: rates.su,
          ouRate: rates.ou,
          from: fromDateStr,
          to: toDateStr,
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
          prepareLessonClubs: 0,
          meetingTraining: 0,
          pt: 0,
          discoveryCamp: 0,
          outing: 0,
          summer: 0,
          conductTest: 0,
          renewalProjects: 0,
          supportLxo: 0,
          supportEc: 0,
          supportMkt: 0,
          totalHours: 0,
          academicHours: 0,
          adminHours: 0,
        };
      }
      const cRow = cenGroup[cenId];
      if (taskField && cRow[taskField] !== undefined) cRow[taskField] += actHours;
      if (ACADEMIC_FIELDS.includes(taskField)) cRow.academicHours += actHours;
      else cRow.adminHours += actHours;
      cRow.totalHours += actHours;
    });

    const finalize = (groupObj: Record<string, any>) => Object.values(groupObj).map((row: any, index) => {
        const deductionHours = (row.inClass + row.inClassAtls + row.clubActivity + row.parentMeeting) / 2;
        const rawTotalSalary = row.academicHours * row.acRate + (row.adminHours - deductionHours) * row.adRate + row.summer * row.suRate + row.outing * row.ouRate + row.discoveryCamp * row.suRate;
        
        const totalSalary = Math.round(rawTotalSalary);
        const baseSalary = rawTotalSalary - row.discoveryCamp * row.suRate;
        const cEc = Math.round(row.supportEc * row.adRate);
        const cPtDemo = Math.round(row.demo * row.acRate) + Math.round(row.pt * row.adRate);
        const cMktLocal = Math.round(row.supportMkt * row.adRate);
        const cRenewal = Math.round(Math.round((row.prepareLessonClubs + row.renewalProjects) * row.adRate) + row.clubActivity * row.acRate - (row.clubActivity / 2) * row.adRate);
        const cDiscovery = Math.round(row.discoveryCamp * row.suRate);
        const cSummerOuting = Math.round(row.summer * row.suRate) + Math.round(row.outing * row.ouRate);
        
        return { 
          ...row, 
          id: index + 1, 
          deductionHours, 
          baseSalary, 
          totalSalary, 
          chargeLxo: totalSalary - cSummerOuting - cPtDemo - cEc - cMktLocal - cRenewal - cDiscovery, 
          chargeEc: cEc, 
          chargePtDemo: cPtDemo, 
          chargeMktLocal: cMktLocal, 
          chargeRenewalProjects: cRenewal, 
          chargeDiscoveryCamp: cDiscovery, 
          chargeSummerOuting: cSummerOuting 
        };
    });

    const empResult = finalize(empGroup).map((r: any) => ({
      ...r,
      noteDays: r.noteDays ? Array.from(r.noteDays).join(" | ") : "",
    }));

    // For Center Summary, group again by Center if needed, or group primarily by cenGroup.
    // The cenId is Center + Business + SalaryScale. We can aggregate by L07 directly.
    const cenAggregate: Record<string, any> = {};
    finalize(cenGroup).forEach(c => {
       const key = c.l07;
       if (!cenAggregate[key]) {
         cenAggregate[key] = { ...c };
       } else {
         cenAggregate[key].totalSalary += c.totalSalary;
         cenAggregate[key].chargeLxo += c.chargeLxo;
         cenAggregate[key].chargeEc += c.chargeEc;
         cenAggregate[key].chargePtDemo += c.chargePtDemo;
         cenAggregate[key].chargeMktLocal += c.chargeMktLocal;
         cenAggregate[key].chargeRenewalProjects += c.chargeRenewalProjects;
         cenAggregate[key].chargeDiscoveryCamp += c.chargeDiscoveryCamp;
         cenAggregate[key].chargeSummerOuting += c.chargeSummerOuting;
         cenAggregate[key].totalHours += c.totalHours;
       }
    });

    return {
      processedRosterData: details,
      employeeSummary: empResult,
      centerSummary: Object.values(cenAggregate),
    };
  }, [rosterData, staffData, salaryScaleData, cacheData, fromDateStr, toDateStr, sheet1Data, holdData, bankNorthData, checkTAsData]);
}

