import type { Metadata } from "next";
import { Roboto, Roboto_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  weight: "variable",
  subsets: ["latin"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  weight: "variable",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  weight: "variable",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ma-Doh | Personal Financial Intelligence",
  description:
    "Capture receipts, messages, voice entries, and cash spending in one reviewed financial record.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${roboto.variable} ${robotoMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
