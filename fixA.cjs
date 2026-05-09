const fs = require('fs');

const file = 'src/app/pages/TimesheetSummary.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `      const firstSheetName = workbook.SheetNames[0];
      if (firstSheetName) {
        const rawData: any[][] = XLSX.utils.sheet_to_json(
          workbook.Sheets[firstSheetName],
          { header: 1, defval: "" },
        );
        if (rawData.length > 0) {
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
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
              defval: "",
            });
            allRows.push(...json);
          }
        }
      }`;

const replacement = `      for (const sheetName of workbook.SheetNames) {
        const rawData: any[][] = XLSX.utils.sheet_to_json(
          workbook.Sheets[sheetName],
          { header: 1, defval: "" },
        );
        if (rawData.length > 0) {
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
          } else if (workbook.SheetNames.length === 1) {
            const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
              defval: "",
            });
            allRows.push(...json);
          }
        }
      }`;

if(content.includes('const firstSheetName = workbook.SheetNames[0];')) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log("Replaced handleUploadFileA");
} else {
    console.log("Could not find target content");
}
