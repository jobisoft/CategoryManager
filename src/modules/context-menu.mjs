import { SUBCATEGORY_SEPARATOR } from "./address-book/index.mjs";

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
    title: `${checked ? '☑ ' : '☐ '} ${title}`,
    type: "normal",
    parentId,
  });
}

export function destroyAllMenus() {
  browser.menus.removeAll();
}

export function createMenuForCategoryTree(categoryElement) {
  createMenu({
    id: "addToTO",
    title: "Add to TO",
  });
  createMenu({
    id: "addToCC",
    title: "Add to CC",
  });
  createMenu({
    id: "addToBCC",
    title: "Add to BCC",
  });
  if (!("uncategorized" in categoryElement.dataset)) {
    // Add an option to delete this category
    createSeparator();
    createMenu({ id: "deleteCategory", title: "Delete this category" });
  }
}

async function createCategoryEditingMenuRecursively(
  category,
  contactId,
  prefix = "",
  parentId = undefined
) {
  const menuId = prefix + category.name;
  const checked = contactId in category.contacts;
  const subCategories = Object.keys(category.categories);

  createCheckBoxMenu({
    id: menuId,
    title: category.name,
    checked,
    parentId,
  });

  // Add submenu entries.
  if (checked) {
    let remove_string = Object.values(category.categories).find(category => contactId in category.contacts)
      ? browser.i18n.getMessage("remove_from_category_recursively", category.name)
      : browser.i18n.getMessage("remove_from_category", category.name)
    createMenu({
      id: "@" + menuId.slice(1),
      title: await remove_string,
      parentId: menuId,
    }); 
  } else {
    createMenu({
      id: "%" + menuId.slice(1),
      title: await browser.i18n.getMessage("add_to_category", category.name),
      parentId: menuId,
    }); 
  }

  if (subCategories.length) {
    createSeparator(menuId);
    subCategories.sort();
    for (const catName of subCategories) {
      const subCategory = category.categories[catName];
      await createCategoryEditingMenuRecursively(
        subCategory,
        contactId,
        menuId + SUBCATEGORY_SEPARATOR,
        menuId
      );
    }
  }

  createSeparator(menuId);
  createMenu({
    id: "$" + menuId.slice(1),
    title: await browser.i18n.getMessage("add_to_sub_category", category.name),
    parentId: menuId,
  });
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

export function createDispatcherForContactListContextMenu({
  onDeletion,
  onAddition,
}) {
  return async function (menuId) {
    const categoryStr = menuId.slice(1);
    switch (menuId.charAt(0)) {
      case "@":
        await onDeletion(categoryStr);
        break;
      case "$":
        await onAddition(categoryStr, true);
        break;
      case "%":
        await onAddition(categoryStr, false);
        break;
      case "#":
        console.error("This menu item should not be clickable!");
        break;
      default:
        console.error("Unknown menu id:", menuId);
        break;
    }
  };
}

export async function createMenuForContact(addressBook, contactId) {
  // Symbols:
  //    @: remove from category
  //    #: normal category
  //    $: <new category>
  //    %: <this category>

  // Menu:
  // - Manage belonging categories
  // - Add to ...
  createMenu({
    id: "header",
    title: await browser.i18n.getMessage("manage_categories_of_contact"),
    enabled: false,
  });


  let categories = Object.keys(addressBook.categories);
  if (categories.length) {
    createSeparator();
    categories.sort();

    for (const catName of categories) {
      const category = addressBook.categories[catName];
      // Add # prefix to avoid id conflicts
      await createCategoryEditingMenuRecursively(category, contactId, "#");
    }
  }

  createSeparator();

  createMenu({ id: "$", title: await browser.i18n.getMessage("new_category_here")});
}
