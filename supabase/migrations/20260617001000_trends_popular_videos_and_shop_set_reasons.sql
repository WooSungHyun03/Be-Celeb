-- Support range-scoped popular video queries and clearer shop set copy.

create index if not exists idx_influencer_videos_published_views
on public.influencer_videos(published_at desc, view_count desc);

update public.creator_shop_sets
set description = case level
  when 'beginner' then '낮은 예산으로 촬영을 시작할 수 있도록 기본 음성, 조명, 거치 안정성을 우선한 구성입니다.'
  when 'intermediate' then '콘텐츠 품질을 올리면서 비용을 과도하게 키우지 않도록 성능, 안정성, 확장성을 균형 있게 맞춘 구성입니다.'
  when 'advanced' then '라이브, 리뷰, 스튜디오 촬영처럼 전문 제작 환경에 필요한 고성능 장비 중심 구성입니다.'
  else description
end
where level in ('beginner', 'intermediate', 'advanced');
