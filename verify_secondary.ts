import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000/en/handbook/laws');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'handbook.png', fullPage: true });

  await page.goto('http://localhost:3000/en/boycotts');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'boycotts.png', fullPage: true });

  await browser.close();
})();
