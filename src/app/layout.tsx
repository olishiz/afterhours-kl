import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeBoot } from "@/components/sites/afterhours/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeBoot = `(function(){try{var k="afterhours-theme";var s=localStorage.getItem(k);var t=s==="light"||s==="dark"?s:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");var r=document.documentElement;r.dataset.theme=t;r.style.colorScheme=t;}catch(e){}})();`;

const assetBase = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const metadata: Metadata = {
  title: "afterhours — Kuala Lumpur",
  description: "Club nights, live rooms and late tables in Kuala Lumpur and Selangor. Times in MYT, with a link to every original listing.",
  applicationName: "afterhours",
  icons: { icon: `${assetBase}/icon.svg`, apple: `${assetBase}/icon.svg` },
  openGraph: {
    title: "afterhours — Kuala Lumpur",
    description: "A nightlife guide for Kuala Lumpur and Selangor. Times in MYT, and a link to each original listing.",
    locale: "en_MY",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
        <meta property="og:image" content={`${assetBase}/brand/og.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="afterhours — Kuala Lumpur" />
        <meta name="twitter:image" content={`${assetBase}/brand/og.png`} />
      </head>
      <body className="min-h-full bg-[var(--page)] font-sans text-[var(--text)]">
        <ThemeBoot />
        {children}
      </body>
    </html>
  );
}
