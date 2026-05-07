import { DEFAULT_CENTERS } from "../../constants";

/**
 * Normalizes text for comparison by removing accents and lowercasing
 */
const normalizeForMatch = (text: string): string => {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[đĐ]/g, "d")
    .replace(/[^a-z0-9]/g, "")
    .trim();
};

export const CENTER_MAPPING: Record<string, string> = {
  "HN1.PH": "HN0001.PHY",
  "BN1.NSL": "BN0001.LTT",
  "BN2.TUS": "BN0002.TSN",
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
  "PT01.HVG": "PT0001.HVG",
  "NSL": "BN0001.LTT",
  "TUS": "BN0002.TSN",
  "PHY": "HN0001.PHY",
  "THA": "HN0002.THA",
  "HQV": "HN0003.HQV",
  "LGI": "HN0004.LGI",
  "NVL": "HN0005.NVL",
  "VQN": "HN0007.VQN",
  "MDH": "HN0010.MDH",
  "NHT": "HN0012.NHT",
  "TMI": "HN0014.TMI",
  "VPU": "HN0015.VPU",
  "PDP": "HN0016.PDP",
  "HNI": "HN0017.HNI",
  "VTP": "HN0018.VTP",
  "NTN": "HN0019.NTN",
  "NGD": "HN0021.NGD",
  "NVO": "HN0022.NVO",
  "LDM": "HN0023.LDM",
  "TCY": "HN0024.TCY",
  "LTT": "HN0025.LTT",
  "VHG": "HN0026.VHG",
  "OPK": "HN0027.OPK",
  "PVD": "HN0028.PVD",
  "VPH": "HN0029.VPH",
  "AKH": "HN0030.AKH",
  "AHG": "HN0031.AHG",
  "LLQ": "HN0032.LLQ",
  "DAH": "HN0033.DAH",
  "HTN": "HN0034.HTN",
  "ECP": "HY0001.ECP",
  "HLG": "QN0001.HLG",
  "CTG": "VIN001.CTG",
  "PCT": "VP0001.PCT",
  "TPU": "TH0001.TPU",
  "LNQ": "TN0001.LNQ",
  "HVG": "PT0001.HVG",
  "ASP": "HN0200.ASP",
  "AA": "AA",
};

