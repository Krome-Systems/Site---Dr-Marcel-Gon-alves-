import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "1";
const allowedDevOrigins = process.env.ALLOWED_DEV_ORIGINS
  ?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  allowedDevOrigins,
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
