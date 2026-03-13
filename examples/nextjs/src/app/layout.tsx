import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loopwise Connect — Next.js Example",
  description:
    "Reference implementation for Loopwise Connect OAuth 2.0 with Next.js App Router.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
