const parseTimeStrToHours = (val) => {
  if (!val) return 0;
  if (val instanceof Date)
    return (val.getHours() * 3600 + val.getMinutes() * 60 + val.getSeconds()) / 86400;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const str = val.trim();
    if (str.includes(":")) {
      const p = str.split(":");
      return (parseInt(p[0]) || 0) / 24 + (parseInt(p[1]) || 0) / 1440 + (parseInt(p[2]) || 0) / 86400;
    }
  }
  return 0;
};
let hF = parseTimeStrToHours("9:00 AM");
let hT = parseTimeStrToHours("11:00 AM");
let hours = hT >= hF ? (hT - hF) * 24 : (hT + 1 - hF) * 24;
console.log("9-11AM:", hours);

hF = parseTimeStrToHours("5:25 PM");
hT = parseTimeStrToHours("7:25 PM");
hours = hT >= hF ? (hT - hF) * 24 : (hT + 1 - hF) * 24;
console.log("5-7PM:", hours);

const durRaw = "01:60";
let hoursFromDur = 0;
        const strVal = String(durRaw).trim().replace(",", ".");
        if (strVal.includes(":")) {
          const p = strVal.split(":");
          hoursFromDur = (parseFloat(p[0]) || 0) + (parseFloat(p[1]) || 0) / 60;
        }
console.log("01:60 yields:", hoursFromDur);
