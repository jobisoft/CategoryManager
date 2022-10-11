"use strict";

// In the html file, we override the contextmenu with the "tab" context and show
// the entries defined here.
// When viewTypes is present, the document's URL is matched instead.

async function main() {
  let { version } = await browser.runtime.getBrowserInfo();

  let major = parseInt(version.split(".")[0], 10);

  // Fixed by bug 1793790.

  let viewTypes = major < 107 ? ["tab"] : ["popup"];

  browser.menus.create({
    id: "add_to",
    title: "Add to TO",
    contexts: ["tab"],
    viewTypes,
    documentUrlPatterns: ["moz-extension://*/popup/popup.html"],
  });

  browser.menus.create({
    id: "add_cc",
    title: "Add to CC",
    contexts: ["tab"],
    viewTypes,
    documentUrlPatterns: ["moz-extension://*/popup/popup.html"],
  });

  browser.menus.create({
    id: "add_bcc",
    title: "Add to BCC",
    contexts: ["tab"],
    viewTypes,
    documentUrlPatterns: ["moz-extension://*/popup/popup.html"],
  });
}

main();
