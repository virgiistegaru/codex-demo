import type { Metadata } from "next";
import { SiteHeader } from "@/src/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "TinyNotes",
  description: "A TinyNotes application scaffold.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
