import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_STATIC_EXPORT: staticExport ? "1" : "0",
  },
  outputFileTracingIncludes: {
    "/api/send-result": ["./public/fonts/Roboto-Variable.ttf"],
  },
  ...(staticExport
    ? {
        output: "export" as const,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
