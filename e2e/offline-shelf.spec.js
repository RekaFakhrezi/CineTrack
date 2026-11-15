import { test, expect } from "@playwright/test";
test("isolated test fixture: offline edits, removal, and image drafts survive reload", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.evaluate(() =>
    localStorage.setItem(
      "cinetrack-uid",
      "11111111-1111-4111-8111-111111111111",
    ),
  );
  await page.reload();
  await page.waitForFunction(async () =>
    (await indexedDB.databases()).some(
      (database) =>
        database.name === "cinetrack-local" && database.version >= 10,
    ),
  );
  await page.evaluate(async () => {
    const uid = "11111111-1111-4111-8111-111111111111";
    localStorage.setItem("cinetrack-uid", uid);
    const database = await new Promise((resolve, reject) => {
      const req = indexedDB.open("cinetrack-local");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = database.transaction("shelf", "readwrite");
      tx.objectStore("shelf").put({
        uid,
        movieKey: "tmdb:12",
        id: "22222222-2222-4222-8222-222222222222",
        tmdb_id: 12,
        custom_movie_id: null,
        snapshot: null,
        status: "planned",
        personal_rating: null,
        review: "",
        completed_at: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        revision: 1,
        syncState: "synced",
        deleted: false,
      });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    database.close();
  });
  await context.setOffline(true);
  await page.goto("/#/shelf");
  await page.reload();
  await page.getByRole("button", { name: "Edit entry" }).click();
  await page
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("completed");
  await page
    .getByRole("combobox", { name: "Your rating", exact: true })
    .selectOption("4");
  await page.getByLabel("Your review").fill("Saved while offline");
  await page.getByRole("button", { name: "Save on device" }).click();
  await expect(page.getByText("Saved while offline")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Saved while offline")).toBeVisible();
  await expect(page.getByText("Pending sync", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByRole("button", { name: "Remove movie", exact: true }).click();
  await page.reload();
  await expect(
    page.getByText("1 removals pending.", { exact: false }),
  ).toBeVisible();
  await page.goto("/#/movies/new");
  await page
    .getByLabel("Movie title", { exact: true })
    .fill("Offline test draft");
  await page
    .getByLabel("Synopsis", { exact: false })
    .fill("A draft created by the browser test only.");
  await page.getByLabel("Drama", { exact: true }).check();
  await page
    .getByLabel("Choose poster")
    .setInputFiles("public/icons/icon-192.png");
  await page.getByLabel("I have the right to publish this image.").check();
  await expect(
    page.getByText("Draft saved on this device.", { exact: true }),
  ).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
  await page.reload();
  await page
    .getByRole("button", { name: "Restore draft", exact: true })
    .click();
  await expect(page.getByLabel("Movie title", { exact: true })).toHaveValue(
    "Offline test draft",
  );
  await expect(page.getByAltText("Selected poster preview")).toHaveAttribute(
    "src",
    /^blob:/,
  );
  await expect(
    page.getByRole("button", { name: "Publish movie" }),
  ).toBeDisabled();
});
