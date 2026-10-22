export type StoreMeta = {
  key: string;
  name: string;
  index: string;
  domain: string;
  url: string;
  description: string;
  coverage: "High" | "Medium" | "Low";
  refreshTarget: string;
  fields: string;
  hasSizes: boolean;
};

export const STORES_META: Record<string, StoreMeta> = {
  puma: {
    key: "puma",
    name: "Puma US",
    index: "01",
    domain: "puma.com",
    url: "https://us.puma.com",
    description: "Official brand site for Puma US footwear and sportstyle collections.",
    coverage: "High",
    refreshTarget: "Scheduled (daily)",
    fields: "Price · sale · colour · images · style code · URL",
    hasSizes: false,
  },
  nike: {
    key: "nike",
    name: "Nike US",
    index: "02",
    domain: "nike.com",
    url: "https://www.nike.com",
    description: "Official brand site for Nike footwear, Jordan, and running styles.",
    coverage: "High",
    refreshTarget: "Scheduled (daily)",
    fields: "Price · sale · colour · images · URL",
    hasSizes: false,
  },
  skechers: {
    key: "skechers",
    name: "Skechers US",
    index: "03",
    domain: "skechers.com",
    url: "https://www.skechers.com",
    description: "Official brand site for Skechers lifestyle, walking, and performance shoes.",
    coverage: "High",
    refreshTarget: "Scheduled (daily)",
    fields: "Price · sale · colour · images · style code · URL",
    hasSizes: false,
  },
  "6pm": {
    key: "6pm",
    name: "6pm",
    index: "04",
    domain: "6pm.com",
    url: "https://www.6pm.com",
    description: "Multi-brand discount retailer that shares one catalogue with Zappos.",
    coverage: "High",
    refreshTarget: "Scheduled (daily)",
    fields: "Price · sale · colour · sizes · images · URL",
    hasSizes: true,
  },
  zappos: {
    key: "zappos",
    name: "Zappos",
    index: "05",
    domain: "zappos.com",
    url: "https://www.zappos.com",
    description: "Multi-brand retailer that shares one catalogue with 6pm.",
    coverage: "Medium",
    refreshTarget: "Scheduled (daily)",
    fields: "Price · sale · colour · images · URL",
    hasSizes: false,
  },
};

export function getStoreDisplayName(storeKey: string): string {
  const norm = storeKey.toLowerCase().trim();
  return STORES_META[norm]?.name || (norm.charAt(0).toUpperCase() + norm.slice(1));
}
