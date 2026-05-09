import fs from 'fs';
import { resolve } from 'path';

const normalizeForMatch = (text) => {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

const RAW_MAPPINGS = [
  { l07: "BN0001.LTT", keys: ["NSL", "Ngo Si Lien", "BN01"] },
  { l07: "BN0002.TSN", keys: ["TUS", "TSN", "Tu Son", "BN02"] },
  { l07: "HN0001.PHY", keys: ["HN1.PH", "PHY", "PH", "Pho Hue", "HN01"] },
  { l07: "HN0026.VHG", keys: ["VHG", "VH", "Viet Hung", "HN26"] },
  { l07: "VP0001.PCT", keys: ["PCT", "VP", "Vinh Phuc", "VP01"] }
]

const getL07FromFileName = (fileName) => {
  const normalized = normalizeForMatch(fileName);
  
  const allMappings = [];
  RAW_MAPPINGS.forEach((m) => {
    m.keys.forEach((k) => {
      allMappings.push({ l07: m.l07, key: k.toUpperCase(), normKey: normalizeForMatch(k) });
    });
  });

  allMappings.sort((a, b) => b.normKey.length - a.normKey.length);

  for (const mapping of allMappings) {
    const escapedKey = mapping.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?:^|[^A-Z0-9_À-ỹa-z])(${escapedKey})(?:[^A-Z0-9_À-ỹa-z]|$)`,
      "i",
    );
    if (regex.test(fileName)) {
      return mapping.l07;
    }
  }

  // Fallback but only for longer keys to prevent bad substring matching
  for (const mapping of allMappings) {
    if (mapping.normKey.length >= 4 && normalized.includes(mapping.normKey)) {
      return mapping.l07;
    }
  }

  return "";
};

console.log("TEST 1", getL07FromFileName("Timesheet HN0026_VH.xlsx"));
console.log("TEST 2", getL07FromFileName("Timesheet VP_VP0001.xlsx"));
console.log("TEST 3", getL07FromFileName("roster HN0001.PHY.xlsx"));
console.log("TEST 4", getL07FromFileName("roster HN01.xlsx"));
