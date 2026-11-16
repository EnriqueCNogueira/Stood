import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Envio de Imagem por Server Action: até 5 MB de imagem mais o resto do formulário; o padrão é 1 MB
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
