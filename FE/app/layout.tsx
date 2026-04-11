import type { Metadata } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import "./globals.css";
import MainLayout from "@/components/layout/MainLayout";
import { AuthProvider } from "@/lib/AuthContext";
import { AuthModal } from "@/components/auth/AuthModal";
import { SettingsProvider } from "@/lib/SettingsContext";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "FinVision - Nền tảng phân tích chứng khoán chuyên nghiệp",
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
        className={`${roboto.variable} ${robotoMono.variable} antialiased`}
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
