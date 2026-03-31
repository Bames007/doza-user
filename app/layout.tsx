// import type { Metadata, Viewport } from "next";
// import { Geist, Geist_Mono } from "next/font/google";
// import { bebasNeue, poppins } from "./constants";
// import "./globals.css";
// import { StorageCheckBanner } from "./components/StorageBannerCookie";
// import Script from "next/script";

// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
//   display: "swap",
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
//   display: "swap",
// });

// export const viewport: Viewport = {
//   width: "device-width",
//   initialScale: 1,
//   themeColor: "#065f46", // Doza brand emerald
// };

// export const metadata: Metadata = {
//   metadataBase: new URL("https://dashboard.dozamedic.com"),
//   title: {
//     default: "Doza | The Connected Healthcare Ecosystem",
//     template: "%s | Doza",
//   },
//   description:
//     "Empowering the healthcare journey. Doza connects patients, doctors, and centers in one seamless ecosystem for records, appointments, and care.",
//   keywords: [
//     "dozamedic",
//     "healthcare ecosystem",
//     "digital health records",
//     "telemedicine nigeria",
//     "medical dashboard",
//   ],
//   authors: [{ name: "EBCom Technologies" }],
//   creator: "Doza Medic",

//   // --- OpenGraph / Socials (UPDATED WITH OG-IMAGE) ---
//   openGraph: {
//     title: "Doza – Healthcare, Connected.",
//     description:
//       "The unified dashboard for the modern healthcare ecosystem. Manage your health with @dozamedic.",
//     url: "https://dashboard.dozamedic.com",
//     siteName: "Doza Medic",
//     images: [
//       {
//         url: "/og-image.png", // Main Social Share Image
//         width: 1200,
//         height: 630,
//         alt: "Doza Medic - Connected Healthcare Ecosystem",
//       },
//     ],
//     locale: "en_US",
//     type: "website",
//   },

//   // --- Twitter / X (UPDATED WITH OG-IMAGE) ---
//   twitter: {
//     card: "summary_large_image", // Changed to large_image to show off the new design
//     site: "@dozamedic",
//     creator: "@dozamedic",
//     title: "Doza Medic Dashboard",
//     description: "Join the healthcare revolution with @dozamedic.",
//     images: ["/og-image.png"],
//   },

//   // Branding Icons
//   icons: {
//     icon: "/logo.png",
//     shortcut: "/logo.png",
//     apple: "/logo.png",
//   },

//   manifest: "/site.webmanifest",
// };

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en" suppressHydrationWarning>
//       <head>
//         {/* Preloading the brand assets */}
//         <link rel="preload" href="/logo.png" as="image" />
//         <link rel="preload" href="/og-image.png" as="image" />
//       </head>
//       <body
//         className={`
//           ${geistSans.variable}
//           ${geistMono.variable}
//           ${poppins.className}
//           antialiased bg-slate-50/50 text-slate-900
//         `}
//       >
//         {/* Paystack Integration */}
//         <Script
//           src="https://js.paystack.co/v1/inline.js"
//           strategy="beforeInteractive"
//         />

//         <div className="min-h-screen flex flex-col">
//           <StorageCheckBanner />
//           <main className="flex-grow">{children}</main>
//         </div>
//       </body>
//     </html>
//   );
// }
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { bebasNeue, poppins } from "./constants";
import "./globals.css";
import { StorageCheckBanner } from "./components/StorageBannerCookie";
import Script from "next/script";

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
  maximumScale: 1, // Apple standard: prevents accidental zooming on inputs
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

  // Apple-Specific Web App Meta
  appleWebApp: {
    capable: true,
    title: "Doza Medic",
    statusBarStyle: "black-translucent",
    startupImage: [
      {
        url: "/og-image.png",
        media:
          "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)",
      },
    ],
  },

  // Social / OpenGraph
  openGraph: {
    title: "Doza – Healthcare, Connected.",
    description: "The unified dashboard for the modern healthcare ecosystem.",
    url: "https://dashboard.dozamedic.com",
    siteName: "Doza Medic",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },

  // Branding Icons (Apple format)
  icons: {
    icon: [
      { url: "/logo.png" },
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png" }, // Ideally a 180x180px maskable icon
      { url: "/logo.png", sizes: "152x152", type: "image/png" },
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
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
        {/* Apple Touch Icon & Preloads */}
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="mask-icon" href="/logo.png" color="#065f46" />
        <link rel="preload" href="/og-image.png" as="image" />

        {/* DNS Prefetching for performance */}
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

          {/* Main Content Area */}
          <main className="flex-grow flex flex-col">{children}</main>

          {/* Apple-style subtle footer gradient blur */}
          <div className="fixed bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent pointer-events-none z-0" />
        </div>
      </body>
    </html>
  );
}
