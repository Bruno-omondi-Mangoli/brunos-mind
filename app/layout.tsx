import type { Metadata } from "next";
import "./globals.css";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Bruno's Mind | Unofficial AZ-900 Prep",
  description:
    "Understand Azure concepts through everyday African analogies. Unofficial study tool.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-black text-white antialiased">
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}