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

function createCheckBoxMenu({
  id,
  title,
  checked = false,
  parentId = undefined,
}) {
  return createMenu({
    id,
    title,
    checked,
    type: "checkbox",
    parentId,
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

const NEW_CATEGORY_TEXT = "<New Category Here>";

function createCategoryEditingMenuRecursively(
  category,
  contactId,
  prefix = "",
  parentId = undefined
) {
  const menuId = prefix + category.name;
  console.log(category, menuId);
  createCheckBoxMenu({
    id: menuId,
    title: category.name,
    checked: contactId in category.contacts,
    parentId,
  });
  createMenu({
    id: "$" + menuId.slice(1),
    title: NEW_CATEGORY_TEXT,
    parentId: menuId,
  });
  for (const catName in category.categories) {
    const subcategory = category.categories[catName];
    createCategoryEditingMenuRecursively(
      subcategory,
      contactId,
      menuId + " / ",
      menuId
    );
  }
}

export function createMenuForContactList(addressBook, contactId) {
  // #: existing category
  // $: create new category
  createMenu({ id: "$", title: NEW_CATEGORY_TEXT });
  for (const catName in addressBook.categories) {
    const category = addressBook.categories[catName];
    // Add # prefix to avoid id conflicts
    createCategoryEditingMenuRecursively(category, contactId, "#");
  }
}
