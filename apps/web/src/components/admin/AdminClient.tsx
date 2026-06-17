"use client";

import { useCallback, useMemo, useState } from "react";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { CollectionManager } from "@/components/admin/CollectionManager";
import { DangerZone } from "@/components/admin/DangerZone";
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminLayout, type AdminSection } from "@/components/admin/AdminLayout";
import { InfluencerChannelManager } from "@/components/admin/InfluencerChannelManager";
import { LLMPromptManager } from "@/components/admin/LLMPromptManager";
import { NaverKeywordGroupManager } from "@/components/admin/NaverKeywordGroupManager";
import { OverviewCards } from "@/components/admin/OverviewCards";
import { RecommendationManager } from "@/components/admin/RecommendationManager";
import { SystemStatusPanel } from "@/components/admin/SystemStatusPanel";
import { VideoDataManager } from "@/components/admin/VideoDataManager";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import {
  getOverview,
  getSystemStatus,
  listAnalyses,
  listCategories,
  listCollectionLogs,
  listInfluencerChannels,
  listLLMPrompts,
  listNaverCollectionLogs,
  listNaverKeywordGroups,
  listRecommendations,
  listVideos,
} from "@/lib/api/admin";
import type {
  AdminAnalysis,
  AdminCategory,
  AdminCollectionLog,
  AdminInfluencerChannel,
  AdminNaverCollectionLog,
  AdminNaverKeywordGroup,
  AdminOverview,
  AdminPromptTemplate,
  AdminRecommendation,
  AdminRecommendationOption,
  AdminSystemStatus,
  AdminVideo,
} from "@/types/admin";

type AdminData = {
  overview: AdminOverview | null;
  categories: AdminCategory[];
  channels: AdminInfluencerChannel[];
  videos: AdminVideo[];
  logs: AdminCollectionLog[];
  naverGroups: AdminNaverKeywordGroup[];
  naverLogs: AdminNaverCollectionLog[];
  analyses: AdminAnalysis[];
  recommendations: AdminRecommendation[];
  options: AdminRecommendationOption[];
  prompts: AdminPromptTemplate[];
  systemStatus: AdminSystemStatus | null;
};

const initialData: AdminData = {
  overview: null,
  categories: [],
  channels: [],
  videos: [],
  logs: [],
  naverGroups: [],
  naverLogs: [],
  analyses: [],
  recommendations: [],
  options: [],
  prompts: [],
  systemStatus: null,
};

function getApiBaseUrlText() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "API 서버 주소 미설정";
}

export function AdminClient() {
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [data, setData] = useState<AdminData>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const apiBaseUrl = useMemo(getApiBaseUrlText, []);

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        overview,
        categoriesResult,
        channelsResult,
        videosResult,
        logsResult,
        naverGroupsResult,
        naverLogsResult,
        analysesResult,
        recommendationsResult,
        promptsResult,
        systemStatus,
      ] = await Promise.all([
        getOverview(),
        listCategories(),
        listInfluencerChannels({ limit: 100 }),
        listVideos({ limit: 100 }),
        listCollectionLogs({ limit: 50 }),
        listNaverKeywordGroups(),
        listNaverCollectionLogs({ limit: 20 }),
        listAnalyses({ limit: 50 }),
        listRecommendations({ limit: 50 }),
        listLLMPrompts(),
        getSystemStatus(),
      ]);

      setData({
        overview,
        categories: categoriesResult.categories,
        channels: channelsResult.channels,
        videos: videosResult.videos,
        logs: logsResult.logs,
        naverGroups: naverGroupsResult.groups,
        naverLogs: naverLogsResult.logs,
        analyses: analysesResult.analyses,
        recommendations: recommendationsResult.contentRecommendations,
        options: recommendationsResult.recommendationOptions,
        prompts: promptsResult.prompts,
        systemStatus,
      });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Admin 데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sharedProps = {
    onChanged: loadAdminData,
    onError: setError,
  };
  const handleUnlock = useCallback(() => {
    void loadAdminData();
  }, [loadAdminData]);

  return (
    <AdminAuthGate onUnlock={handleUnlock}>
      <AdminLayout activeSection={activeSection} apiBaseUrl={apiBaseUrl} onSectionChange={setActiveSection}>
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-rose-700">{error}</p>
              <Button onClick={loadAdminData} variant="secondary">
                다시 불러오기
              </Button>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <Card>
            <div className="flex items-center gap-2">
              <Badge tone="info">loading</Badge>
              <p className="text-sm text-slate-500">Admin 데이터를 불러오는 중입니다.</p>
            </div>
          </Card>
        ) : null}

        {activeSection === "overview" ? <OverviewCards overview={data.overview} /> : null}
        {activeSection === "categories" ? <CategoryManager categories={data.categories} {...sharedProps} /> : null}
        {activeSection === "channels" ? (
          <InfluencerChannelManager categories={data.categories} channels={data.channels} {...sharedProps} />
        ) : null}
        {activeSection === "videos" ? (
          <VideoDataManager categories={data.categories} channels={data.channels} videos={data.videos} {...sharedProps} />
        ) : null}
        {activeSection === "collection" ? <CollectionManager logs={data.logs} {...sharedProps} /> : null}
        {activeSection === "naver" ? (
          <NaverKeywordGroupManager
            categories={data.categories}
            groups={data.naverGroups}
            logs={data.naverLogs}
            {...sharedProps}
          />
        ) : null}
        {activeSection === "recommendations" ? (
          <RecommendationManager
            analyses={data.analyses}
            options={data.options}
            recommendations={data.recommendations}
            {...sharedProps}
          />
        ) : null}
        {activeSection === "prompts" ? <LLMPromptManager prompts={data.prompts} {...sharedProps} /> : null}
        {activeSection === "system" ? <SystemStatusPanel apiBaseUrl={apiBaseUrl} status={data.systemStatus} onError={setError} /> : null}
        {activeSection === "danger" ? <DangerZone categories={data.categories} {...sharedProps} /> : null}
      </AdminLayout>
    </AdminAuthGate>
  );
}
