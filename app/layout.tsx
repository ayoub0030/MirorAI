import "@/styles/globals.css";
import { Navbar } from "@/components/navbar";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { OcrProvider } from "@/lib/ocr-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Screenpipe Demo App",
  description: "Demo app showing how to use the Screenpipe Browser API",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-zinc-950 min-h-screen text-zinc-200`}>
        <OcrProvider>
        
          <main className="flex flex-col w-full h-full min-h-screen">
            {children}
          </main>
          <Toaster />
        </OcrProvider>
      </body>
    </html>
  );
}
