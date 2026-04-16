export function isBankingIndustry(...candidates: Array<string | null | undefined>): boolean {
  const normalized = candidates
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.toLowerCase());

  if (normalized.length === 0) return false;

  const keywords = ["ngân hàng", "ngan hang", "bank", "banking"];
  return normalized.some((text) => keywords.some((kw) => text.includes(kw)));
}

export function isInsuranceIndustry(...candidates: Array<string | null | undefined>): boolean {
  const normalized = candidates
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.toLowerCase());

  if (normalized.length === 0) return false;

  const keywords = ["bảo hiểm", "bao hiem", "insurance"];
  return normalized.some((text) => keywords.some((kw) => text.includes(kw)));
}

export function isFincoIndustry(...candidates: Array<string | null | undefined>): boolean {
  const normalized = candidates
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .map((v) => v.toLowerCase());

  if (normalized.length === 0) return false;

  const keywords = ["tài chính", "tai chinh", "dịch vụ tài chính", "financial", "finco"];
  return normalized.some((text) => keywords.some((kw) => text.includes(kw)));
}
