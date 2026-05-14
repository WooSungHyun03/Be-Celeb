// Renders a lightweight operations checklist for the YouTube-only service.
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { PageHeader } from "@/components/common/PageHeader";
import { ROUTES } from "@/constants/routes";

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "YOUTUBE_API_KEY",
  "CRON_SECRET",
  "LOCAL_LLM_API_URL",
];

const dataTables = [
  "creator_categories",
  "influencer_channels",
  "influencer_videos",
  "collection_logs",
  "user_channel_analyses",
  "content_recommendations",
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<Badge tone="warning">운영 점검</Badge>}
        title="관리자"
        description="YouTube 수집과 추천 기능 운영에 필요한 설정을 빠르게 확인합니다."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <Card title="수집 스케줄">
          <p className="text-3xl font-bold text-ink">06:00 KST</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">UTC 21:00, cron `0 21 * * *` 기준으로 실행합니다.</p>
        </Card>
        <Card title="수집 endpoint">
          <p className="break-all text-sm font-semibold text-ink">POST /api/cron/collect-daily-videos</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">Authorization Bearer 또는 x-cron-secret 헤더가 필요합니다.</p>
        </Card>
        <Card title="채널 입력 위치">
          <p className="text-sm font-semibold text-ink">Supabase influencer_channels.channel_url</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">카테고리별 YouTube 채널 URL을 운영 DB에 입력합니다.</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="필수 환경 변수">
          <div className="flex flex-wrap gap-2">
            {requiredEnv.map((name) => (
              <Badge key={name} tone="info">
                {name}
              </Badge>
            ))}
          </div>
        </Card>
        <Card title="주요 DB 테이블">
          <div className="flex flex-wrap gap-2">
            {dataTables.map((table) => (
              <Badge key={table}>{table}</Badge>
            ))}
          </div>
        </Card>
      </div>

      <Card title="운영 문서">
        <p className="text-sm leading-6 text-slate-600">
          자동 수집 설정, 수동 curl 테스트, 인플루언서 채널 입력 SQL은 문서에 정리되어 있습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={ROUTES.dashboard}>
            <Button>추천 생성 테스트</Button>
          </Link>
          <Link href={ROUTES.trends}>
            <Button variant="secondary">트렌드 화면 확인</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
