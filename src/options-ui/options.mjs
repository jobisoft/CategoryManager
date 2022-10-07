import { getOrSetToDefaultTheme } from "../modules/theme.mjs";
const useDarkTheme = await getOrSetToDefaultTheme();
const theme = document.getElementById("theme");

theme.checked = useDarkTheme;
theme.addEventListener("change", async () => {
  await browser.storage.local.set({ useDarkTheme: theme.checked });
});

