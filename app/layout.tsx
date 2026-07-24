import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Instituto Dr. Marcel Gonçalves | Psiquiatria humanizada";
const description = "Psiquiatria com profundidade clínica, escuta qualificada e cuidado real. Triagens responsáveis e avaliação sem rótulos apressados.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);

  return {
    metadataBase: base,
    title,
    description,
    openGraph: { title, description, type: "website", images: [{ url: new URL("/og.png", base), width: 1536, height: 1024, alt: "Instituto Dr. Marcel Gonçalves — diagnóstico cuidadoso, sem rótulos apressados" }] },
    twitter: { card: "summary_large_image", title, description, images: [new URL("/og.png", base)] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
