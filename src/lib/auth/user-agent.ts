import { buildTodayInBrasilia } from "@/lib/agenda/rules";

export type Device = { browser: string; system: string | null };

const MS_PER_DAY = 86_400_000;

export const UNKNOWN_BROWSER = "Navegador desconhecido";

// A ordem importa: Edge, Opera e Samsung também dizem Chrome, e quase todos dizem Safari
const BROWSERS: [RegExp, string][] = [
  [/\bEdgA?(?:iOS)?\//, "Edge"],
  [/\bOPR\//, "Opera"],
  [/\bSamsungBrowser\//, "Samsung Internet"],
  [/\b(?:Firefox|FxiOS)\//, "Firefox"],
  [/\b(?:Chrome|CriOS)\//, "Chrome"],
  [/\bSafari\//, "Safari"],
];

// Android também diz Linux, e o iPad e o iPhone também dizem Mac OS X
const SYSTEMS: [RegExp, string][] = [
  [/\b(?:iPhone|iPad)\b/, "iOS"],
  [/\bAndroid\b/, "Android"],
  [/\bWindows\b/, "Windows"],
  [/\bMac OS X\b/, "macOS"],
  [/\bCrOS\b/, "ChromeOS"],
  [/\bLinux\b/, "Linux"],
];

// Navegador e sistema de uma Sessão, a partir do texto que o navegador envia
export function parseUserAgent(userAgent: string | null): Device {
  const text = userAgent ?? "";
  return { browser: findName(BROWSERS, text) ?? UNKNOWN_BROWSER, system: findName(SYSTEMS, text) ?? null };
}

// A Sessão é renovada no máximo uma vez por dia, então o último uso só vale pelo dia
export function buildLastUsedLabel(lastUsedAt: Date, now: Date) {
  const days = Math.round((Date.parse(buildTodayInBrasilia(now)) - Date.parse(buildTodayInBrasilia(lastUsedAt))) / MS_PER_DAY);
  if (days <= 0) return "hoje";
  return days === 1 ? "ontem" : `há ${days} dias`;
}

function findName(options: [RegExp, string][], text: string) {
  return options.find(([pattern]) => pattern.test(text))?.[1];
}
