import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/layout/Navigation";
import TopBar from "@/components/layout/TopBar";
import LiveFeedSidebar from "@/components/layout/LiveFeedSidebar";
import { Providers } from "@/components/layout/Providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vorentoe Command",
  description: "Command center for Vorentoe operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body
        className={`${inter.variable} ${mono.variable} font-sans antialiased bg-gray-950 text-gray-100 h-full flex`}
      >
        <Providers>
          <Navigation />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main className="flex-1 overflow-auto scroll-smooth">{children}</main>
          </div>
          <LiveFeedSidebar />
        </Providers>
      </body>
    </html>
  );
}
