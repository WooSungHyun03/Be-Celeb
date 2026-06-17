import Link from "next/link";
import { ROUTES } from "@/constants/routes";

const sections = [
  {
    title: "서비스 이용",
    body: "BE CELEB은 크리에이터의 콘텐츠 기획, 트렌드 확인, 추천 장비 탐색을 돕는 서비스입니다. 사용자는 계정 정보를 정확히 관리하고, 타인의 권리나 서비스 운영을 침해하는 방식으로 서비스를 이용해서는 안 됩니다.",
  },
  {
    title: "계정과 접근 권한",
    body: "로그인이 필요한 기능은 본인 계정으로만 이용해야 하며, 관리자 기능은 별도 권한을 받은 사용자에게만 제공됩니다. 비정상 접근이나 자동화 요청은 제한될 수 있습니다.",
  },
  {
    title: "콘텐츠와 외부 정보",
    body: "트렌드, 영상, 상품 정보는 외부 API와 판매처 데이터를 기반으로 표시됩니다. 가격, 재고, 조회수 등은 수집 시점과 판매처 정책에 따라 달라질 수 있으므로 최종 구매 전 판매처 정보를 확인해야 합니다.",
  },
  {
    title: "서비스 변경과 중단",
    body: "운영 안정성, 보안, 외부 API 정책 변경에 따라 일부 기능이 변경되거나 일시 중단될 수 있습니다. 중요한 변경은 서비스 화면 또는 별도 공지로 안내합니다.",
  },
];

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 text-ink sm:px-6">
      <Link className="text-sm font-semibold text-violet-700 hover:underline" href={ROUTES.home}>
        BE CELEB 홈
      </Link>
      <h1 className="mt-6 text-3xl font-black tracking-tight">이용약관</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        시행일: 2026년 6월 17일. 본 약관은 BE CELEB 서비스 이용 기준과 사용자 책임을 안내합니다.
      </p>

      <div className="mt-8 space-y-7">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="text-lg font-black">{section.title}</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">{section.body}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