const RAW_MAPPINGS = [
  { l07: "BN0001.LTT", keys: ["NSL", "Ngo Si Lien", "BN01"] },
  { l07: "BN0002.TSN", keys: ["TUS", "TSN", "Tu Son", "BN02"] },
  { l07: "HN0001.PHY", keys: ["HN1.PH", "PHY", "PH", "Pho Hue", "HN01"] },
  { l07: "HN0002.THA", keys: ["TH", "THA", "Thai Ha", "HN02"] },
  { l07: "HN0003.HQV", keys: ["HQV", "Hoang Quoc Viet", "HN03"] },
  { l07: "HN0004.LGI", keys: ["LGI", "LG", "Lieu Giai", "HN04"] },
  { l07: "HN0005.NVL", keys: ["NVL", "Nguyen Van Linh", "HN05"] },
  { l07: "HN0007.VQN", keys: ["VQ", "VQN", "Van Quan", "HN07"] },
  { l07: "HN0010.MDH", keys: ["MD", "MDH", "My Dinh", "HN10"] },
  { l07: "HN0012.NHT", keys: ["NHT", "HM", "Hoang Mai", "HN12"] },
  { l07: "HN0014.TMI", keys: ["TMI", "TM", "Tan Mai", "HN14"] },
  { l07: "HN0015.VPU", keys: ["VPU", "VP", "Van Phu", "HN15"] },
  { l07: "HN0016.PDP", keys: ["PDP", "Phan Dinh Phung", "HN16"] },
  { l07: "HN0017.HNI", keys: ["HNI", "Ham Nghi", "HN17"] },
  { l07: "HN0018.VTP", keys: ["VTP", "Vu Tong Phan", "HN18"] },
  { l07: "HN0019.NTN", keys: ["NTN", "NT", "Nguyen Tuan", "HN19"] },
  { l07: "HN0021.NGD", keys: ["NGD", "Ngoai Giao Doan", "HN21"] },
  { l07: "HN0022.NVO", keys: ["NVO", "Nguyen Van Loc", "HN22"] },
  { l07: "HN0023.LDM", keys: ["LDM", "LD", "Linh Dam", "HN23"] },
  { l07: "HN0024.TCY", keys: ["TCY", "TC", "TIMES CITY", "HN24"] },
  { l07: "HN0025.LTT", keys: ["LTT", "Le Trong Tan", "HN25"] },
  { l07: "HN0026.VHG", keys: ["VHG", "VH", "Viet Hung", "HN26"] },
  { l07: "HN0027.OPK", keys: ["OPK", "OCP", "Ocepark", "Ocean Park", "HN27"] },
  { l07: "HN0028.PVD", keys: ["PVD", "Pham Van Dong", "HN28"] },
  { l07: "HN0029.VPH", keys: ["VPH", "Vu Pham Ham", "HN29"] },
  { l07: "HN0030.AKH", keys: ["AKH", "AK", "An Khanh", "HN30"] },
  { l07: "HN0031.AHG", keys: ["AHG", "AH", "An Hung", "HN31"] },
  { l07: "HN0032.LLQ", keys: ["LLQ", "Lac Long Quan", "Xuan Dieu", "Xuan Dieu (đổi thành Lạc Long Quân)", "HN32"] },
  { l07: "HN0033.DAH", keys: ["DAH", "DA", "Dong Anh", "HN33"] },
  { l07: "HN0034.HTN", keys: ["HTN", "Hong Tien", "HN34"] },
  { l07: "HY0001.ECP", keys: ["ECP", "Ecopark", "HY01"] },
  { l07: "HP0001.LHP", keys: ["LHP", "HP1", "HP01", "Hai Phong 1"] },
  { l07: "HP0002.HBT", keys: ["HBT", "HP2", "HP02", "Hai Phong 2"] },
  { l07: "HP0003.VIN", keys: ["HP3", "HP03", "Hai Phong 3"] },
  { l07: "QN0001.HLG", keys: ["HLG", "QN", "HL", "Ha Long", "QN01"] },
  { l07: "VIN001.CTG", keys: ["CTG", "VIN", "Vinh", "VIN01"] },
  { l07: "VP0001.PCT", keys: ["PCT", "VP", "Vinh Phuc", "VP01"] },
  { l07: "TH0001.TPU", keys: ["TPU", "TH01.TPU", "MKT TH01.TPU", "Thanh Hoa", "TH01"] },
  { l07: "TN0001.LNQ", keys: ["LNQ", "TN01.LNQ", "MKT TN01.LNQ", "Thai Nguyen", "TN01"] },
  { l07: "PT0001.HVG", keys: ["HVG", "PT01.HVG", "MKT PT01.HVG", "Phu Tho", "PT01"] },
  { l07: "AA", keys: ["AA", "Apollo Advance"] },
  { l07: "HN0200.ASP", keys: ["HN0.ASP", "ASP", "ASP - HN", "HN0200"] },
  { l07: "MKT LOCAL NORTH", keys: ["NORTH.MKT INTERN", "MKT LOCAL NORTH"] },
  { l07: "ZHN0000.GY", keys: ["CAMBRIDGE", "CONTEST QN", "HP", "Gym"] },
  { l07: "MKT HP", keys: ["MKT HP"] },
];

export const mapL07 = (rawL07: string): string => {
  if (!rawL07) return "";
  const l07Upper = rawL07.toUpperCase().trim();
  if (CENTER_MAPPING[l07Upper]) return CENTER_MAPPING[l07Upper];

  // Try keyword matching
  const normalized = normalizeForMatch(rawL07);
  for (const m of RAW_MAPPINGS) {
    if (m.keys.some(k => normalizeForMatch(k) === normalized || normalized.includes(normalizeForMatch(k)))) {
      return m.l07;
    }
  }
  
  return rawL07;
};

export const getL07FromFileName = (fileName: string): string => {
  const name = fileName.toUpperCase();
  
  const allMappings: { l07: string; key: string }[] = [];
  RAW_MAPPINGS.forEach((m) => {
    m.keys.forEach((k) => {
      allMappings.push({ l07: m.l07, key: k.toUpperCase() });
    });
  });

  allMappings.sort((a, b) => b.key.length - a.key.length);

  for (const mapping of allMappings) {
    const escapedKey = mapping.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `(?:^|[^A-Z0-9_À-ỹ])(${escapedKey})(?:[^A-Z0-9_À-ỹ]|$)`,
      "i",
    );
    if (regex.test(name)) {
      return mapping.l07;
    }
  }

  for (const mapping of allMappings) {
    if (name.includes(mapping.key)) {
      return mapping.l07;
    }
  }

  return "";
};

export const getCenterInfoByL07 = (l07: string) => {
  if (!l07) return null;
  const normalized = normalizeForMatch(l07);
  return DEFAULT_CENTERS.find((c) => normalizeForMatch(c.l07) === normalized);
};

export const getCenterInfoByAECode = (aeCode: string) => {
  if (!aeCode) return null;
  const normalizedAE = normalizeForMatch(aeCode);
  return DEFAULT_CENTERS.find(
    (c) => normalizeForMatch(c.aeCode) === normalizedAE || normalizeForMatch(c.l07) === normalizedAE,
  );
};

