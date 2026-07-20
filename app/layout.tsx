import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { poppins } from "./constants";
import "./globals.css";
import { StorageCheckBanner } from "./components/StorageBannerCookie";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import FloatingFeedbackButton from "./components/FloatingFeedbackButton";
import PaystackScript from "./components/PaystackScript";

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
    "Doza is a digital healthcare ecosystem that connects patients, doctors, and medical centers into one intelligent system for continuous care, medication adherence, and better health outcomes — all in one place.",
  keywords: [
    "doza",
    "dozamedic",
    "healthcare ecosystem",
    "telemedicine",
    "continuous care",
    "medication adherence",
    "digital health",
    "patient monitoring",
    "medical records",
    "prescription management",
    "healthcare platform",
    "doctor consultation",
    "remote diagnostics",
    "health data intelligence",
  ],

  // Apple‑specific web app settings
  appleWebApp: {
    capable: true,
    title: "Doza Medic",
    statusBarStyle: "black-translucent",
  },

  // Open Graph (for social sharing)
  openGraph: {
    title: "Doza — Healthcare, Connected",
    description:
      "The unified healthcare ecosystem where patients, doctors, and medical centers connect for seamless, continuous care.",
    url: "https://dashboard.dozamedic.com",
    siteName: "Doza Medic",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Doza — The Connected Healthcare Ecosystem",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "Doza — Healthcare, Connected",
    description:
      "The digital healthcare ecosystem connecting patients, doctors, and medical centers for better outcomes.",
    images: ["/og-image.png"],
  },

  // Brand Icons
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
        <link rel="preconnect" href="https://js.paystack.co" />
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
        <div className="relative min-h-screen flex flex-col">
          <StorageCheckBanner />
          <main className="flex-grow flex flex-col">{children}</main>

          <FloatingFeedbackButton />

          {/* Subtle footer gradient */}
          <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none z-0" />
        </div>

        {/* Third‑party scripts loaded via client component to avoid SSR issues */}
        <PaystackScript />

        {/* Vercel Analytics & Speed Insights */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
