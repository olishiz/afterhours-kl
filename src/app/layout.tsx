import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "afterhours — Kuala Lumpur",
  description: "Club nights, DJ sets, gigs and late nights in Kuala Lumpur and Selangor. Every listing links to its original source.",
  applicationName: "afterhours",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  openGraph: {
    title: "afterhours — Kuala Lumpur",
    description: "A nightlife guide for Kuala Lumpur and Selangor, with times in MYT and links to the original listings.",
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
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-[#101010] text-white">{children}</body>
    </html>
  );
}
