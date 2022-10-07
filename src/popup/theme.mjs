import { getOrSetToDefaultTheme, setTheme } from "../modules/theme.mjs";

const useDarkTheme = await getOrSetToDefaultTheme();
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  const { useDarkTheme } = changes;
  if (useDarkTheme != null) {
    setTheme(useDarkTheme);
  }
});

setTheme(useDarkTheme);
