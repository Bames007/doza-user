import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { poppins } from "./constants";
import "./globals.css";
import { StorageCheckBanner } from "./components/StorageBannerCookie";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import FloatingFeedbackButton from "./components/FloatingFeedbackButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#022c22" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://dashboard.dozamedic.com"),
  title: {
    default: "Doza | The Connected Healthcare Ecosystem",
    template: "%s | Doza",
  },
  description:
    "Empowering the healthcare journey through a unified digital ecosystem.",
  keywords: [
    "dozamedic",
    "healthcare ecosystem",
    "medical dashboard",
    "telemedicine",
  ],

  // Apple-Specific Web App Meta
  appleWebApp: {
    capable: true,
    title: "Doza Medic",
    statusBarStyle: "black-translucent",
  },

  // Social / OpenGraph
  openGraph: {
    title: "Doza – Healthcare, Connected.",
    description: "The unified dashboard for the modern healthcare ecosystem.",
    url: "https://dashboard.dozamedic.com",
    siteName: "Doza Medic",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Doza Medic Ecosystem",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  // Twitter / X
  twitter: {
    card: "summary_large_image",
    title: "Doza Medic | Healthcare, Connected",
    description: "Access your medical records and care in one ecosystem.",
    images: ["/og-image.png"],
  },

  // Branding Icons
  icons: {
    icon: [{ url: "/logo.png" }],
    apple: [{ url: "/logo.png", sizes: "180x180" }],
  },

  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="preload" href="/og-image.png" as="image" />
        <link rel="dns-prefetch" href="https://js.paystack.co" />
      </head>
      <body
        className={`
          ${geistSans.variable} 
          ${geistMono.variable} 
          ${poppins.className} 
          selection:bg-emerald-100 selection:text-emerald-900
          bg-slate-50 text-slate-900 overflow-x-hidden
        `}
      >
        <Script
          src="https://js.paystack.co/v1/inline.js"
          strategy="beforeInteractive"
        />

        <div className="relative min-h-screen flex flex-col">
          <StorageCheckBanner />
          <main className="flex-grow flex flex-col">{children}</main>

          <FloatingFeedbackButton />
          {/* subtle footer gradient */}
          <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none z-0" />
        </div>

        {/* Vercel Insights & Analytics */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
