let { version } = await browser.runtime.getBrowserInfo();

let major = parseInt(version.split(".")[0], 10);

// Fixed by bug 1793790.

let viewTypes = major < 107 ? ["tab"] : ["popup"];

export function createNormalMenu({ id, title }) {
  return browser.menus.create({
    id,
    title,
    contexts: ["tab"],
    viewTypes,
    documentUrlPatterns: ["moz-extension://*/popup/popup.html"],
  });
}
