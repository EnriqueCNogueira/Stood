import { describe, expect, it } from "vitest";
import { buildLastUsedLabel, parseUserAgent } from "@/lib/auth/user-agent";

const NOW = new Date("2026-11-24T13:00:00.000Z");

describe("parseUserAgent", () => {
  it.each([
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36", "Chrome", "Windows"],
    ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0", "Edge", "Windows"],
    ["Mozilla/5.0 (X11; Linux x86_64; rv:145.0) Gecko/20100101 Firefox/145.0", "Firefox", "Linux"],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15", "Safari", "macOS"],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0.0.0 Mobile/15E148 Safari/604.1", "Chrome", "iOS"],
    ["Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/29.0 Chrome/136.0.0.0 Mobile Safari/537.36", "Samsung Internet", "Android"],
    ["curl/8.9.1", "Navegador desconhecido", null],
    ["", "Navegador desconhecido", null],
    [null, "Navegador desconhecido", null],
  ])("lê %s", (userAgent, browser, system) => {
    expect(parseUserAgent(userAgent)).toEqual({ browser, system });
  });
});

describe("buildLastUsedLabel", () => {
  it.each([
    ["hoje", "2026-11-24T03:00:00.000Z"],
    ["ontem", "2026-11-24T02:59:00.000Z"],
    ["há 5 dias", "2026-11-19T13:00:00.000Z"],
  ])("mostra %s pelo dia de Brasília", (label, lastUsedAt) => {
    expect(buildLastUsedLabel(new Date(lastUsedAt), NOW)).toBe(label);
  });
});
