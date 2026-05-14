"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { DeleteAccountSection } from "@/components/account/DeleteAccountSection";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { EmptyState } from "@/components/common/EmptyState";
import { Input } from "@/components/common/Input";
import { Loading } from "@/components/common/Loading";
import { PageHeader } from "@/components/common/PageHeader";
import { ROUTES } from "@/constants/routes";
import { CREATOR_CATEGORIES } from "@/lib/categories";
import { getUserChannelSettings, updateUserChannelSettings } from "@/lib/client/api";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UserChannelSettings } from "@/types/content-recommendation";

type ProfileRow = {
  nickname: string;
};

type PlanRow = {
  plan_name: string;
  monthly_recommendation_limit: number;
  monthly_recommendation_used: number;
};

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [settings, setSettings] = useState<UserChannelSettings | null>(null);
  const [channelUrl, setChannelUrl] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized" | "error">("loading");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!active) {
          return;
        }

        if (!session?.user) {
          setStatus("unauthorized");
          return;
        }

        setEmail(session.user.email ?? "");
        const [profileResult, planResult, channelSettings] = await Promise.all([
          supabase.from("profiles").select("nickname").eq("user_id", session.user.id).maybeSingle<ProfileRow>(),
          supabase
            .from("user_plans")
            .select("plan_name,monthly_recommendation_limit,monthly_recommendation_used")
            .eq("user_id", session.user.id)
            .maybeSingle<PlanRow>(),
          getUserChannelSettings().catch(() => null),
        ]);

        if (!active) {
          return;
        }

        if (profileResult.error) {
          throw new Error(profileResult.error.message);
        }

        setNickname(profileResult.data?.nickname ?? "");
        setPlan(planResult.data ?? null);
        setSettings(channelSettings);
        setChannelUrl(channelSettings?.channelUrl ?? "");
        setCategory(channelSettings?.category ?? "");
        setStatus("ready");
      } catch (error) {
        if (active) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "프로필을 불러오지 못했습니다.");
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveStatus("saving");
    setMessage("");

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("로그인이 필요합니다.");
      }

      const { error } = await supabase.from("profiles").update({ nickname }).eq("user_id", session.user.id);
      if (error) {
        throw new Error(error.message);
      }

      setSaveStatus("success");
      setMessage("프로필이 저장되었습니다.");
    } catch (error) {
      setSaveStatus("error");
      setMessage(error instanceof Error ? error.message : "프로필 저장에 실패했습니다.");
    }
  }

  async function handleChannelSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveStatus("saving");
    setMessage("");

    try {
      const updated = await updateUserChannelSettings({ channelUrl, category });
      setSettings(updated);
      setSaveStatus("success");
      setMessage("채널 설정이 저장되었습니다.");
    } catch (error) {
      setSaveStatus("error");
      setMessage(error instanceof Error ? error.message : "채널 설정 저장에 실패했습니다.");
    }
  }

  if (status === "loading") {
    return <Loading label="계정 설정을 불러오는 중입니다." />;
  }

  if (status === "unauthorized") {
    return (
      <EmptyState
        action={
          <Link href={ROUTES.login}>
            <Button>로그인하기</Button>
          </Link>
        }
        description="계정 설정은 로그인 후 확인할 수 있습니다."
        title="로그인이 필요합니다"
      />
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        action={
          <Link href={ROUTES.dashboard}>
            <Button variant="secondary">대시보드로 이동</Button>
          </Link>
        }
        description={message || "Supabase 환경 변수 또는 인증 상태를 확인해주세요."}
        title="계정 설정을 불러오지 못했습니다"
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="계정 설정" description="프로필과 기본 YouTube 채널 설정을 관리합니다." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card title="프로필 정보">
            <form className="space-y-4" onSubmit={handleProfileSubmit}>
              <Input label="닉네임" onChange={(event) => setNickname(event.target.value)} required value={nickname} />
              <Input label="이메일" readOnly type="email" value={email} />
              {message ? (
                <p className={`text-sm font-semibold ${saveStatus === "error" ? "text-rose-700" : "text-violet-700"}`}>
                  {message}
                </p>
              ) : null}
              <Button disabled={saveStatus === "saving"} type="submit">
                {saveStatus === "saving" ? "저장 중" : "프로필 저장"}
              </Button>
            </form>
          </Card>

          <Card title="채널 설정 변경">
            <form className="space-y-4" onSubmit={handleChannelSubmit}>
              <Input
                helperText="dashboard 추천 요청 시 이 값이 자동으로 채워집니다."
                label="YouTube 채널 URL"
                onChange={(event) => setChannelUrl(event.target.value)}
                placeholder="https://www.youtube.com/@..."
                required
                value={channelUrl}
              />
              <label className="block text-sm font-semibold text-slate-700" htmlFor="profile-category">
                <span>카테고리</span>
                <select
                  className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink"
                  id="profile-category"
                  onChange={(event) => setCategory(event.target.value)}
                  required
                  value={category}
                >
                  <option value="">카테고리 선택</option>
                  {CREATOR_CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <Button disabled={saveStatus === "saving"} type="submit">
                채널 설정 저장
              </Button>
            </form>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="추천 사용량">
            <p className="text-3xl font-bold text-ink">
              {plan?.monthly_recommendation_used ?? 0} / {plan?.monthly_recommendation_limit ?? 5}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">이번 달 YouTube 추천 생성 사용량입니다.</p>
          </Card>
          <Card title="저장된 채널">
            <div className="space-y-3">
              <Badge tone="info">{settings?.category ?? "카테고리 없음"}</Badge>
              <p className="break-all text-sm font-semibold text-ink">{settings?.channelTitle ?? settings?.channelUrl ?? "저장된 채널 없음"}</p>
            </div>
          </Card>
          <Card title="구독 상태">
            <p className="text-2xl font-bold capitalize text-ink">{plan?.plan_name ?? "free"}</p>
          </Card>
          <DeleteAccountSection onError={setMessage} />
        </div>
      </div>
    </div>
  );
}
