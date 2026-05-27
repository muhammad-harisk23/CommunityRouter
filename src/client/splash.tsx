import './index.css';

import { navigateTo, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './ErrorBoundary';

type Theme = 'dark' | 'light';

const focusRing =
  'focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0f18] focus-visible:outline-none';

export const Splash = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = window.localStorage.getItem('communityrouter-theme');
    return savedTheme === 'light' || savedTheme === 'dark'
      ? savedTheme
      : 'dark';
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('communityrouter-theme', theme);
  }, [theme]);

  return (
    <main
      className="min-h-screen overflow-hidden text-white"
      data-theme={theme}
      style={{ background: 'var(--bg-primary)' }}
    >
      <section className="relative isolate flex min-h-screen items-center px-4 py-4">
        <div className="absolute inset-0 -z-10" style={{background: 'radial-gradient(circle at 18% 0%,var(--hero-glow-1),transparent 34%),radial-gradient(circle at 85% 12%,var(--hero-glow-2),transparent 32%),linear-gradient(180deg,var(--hero-bg-splash-1) 0%,var(--hero-bg-splash-2) 100%)'}} />
        <div className="pointer-events-none absolute left-1/2 top-12 -z-10 h-56 w-56 -translate-x-1/2 rounded-full bg-orange-200/10 blur-3xl" />

        <div className="mx-auto w-full max-w-xl animate-[fadeIn_300ms_cubic-bezier(0.22,1,0.36,1)] rounded-[1.75rem] border p-3 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:rounded-[2rem] sm:p-4"
          style={{background: 'var(--bg-panel)', borderColor: 'var(--border-primary)'}}
        >
          <div className="rounded-[1.35rem] border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:rounded-[1.5rem]"
            style={{background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)'}}
          >
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/12 bg-white/8">
                  <span className="text-sm font-semibold text-teal-100">
                    CR
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">
                    CommunityRouter
                  </p>
                  <p className="text-xs text-white/45">
                    Pre-post routing infrastructure
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className={`rounded-full px-2 py-1 text-xs font-medium text-white/45 transition-all duration-300 hover:bg-white/[0.055] hover:text-white ${focusRing}`}
                  onClick={() =>
                    navigateTo('https://developers.reddit.com/docs')
                  }
                  type="button"
                >
                  Docs
                </button>
                <button
                  aria-label="Toggle color theme"
                  className={`rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white/64 transition-all duration-300 hover:-translate-y-0.5 hover:border-orange-200/24 hover:text-white active:translate-y-0 ${focusRing}`}
                  onClick={() =>
                    setTheme((currentTheme) =>
                      currentTheme === 'dark' ? 'light' : 'dark'
                    )
                  }
                  type="button"
                >
                  {theme === 'dark' ? 'Dark' : 'Light'}
                </button>
              </div>
            </div>

            <div>
              <p className="mb-3 inline-flex rounded-full border border-teal-300/18 bg-teal-300/8 px-3 py-1 text-xs font-medium text-teal-100">
                Reducing onboarding chaos
              </p>
              <h1 className="text-[2rem] leading-tight font-semibold text-balance text-white sm:text-4xl">
                Find the right community before you post.
              </h1>
              <p className="mt-4 text-sm leading-6 text-white/60">
                CommunityRouter prevents repetitive discovery posts by routing
                new members into the right communities, rules, and posting paths.
                Moderators reduce onboarding overhead; users find their place
                faster.
              </p>
            </div>

            <button
              className="mt-8 flex h-12 w-full items-center justify-center rounded-2xl bg-orange-200 px-4 text-sm font-semibold text-[#140c05] shadow-[0_18px_50px_rgba(251,146,60,0.22)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-orange-100 hover:shadow-[0_22px_60px_rgba(251,146,60,0.3)] active:translate-y-0 focus-visible:ring-2 focus-visible:ring-orange-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0f18] focus-visible:outline-none"
              onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
              type="button"
            >
              Start onboarding
            </button>
          </div>
        </div>
      </section>
    </main>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Splash />
    </ErrorBoundary>
  </StrictMode>
);
