import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/layout/MainLayout";
import { AuthProvider } from "@/lib/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { SettingsProvider } from "@/lib/SettingsContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StockPro - Nền tảng phân tích chứng khoán chuyên nghiệp",
  description: "Cập nhật dữ liệu thị trường, tin tức tài chính và công cụ phân tích chứng khoán hàng đầu Việt Nam.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${robotoMono.variable} antialiased`}
      >
        <AuthProvider>
          <SettingsProvider>
            <MainLayout>
              {children}
            </MainLayout>
            <AuthModal />
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
