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
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";
import { getUserChannelSettings, updateUserChannelSettings } from "@/lib/api/users";
import type { UserChannelSettings } from "@/types/content-recommendation";

type ProfileRow = {
  nickname: string;
};

export default function ProfilePage() {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [settings, setSettings] = useState<UserChannelSettings | null>(null);
  const [channelUrl, setChannelUrl] = useState("");
  const [category, setCategory] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "unauthorized" | "error">("loading");
  const [profileStatus, setProfileStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [channelStatus, setChannelStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [passwordStatus, setPasswordStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [channelMessage, setChannelMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

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

        const userEmail = session.user.email ?? "";
        setEmail(userEmail);
        const [profileResult, channelSettings] = await Promise.all([
          supabase.from("profiles").select("nickname").eq("user_id", session.user.id).maybeSingle<ProfileRow>(),
          getUserChannelSettings().catch(() => null),
        ]);

        if (!active) {
          return;
        }

        if (profileResult.error) {
          throw new Error(profileResult.error.message);
        }

        setNickname(profileResult.data?.nickname ?? "");
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
    setProfileStatus("saving");
    setProfileMessage("");
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

      setProfileStatus("success");
      setProfileMessage("프로필이 저장되었습니다.");
    } catch (error) {
      setProfileStatus("error");
      setProfileMessage(error instanceof Error ? error.message : "프로필 저장에 실패했습니다.");
    }
  }

  async function handleChannelSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChannelStatus("saving");
    setChannelMessage("");
    setMessage("");

    try {
      const updated = await updateUserChannelSettings({ channelUrl, category });
      setSettings(updated);
      setChannelStatus("success");
      setChannelMessage("채널 설정이 저장되었습니다.");
    } catch (error) {
      setChannelStatus("error");
      setChannelMessage(error instanceof Error ? error.message : "채널 설정 저장에 실패했습니다.");
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordStatus("saving");
    setPasswordMessage("");
    setMessage("");

    try {
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error("현재 비밀번호, 새 비밀번호, 확인 값을 모두 입력해 주세요.");
      }
      if (newPassword.length < 8) {
        throw new Error("새 비밀번호는 8자 이상이어야 합니다.");
      }
      if (newPassword !== confirmPassword) {
        throw new Error("새 비밀번호와 확인 값이 일치하지 않습니다.");
      }
      if (!email) {
        throw new Error("로그인 이메일을 확인하지 못했습니다. 다시 로그인한 뒤 시도해 주세요.");
      }

      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (signInError) {
        throw new Error("현재 비밀번호가 올바르지 않습니다.");
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        throw new Error(updateError.message);
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus("success");
      setPasswordMessage("비밀번호가 변경되었습니다. 현재 세션은 유지됩니다.");
    } catch (error) {
      setPasswordStatus("error");
      setPasswordMessage(error instanceof Error ? error.message : "비밀번호 변경에 실패했습니다.");
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
        description="계정 설정은 로그인한 사용자만 확인할 수 있습니다."
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
        description={message || "Supabase 환경 변수 또는 인증 상태를 확인해 주세요."}
        title="계정 설정을 불러오지 못했습니다"
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="계정 설정" description="프로필, 기본 YouTube 채널 설정, 비밀번호를 한 곳에서 관리합니다." />

      {message ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">{message}</p> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card title="프로필 정보">
            <form className="space-y-4" onSubmit={handleProfileSubmit}>
              <Input label="닉네임" onChange={(event) => setNickname(event.target.value)} required value={nickname} />
              <Input label="이메일" readOnly type="email" value={email} />
              {profileMessage ? (
                <p className={`text-sm font-semibold ${profileStatus === "error" ? "text-rose-700" : "text-violet-700"}`}>
                  {profileMessage}
                </p>
              ) : null}
              <Button disabled={profileStatus === "saving"} type="submit">
                {profileStatus === "saving" ? "저장 중..." : "프로필 저장"}
              </Button>
            </form>
          </Card>

          <Card title="채널 설정 변경">
            <form className="space-y-4" onSubmit={handleChannelSubmit}>
              <Input
                helperText="대시보드 추천 요청 시 이 값이 기본 채널로 사용됩니다."
                label="YouTube 채널 URL"
                onChange={(event) => setChannelUrl(event.target.value)}
                placeholder="https://www.youtube.com/@..."
                required
                value={channelUrl}
              />
              <label className="block text-sm font-semibold text-slate-700" htmlFor="profile-category">
                <span>카테고리</span>
                <select
                  className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
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
              {channelMessage ? (
                <p className={`text-sm font-semibold ${channelStatus === "error" ? "text-rose-700" : "text-violet-700"}`}>
                  {channelMessage}
                </p>
              ) : null}
              <Button disabled={channelStatus === "saving"} type="submit">
                {channelStatus === "saving" ? "저장 중..." : "채널 설정 저장"}
              </Button>
            </form>
          </Card>

          <Card
            title="비밀번호 변경"
            className="border-violet-200 bg-[linear-gradient(180deg,#ffffff_0%,#faf5ff_100%)] shadow-violet-100"
          >
            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
              <div className="rounded-xl border border-violet-100 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-600">
                계정 보안을 위해 현재 비밀번호를 한 번 더 확인한 뒤 새 비밀번호를 저장합니다.
              </div>
              <Input
                autoComplete="current-password"
                label="현재 비밀번호"
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
                type="password"
                value={currentPassword}
              />
              <Input
                autoComplete="new-password"
                helperText="새 비밀번호는 8자 이상이어야 합니다."
                label="새 비밀번호"
                minLength={8}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                type="password"
                value={newPassword}
              />
              <Input
                autoComplete="new-password"
                label="새 비밀번호 확인"
                minLength={8}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                type="password"
                value={confirmPassword}
              />
              {passwordMessage ? (
                <p className={`text-sm font-semibold ${passwordStatus === "error" ? "text-rose-700" : "text-violet-700"}`}>
                  {passwordMessage}
                </p>
              ) : null}
              <Button disabled={passwordStatus === "saving"} type="submit">
                {passwordStatus === "saving" ? "변경 중..." : "비밀번호 변경"}
              </Button>
            </form>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card title="저장된 채널">
            <div className="space-y-3">
              <Badge tone="brand">{settings?.category ?? "카테고리 없음"}</Badge>
              <p className="break-all text-sm font-semibold text-ink">
                {settings?.channelTitle ?? settings?.channelUrl ?? "저장된 채널 없음"}
              </p>
              <p className="text-xs leading-5 text-slate-500">
                이 정보는 대시보드 추천과 콘텐츠 분석의 기본값으로 사용됩니다.
              </p>
            </div>
          </Card>
          <DeleteAccountSection onError={setMessage} />
        </aside>
      </div>
    </div>
  );
}
