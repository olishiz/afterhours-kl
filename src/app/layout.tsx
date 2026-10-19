import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./afterhours.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Afterhours — Kuala Lumpur, after dark",
  description: "Find your next great night. Discover live music, DJ sets, club nights and late-night culture across Kuala Lumpur and Selangor, with links to the original listings.",
  applicationName: "Afterhours",
  icons: { icon: "/afterhours-kl/icon.svg", apple: "/afterhours-kl/icon.svg" },
  openGraph: {
    title: "Afterhours — Kuala Lumpur, after dark",
    description: "Good music. Great company. Your guide to nights worth going out for in KL and Selangor.",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
