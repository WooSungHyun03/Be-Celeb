import Link from "next/link";
import { ROUTES } from "@/constants/routes";

const sections = [
  {
    title: "수집하는 정보",
    body: "회원가입과 로그인 과정에서 이메일, 닉네임, 인증 제공자가 발급한 사용자 식별자를 처리합니다. 서비스 사용 과정에서 저장한 즐겨찾기, 추천 설정, 온보딩 응답 같은 사용 기록이 계정과 연결될 수 있습니다.",
  },
  {
    title: "이용 목적",
    body: "수집한 정보는 계정 인증, 사용자별 추천 제공, 저장한 데이터 조회, 서비스 보안 유지, 오류 대응과 운영 개선을 위해 사용합니다.",
  },
  {
    title: "보관과 삭제",
    body: "계정과 연결된 데이터는 서비스 제공에 필요한 기간 동안 보관합니다. 계정 삭제 또는 운영상 필요한 삭제 요청이 접수되면 관련 법령과 내부 보관 기준에 따라 처리합니다.",
  },
  {
    title: "외부 서비스",
    body: "인증, 데이터 저장, 영상/상품 정보 수집을 위해 Supabase, YouTube API, 상품 판매처 등 외부 서비스를 사용할 수 있습니다. 외부 링크로 이동한 뒤의 개인정보 처리는 해당 서비스 정책을 따릅니다.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 text-ink sm:px-6">
      <Link className="text-sm font-semibold text-violet-700 hover:underline" href={ROUTES.home}>
        BE CELEB 홈
      </Link>
      <h1 className="mt-6 text-3xl font-black tracking-tight">개인정보처리방침</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        시행일: 2026년 6월 17일. 본 방침은 BE CELEB이 서비스 제공을 위해 처리하는 개인정보의 범위와 목적을 안내합니다.
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
