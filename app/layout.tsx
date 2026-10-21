import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DoorOverlay } from "@/components/transition/door-overlay";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AuthPilot",
  description: "Verdict-first guides for registering and getting approved for an OAuth app with a provider.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full">
        {children}
        <DoorOverlay />
      </body>
    </html>
  );
}
