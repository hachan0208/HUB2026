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

const DEFAULT_CENTERS = [
  { l07: "HN0001.PHY", aeCode: "Pho Hue Junior", bus: "AHN", url: "" },
  { l07: "HN0026.VHG", aeCode: "Viet Hung", bus: "AHN", url: "" },
];

const getCenterInfoByAECode = (aeCode) => {
  if (!aeCode) return null;
  const normalizedAE = normalizeForMatch(aeCode);
  return DEFAULT_CENTERS.find(
    (c) => normalizeForMatch(c.aeCode) === normalizedAE || normalizeForMatch(c.l07) === normalizedAE,
  );
};

console.log(getCenterInfoByAECode("HN0026.VHG"));

