// Cache só no navegador do dono, por um dia: a Imagem não muda depois de enviada, e a Foto nova vem com outro endereço
const CACHE_CONTROL = "private, max-age=86400";

// Resposta com os bytes que o Usuário enviou, para o próprio dono
export function buildImageResponse(data: Buffer, mimeType: string) {
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": CACHE_CONTROL,
      // O navegador não adivinha outro tipo, e a resposta não roda nada se for aberta direto
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
