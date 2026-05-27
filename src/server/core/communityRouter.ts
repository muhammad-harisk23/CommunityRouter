import { context, redis } from '@devvit/web/server';
import {
  analyticsSchema,
  defaultAnalytics,
  routeCategoriesSchema,
  type RouterAnalytics,
  type RouteCategory,
} from '../../shared/communityRouter';

const configKey = () =>
  `community-router:${context.subredditId ?? context.subredditName}:config`;

const categoryClicksKey = () =>
  `community-router:${context.subredditId ?? context.subredditName}:category-clicks`;

const destinationClicksKey = () =>
  `community-router:${context.subredditId ?? context.subredditName}:destination-clicks`;

const recentActivityKey = () =>
  `community-router:${context.subredditId ?? context.subredditName}:recent-activity`;

const parseCount = (value: string | undefined) => {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const sumCounts = (counts: Record<string, number>) =>
  Object.values(counts).reduce((total, count) => total + count, 0);

const normalizeRedisCounts = (counts: Record<string, string> | undefined) => {
  if (!counts) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(counts).map(([key, value]) => [key, parseCount(value)])
  );
};

const getRecentActivity = async () => {
  const rawActivity = await redis.get(recentActivityKey());

  if (!rawActivity) {
    return [];
  }

  try {
    const activity: unknown = JSON.parse(rawActivity);
    return Array.isArray(activity)
      ? activity.filter((item): item is string => typeof item === 'string').slice(0, 8)
      : [];
  } catch {
    return [];
  }
};

const pushRecentActivity = async (message: string) => {
  const activity = await getRecentActivity();
  await redis.set(
    recentActivityKey(),
    JSON.stringify([message, ...activity].slice(0, 8))
  );
};

export const getRouterCategories = async (): Promise<RouteCategory[]> => {
  const savedCategories = await redis.get(configKey());

  if (!savedCategories) {
    await redis.set(configKey(), JSON.stringify([]));
    return [];
  }

  let rawCategories: unknown;

  try {
    rawCategories = JSON.parse(savedCategories);
  } catch {
    await redis.set(configKey(), JSON.stringify([]));
    return [];
  }

  const parsedCategories = routeCategoriesSchema.safeParse(rawCategories);

  if (!parsedCategories.success) {
    await redis.set(configKey(), JSON.stringify([]));
    return [];
  }

  return parsedCategories.data;
};

export const saveRouterCategories = async (
  categories: RouteCategory[]
): Promise<RouteCategory[]> => {
  const parsedCategories = routeCategoriesSchema.parse(categories);
  await redis.set(configKey(), JSON.stringify(parsedCategories));
  return parsedCategories;
};

export const getRouterAnalytics = async (): Promise<RouterAnalytics> => {
  const [categoryClicks, destinationClicks, recentActivity] = await Promise.all([
    redis.hGetAll(categoryClicksKey()),
    redis.hGetAll(destinationClicksKey()),
    getRecentActivity(),
  ]);

  const normalizedCategoryClicks = normalizeRedisCounts(categoryClicks);
  const normalizedDestinationClicks = normalizeRedisCounts(destinationClicks);
  const totalCategories = sumCounts(normalizedCategoryClicks);
  const totalDestinations = sumCounts(normalizedDestinationClicks);

  /*
   * Compute derived moderator impact metrics
   *
   * preventedMisroutes: each category click represents a user who was guided
   * toward the correct community instead of posting in the wrong place.
   * Estimate ~40% of routed users would have otherwise posted incorrectly.
   *
   * reducedRepetitiveQuestions: each destination click means a user found the
   * right community without asking "where do I go?". Estimate ~25% of routed
   * users would have created a repetitive help post.
   *
   * moderationEfficiencyGain: combined impact score as a percentage.
   */
  const preventedMisroutes = Math.round(totalCategories * 0.4);
  const reducedRepetitiveQuestions = Math.round(totalCategories * 0.25);
  const totalImpact = preventedMisroutes + reducedRepetitiveQuestions;
  const moderationEfficiencyGain = totalCategories > 0
    ? Math.min(Math.round((totalImpact / Math.max(totalCategories, 1)) * 100), 100)
    : 0;

  const analytics = {
    categoryClicks: normalizedCategoryClicks,
    destinationClicks: normalizedDestinationClicks,
    recentActivity,
    totalCategoryClicks: totalCategories,
    totalDestinationClicks: totalDestinations,
    preventedMisroutes,
    reducedRepetitiveQuestions,
    moderationEfficiencyGain,
  };

  const parsedAnalytics = analyticsSchema.safeParse(analytics);
  return parsedAnalytics.success ? parsedAnalytics.data : defaultAnalytics;
};

export const trackCategoryClick = async (categoryId: string) => {
  await redis.hIncrBy(categoryClicksKey(), categoryId, 1);
  await pushRecentActivity(`Selected ${categoryId}`);
  return await getRouterAnalytics();
};

export const trackDestinationClick = async (destination: string) => {
  await redis.hIncrBy(destinationClicksKey(), destination, 1);
  await pushRecentActivity(`Opened ${destination}`);
  return await getRouterAnalytics();
};
