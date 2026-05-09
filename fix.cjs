const fs = require('fs');

const file = 'src/app/pages/TimesheetSummary.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      let foundData = false;

      const firstSheetName = workbook.SheetNames[0];
      if (firstSheetName) {
        const rawData: any[][] = XLSX.utils.sheet_to_json(
          workbook.Sheets[firstSheetName],
          { header: 1, defval: "", blankrows: false }
        );

        if (rawData.length > 0) {
          let headerRowIdx = -1;
          for (let i = 0; i < Math.min(20, rawData.length); i++) {
            const row = rawData[i] || [];
            const hasHeaderMatch = row.some((c) => {
              const text = String(c).toLowerCase().trim();
              return text === "no" || 
                     text === "no." || 
                     text === "stt" || 
                     text.includes("mã ae") || 
                     text.includes("account") || 
                     text === "center" || 
                     text === "s code" ||
                     text === "class" ||
                     text.includes("class name") ||
                     text === "lớp" ||
                     text === "ngày" ||
                     text === "date" ||
                     text === "cơ sở" ||
                     text === "location" ||
                     text === "id number";
            });
            if (hasHeaderMatch) {
              headerRowIdx = i;
              break;
            }
          }

          let allRows: any[] = [];
          if (headerRowIdx === -1) {
            // Fallback: Pick the first row that has at least 2 non-empty columns
            for (let i = 0; i < Math.min(20, rawData.length); i++) {
              const row = rawData[i] || [];
              const nonEmpties = row.filter((c: any) => String(c).trim() !== "");
              if (nonEmpties.length >= 2) {
                headerRowIdx = i;
                break;
              }
            }
          }

          if (headerRowIdx !== -1) {
            const headers = rawData[headerRowIdx];
            for (let i = headerRowIdx + 1; i < rawData.length; i++) {
              const row = rawData[i] || [];
              // Ignore completely empty rows
              if (row.join("").trim() === "") continue;
              const obj: any = {};
              for (let j = 0; j < headers.length; j++) {
                const key = String(headers[j] || "").trim();
                // Ensure duplicate columns don't overwrite if one is empty
                if (key && !key.toLowerCase().includes("__empty")) {
                   // only take valid keys, skip "__empty" etc if we are doing custom
                   obj[key] = row[j] !== undefined && row[j] !== null ? row[j] : "";
                }
              }
              if (Object.keys(obj).length > 0) {
                allRows.push(obj);
              }
            }
          }
          
          if (allRows.length === 0 || (allRows.length > 0 && Object.keys(allRows[0]).length < 3)) {
            // Fallback to simple parse if custom parsing failed or yielded bad structure
            const simpleJson = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], { defval: "" });
            if (Array.isArray(simpleJson) && simpleJson.length > 0) {
              allRows = simpleJson as any[];
            }
          }

          if (allRows.length > 0) {
            foundData = true;
            allRows.forEach((r: any) => {
              r._sourceFile = file.name;
              r._rowId = rowId;
            });
            const headers = Object.keys(allRows[0] as any).map((k) =>
              k.toLowerCase().trim()
            );

            // Nhận diện tự động qua cột và cập nhật vào AppData
            updateAppData((prev) => {
              const next = { ...prev };
              if (headers.includes("academic price") || isSalary || headers.includes("s code"))
                next.Q_Salary_Scale = [...(next.Q_Salary_Scale || []), ...allRows];
              else if (headers.includes("bank account number") || isStaff)
                next.Q_Staff = [...(next.Q_Staff || []), ...allRows];
              else if (headers.includes("today") || isCache)
                next.Q_Cache = [...(next.Q_Cache || []), ...allRows];
              else next.Q_Roster = [...(next.Q_Roster || []), ...allRows];
              return next;
            });
          }
        }
      }`;

const replacement = `      let foundData = false;

      // Scan through all sheets
      for (const sheetName of workbook.SheetNames) {
        const rawData: any[][] = XLSX.utils.sheet_to_json(
          workbook.Sheets[sheetName],
          { header: 1, defval: "", blankrows: false }
        );

        if (rawData.length > 0) {
          let headerRowIdx = -1;
          let hasExplicitHeaderMatch = false;

          for (let i = 0; i < Math.min(20, rawData.length); i++) {
            const row = rawData[i] || [];
            hasExplicitHeaderMatch = row.some((c) => {
              const text = String(c).toLowerCase().trim();
              return text === "no" || 
                     text === "no." || 
                     text === "stt" || 
                     text.includes("mã ae") || 
                     text.includes("account") || 
                     text === "center" || 
                     text === "s code" ||
                     text === "class" ||
                     text.includes("class name") ||
                     text === "lớp" ||
                     text === "ngày" ||
                     text === "date" ||
                     text === "cơ sở" ||
                     text === "location" ||
                     text === "id number";
            });
            if (hasExplicitHeaderMatch) {
              headerRowIdx = i;
              break;
            }
          }

          let allRows: any[] = [];
          
          if (headerRowIdx === -1 && workbook.SheetNames.length === 1) {
            // Fallback: Pick the first row that has at least 2 non-empty columns
            for (let i = 0; i < Math.min(20, rawData.length); i++) {
              const row = rawData[i] || [];
              const nonEmpties = row.filter((c: any) => String(c).trim() !== "");
              if (nonEmpties.length >= 2) {
                headerRowIdx = i;
                break;
              }
            }
          }

          // If we still don't have a header row and there are multiple sheets, we skip this sheet 
          // because it's not a clear data sheet.
          if (headerRowIdx === -1 && workbook.SheetNames.length > 1) {
             continue;
          }

          if (headerRowIdx !== -1) {
            const headers = rawData[headerRowIdx];
            for (let i = headerRowIdx + 1; i < rawData.length; i++) {
              const row = rawData[i] || [];
              // Ignore completely empty rows
              if (row.join("").trim() === "") continue;
              const obj: any = {};
              for (let j = 0; j < headers.length; j++) {
                const key = String(headers[j] || "").trim();
                // Ensure duplicate columns don't overwrite if one is empty
                if (key && !key.toLowerCase().includes("__empty")) {
                   // only take valid keys, skip "__empty" etc if we are doing custom
                   obj[key] = row[j] !== undefined && row[j] !== null ? row[j] : "";
                }
              }
              if (Object.keys(obj).length > 0) {
                allRows.push(obj);
              }
            }
          }
          
          if (allRows.length === 0 || (allRows.length > 0 && Object.keys(allRows[0]).length < 3)) {
            // Fallback to simple parse if custom parsing failed or yielded bad structure
            const simpleJson = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
            if (Array.isArray(simpleJson) && simpleJson.length > 0) {
              allRows = simpleJson as any[];
            }
          }

          if (allRows.length > 0) {
            foundData = true;
            allRows.forEach((r: any) => {
              r._sourceFile = file.name;
              r._rowId = rowId;
            });
            const headers = Object.keys(allRows[0] as any).map((k) =>
              k.toLowerCase().trim()
            );

            // Nhận diện tự động qua cột và cập nhật vào AppData
            updateAppData((prev) => {
              const next = { ...prev };
              if (headers.includes("academic price") || isSalary || headers.includes("s code"))
                next.Q_Salary_Scale = [...(next.Q_Salary_Scale || []), ...allRows];
              else if (headers.includes("bank account number") || isStaff)
                next.Q_Staff = [...(next.Q_Staff || []), ...allRows];
              else if (headers.includes("today") || isCache)
                next.Q_Cache = [...(next.Q_Cache || []), ...allRows];
              else next.Q_Roster = [...(next.Q_Roster || []), ...allRows];
              return next;
            });
          }
        }
      } // End for sheetName`;

if(content.includes('let foundData = false;')) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log("Replaced handleUploadFile");
}
