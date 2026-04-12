import type { Metadata, Viewport } from "next";
import { VoicePickerClient } from "@/components/VoicePicker";
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
        <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-10 bg-bg/70 pt-[env(safe-area-inset-top)]">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="inline-block w-6 h-6 rounded-full bg-gradient-to-br from-accent to-accent2" />
              Accent Coach
            </a>
            <nav className="flex items-center gap-4 text-sm text-zinc-400">
              <a href="/" className="hover:text-zinc-200">
                Practice
              </a>
              <VoicePickerClient />
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
