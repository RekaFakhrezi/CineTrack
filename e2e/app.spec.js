import { test, expect } from "@playwright/test";
test("production routes, honest setup states, responsive layout, and offline reload", async ({
  page,
  context,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "A life in movies." }),
  ).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  for (const width of [360, 390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, heading] of [
      ["explore", "Discover movies"],
      ["shelf", "My shelf"],
      ["profile", "Behind the screen"],
      ["movies/new", "Bring a story to the shelf"],
    ]) {
      await page.goto("/#/" + route);
      await expect(
        page.getByRole("heading", { name: heading, exact: true }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.screenshot({
      path: `test-results/profile-${width}.png`,
      fullPage: true,
    });
  }
  await context.setOffline(true);
  await page.goto("/#/shelf");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "My shelf", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "You’re offline. Your shelf and saved drafts are available.",
    ),
  ).toBeVisible();
  await page.goto("/#/profile");
  await expect(
    page.getByRole("heading", { name: "Behind the screen" }),
  ).toBeVisible();
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    return (
      await Promise.all(
        keys.map(async (key) =>
          (await (await caches.open(key)).keys()).map((r) => r.url),
        ),
      )
    ).flat();
  });
  expect(cached.some((url) => /\/rest\/|\/auth\/|\/api\/tmdb/.test(url))).toBe(
    false,
  );
  expect(errors).toEqual([]);
});
