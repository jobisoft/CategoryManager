export async function getOrSetToDefaultTheme() {
  let { useDarkTheme } = await browser.storage.local.get("useDarkTheme");
  if (useDarkTheme == null) {
    useDarkTheme = false;
    await browser.storage.local.set({ useDarkTheme });
  }
  return useDarkTheme;
}

export function setTheme(useDarkTheme) {
  let root = document.documentElement;
  root.style.setProperty(
    "--catman-foreground",
    useDarkTheme ? "white" : "black"
  );
  root.style.setProperty(
    "--catman-background",
    useDarkTheme ? "#191c1e" : "white"
  );
}
