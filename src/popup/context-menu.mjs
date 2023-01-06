// -------------------
// Native Context Menu
// -------------------

import { createDispatcherForContactListContextMenu } from "../modules/context-menu.mjs";
import {
  addContactsToComposeDetails,
  openComposeWindowWithContacts,
} from "./compose.mjs";
import { lookupContactsByCategoryElement } from "./utils.mjs";
import {
  createMenuForCategoryTree,
  createMenuForContact,
  destroyAllMenus,
} from "../modules/context-menu.mjs";
import {
  getCategoryStringFromInput,
  showCategoryInputModalAsync,
} from "./modal.mjs";
import {
  addContactToCategory,
  deleteCategory,
  removeContactFromCategory,
  moveCategory,
} from "./category-edit.mjs";

function makeCategoryMenuHandler(fieldName) {
  const state = window.state;
  return async (categoryElement) => {
    const contacts = lookupContactsByCategoryElement(
      categoryElement,
      state.currentAddressBook
    );
    if (state.isComposeAction) {
      await addContactsToComposeDetails(fieldName, state, contacts);
    } else {
      await openComposeWindowWithContacts(
        fieldName,
        state,
        contacts,
        categoryElement.dataset.category
      );
    }
    window.close();
  };
}

function overrideMenuForCategoryTree(categoryElement) {
  destroyAllMenus();
  createMenuForCategoryTree(categoryElement);
}

async function overrideMenuForContactList() {
  const state = window.state;
  destroyAllMenus();
  await createMenuForContact(
    state.currentAddressBook,
    state.elementForContextMenu.dataset.id
  );
}

export function initContextMenu(updateUI) {
  const state = window.state;
  const contextMenuHandlers = {
    addToTO: makeCategoryMenuHandler("to"),
    addToCC: makeCategoryMenuHandler("cc"),
    addToBCC: makeCategoryMenuHandler("bcc"),
    async deleteCategory(categoryElement) {
      try {
        await deleteCategory({
          categoryPath: categoryElement.dataset.category,
          isUncategorized: "uncategorized" in categoryElement.dataset,
          addressBook: state.currentAddressBook,
          addressBooks: state.addressBooks,
        });
      } finally {
        await updateUI();
      }
    },
    async moveCategory(categoryElement) {
      const oldCategoryStr = categoryElement.dataset.category;
      const newCategoryStr = await showCategoryInputModalAsync(oldCategoryStr);
      if (newCategoryStr == null) return;
      try {
        await moveCategory({
          addressBook: state.currentAddressBook,
          addressBooks: state.addressBooks,
          oldCategoryStr,
          newCategoryStr,
        });
      } finally {
        updateUI();
      }
    },
  };
  const dispatchMenuEventsForContactList =
    createDispatcherForContactListContextMenu({
      async onDeletion(categoryStr) {
        const contactId = state.elementForContextMenu.dataset.id;
        const addressBookId = state.elementForContextMenu.dataset.addressbook;
        const addressBook = state.addressBooks.get(addressBookId);
        await removeContactFromCategory({
          addressBook,
          contactId,
          categoryStr,
        });
        return updateUI();
      },
      async onAddition(categoryStr, createSubCategory) {
        const contactId = state.elementForContextMenu.dataset.id;
        const addressBookId = state.elementForContextMenu.dataset.addressbook;
        const addressBook = state.addressBooks.get(addressBookId);
        if (createSubCategory) {
          const subcategory = await getCategoryStringFromInput(categoryStr);
          if (subcategory == null) return;
          categoryStr = subcategory;
        }
        await addContactToCategory({
          addressBook,
          contactId,
          categoryStr,
        });
        return updateUI();
      },
    });

  document.addEventListener("contextmenu", async (e) => {
    if (!state.allowEdit) {
      e.preventDefault();
      return;
    }
    browser.menus.overrideContext({ context: "tab", tabId: state.tab.id });
    state.elementForContextMenu = e.target;
    console.log(state.elementForContextMenu);
    // Check if the right click originates from contact list
    if (state.elementForContextMenu.parentNode.dataset.id != null) {
      // Right click on contact info
      state.elementForContextMenu = state.elementForContextMenu.parentNode;
      await overrideMenuForContactList();
      return;
    } else if (state.elementForContextMenu.dataset.id != null) {
      await overrideMenuForContactList();
      return;
    }
    overrideMenuForCategoryTree(state.elementForContextMenu);
    // Check if the right click originates from category tree
    if (state.elementForContextMenu.nodeName === "I")
      // Right click on the expander icon. Use the parent element
      state.elementForContextMenu = state.elementForContextMenu.parentNode;
    if (state.elementForContextMenu.dataset.category == null)
      // No context menu outside category tree
      e.preventDefault();
  });

  browser.menus.onClicked.addListener(async ({ menuItemId }) => {
    const handler = contextMenuHandlers[menuItemId];
    try {
      state.allowEdit = false;
      if (handler != null) {
        await handler(state.elementForContextMenu);
      } else {
        await dispatchMenuEventsForContactList(menuItemId);
      }
    } finally {
      state.allowEdit = true;
    }
  });
}
