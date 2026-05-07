// Renders the profile page.
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { CATEGORIES } from "@/constants/categories";
import { PLATFORMS } from "@/constants/platforms";

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-ink">마이페이지</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">계정 정보와 추천 설정을 관리합니다.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card title="프로필 정보">
          <div className="space-y-4">
            <Input label="계정명" defaultValue="be_celeb_creator" />
            <Input label="이메일" defaultValue="creator@example.com" type="email" />
            <Input label="소개" defaultValue="AI 영상과 일상 숏폼을 만드는 크리에이터" />
            <Button>변경사항 저장</Button>
          </div>
        </Card>
        <div className="space-y-4">
          <Card title="추천 설정">
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">플랫폼</p>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => <Badge key={platform.id} tone="info">{platform.label}</Badge>)}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">관심 카테고리</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.slice(0, 3).map((category) => <Badge key={category.id} tone="brand">{category.label}</Badge>)}
                </div>
              </div>
            </div>
          </Card>
          <Card title="구독 상태">
            <p className="text-2xl font-bold text-ink">Creator</p>
            <p className="mt-2 text-sm text-slate-500">추천 생성과 저장 기능을 사용할 수 있습니다.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
