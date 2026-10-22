import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Atkinson_Hyperlegible, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import AuthBootstrap from "@/components/AuthBootstrap";
import VisualsProvider from "@/components/VisualsProvider";
import NeuralBackground from "@/components/NeuralBackground";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--nf-display",
  display: "swap",
});

const reading = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--nf-reading",
  display: "swap",
});

const code = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--nf-code",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bruno's Mind | Unofficial AZ-900 Prep",
  description:
    "Understand Azure concepts through everyday African analogies. Unofficial study tool.",
};

export const viewport: Viewport = {
  themeColor: "#05070b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${reading.variable} ${code.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-cyan-400 focus:px-4 focus:py-2 focus:text-black"
        >
          Skip to content
        </a>
        <AuthBootstrap />
        <VisualsProvider>
          <NeuralBackground />
          <Nav />
          <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>
          <Footer />
        </VisualsProvider>
      </body>
    </html>
  );
}