import { describe, expect, it, vi } from "vitest";
import { fetchYouTubeVideo } from "@/lib/video/youtube";

const VIDEO_ID = "dQw4w9WgXcQ";

// Resposta real de https://www.youtube.com/oembed para o VIDEO_ID
const OEMBED_PAYLOAD = {
  title: "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)",
  author_name: "Rick Astley",
  author_url: "https://www.youtube.com/@RickAstleyYT",
  type: "video",
  height: 113,
  width: 200,
  version: "1.0",
  provider_name: "YouTube",
  provider_url: "https://www.youtube.com/",
  thumbnail_height: 360,
  thumbnail_width: 480,
  thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/dQw4w9WgXcQ?feature=oembed" frameborder="0" allowfullscreen title="Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)"></iframe>',
};

function stubFetch(response: Response | Error) {
  const fetchStub = response instanceof Error ? vi.fn().mockRejectedValue(response) : vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchStub);
  return fetchStub;
}

function buildJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("fetchYouTubeVideo", () => {
  it("devolve título, canal e miniatura do Vídeo", async () => {
    stubFetch(buildJsonResponse(OEMBED_PAYLOAD));

    await expect(fetchYouTubeVideo(VIDEO_ID)).resolves.toEqual({
      ok: true,
      video: {
        id: VIDEO_ID,
        title: OEMBED_PAYLOAD.title,
        channelName: "Rick Astley",
        thumbnailUrl: OEMBED_PAYLOAD.thumbnail_url,
      },
    });
  });

  it("consulta o oEmbed com o link do vídeo e prazo para responder", async () => {
    const fetchStub = stubFetch(buildJsonResponse(OEMBED_PAYLOAD));

    await fetchYouTubeVideo(VIDEO_ID);

    expect(fetchStub).toHaveBeenCalledWith(
      `https://www.youtube.com/oembed?format=json&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D${VIDEO_ID}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("não consulta o YouTube com id inválido", async () => {
    const fetchStub = stubFetch(buildJsonResponse(OEMBED_PAYLOAD));

    const result = await fetchYouTubeVideo("abc");

    expect({ result, calls: fetchStub.mock.calls.length }).toEqual({
      result: { ok: false, reason: "video-nao-encontrado" },
      calls: 0,
    });
  });

  // O oEmbed responde 400 para id que não existe
  it.each([400, 404])("recusa Vídeo que não existe (HTTP %i)", async (status) => {
    stubFetch(new Response("Bad Request", { status }));

    await expect(fetchYouTubeVideo(VIDEO_ID)).resolves.toEqual({ ok: false, reason: "video-nao-encontrado" });
  });

  it.each([401, 403])("recusa Vídeo privado ou que não pode ser incorporado (HTTP %i)", async (status) => {
    stubFetch(new Response("Unauthorized", { status }));

    await expect(fetchYouTubeVideo(VIDEO_ID)).resolves.toEqual({ ok: false, reason: "video-indisponivel" });
  });

  it.each([
    ["erro do YouTube", new Response("Internal Server Error", { status: 500 })],
    ["limite de pedidos", new Response("Too Many Requests", { status: 429 })],
    ["falha de rede", new TypeError("fetch failed")],
    ["prazo esgotado", new DOMException("The operation was aborted due to timeout", "TimeoutError")],
    ["resposta sem título", buildJsonResponse({ ...OEMBED_PAYLOAD, title: undefined })],
    ["miniatura que não é link", buildJsonResponse({ ...OEMBED_PAYLOAD, thumbnail_url: "hqdefault.jpg" })],
    ["resposta que não é JSON", new Response("<html></html>", { status: 200 })],
  ])("avisa que o YouTube está fora do ar com %s", async (_case, response) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(response);

    await expect(fetchYouTubeVideo(VIDEO_ID)).resolves.toEqual({ ok: false, reason: "youtube-fora-do-ar" });
  });
});
