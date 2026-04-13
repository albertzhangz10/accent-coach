import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { I18nProvider } from "@/lib/i18n";
import { Header } from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accent Coach",
  description:
    "Train your English accent with AI-powered pronunciation feedback.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Accent Coach",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="font-sans min-h-screen">
        <I18nProvider>
          <Header />
          <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  );
}
