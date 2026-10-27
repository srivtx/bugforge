import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { themeScript } from "@/lib/theme";

const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });
const code = JetBrains_Mono({ variable: "--font-code", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BugForge: OA Debug, Build & DSA Arena",
  description: "Technical assessment practice: repository debugging labs, build-from-scratch labs, endless bug hunts, spot-the-bug drills and DSA with 3D voxel visualizations.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${display.variable} ${code.variable} min-h-screen antialiased`}>
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
