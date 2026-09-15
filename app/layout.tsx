import type { Metadata } from "next";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "@fontsource/tajawal/800.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Masar HR",
  description: "نظام إدارة الموارد البشرية والرواتب والسلف وإجازات الموظفين",
  openGraph: {
    title: "Masar HR",
    description: "نظام إدارة الموارد البشرية والرواتب والسلف وإجازات الموظفين",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
