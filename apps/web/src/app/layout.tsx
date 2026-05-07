// Provides the shared App Router layout for Be Celeb pages.
import type { Metadata } from "next";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "Be Celeb | SNS 트렌드 전략 추천",
  description: "크리에이터를 위한 SNS 트렌드 분석과 콘텐츠 추천 서비스",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>
        <Header />
        <main className="mx-auto min-h-[calc(100vh-180px)] w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
