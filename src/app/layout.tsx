import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Discipline",
  description: "Private discipline tracker for exercise, nutrition, and weight",
  applicationName: "Discipline",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Discipline",
  },
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/Group%2048.png", type: "image/png" }],
    shortcut: [{ url: "/Group%2048.png", type: "image/png" }],
    apple: [{ url: "/Group%2048.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
