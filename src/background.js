"use strict";

// The tab context usually refers to the context menu of tab ribbons.
// By adding a viewType, the menu is basically hidden, because *inside* a tab or
// popup there is no tab ribbon.

// In the html file, we override the contextmenu with the "tab" context and show
// the entries defined here.

// When viewTypes is present, the document's URL is matched instead.
browser.menus.create({
  id: "entry_1",
  title: "entry_1",
  contexts: ["tab"],
  viewTypes: ["tab"],
  documentUrlPatterns: ["moz-extension://*/compose-action/popup.html"],
});
browser.menus.create(
  {
    id: "entry_2",
    title: "entry_2",
    contexts: ["tab"],
    viewTypes: ["tab"],
    documentUrlPatterns: ["moz-extension://*/compose-action/popup.html"],
  },
  () => {
    console.log("This is a callback when I am done (could also await me)");
  }
);
