import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import { NotificationProvider } from "@/components/providers/notification-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { VTPassProvider } from "@/contexts/VTPassContext";
import { ErrorBoundary } from "@/components/providers/error-boundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PayLink",
  description: "Your trusted payment solution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <AuthProvider>
            <VTPassProvider>
              {children}
              {/* Removed NotificationProvider since we're using our own toast system */}
            </VTPassProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
