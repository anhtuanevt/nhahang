import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nhà Hàng",
  description: "Hệ thống đặt món nhà hàng",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="h-full">
      <body className="min-h-full bg-gray-50 font-sans">{children}</body>
    </html>
  );
}
