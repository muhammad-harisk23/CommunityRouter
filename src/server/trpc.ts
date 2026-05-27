import { initTRPC } from '@trpc/server';
import { transformer } from '../shared/transformer';
import { Context } from './context';

import {
  getRouterAnalytics,
  getRouterCategories,
  saveRouterCategories,
  trackCategoryClick,
  trackDestinationClick,
} from './core/communityRouter';
import { routeCategoriesSchema } from '../shared/communityRouter';
import { z } from 'zod';

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create({
  transformer,
});

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = t.router({
  onboarding: t.router({
    get: publicProcedure.query(async () => {
      const [categories, analytics] = await Promise.all([
        getRouterCategories(),
        getRouterAnalytics(),
      ]);

      return {
        analytics,
        categories,
      };
    }),
    saveCategories: publicProcedure
      .input(routeCategoriesSchema)
      .mutation(async ({ input }) => {
        return await saveRouterCategories(input);
      }),
    trackCategoryClick: publicProcedure
      .input(z.object({ categoryId: z.string().min(1).max(80) }))
      .mutation(async ({ input }) => {
        return await trackCategoryClick(input.categoryId);
      }),
    trackDestinationClick: publicProcedure
      .input(z.object({ destination: z.string().min(1).max(64) }))
      .mutation(async ({ input }) => {
        return await trackDestinationClick(input.destination);
      }),
    getAnalytics: publicProcedure.query(async () => {
      return await getRouterAnalytics();
    }),
  }),
});

export type AppRouter = typeof appRouter;
