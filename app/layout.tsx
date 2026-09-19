import type { Metadata } from "next";
import "./globals.css";

const title = "Instituto Dr. Marcel Gonçalves | Saúde mental e dependência";
const description = "Cuidado médico em saúde mental, dependência química, dependência de álcool e comportamentos aditivos, com escuta qualificada e acompanhamento individualizado.";
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
