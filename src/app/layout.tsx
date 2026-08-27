import type { Metadata } from "next";
import SpaceBackground from "@/components/SpaceBackground";
import "./globals.css";

export const metadata: Metadata = {
  title: "Memento // Digital Consciousness Mirror & Temporal Vault",
  description: "Futuristic digital memory archiver, heuristic AI consciousness simulator, and temporal legacy vault capsule scheduling engine.",
  keywords: ["Memento", "Consciousness Mirror", "Temporal Legacy Vault", "Memory Archiver", "Sci-Fi Glassmorphism", "Neural Sync Core"],
  authors: [{ name: "Memento Systems" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased dark" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[#030712] text-gray-200 relative" suppressHydrationWarning>
        <SpaceBackground />
        {children}
      </body>
    </html>
  );
}
