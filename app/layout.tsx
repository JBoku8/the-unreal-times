import type { Metadata } from "next";
import { Inter, Newsreader, Space_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { cn } from "@/src/utils/cn";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Unreal Times — Satirical News Reader",
  description: "Browse feeds, explore sources, and chat in-context with articles.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className={cn("flex min-h-full flex-col", inter.className)}>
        <Providers>
          <SiteHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
