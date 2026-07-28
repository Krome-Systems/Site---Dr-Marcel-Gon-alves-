import type { Metadata } from "next";
import "./globals.css";

const title = "Instituto Dr. Marcel Gonçalves | Psiquiatria humanizada";
const description = "Psiquiatria com profundidade clínica, escuta qualificada e cuidado real. Triagens responsáveis e avaliação sem rótulos apressados.";
const configuredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const metadataBase = new URL(configuredSiteUrl);

export const metadata: Metadata = {
  metadataBase,
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1536,
        height: 1024,
        alt: "Instituto Dr. Marcel Gonçalves — diagnóstico cuidadoso, sem rótulos apressados",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
