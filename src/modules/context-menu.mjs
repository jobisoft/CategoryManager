// In the html file, we override the contextmenu with the "tab" context and show
// the entries defined here.
// When viewTypes is present, the document's URL is matched instead.

let { version } = await browser.runtime.getBrowserInfo();

let major = parseInt(version.split(".")[0], 10);

// Fixed by bug 1793790.

let viewTypes = major < 107 ? ["tab"] : ["popup"];

function createMenu(properties) {
  return browser.menus.create({
    ...properties,
    contexts: ["tab"],
    viewTypes,
    documentUrlPatterns: ["moz-extension://*/popup/popup.html"],
  });
}

export function destroyAllMenus() {
  browser.menus.removeAll();
}

export function createMenuForCategoryTree() {
  createMenu({
    id: "add_to",
    title: "Add to TO",
  });
  createMenu({
    id: "add_cc",
    title: "Add to CC",
  });
  createMenu({
    id: "add_bcc",
    title: "Add to BCC",
  });
}

export function createMenuForContactList() {
  createMenu({
    id: "edit",
    title: "Edit contact",
    checked: true,
    type: "checkbox",
  });
}
