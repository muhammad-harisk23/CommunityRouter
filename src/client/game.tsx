import './index.css';

import { navigateTo } from '@devvit/web/client';
import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './ErrorBoundary';
import { trpc } from './trpc';
import {
  defaultAnalytics,
  defaultCategories,
  type Community,
  type RouterAnalytics,
  type RouteCategory,
} from '../shared/communityRouter';

const categoriesToCreate = ['Find Work', 'Hire Talent', 'Find Cofounders', 'Learn Skills'];

const focusRing =
  'focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0f18] focus-visible:outline-none';

type Theme = 'dark' | 'light';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

/* ───────── Helpers ───────── */

const getSubredditUrl = (communityName: string) => {
  const cleanName = communityName.trim().replace(/^\/?r\//i, '');
  return `https://www.reddit.com/r/${cleanName}/`;
};

const isRoutableCommunity = (community: Community) =>
  community.name.trim().replace(/^\/?r\//i, '').length > 0;

const normalizeSubredditName = (value: string) => {
  const cleaned = value
    .trim()
    .replace(/^https?:\/\/(www\.)?reddit\.com\/r\//i, '')
    .replace(/^\/?r\//i, '')
    .replaceAll('/', '')
    .replace(/[^A-Za-z0-9_]/g, '');

  return cleaned ? `r/${cleaned}` : '';
};

const dedupeTitle = (title: string, categories: RouteCategory[]) => {
  const baseTitle = title.trim() || 'Custom Route';
  const usedTitles = new Set(
    categories.map((category) => category.title.trim().toLowerCase())
  );

  if (!usedTitles.has(baseTitle.toLowerCase())) {
    return baseTitle;
  }

  let suffix = 2;
  while (usedTitles.has(`${baseTitle} ${suffix}`.toLowerCase())) {
    suffix += 1;
  }

  return `${baseTitle} ${suffix}`;
};

const dedupeEditedTitle = (
  title: string,
  categories: RouteCategory[],
  categoryId: string
) =>
  dedupeTitle(
    title,
    categories.filter((category) => category.id !== categoryId)
  );

const getTopAnalyticsLabel = (counts: Record<string, number>) => {
  const [topEntry] = Object.entries(counts)
    .filter(([label, count]) => label.trim().length > 0 && count > 0)
    .sort(([, firstCount], [, secondCount]) => secondCount - firstCount);

  if (!topEntry) {
    return 'No data yet';
  }

  return topEntry[0];
};

/* ───────── Badge & Strictness helpers ───────── */

const badgeLabels: Record<string, string> = {
  'beginner-friendly': 'Beginner Friendly',
  'strict-moderation': 'Strict Moderation',
  'megathread-first': 'Megathread First',
  'fast-responses': 'Fast Responses',
  'portfolio-required': 'Portfolio Required',
  'learning-safe': 'Learning Safe',
  'founder-focused': 'Founder Focused',
};

const badgeColors: Record<string, string> = {
  'beginner-friendly': 'bg-emerald-400/12 text-emerald-200 border-emerald-400/20',
  'strict-moderation': 'bg-amber-400/10 text-amber-200 border-amber-400/18',
  'megathread-first': 'bg-blue-400/10 text-blue-200 border-blue-400/18',
  'fast-responses': 'bg-green-400/10 text-green-200 border-green-400/18',
  'portfolio-required': 'bg-violet-400/10 text-violet-200 border-violet-400/18',
  'learning-safe': 'bg-teal-400/10 text-teal-200 border-teal-400/18',
  'founder-focused': 'bg-rose-400/10 text-rose-200 border-rose-400/18',
};

const strictnessConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/18' },
  medium: { label: 'Medium', color: 'text-amber-300 bg-amber-400/10 border-amber-400/18' },
  high: { label: 'High', color: 'text-rose-300 bg-rose-400/10 border-rose-400/18' },
};

const computeMatchScore = (community: Community): number => {
  let score = 65;
  if (community.strictness === 'high') score += 10;
  if (community.strictness === 'medium') score += 5;
  if (community.badges?.includes('fast-responses')) score += 8;
  if (community.badges?.includes('beginner-friendly')) score += 7;
  if (community.badges?.includes('learning-safe')) score += 5;
  if (community.requires && community.requires.length >= 3) score += 5;
  if (community.badges?.includes('portfolio-required')) score -= 5;
  if (community.badges?.includes('strict-moderation')) score -= 3;
  return Math.min(Math.max(score, 40), 98);
};

const isDuplicateInCategory = (
  categories: RouteCategory[],
  categoryId: string,
  communityName: string,
  communityIndex: number
): boolean => {
  const targetCategory = categories.find((c) => c.id === categoryId);
  if (!targetCategory) return false;
  return targetCategory.communities.some(
    (c, idx) => idx !== communityIndex && c.name.toLowerCase() === communityName.toLowerCase() && c.name.length > 0
  );
};

/* ───────── Animated Counter ───────── */

const AnimatedCounter = ({ value, label }: { value: number; label: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [hasAnimated]);

  useEffect(() => {
    if (!hasAnimated) return;
    const duration = 600;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value, hasAnimated]);

  return (
    <div ref={ref} className="min-h-24 rounded-3xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/15 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200/18 hover:bg-white/[0.075]">
      <p className="text-lg font-semibold text-white sm:text-xl">
        {hasAnimated ? displayValue : 0}
      </p>
      <p className="mt-1 text-xs text-white/42">{label}</p>
    </div>
  );
};

/* ───────── Community Health Impact Panel ───────── */

const CommunityHealthPanel = ({ analytics }: { categories: RouteCategory[]; analytics: RouterAnalytics }) => {
  const hasImpact = analytics.preventedMisroutes && analytics.preventedMisroutes > 0;

  return (
    <div className="mt-6 grid max-w-xl gap-3 rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-2xl shadow-black/15 sm:grid-cols-2">
      <div>
        <p className="text-xs font-semibold text-white/46">
          Without CommunityRouter
        </p>
        <div className="mt-3 space-y-2 text-sm leading-6 text-white/58">
          <p>repetitive onboarding questions</p>
          <p>off-topic posts</p>
          <p>overwhelmed moderators</p>
          <p>low quality onboarding</p>
        </div>
      </div>
      <div className="rounded-2xl border border-orange-200/14 bg-orange-300/[0.06] p-3">
        <p className="text-xs font-semibold text-orange-100/80">
          With CommunityRouter
        </p>
        <div className="mt-3 space-y-2 text-sm leading-6 text-white/70">
          <p>guided onboarding</p>
          <p>cleaner posting intent</p>
          <p>fewer repetitive threads</p>
          <p>faster community discovery</p>
        </div>
        {hasImpact && (
          <div className="mt-4 animate-[fadeIn_400ms_ease-out] rounded-xl border border-orange-200/18 bg-orange-300/12 p-2.5 text-center">
            <span className="text-sm font-semibold text-orange-100">
              {analytics.preventedMisroutes} misroutes prevented
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const ThemeToggle = ({
  theme,
  onToggle,
}: {
  theme: Theme;
  onToggle: () => void;
}) => (              <button
                aria-label="Toggle color theme"
                className={`rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/64 shadow-2xl shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200/24 hover:text-white active:translate-y-0 ${focusRing}`}
                onClick={onToggle}
                type="button"
              >
                {theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            );

const ModeratorToggle = ({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) => (
  <button
    aria-label={enabled ? 'Disable moderator mode' : 'Enable moderator mode'}
    className={`rounded-full border px-3 py-1.5 text-xs font-medium shadow-2xl shadow-black/20 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 ${focusRing} ${
      enabled
        ? 'border-orange-200/28 bg-orange-300/10 text-orange-100 hover:bg-orange-300/18'
        : 'border-white/10 bg-white/5 text-white/46 hover:text-white/80'
    }`}
    onClick={onToggle}
    type="button"
  >
    {enabled ? 'Moderator' : 'Moderator'}
  </button>
);

const SaveStatus = ({ state }: { state: SaveState }) => {
  const label =
    state === 'saving'
      ? 'Saving...'
      : state === 'saved'
        ? 'Synced'
        : state === 'error'
          ? 'Unsaved'
          : 'Ready';

  return (
    <span
      className={[
        'rounded-full border px-2.5 py-1 text-xs font-medium',
        state === 'error'
          ? 'border-red-300/24 bg-red-400/8 text-red-100/82'
          : 'border-white/10 bg-white/[0.055] text-white/52',
      ].join(' ')}
    >
      {label}
    </span>
  );
};

const getCategoryTemplate = (
  title: string,
  existingCount: number,
  existingCategories: RouteCategory[]
): RouteCategory => {
  const template = defaultCategories.find((category) => category.title === title);

  if (template) {
    return {
      ...template,
      id: `${template.id}-${Date.now()}`,
      title: dedupeTitle(template.title, existingCategories),
      expanded: false,
      enabled: true,
    };
  }

  return {
    id: `custom-route-${Date.now()}`,
    title: dedupeTitle(`Custom Route ${existingCount + 1}`, existingCategories),
    description: '',
    marker: 'CR',
    accent: 'from-orange-300/28 via-amber-300/10 to-transparent',
    expanded: false,
    enabled: true,
    communities: [
      {
        name: '',
        fit: '',
        note: '',
      },
    ],
    tips: [''],
    warning: '',
    path: 'Intent > Moderator review > Posting rules',
  };
};

/* ───────── Loading Skeleton (enhanced) ───────── */

const LoadingSkeleton = () => (
  <div className="animate-[fadeIn_180ms_ease-out]" role="status">
    <div className="mb-4 flex items-center gap-2 rounded-2xl border border-orange-200/14 bg-orange-300/8 px-3 py-2">
      <span className="h-2 w-2 animate-[pulseGlow_1400ms_ease-in-out_infinite] rounded-full bg-orange-200" />
      <span className="text-xs font-medium text-orange-100/80">
        Analyzing best communities...
      </span>
    </div>
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div
          className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.045] p-4"
          key={item}
        >
          <div className="relative h-4 w-1/3 overflow-hidden rounded-full bg-white/[0.07]">
            <div className="absolute inset-y-0 w-1/2 animate-[shimmer_900ms_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
          <div className="relative mt-4 h-3 w-4/5 overflow-hidden rounded-full bg-white/[0.055]">
            <div className="absolute inset-y-0 w-1/2 animate-[shimmer_900ms_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-orange-100/20 to-transparent" />
          </div>
          <div className="relative mt-2 h-3 w-3/5 overflow-hidden rounded-full bg-white/[0.045]">
            <div className="absolute inset-y-0 w-1/2 animate-[shimmer_900ms_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>
        </div>
      ))}
    </div>
    <span className="sr-only">Analyzing onboarding fit and preparing recommendations</span>
  </div>
);

/* ───────── Empty Onboarding State (enhanced) ───────── */

const EmptyOnboardingState = () => (
  <div className="grid min-h-80 place-items-center rounded-3xl border border-dashed border-white/12 bg-white/[0.035] p-6 text-center">
    <div className="max-w-sm">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-orange-200/20 bg-orange-300/10 text-sm font-semibold text-orange-100 shadow-[0_0_36px_rgba(251,146,60,0.12)]">
        CR
      </div>
      <h3 className="mt-5 text-xl font-semibold text-white">
        Build your first onboarding path
      </h3>
      <p className="mt-3 text-sm leading-6 text-white/56">
        Guide new members into the right communities before they post.
        Create onboarding categories with subreddit recommendations and
        posting guidance.
      </p>
      <div className="mt-5 space-y-2 text-left">
        {[
          'Create an onboarding category',
          'Add subreddit destinations',
          'Add posting guidance and tips',
          'Enable the route for users',
        ].map((step, index) => (
          <div className="flex items-center gap-2.5 text-sm text-white/62" key={step}>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.06] text-xs font-medium text-white/52">
              {index + 1}
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs leading-5 text-orange-100/72">
        Get started by creating your first onboarding route above.
      </p>
    </div>
  </div>
);

/* ───────── Recommendation View (enhanced with badges, requires, avoid-if, match score) ───────── */

const RecommendationView = ({
  category,
  onBack,
  onOpenCommunity,
}: {
  category: RouteCategory;
  onBack: () => void;
  onOpenCommunity: (community: Community) => void;
}) => {
  const routableCommunities = category.communities.filter(isRoutableCommunity);
  const visibleTips = category.tips.filter((tip) => tip.trim().length > 0);

  return (
    <div className="animate-[fadeIn_280ms_cubic-bezier(0.22,1,0.36,1)]">
    <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
      <div>
        <p className="text-xs font-medium text-orange-200">Recommended route</p>
        <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
          {category.title}
        </h2>
      </div>
      <button
        className={`rounded-full border border-white/10 bg-white/[0.055] px-3.5 py-2 text-xs font-medium text-white/68 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-orange-200/30 hover:bg-white/[0.085] hover:text-white active:translate-y-0 ${focusRing}`}
        onClick={onBack}
        type="button"
      >
        Back
      </button>
    </div>

    <div className="mt-4 space-y-3">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-white/36">
        Recommended communities
      </p>
      {routableCommunities.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.035] p-5 text-sm leading-6 text-white/58">
          No subreddit routes configured for this onboarding category yet.
          Moderators can add destinations in the routing dashboard.
        </div>
      ) : (
        routableCommunities.map((community, index) => {
          const matchScore = computeMatchScore(community);
          const strictness = community.strictness
            ? strictnessConfig[community.strictness]
            : null;
          const visibleRequires = (community.requires ?? []).filter(
            (r) => r.trim().length > 0
          );
          const visibleAvoidIf = (community.avoidIf ?? []).filter(
            (a) => a.trim().length > 0
          );
          const visibleBadges = (community.badges ?? []).filter(
            (b) => b.trim().length > 0
          );

          return (
          <div
            className="animate-[fadeInUp_300ms_ease-out] rounded-3xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/18 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-orange-200/22 hover:bg-white/[0.08] hover:shadow-[0_18px_50px_rgba(0,0,0,0.32)]"
            key={community.name}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white">{community.name}</p>
                  {strictness && (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${strictness.color}`}>
                      {strictness.label}
                    </span>
                  )}
                  <span className="rounded-full bg-orange-200/12 px-2 py-0.5 text-[10px] font-medium text-orange-100">
                    {matchScore}% fit
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/62">{community.fit}</p>
              </div>
              <button
                className={`shrink-0 rounded-full bg-orange-200 px-3 py-1.5 text-xs font-semibold text-[#150c05] shadow-[0_8px_24px_rgba(251,146,60,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-100 active:translate-y-0 ${focusRing}`}
                onClick={() => onOpenCommunity(community)}
                type="button"
              >
                Open Community
              </button>
            </div>

            {/* Badges */}
            {visibleBadges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {visibleBadges.map((badge) => (
                  <span
                    className={`animate-[badgePop_350ms_ease-out] rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeColors[badge] ?? 'bg-white/[0.06] text-white/60 border-white/10'}`}
                    key={badge}
                    style={{ animationDelay: `${index * 60 + 100}ms` }}
                  >
                    {badgeLabels[badge] ?? badge}
                  </span>
                ))}
              </div>
            )}

            {/* Requires & Avoid If */}
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {visibleRequires.length > 0 && (
                <div className="rounded-2xl border border-emerald-400/12 bg-emerald-400/6 p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-300/80">
                    Requires
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {visibleRequires.map((req) => (
                      <p className="flex items-center gap-1.5 text-xs text-white/72" key={req}>
                        <svg className="h-3 w-3 shrink-0 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {req}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {visibleAvoidIf.length > 0 && (
                <div className="rounded-2xl border border-rose-400/12 bg-rose-400/6 p-2.5">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-rose-300/80">
                    Avoid if
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {visibleAvoidIf.map((avoid) => (
                      <p className="flex items-center gap-1.5 text-xs text-white/72" key={avoid}>
                        <svg className="h-3 w-3 shrink-0 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        {avoid}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Note */}
            <p className="mt-3 text-xs leading-5 text-white/42">
              {community.note.trim() || 'No routing note configured.'}
            </p>
          </div>
          );
        })
      )}
    </div>

    {/* Posting Tips & Warning */}
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-black/18 p-4 shadow-inner shadow-black/10">
        <p className="text-xs font-medium text-white/42">Posting tips</p>
        <div className="mt-3 space-y-2">
          {visibleTips.length === 0 ? (
            <p className="text-sm text-white/52">No posting guidance added.</p>
          ) : (
            visibleTips.map((tip, index) => (
            <p className="flex gap-2 text-sm text-white/70" key={`${tip}-${index}`}>
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-200/70" />
              <span>{tip}</span>
            </p>
            ))
          )}
        </div>
      </div>
      <div className="rounded-3xl border border-orange-200/16 bg-orange-300/[0.075] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
        <p className="text-xs font-medium text-orange-100/70">
          Community warning
        </p>
        <p className="mt-3 text-sm leading-6 text-white/72">
          {category.warning.trim() || 'No moderation warning configured.'}
        </p>
      </div>
    </div>

    <div className="mt-4 rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-inner shadow-black/10">
      <p className="text-xs font-medium text-white/42">Recommended path</p>
      <p className="mt-2 text-sm font-medium text-white/76">
        {category.description.trim() || 'No onboarding note configured.'}
      </p>
    </div>
    </div>
  );
};

/* ───────── Onboarding Panel ───────── */

const OnboardingPanel = ({
  categories,
  isViewingAllRoutes,
  selectedCategory,
  isRouting,
  loadError,
  onBack,
  onOpenCommunity,
  onSelect,
  onToggleViewAllRoutes,
}: {
  categories: RouteCategory[];
  isViewingAllRoutes: boolean;
  selectedCategory: RouteCategory | null;
  isRouting: boolean;
  loadError: string | null;
  onBack: () => void;
  onOpenCommunity: (community: Community) => void;
  onSelect: (category: RouteCategory) => void;
  onToggleViewAllRoutes: () => void;
}) => {
  /* Keyboard shortcut: ESC to go back from recommendation view */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCategory) {
        onBack();
      }
    },
    [selectedCategory, onBack]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="relative rounded-[1.75rem] border border-white/12 bg-gradient-to-b from-white/[0.12] to-white/[0.045] p-2.5 shadow-[0_20px_70px_rgba(0,0,0,0.35)] sm:rounded-[2rem] sm:p-3">
      <div className="pointer-events-none absolute -inset-px rounded-[inherit] bg-gradient-to-br from-orange-200/18 via-white/5 to-transparent opacity-70" />
      <div className="relative min-h-[280px] rounded-[1.35rem] border border-white/10 bg-[var(--bg-secondary)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:rounded-[1.5rem] sm:p-5">
        {isRouting && (
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full w-2/3 animate-[shimmer_760ms_ease-in-out_infinite] rounded-full bg-gradient-to-r from-transparent via-orange-200/70 to-transparent" />
          </div>
        )}

        {isRouting ? (
          <LoadingSkeleton />
        ) : selectedCategory ? (
          <RecommendationView
            category={selectedCategory}
            onBack={onBack}
            onOpenCommunity={onOpenCommunity}
          />
        ) : (
          <div className="animate-[fadeIn_280ms_cubic-bezier(0.22,1,0.36,1)]">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-medium text-orange-200">
                  Onboarding intelligence
                </p>
                <h2 className="mt-1 text-xl font-semibold text-white">
                  What are you looking for?
                </h2>
              </div>
              <div className="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-xs text-white/50">
                Live preview
              </div>
            </div>
            {loadError && (
              <div className="mt-4 rounded-2xl border border-red-300/18 bg-red-400/8 p-3 text-sm leading-6 text-red-100/80">
                {loadError}
              </div>
            )}

            {categories.length === 0 ? (
              <div className="mt-4">
                <EmptyOnboardingState />
              </div>
            ) : (
              <>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-white/42">
                    {Math.min(categories.length, isViewingAllRoutes ? categories.length : 4)} of{' '}
                    {categories.length} route{categories.length === 1 ? '' : 's'}
                  </p>
                  {categories.length > 4 && (
                    <button
                      className={`rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-medium text-white/62 transition-all duration-300 hover:border-orange-200/24 hover:text-white ${focusRing}`}
                      onClick={onToggleViewAllRoutes}
                      type="button"
                    >
                      {isViewingAllRoutes
                        ? 'Show primary paths'
                        : `View all onboarding paths (+${categories.length - 4})`}
                    </button>
                  )}
                </div>
                <div
                  className={[
                    'mt-3 grid gap-3 sm:grid-cols-2',
                    isViewingAllRoutes
                      ? ''
                      : '',
                  ].join(' ')}
                >
                {(isViewingAllRoutes ? categories : categories.slice(0, 4)).map((category, index) => {
                  const isPrimary = index === 0;

                  return (
                    <button
                      aria-label={`Open ${category.title} recommendations`}
                      className={[
                        'group relative min-h-40 overflow-hidden rounded-3xl border p-4 text-left transition-all duration-300 ease-out will-change-transform',
                        focusRing,
                        category.enabled
                          ? 'hover:-translate-y-1 hover:scale-[1.015] hover:border-orange-200/38 hover:shadow-[0_22px_65px_rgba(0,0,0,0.42)] active:translate-y-0 active:scale-[0.995]'
                          : 'opacity-45',
                        isPrimary
                          ? 'border-orange-200/34 bg-white/[0.12] shadow-[0_20px_70px_rgba(251,146,60,0.16)] animate-[routePulse_3s_ease-in-out_infinite]'
                          : 'border-white/10 bg-white/[0.045]',
                      ].join(' ')}
                      disabled={!category.enabled}
                      key={category.id}
                      onClick={() => onSelect(category)}
                      style={{ animationDelay: `${index * 40}ms` }}
                      type="button"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${category.accent} opacity-80 transition-opacity duration-300 group-hover:opacity-100`}
                      />
                      <div className="absolute inset-0 opacity-0 ring-1 ring-orange-200/20 transition-opacity duration-300 group-hover:opacity-100" />
                      <div className="relative flex h-full min-h-32 flex-col justify-between gap-5">
                        <div className="flex items-center justify-between gap-3">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-white/12 bg-black/18 text-xs font-semibold text-white/76 shadow-inner shadow-black/20">
                            {category.marker}
                          </span>
                          <span
                            className={[
                              'h-2.5 w-2.5 shrink-0 rounded-full transition-all duration-300',
                              isPrimary
                                ? 'bg-orange-200 shadow-[0_0_20px_rgba(251,191,36,0.75)]'
                                : 'bg-white/18 group-hover:bg-orange-100 group-hover:shadow-[0_0_16px_rgba(254,215,170,0.45)]',
                            ].join(' ')}
                          />
                        </div>
                        <div>
                          <h3 className="text-[1.05rem] font-semibold leading-6 text-white">
                            {category.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-white/56">
                            {category.description.trim() || 'No onboarding note configured.'}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ───────── Live Preview (enhanced) ───────── */

const LivePreview = ({ categories }: { categories: RouteCategory[] }) => {
  const enabled = categories.filter((category) => category.enabled);
  const firstCategory = enabled[0];

  const primaryCommunity = firstCategory?.communities.find(isRoutableCommunity);
  const primaryBadges = primaryCommunity?.badges ?? [];

  return (
    <div className="animate-[fadeIn_240ms_ease-out] rounded-3xl border border-white/10 bg-black/18 p-4 shadow-inner shadow-black/10">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-orange-200">Live Preview</p>
          <p className="mt-1 text-sm font-semibold text-white">
            User onboarding simulation
          </p>
        </div>
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs text-white/46">
          Pre-post
        </span>
      </div>
      {firstCategory ? (
        <div className="mt-4 rounded-3xl border border-orange-200/18 bg-gradient-to-br from-orange-300/14 to-white/[0.045] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-orange-200/12 px-2 py-0.5 text-[10px] font-medium text-orange-100">
              Selected intent
            </span>
            <span className="text-xs text-white/42">→</span>
            <span className="text-xs font-medium text-white/62">
              {firstCategory.title}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-white/58">
            {firstCategory.description}
          </p>

          {primaryBadges.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {primaryBadges.map((badge) => (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${badgeColors[badge] ?? 'bg-white/[0.06] text-white/60 border-white/10'}`}
                  key={badge}
                >
                  {badgeLabels[badge] ?? badge}
                </span>
              ))}
            </div>
          )}

          {primaryCommunity && (
            <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.04] p-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">
                  {primaryCommunity.name}
                </p>
                <span className="text-[10px] text-white/48">
                  {computeMatchScore(primaryCommunity)}% match
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-white/52">
                {primaryCommunity.fit}
              </p>
            </div>
          )}

          <p className="mt-4 text-xs font-medium text-orange-100/80">
            {enabled.length} enabled route{enabled.length === 1 ? '' : 's'} •{' '}
            {categories.reduce((s, c) => s + c.communities.filter(isRoutableCommunity).length, 0)} destinations
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-3xl border border-dashed border-white/12 bg-white/[0.035] p-4 text-sm leading-6 text-white/52">
          Preview will appear after moderators create an enabled route.
        </div>
      )}
    </div>
  );
};

/* ───────── Analytics Panel (enhanced) ───────── */

const AnalyticsPanel = ({ analytics }: { analytics: RouterAnalytics }) => {
  const hasAnalytics =
    analytics.totalCategoryClicks > 0 || analytics.totalDestinationClicks > 0;
  const categoryPercentages = Object.entries(analytics.categoryClicks)
    .filter(([, count]) => count > 0)
    .sort(([, firstCount], [, secondCount]) => secondCount - firstCount)
    .slice(0, 4)
    .map(([label, count]) => [
      label,
      Math.round((count / Math.max(analytics.totalCategoryClicks, 1)) * 100),
    ] as const);

  if (!hasAnalytics) {
    return (
      <div className="rounded-3xl border border-dashed border-white/12 bg-white/[0.035] p-5 shadow-2xl shadow-black/15">
        <p className="text-sm font-semibold text-white">
          No routing activity yet.
        </p>
        <p className="mt-2 text-sm leading-6 text-white/54">
          Analytics will appear after users select onboarding intents and open
          recommended communities.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3">
        <AnimatedCounter label="users routed" value={analytics.totalCategoryClicks} />
        <AnimatedCounter label="communities opened" value={analytics.totalDestinationClicks} />
        <AnimatedCounter label="misroutes prevented" value={analytics.preventedMisroutes ?? 0} />
        <AnimatedCounter label="repetitive questions reduced" value={analytics.reducedRepetitiveQuestions ?? 0} />
      </div>

      {/* Moderation efficiency gain */}
      {(analytics.moderationEfficiencyGain ?? 0) > 0 && (
        <div className="animate-[fadeIn_300ms_ease-out] rounded-3xl border border-orange-200/16 bg-orange-300/[0.075] p-4 text-center">
          <p className="text-xs font-medium text-orange-100/70">
            Moderation efficiency gain
          </p>
          <p className="mt-1 text-2xl font-semibold text-orange-100">
            {analytics.moderationEfficiencyGain}%
          </p>
          <p className="mt-2 text-xs leading-5 text-white/52">
            Users reached the correct subreddit before posting.
          </p>
        </div>
      )}

      {/* Category usage */}
      {categoryPercentages.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
          <p className="text-xs font-medium text-white/42">
            Category usage percentages
          </p>
          <div className="mt-3 space-y-2">
            {categoryPercentages.map(([label, percentage]) => (
              <div className="grid grid-cols-[1fr_auto] gap-3" key={label}>
                <div className="overflow-hidden rounded-full bg-white/[0.055]">
                  <div
                    className="h-2 rounded-full bg-orange-200 transition-all duration-700"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs text-white/56">
                  {label} {percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top routes */}
      <div className="grid grid-cols-2 gap-3">
        {[
          [getTopAnalyticsLabel(analytics.categoryClicks), 'most selected path'],
          [getTopAnalyticsLabel(analytics.destinationClicks), 'top destination'],
        ].map(([value, label]) => (
          <div
            className="min-h-20 rounded-3xl border border-white/10 bg-white/[0.045] p-3"
            key={label}
          >
            <p className="text-xs font-semibold text-white">{value}</p>
            <p className="mt-1 text-[10px] text-white/42">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent activity */}
      {analytics.recentActivity.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
          <p className="text-xs font-medium text-white/42">
            Recent onboarding activity
          </p>
          <div className="mt-3 space-y-2">
            {analytics.recentActivity.map((item, index) => (
              <p className="text-sm text-white/64" key={`${item}-${index}`}>
                {item}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ───────── Moderator Panel ───────── */

const ModeratorPanel = ({
  analytics,
  categories,
  onAddCommunity,
  onAddCategory,
  onDeleteCategory,
  onDeleteCommunity,
  onMoveCategory,
  onToggleCategory,
  onToggleExpanded,
  onUpdateCategory,
  onUpdateCommunity,
  saveState,
  savingStatus,
  pendingDeleteId,
}: {
  analytics: RouterAnalytics;
  categories: RouteCategory[];
  onAddCommunity: (categoryId: string) => void;
  onAddCategory: () => void;
  onDeleteCategory: (categoryId: string) => void;
  onDeleteCommunity: (categoryId: string, communityIndex: number) => void;
  onMoveCategory: (categoryId: string, direction: 'up' | 'down') => void;
  onToggleCategory: (categoryId: string) => void;
  onToggleExpanded: (categoryId: string) => void;
  onUpdateCategory: (
    categoryId: string,
    updates: Partial<Pick<RouteCategory, 'title' | 'description' | 'warning'>>
  ) => void;
  onUpdateCommunity: (
    categoryId: string,
    communityIndex: number,
    updates: Partial<Community>
  ) => void;
  saveState: SaveState;
  savingStatus: string;
  pendingDeleteId: string | null;
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<boolean | null>(null);

  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      category.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterEnabled === null || category.enabled === filterEnabled;
    return matchesSearch && matchesFilter;
  });

  const totalRoutes = categories.reduce(
    (sum, cat) => sum + cat.communities.filter(isRoutableCommunity).length,
    0
  );

  const expandedCategory = categories.find((c) => c.expanded);
  const hasVisibleRoutes = totalRoutes > 0;

  /* Keyboard shortcut: ESC closes expanded category */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && expandedCategory) {
        onToggleExpanded(expandedCategory.id);
      }
    },
    [expandedCategory, onToggleExpanded]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <section className="relative mx-auto w-full max-w-6xl px-5 pb-10 sm:px-8 lg:px-0">
      <div className="pointer-events-none absolute -top-16 right-0 -z-10 h-52 w-52 rounded-full bg-orange-300/10 blur-3xl" />
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-orange-200/70">
            Moderator tooling
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Pre-post routing dashboard
          </h2>
          <div className="mt-2 flex items-center gap-2">
            <SaveStatus state={saveState} />
            <p className="text-xs text-white/42">{savingStatus}</p>
          </div>
        </div>
        <button
          className={`rounded-2xl bg-orange-200 px-4 py-2.5 text-sm font-semibold text-[#140c05] shadow-[0_16px_45px_rgba(251,146,60,0.2)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-orange-100 hover:shadow-[0_20px_55px_rgba(251,146,60,0.26)] active:translate-y-0 sm:min-w-44 ${focusRing}`}
          onClick={onAddCategory}
          type="button"
        >
          {categories.length === 0 ? 'Create First Category' : 'Add Category'}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.055] p-3 shadow-2xl shadow-black/25 backdrop-blur sm:rounded-[2rem] sm:p-4">
          {categories.length === 0 ? (
            <div className="grid min-h-80 animate-[fadeIn_260ms_ease-out] place-items-center rounded-3xl border border-dashed border-white/12 bg-black/18 p-6 text-center">
              <div className="max-w-sm">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-orange-200/20 bg-orange-300/10 text-sm font-semibold text-orange-100">
                  CR
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white">
                  No onboarding routes configured yet.
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/56">
                  Moderators can create onboarding paths to guide new members
                  before they post. Each route can contain subreddit
                  recommendations, posting tips, and moderation warnings.
                </p>
                <button
                  className={`mt-5 rounded-2xl bg-orange-200 px-4 py-2.5 text-sm font-semibold text-[#140c05] shadow-[0_14px_40px_rgba(251,146,60,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-100 active:translate-y-0 ${focusRing}`}
                  onClick={onAddCategory}
                  type="button"
                >
                  Create First Category
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 min-w-0">
                  <input
                    className={`w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-2.5 text-sm text-white/78 outline-none transition duration-300 placeholder:text-white/28 hover:border-orange-200/20 ${focusRing}`}
                    onChange={(e) => setSearchQuery(e.currentTarget.value)}
                    placeholder="Search categories..."
                    type="text"
                    value={searchQuery}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                      filterEnabled === null
                        ? 'bg-white/[0.06] text-white/52 border border-white/10'
                        : 'border border-white/10 bg-white/[0.045] text-white/62 hover:border-orange-200/24 hover:text-white'
                    } ${focusRing}`}
                    onClick={() => setFilterEnabled(null)}
                    type="button"
                  >
                    All
                  </button>
                  <button
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                      filterEnabled === true
                        ? 'bg-orange-200/12 text-orange-100 border border-orange-200/28'
                        : 'border border-white/10 bg-white/[0.045] text-white/62 hover:border-orange-200/24 hover:text-white'
                    } ${focusRing}`}
                    onClick={() => setFilterEnabled(true)}
                    type="button"
                  >
                    Enabled
                  </button>
                  <button
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                      filterEnabled === false
                        ? 'bg-white/[0.06] text-white/50 border border-white/12'
                        : 'border border-white/10 bg-white/[0.045] text-white/62 hover:border-orange-200/24 hover:text-white'
                    } ${focusRing}`}
                    onClick={() => setFilterEnabled(false)}
                    type="button"
                  >
                    Disabled
                  </button>
                </div>
              </div>

              {filteredCategories.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/48">
                  <span>
                    {filteredCategories.length} of {categories.length} routes shown
                  </span>
                  {hasVisibleRoutes && (
                    <span>
                      • {totalRoutes} subreddit destinations
                    </span>
                  )}
                  {expandedCategory && (
                    <span className="text-orange-100">
                      • Editing: {expandedCategory.title}
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {filteredCategories.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/12 bg-black/18 p-6 text-center">
                    <p className="text-sm text-white/52">
                      {searchQuery
                        ? 'No categories match your search.'
                        : 'No categories match your filters.'}
                    </p>
                  </div>
                ) : (
                  filteredCategories.map((category) => {
                    const originalIndex = categories.findIndex(
                      (c) => c.id === category.id
                    );
                    const routeCount = category.communities.filter(
                      isRoutableCommunity
                    ).length;
                    const isPrimary = originalIndex < 4;

                    return (
                      <div
                        key={category.id}
                        className="animate-[fadeIn_220ms_ease-out]"
                      >
                        <button
                          aria-expanded={category.expanded}
                          className="w-full"
                          onClick={() => onToggleExpanded(category.id)}
                          type="button"
                        >
                          <div
                            className={`flex items-center justify-between gap-3 rounded-3xl border transition-all duration-300 p-3.5 sm:p-4 ${
                              category.expanded
                                ? 'border-orange-200/28 bg-black/28 shadow-[0_12px_40px_rgba(0,0,0,0.35)]'
                                : 'border-white/10 bg-black/18 hover:border-white/18 hover:bg-black/22 hover:-translate-y-0.5'
                            }`}
                          >
                            <div className="flex flex-1 items-center gap-3 min-w-0">
                              <svg
                                className={`h-5 w-5 shrink-0 text-white/64 transition-transform duration-300 ${
                                  category.expanded ? 'rotate-90' : ''
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  d="M9 5l7 7-7 7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                />
                              </svg>
                              <div className="min-w-0 flex-1 text-left">
                                <p className="text-sm font-semibold text-white truncate">
                                  {category.title.trim() || 'Untitled route'}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-2.5">
                                  <span
                                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                                      category.enabled
                                        ? 'bg-orange-200/12 text-orange-100'
                                        : 'bg-white/[0.06] text-white/52'
                                    }`}
                                  >
                                    {category.enabled
                                      ? 'Enabled'
                                      : 'Disabled'}
                                  </span>
                                  <span className="text-xs text-white/48">
                                    {routeCount} route
                                    {routeCount !== 1 ? 's' : ''}
                                  </span>
                                  <span className="text-xs text-white/48">
                                    {isPrimary ? '★ Primary' : 'Secondary'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                              <button
                                className={`rounded-full border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/52 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200/24 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 ${focusRing}`}
                                disabled={originalIndex === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMoveCategory(category.id, 'up');
                                }}
                                type="button"
                              >
                                ↑
                              </button>
                              <button
                                className={`rounded-full border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/52 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200/24 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 ${focusRing}`}
                                disabled={originalIndex === categories.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMoveCategory(category.id, 'down');
                                }}
                                type="button"
                              >
                                ↓
                              </button>
                              <button
                                className={[
                                  `rounded-full px-2.5 py-1.5 text-xs font-semibold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 ${focusRing}`,
                                  category.enabled
                                    ? 'bg-orange-200 text-[#140c05] shadow-[0_8px_24px_rgba(251,146,60,0.16)]'
                                    : 'bg-white/[0.06] text-white/46 hover:text-white/70 border border-white/10',
                                ].join(' ')}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleCategory(category.id);
                                }}
                                type="button"
                              >
                                {category.enabled ? 'On' : 'Off'}
                              </button>
                              <button
                                className={`rounded-full border border-white/10 px-2.5 py-1.5 text-xs font-medium text-white/52 transition-all duration-300 hover:-translate-y-0.5 hover:border-red-300/30 hover:text-red-100 active:translate-y-0 ${focusRing}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteCategory(category.id);
                                }}
                                type="button"
                              >
                                {pendingDeleteId === category.id ? 'Confirm' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </button>

                        {category.expanded && (
                          <div className="animate-[slideDown_220ms_ease-out] mt-2 space-y-3 rounded-3xl border border-white/8 bg-black/12 p-3.5 sm:p-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                              <label className="block sm:col-span-2">
                                <span className="text-xs font-medium text-white/42">
                                  Category name
                                </span>
                                <input
                                  className={`mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm leading-6 text-white/78 outline-none transition duration-300 placeholder:text-white/28 hover:border-orange-200/20 ${focusRing}`}
                                  onBlur={(event) =>
                                    onUpdateCategory(category.id, {
                                      title: dedupeEditedTitle(
                                        event.currentTarget.value,
                                        categories,
                                        category.id
                                      ),
                                    })
                                  }
                                  onChange={(event) =>
                                    onUpdateCategory(category.id, {
                                      title: event.currentTarget.value,
                                    })
                                  }
                                  value={category.title}
                                />
                              </label>
                              <label className="block">
                                <span className="text-xs font-medium text-white/42">
                                  Onboarding note
                                </span>
                                <textarea
                                  className={`mt-2 min-h-20 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm leading-6 text-white/78 outline-none transition duration-300 placeholder:text-white/28 hover:border-orange-200/20 ${focusRing}`}
                                  onChange={(event) =>
                                    onUpdateCategory(category.id, {
                                      description: event.currentTarget.value,
                                    })
                                  }
                                  placeholder="Explain the onboarding path for users."
                                  value={category.description}
                                />
                              </label>
                              <label className="block">
                                <span className="text-xs font-medium text-white/42">
                                  Moderation warning
                                </span>
                                <textarea
                                  className={`mt-2 min-h-20 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm leading-6 text-white/78 outline-none transition duration-300 placeholder:text-white/28 hover:border-orange-200/20 ${focusRing}`}
                                  onChange={(event) =>
                                    onUpdateCategory(category.id, {
                                      warning: event.currentTarget.value,
                                    })
                                  }
                                  placeholder="Warn moderators about common issues."
                                  value={category.warning}
                                />
                              </label>
                            </div>

                            <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                              <p className="text-xs font-medium text-white/56 mb-3">
                                Subreddit routes ({routeCount})
                              </p>
                              <div className="space-y-2">
                                {category.communities.length === 0 ? (
                                  <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.035] p-4 text-sm text-white/52">
                                    No subreddit routes configured.
                                  </div>
                                ) : (
                                  category.communities.map((community, cidx) => {
                                    const isDuplicate =
                                      community.name.length > 0 &&
                                      isDuplicateInCategory(
                                        categories,
                                        category.id,
                                        community.name,
                                        cidx
                                      );

                                    return (
                                      <div
                                        className={`group rounded-2xl border p-3 transition-colors duration-300 hover:border-orange-200/14 hover:bg-white/[0.06] ${
                                          isDuplicate
                                            ? 'border-rose-400/20 bg-rose-400/6'
                                            : 'border-white/8 bg-white/[0.04]'
                                        }`}
                                        key={`${category.id}-${cidx}`}
                                      >
                                        {isDuplicate && (
                                          <p className="mb-2 text-[10px] font-medium text-rose-300">
                                            ⚠ Duplicate subreddit route
                                          </p>
                                        )}
                                        <div className="grid gap-2 sm:grid-cols-[0.6fr_1fr_1.2fr_auto]">
                                          <div>
                                            <label className="block text-xs font-medium text-white/42 mb-1">
                                              Subreddit
                                            </label>
                                            <input
                                              className={`w-full rounded-lg border border-white/10 bg-black/18 px-2.5 py-2 text-sm text-white/82 outline-none transition duration-300 hover:border-orange-200/20 ${focusRing}`}
                                              onChange={(event) =>
                                                onUpdateCommunity(category.id, cidx, {
                                                  name: normalizeSubredditName(
                                                    event.currentTarget.value
                                                  ),
                                                })
                                              }
                                              placeholder="r/subreddit"
                                              value={community.name}
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-white/42 mb-1">
                                              Fit
                                            </label>
                                            <input
                                              className={`w-full rounded-lg border border-white/10 bg-black/18 px-2.5 py-2 text-sm text-white/82 outline-none transition duration-300 hover:border-orange-200/20 ${focusRing}`}
                                              onChange={(event) =>
                                                onUpdateCommunity(category.id, cidx, {
                                                  fit: event.currentTarget.value,
                                                })
                                              }
                                              placeholder="Best-fit explanation"
                                              value={community.fit}
                                            />
                                          </div>
                                          <div>
                                            <label className="block text-xs font-medium text-white/42 mb-1">
                                              Note
                                            </label>
                                            <input
                                              className={`w-full rounded-lg border border-white/10 bg-black/18 px-2.5 py-2 text-sm text-white/82 outline-none transition duration-300 hover:border-orange-200/20 ${focusRing}`}
                                              onChange={(event) =>
                                                onUpdateCommunity(category.id, cidx, {
                                                  note: event.currentTarget.value,
                                                })
                                              }
                                              placeholder="Routing note"
                                              value={community.note}
                                            />
                                          </div>
                                          <div className="flex items-end">
                                            <button
                                              className={`w-full rounded-lg border border-white/10 px-2.5 py-2 text-xs font-medium text-white/52 transition-all duration-300 hover:border-red-300/30 hover:text-red-100 ${focusRing}`}
                                              onClick={() =>
                                                onDeleteCommunity(category.id, cidx)
                                              }
                                              type="button"
                                            >
                                              Remove
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                                <button
                                  className={`w-full rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2.5 text-sm font-semibold text-white/62 transition-all duration-300 hover:border-orange-200/24 hover:text-white ${focusRing}`}
                                  onClick={() => onAddCommunity(category.id)}
                                  type="button"
                                >
                                  + Add subreddit route
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-8 lg:h-fit">
          <AnalyticsPanel analytics={analytics} />
          <LivePreview categories={categories} />
        </div>
      </div>
    </section>
  );
};

/* ───────── App ───────── */

export const App = () => {
  const [categories, setCategories] = useState(defaultCategories);
  const [analytics, setAnalytics] = useState(defaultAnalytics);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [savingStatus, setSavingStatus] = useState('Saved to Redis');
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = window.localStorage.getItem('communityrouter-theme');
    return savedTheme === 'light' || savedTheme === 'dark'
      ? savedTheme
      : 'dark';
  });
  const [isViewingAllRoutes, setIsViewingAllRoutes] = useState(false);
  const [moderatorMode, setModeratorMode] = useState<boolean>(() => {
    const saved = window.localStorage.getItem('communityrouter-mod');
    return saved === 'true' || false;
  });
  const routingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveVersionRef = useRef(0);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('communityrouter-theme', theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      if (routingTimeoutRef.current) {
        clearTimeout(routingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const loadOnboardingConfig = async () => {
      try {
        const data = await trpc.onboarding.get.query();
        setCategories(data.categories);
        setAnalytics(data.analytics);
        setLoadError(null);
      } catch {
        setLoadError(
          'Using bundled fallback routes. Redis config could not be loaded.'
        );
      } finally {
        setIsLoadingConfig(false);
      }
    };

    void loadOnboardingConfig();
  }, []);

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedRouteId) ?? null,
    [categories, selectedRouteId]
  );

  const enabledCategories = categories.filter((category) => category.enabled);

  const totalDestinations = useMemo(
    () =>
      categories.reduce(
        (sum, cat) => sum + cat.communities.filter(isRoutableCommunity).length,
        0
      ),
    [categories]
  );

  const persistCategories = (nextCategories: RouteCategory[]) => {
    saveVersionRef.current += 1;
    const saveVersion = saveVersionRef.current;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setSaveState('saving');
    setSavingStatus('Saving...');
    saveTimerRef.current = setTimeout(() => {
      void trpc.onboarding.saveCategories
        .mutate(nextCategories)
        .then(() => {
          if (saveVersion !== saveVersionRef.current) {
            return;
          }

          setSaveState('saved');
          setSavingStatus('Route saved');
          setLoadError(null);
        })
        .catch(() => {
          if (saveVersion !== saveVersionRef.current) {
            return;
          }

          setSaveState('error');
          setSavingStatus('Unsaved changes');
          setLoadError('Could not save moderator changes to Redis.');
        });
    }, 350);
  };

  const updateCategories = (
    getNextCategories: (currentCategories: RouteCategory[]) => RouteCategory[]
  ) => {
    setCategories((currentCategories) => {
      const nextCategories = getNextCategories(currentCategories);
      persistCategories(nextCategories);
      return nextCategories;
    });
  };

  const selectCategory = (category: RouteCategory) => {
    /* Cancel any previous routing timeout to avoid race conditions */
    if (routingTimeoutRef.current) {
      clearTimeout(routingTimeoutRef.current);
      routingTimeoutRef.current = null;
    }

    setIsRouting(true);

    void trpc.onboarding.trackCategoryClick
      .mutate({ categoryId: category.title.trim() || category.id })
      .then((updatedAnalytics) => {
        setAnalytics(updatedAnalytics);
      })
      .catch(() => {
        /* Analytics tracking is non-critical; continue with routing */
      });

    routingTimeoutRef.current = setTimeout(() => {
      setSelectedRouteId(category.id);
      setIsRouting(false);
      routingTimeoutRef.current = null;
    }, 380);
  };

  const openCommunity = (community: Community) => {
    if (!isRoutableCommunity(community)) {
      return;
    }

    void trpc.onboarding.trackDestinationClick
      .mutate({ destination: community.name })
      .then(setAnalytics);
    navigateTo(getSubredditUrl(community.name));
  };

  const addCategory = () => {
    updateCategories((currentCategories) => {
      const nextTitle =
        categoriesToCreate[currentCategories.length % categoriesToCreate.length] ??
        'Find Work';
      return [
        ...currentCategories,
        getCategoryTemplate(
          nextTitle,
          currentCategories.length,
          currentCategories
        ),
      ];
    });
  };

  const deleteCategory = (categoryId: string) => {
    if (pendingDeleteId !== categoryId) {
      setPendingDeleteId(categoryId);
      return;
    }

    updateCategories((currentCategories) =>
      currentCategories.filter((category) => category.id !== categoryId)
    );
    setPendingDeleteId(null);
    setSelectedRouteId((currentId) =>
      currentId === categoryId ? null : currentId
    );
  };

  const toggleCategory = (categoryId: string) => {
    updateCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === categoryId
          ? { ...category, enabled: !category.enabled }
          : category
      )
    );
    setSelectedRouteId((currentId) =>
      currentId === categoryId ? null : currentId
    );
  };

  const toggleExpanded = (categoryId: string) => {
    updateCategories((currentCategories) => {
      const targetCategory = currentCategories.find(
        (category) => category.id === categoryId
      );
      const shouldExpand = !targetCategory?.expanded;

      return currentCategories.map((category) =>
        category.id === categoryId
          ? { ...category, expanded: shouldExpand }
          : { ...category, expanded: false }
      );
    });
  };

  const updateCategory = (
    categoryId: string,
    updates: Partial<Pick<RouteCategory, 'title' | 'description' | 'warning'>>
  ) => {
    updateCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === categoryId ? { ...category, ...updates } : category
      )
    );
  };

  const addCommunity = (categoryId: string) => {
    updateCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              communities: [
                ...category.communities,
                { name: '', fit: '', note: '' },
              ].slice(0, 5),
            }
          : category
      )
    );
  };

  const deleteCommunity = (categoryId: string, communityIndex: number) => {
    updateCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              communities: category.communities.filter(
                (_community, index) => index !== communityIndex
              ),
            }
          : category
      )
    );
  };

  const updateCommunity = (
    categoryId: string,
    communityIndex: number,
    updates: Partial<Community>
  ) => {
    updateCategories((currentCategories) =>
      currentCategories.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              communities: category.communities.map((community, index) =>
                index === communityIndex
                  ? { ...community, ...updates }
                  : community
              ),
            }
          : category
      )
    );
  };

  const moveCategory = (categoryId: string, direction: 'up' | 'down') => {
    updateCategories((currentCategories) => {
      const currentIndex = currentCategories.findIndex(
        (category) => category.id === categoryId
      );
      const targetIndex =
        direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= currentCategories.length
      ) {
        return currentCategories;
      }

      const nextCategories = [...currentCategories];
      const currentCategory = nextCategories[currentIndex];
      const targetCategory = nextCategories[targetIndex];

      if (!currentCategory || !targetCategory) {
        return currentCategories;
      }

      nextCategories[currentIndex] = targetCategory;
      nextCategories[targetIndex] = currentCategory;
      return nextCategories;
    });
  };

  return (
    <main
      className="min-h-screen overflow-x-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-500"
      data-theme={theme}
    >
      {/* ── Hero section ── */}
      <section className="relative isolate flex min-h-screen flex-col px-5 py-5 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10" style={{background: 'radial-gradient(circle at 20% 10%,var(--hero-glow-1),transparent 28%),radial-gradient(circle at 80% 0%,var(--hero-glow-2),transparent 30%),linear-gradient(180deg,var(--hero-bg-1) 0%,var(--hero-bg-2) 54%,var(--hero-bg-3) 100%)'}} />
        <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-200/8 blur-3xl animate-[ambientFloat_6s_ease-in-out_infinite]" />
        <div className="absolute inset-x-6 top-5 -z-10 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-[#10131d] to-transparent" />

        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between animate-[fadeIn_260ms_ease-out]">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl border border-white/12 bg-white/8 shadow-[0_0_40px_rgba(251,146,60,0.18)]">
              <span className="text-sm font-semibold text-orange-100">CR</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                CommunityRouter
              </p>
              <p className="text-xs text-white/45">Pre-post routing infrastructure</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 shadow-2xl shadow-black/20 sm:block">
              Reducing onboarding chaos
            </div>
            <ModeratorToggle
              enabled={moderatorMode}
              onToggle={() =>
                setModeratorMode((currentMode) => {
                  const next = !currentMode;
                  window.localStorage.setItem(
                    'communityrouter-mod',
                    String(next)
                  );
                  return next;
                })
              }
            />
            <ThemeToggle
              onToggle={() =>
                setTheme((currentTheme) =>
                  currentTheme === 'dark' ? 'light' : 'dark'
                )
              }
              theme={theme}
            />
          </div>
        </nav>

        <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-7 py-7 sm:gap-8 sm:py-8 lg:grid-cols-[1.02fr_0.98fr] lg:py-10">
          <div className="max-w-2xl animate-[fadeIn_340ms_cubic-bezier(0.22,1,0.36,1)]">
            <div className="mb-5 inline-flex items-center rounded-full border border-orange-300/20 bg-orange-300/8 px-3 py-1 text-xs font-medium text-orange-100">
              Pre-post routing • Moderation infrastructure • Onboarding intelligence
            </div>
            <h1 className="max-w-2xl text-[2.35rem] leading-[1.06] font-semibold text-balance text-[var(--hero-headline)] sm:text-[2.85rem] lg:text-[3.2rem]">
              Help every new member find the right path before they post.
            </h1>
            <p className="mt-5 max-w-xl text-[0.98rem] leading-7 text-[var(--hero-subheadline)] sm:text-base">
              CommunityRouter reduces repetitive onboarding questions by guiding
              users into the right communities, rules, and posting flows before
              moderation problems begin.
            </p>

            {/* Routing stats */}
            {!isLoadingConfig && categories.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="rounded-xl border border-orange-200/14 bg-orange-300/8 px-3 py-2">
                  <span className="text-lg font-semibold text-orange-100">
                    {categories.length}
                  </span>
                  <span className="ml-1.5 text-xs text-white/52">
                    route{categories.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {totalDestinations > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2">
                    <span className="text-lg font-semibold text-white">
                      {totalDestinations}
                    </span>
                    <span className="ml-1.5 text-xs text-white/52">
                      destination{totalDestinations !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {analytics.totalCategoryClicks > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2">
                    <span className="text-lg font-semibold text-white">
                      {analytics.totalCategoryClicks}
                    </span>
                    <span className="ml-1.5 text-xs text-white/52">
                      user{analytics.totalCategoryClicks !== 1 ? 's' : ''} routed
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 grid max-w-xl grid-cols-3 gap-2.5 sm:gap-3">
              {['Intent', 'Readiness', 'Route'].map((item, index) => (
                <div
                  className="min-h-20 rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-2xl shadow-black/20 backdrop-blur transition-colors duration-300 hover:border-orange-200/18 hover:bg-white/[0.075]"
                  key={item}
                >
                  <p className="text-xs text-white/42">Step 0{index + 1}</p>
                  <p className="mt-1 text-sm font-medium text-white">{item}</p>
                </div>
              ))}
            </div>
            <CommunityHealthPanel categories={categories} analytics={analytics} />
          </div>

          <OnboardingPanel
            categories={enabledCategories}
            isRouting={isRouting || isLoadingConfig}
            isViewingAllRoutes={isViewingAllRoutes}
            loadError={loadError}
            onBack={() => setSelectedRouteId(null)}
            onOpenCommunity={openCommunity}
            onSelect={selectCategory}
            onToggleViewAllRoutes={() =>
              setIsViewingAllRoutes((currentValue) => !currentValue)
            }
            selectedCategory={isLoadingConfig ? null : selectedCategory}
          />
        </div>
      </section>

      {moderatorMode && (
        <ModeratorPanel
          analytics={analytics}
          categories={categories}
          onAddCommunity={addCommunity}
          onAddCategory={addCategory}
          onDeleteCategory={deleteCategory}
          onDeleteCommunity={deleteCommunity}
          onMoveCategory={moveCategory}
          onToggleCategory={toggleCategory}
          onToggleExpanded={toggleExpanded}
          onUpdateCategory={updateCategory}
          onUpdateCommunity={updateCommunity}
          pendingDeleteId={pendingDeleteId}
          saveState={saveState}
          savingStatus={isLoadingConfig ? 'Loading persisted routes...' : savingStatus}
        />
      )}
    </main>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
