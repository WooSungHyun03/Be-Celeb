"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/common/Input";
import { Loading } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { ROUTES } from "@/constants/routes";
import { ApiClientError, apiFetch, type ApiSuccess } from "@/lib/client/api";

type ProfilePayload = {
  user: {
    email: string | null;
  };
  profile: {
    nickname: string;
    youtubeChannelUrl?: string | null;
    youtube_channel_url?: string | null;
  };
  plan: {
    planName?: string;
    plan_name?: string;
    monthlyRecommendationLimit?: number;
    monthly_recommendation_limit?: number;
    monthlyRecommendationUsed?: number;
    monthly_recommendation_used?: number;
  } | null;
  creator_profile: {
    categories?: string[];
    onboardingCompleted?: boolean;
    onboarding_completed?: boolean;
  } | null;
  authProvider: string;
};

function getYoutubeChannelUrl(profile: ProfilePayload["profile"]) {
  return profile.youtubeChannelUrl ?? profile.youtube_channel_url ?? "";
}

function getPlanName(plan: ProfilePayload["plan"]) {
  return plan?.planName ?? plan?.plan_name ?? "free";
}

function getPlanUsage(plan: ProfilePayload["plan"]) {
  return {
    used: plan?.monthlyRecommendationUsed ?? plan?.monthly_recommendation_used ?? 0,
    limit: plan?.monthlyRecommendationLimit ?? plan?.monthly_recommendation_limit ?? 5,
  };
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [nickname, setNickname] = useState("");
  const [youtubeChannelUrl, setYoutubeChannelUrl] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized" | "error">("loading");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    apiFetch<ApiSuccess<ProfilePayload>>("/api/me")
      .then((response) => response.data)
      .then((data) => {
        if (!active || !data) {
          return;
        }

        setProfile(data);
        setNickname(data.profile.nickname);
        setYoutubeChannelUrl(getYoutubeChannelUrl(data.profile));
        setStatus("ready");
      })
      .catch((error) => {
        if (active) {
          if (error instanceof ApiClientError && error.status === 401) {
            setStatus("unauthorized");
            return;
          }

          setStatus("error");
          setMessage(error instanceof Error ? error.message : "프로필을 불러오지 못했습니다.");
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveStatus("saving");
    setMessage("");

    try {
      const data = await apiFetch<ApiSuccess<{ profile: ProfilePayload["profile"] }>>(
        "/api/me/profile",
        {
          method: "PATCH",
          body: JSON.stringify({
            nickname,
            youtube_channel_url: youtubeChannelUrl || null,
          }),
        },
      );

      setProfile((current) => (current ? { ...current, profile: { ...current.profile, ...data.data.profile } } : current));
      setSaveStatus("success");
      setMessage("프로필이 저장되었습니다.");
    } catch (error) {
      setSaveStatus("error");
      setMessage(error instanceof Error ? error.message : "프로필 저장에 실패했습니다.");
    }
  }

  if (status === "loading") {
    return <Loading label="프로필을 불러오는 중입니다." />;
  }

  if (status === "unauthorized") {
    return (
      <EmptyState
        title="로그인이 필요합니다"
        description="프로필과 추천 기록은 로그인 후 확인할 수 있습니다."
        action={
          <Link href={ROUTES.login}>
            <Button>로그인하기</Button>
          </Link>
        }
      />
    );
  }

  if (status === "error" || !profile) {
    return (
      <EmptyState
        title="프로필을 불러오지 못했습니다"
        description={message || "Supabase 환경 변수 또는 인증 상태를 확인해주세요."}
        action={
          <Link href={ROUTES.dashboard}>
            <Button variant="secondary">대시보드로 이동</Button>
          </Link>
        }
      />
    );
  }

  const usage = getPlanUsage(profile.plan);

  return (
    <div className="space-y-8">
      <PageHeader title="마이페이지" description="계정 정보와 YouTube 채널 설정을 관리합니다." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card title="프로필 정보">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input label="닉네임" onChange={(event) => setNickname(event.target.value)} required value={nickname} />
            <Input label="이메일" readOnly type="email" value={profile.user.email ?? ""} />
            <Input
              helperText="예: https://www.youtube.com/@channel"
              label="YouTube 채널 URL"
              onChange={(event) => setYoutubeChannelUrl(event.target.value)}
              placeholder="https://www.youtube.com/@..."
              value={youtubeChannelUrl}
            />
            {message ? (
              <p className={`text-sm font-semibold ${saveStatus === "error" ? "text-rose-700" : "text-violet-700"}`}>
                {message}
              </p>
            ) : null}
            <Button disabled={saveStatus === "saving"} type="submit">
              {saveStatus === "saving" ? "저장 중..." : "변경사항 저장"}
            </Button>
          </form>
        </Card>
        <div className="space-y-4">
          <Card title="추천 사용량">
            <p className="text-3xl font-bold text-ink">
              {usage.used} / {usage.limit}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">이번 달 YouTube 추천 생성 사용량입니다.</p>
          </Card>
          <Card title="추천 설정">
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">대상 채널</p>
                <Badge tone="info">YouTube</Badge>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">관심 카테고리</p>
                <div className="flex flex-wrap gap-2">
                  {(profile.creator_profile?.categories ?? []).length > 0 ? (
                    profile.creator_profile?.categories?.map((category) => (
                      <Badge key={category} tone="brand">
                        {category}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">온보딩에서 관심 카테고리를 선택하면 표시됩니다.</span>
                  )}
                </div>
              </div>
            </div>
          </Card>
          <Card title="구독 상태">
            <p className="text-2xl font-bold capitalize text-ink">{getPlanName(profile.plan)}</p>
            <p className="mt-2 text-sm text-slate-500">요금제와 추천 한도는 운영 DB의 user_plans 기준으로 표시됩니다.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
