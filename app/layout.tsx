import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/Footer";
import Nav from "@/components/Nav";
import AuthBootstrap from "@/components/AuthBootstrap";
import VisualsProvider from "@/components/VisualsProvider";
import NeuralBackground from "@/components/NeuralBackground";
import LiveWords from "@/components/LiveWords";

export const metadata: Metadata = {
  title: "Bruno's Mind | Unofficial AZ-900 Prep",
  description:
    "Understand Azure concepts through everyday African analogies. Unofficial study tool.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-black text-white antialiased">
        <AuthBootstrap />
        <VisualsProvider>
          <NeuralBackground />
          <LiveWords />
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </VisualsProvider>
      </body>
    </html>
  );
}