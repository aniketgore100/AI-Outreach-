import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

import { StoreProvider } from "@/store/provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Outreach Automation Platform",
  description: "Production-ready outreach automation for agencies and sales teams.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StoreProvider>{children}</StoreProvider>
        <Toaster
          theme="light"
          position="bottom-right"
          toastOptions={{
            classNames: {
              toast: "rounded-md border border-border bg-card shadow-md",
              title: "text-sm font-medium text-foreground",
              description: "text-small text-muted-foreground",
              actionButton: "bg-primary text-primary-foreground",
              cancelButton: "bg-secondary text-secondary-foreground",
            },
          }}
        />
      </body>
    </html>
  );
}
