import { test as setup } from "@playwright/test";
import { AUTH_FILE, sessionCookies } from "./support";

// Signs in as test user A once and saves the session for the other tests
setup("sign in as test user A", async ({ context, baseURL }) => {
  await context.addCookies(await sessionCookies("A", baseURL!));
  await context.storageState({ path: AUTH_FILE });
});
