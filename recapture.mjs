import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, 'assets', 'screenshots');
const chromePath = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const baseUrl = 'http://localhost:5175';

const main = async () => {
  console.log('Launching Chrome...');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Enable moderator mode and navigate to game page
  console.log('\nSetting moderator mode...');
  await page.goto(`${baseUrl}/game.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2000));

  await page.evaluate(() => {
    localStorage.setItem('communityrouter-mod', 'true');
    localStorage.setItem('communityrouter-theme', 'dark');
  });

  // Reload with moderator mode active
  await page.goto(`${baseUrl}/game.html`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 3000));

  // --- 1. Moderator Dashboard (full page) ---
  console.log('1. Moderator dashboard...');
  // Get full page height and set viewport tall enough
  const fullHeight = await page.evaluate(() => document.body.scrollHeight);
  await page.setViewport({ width: 1440, height: Math.min(fullHeight, 3000) });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({
    path: path.join(screenshotsDir, 'moderator-dashboard.png'),
    fullPage: true,
  });
  console.log(`  ✓ moderator-dashboard.png (fullPage, height=${Math.min(fullHeight, 3000)})`);

  // Reset viewport for next screenshots
  await page.setViewport({ width: 1440, height: 900 });

  // --- 2. Analytics Panel (scroll to bottom, crop specific area) ---
  console.log('2. Analytics panel...');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 1000));

  // Try to find the analytics elements - look for the sticky sidebar that contains analytics + live preview
  const analyticsPanel = await page.evaluate(() => {
    // The analytics panel is inside the sticky sidebar (lg:sticky class)
    const sidebar = document.querySelector('.lg\\:sticky') || document.querySelector('[class*="lg:sticky"]');
    if (sidebar) {
      const rect = sidebar.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }
    return null;
  });

  if (analyticsPanel) {
    await page.screenshot({
      path: path.join(screenshotsDir, 'analytics.png'),
      clip: {
        x: analyticsPanel.x,
        y: analyticsPanel.y,
        width: Math.min(analyticsPanel.width, 1440),
        height: Math.min(analyticsPanel.height, 2000),
      },
    });
    console.log('  ✓ analytics.png (clipped sidebar)');
  } else {
    // Fallback: take viewport screenshot at the bottom
    await page.screenshot({
      path: path.join(screenshotsDir, 'analytics.png'),
    });
    console.log('  ✓ analytics.png (fallback viewport)');
  }

  // --- 3. Live Preview (in the sidebar below analytics) ---
  console.log('3. Live preview...');
  // The Live Preview is the second card in the sticky sidebar
  const livePreviewEl = await page.evaluate(() => {
    // Find elements containing "Live Preview" text
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      if (el.textContent?.includes('Live Preview') && el.children.length > 3) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 200 && rect.height > 100) {
          return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        }
      }
    }
    return null;
  });

  if (livePreviewEl) {
    await page.screenshot({
      path: path.join(screenshotsDir, 'live-preview.png'),
      clip: {
        x: livePreviewEl.x,
        y: livePreviewEl.y,
        width: Math.min(livePreviewEl.width, 800),
        height: Math.min(livePreviewEl.height, 800),
      },
    });
    console.log('  ✓ live-preview.png (clipped element)');
  } else {
    // Fallback: take full viewport screenshot
    await page.screenshot({
      path: path.join(screenshotsDir, 'live-preview.png'),
    });
    console.log('  ✓ live-preview.png (fallback viewport)');
  }

  console.log('\n✅ All three screenshots recaptured!');
  await browser.close();
};

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
