import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accent Coach",
  description: "Train your English accent with AI-powered pronunciation feedback.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen">
        <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-10 bg-bg/70">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 font-bold text-lg">
              <span className="inline-block w-6 h-6 rounded-full bg-gradient-to-br from-accent to-accent2" />
              Accent Coach
            </a>
            <nav className="text-sm text-zinc-400">Practice · Progress</nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-10">{children}</main>
      </body>
    </html>
  );
}
