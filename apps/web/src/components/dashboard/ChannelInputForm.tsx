import type { FormEvent } from "react";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { CREATOR_CATEGORIES } from "@/lib/categories";

type ChannelInputFormProps = {
  channelUrl: string;
  category: string;
  isLoading: boolean;
  onChannelUrlChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function ChannelInputForm({
  channelUrl,
  category,
  isLoading,
  onChannelUrlChange,
  onCategoryChange,
  onSubmit,
}: ChannelInputFormProps) {
  return (
    <Card title="채널 분석 시작">
      <form className="space-y-4" onSubmit={onSubmit}>
        <Input
          helperText="예: https://www.youtube.com/@channel"
          label="YouTube 채널 URL"
          onChange={(event) => onChannelUrlChange(event.target.value)}
          placeholder="https://www.youtube.com/@..."
          required
          type="text"
          value={channelUrl}
        />

        <label className="block text-sm font-semibold text-slate-700" htmlFor="creator-category">
          <span>카테고리 선택사항</span>
          <select
            className="mt-2 block min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-ink focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100"
            id="creator-category"
            onChange={(event) => onCategoryChange(event.target.value)}
            value={category}
          >
            <option value="">자동 선정</option>
            {CREATOR_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <Button className="w-full sm:w-auto" disabled={isLoading} type="submit">
          {isLoading ? "아이디어 생성 중" : "콘텐츠 아이디어 3개 추천받기"}
        </Button>
      </form>
    </Card>
  );
}
