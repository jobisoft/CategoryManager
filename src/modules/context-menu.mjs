function createMenu(properties) {
  return browser.menus.create({
    ...properties,
    contexts: ["tab"],
    viewTypes: ["popup"],
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

function debug(x) {
  console.log(x);
  return x;
}

function createCategoryEditingMenuRecursively(
  category,
  contactId,
  prefix = "",
  parentId = undefined
) {
  const menuId = prefix + category.name;
  console.log(menuId, contactId);
  createCheckBoxMenu({
    id: menuId,
    title: category.name,
    checked: debug(contactId in category.contacts),
    parentId,
  });
  createCheckBoxMenu({
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

let separatorIdCounter = 0;

function createSeparator(parentId = undefined) {
  return createMenu({
    id: `separator-${separatorIdCounter++}`,
    type: "separator",
    parentId,
  });
}

const MENU_NUMBER_LIMIT = 15;

export function createMenuForContactList(addressBook, contactId) {
  // Menu for deletion
  //    @: for flattened category items
  // Menu for addition
  //    #: existing category
  //    $: create new category
  const contact = addressBook.contacts[contactId];
  for (const catArr of contact.categories) {
    const catName = catArr.join(" / ");
    createCheckBoxMenu({
      id: "@" + catName,
      title: catName,
      checked: true,
    });
  }
  createSeparator();
  let parentId = undefined;

  // I didn't found an O(1)/O(1) method to read the length of an object.
  // Let's just use an O(n)/O(n) method and hope JavaScript will be replaced one day.
  if (Object.keys(addressBook.categories).length > MENU_NUMBER_LIMIT) {
    // Fold them inside a sub menu
    parentId = createMenu({ id: "expander", title: "Add to" });
  } else {
    createMenu({ id: "expander", title: "Add to", enabled: false });
  }
  createMenu({ id: "$", title: NEW_CATEGORY_TEXT, parentId });
  for (const catName in addressBook.categories) {
    const category = addressBook.categories[catName];
    // Add # prefix to avoid id conflicts
    createCategoryEditingMenuRecursively(category, contactId, "#", parentId);
  }
}
