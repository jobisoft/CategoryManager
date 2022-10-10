"use strict";

// The tab context usually refers to the context menu of tab ribbons.
// By adding a viewType, the menu is basically hidden, because *inside* a tab or
// popup there is no tab ribbon.

// In the html file, we override the contextmenu with the "tab" context and show
// the entries defined here.

// When viewTypes is present, the document's URL is matched instead.
browser.menus.create({
  id: "add_to",
  title: "Add to TO",
  contexts: ["tab"],
  viewTypes: ["tab"],
  documentUrlPatterns: ["moz-extension://*/popup/popup.html"],
});
browser.menus.create({
  id: "add_cc",
  title: "Add to CC",
  contexts: ["tab"],
  viewTypes: ["tab"],
  documentUrlPatterns: ["moz-extension://*/popup/popup.html"],
});
browser.menus.create({
  id: "add_bcc",
  title: "Add to BCC",
  contexts: ["tab"],
  viewTypes: ["tab"],
  documentUrlPatterns: ["moz-extension://*/popup/popup.html"],
});
