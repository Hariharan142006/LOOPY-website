import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "Loopy - Instant Cash for Scrap",
  description: "The smartest way to recycle in India. Book a doorstep pickup, get accurate weighing, and receive instant payment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body
        className={`antialiased font-poppins`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
