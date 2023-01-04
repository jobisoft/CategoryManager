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
import { getCategoryStringFromInput } from "./modal.mjs";
import {
  addContactToCategory,
  deleteCategory,
  removeContactFromCategory,
} from "./category-edit.mjs";

function makeCategoryMenuHandler(fieldName) {
  return async (categoryElement) => {
    const contacts = lookupContactsByCategoryElement(window.state.currentAddressBook, categoryElement);
    if (window.state.isComposeAction) {
      await addContactsToComposeDetails(fieldName, contacts);
    } else {
      await openComposeWindowWithContacts(
        fieldName,
        contacts,
        categoryElement.dataset.category
      );
    }
    window.close();
  };
}

async function overrideMenuForCategoryTree(categoryElement) {
  destroyAllMenus();
  await createMenuForCategoryTree(categoryElement);
}

async function overrideMenuForContactList() {
  destroyAllMenus();
  await createMenuForContact(
    window.state.currentAddressBook,
    window.state.elementForContextMenu.dataset.id
  );
}

export function initContextMenu(updateUI) {
  const contextMenuHandlers = {
    addToTO: makeCategoryMenuHandler("to"),
    addToCC: makeCategoryMenuHandler("cc"),
    addToBCC: makeCategoryMenuHandler("bcc"),
    async deleteCategory(categoryElement) {
      try {
        await deleteCategory({
          categoryPath: categoryElement.dataset.category,
          isUncategorized: "uncategorized" in categoryElement.dataset,
          addressBook: window.state.currentAddressBook,
          addressBooks: window.state.addressBooks,
        });
      } finally {
        await updateUI();
      }
    },
  };
  const dispatchMenuEventsForContactList =
    createDispatcherForContactListContextMenu({
      async onDeletion(categoryStr) {
        const contactId = window.state.elementForContextMenu.dataset.id;
        const addressBookId = window.state.elementForContextMenu.dataset.addressbook;
        const addressBook = window.state.addressBooks.get(addressBookId);
        await removeContactFromCategory({
          addressBook,
          contactId,
          categoryStr,
        });
        return updateUI();
      },
      async onAddition(categoryStr, createSubCategory) {
        const contactId = window.state.elementForContextMenu.dataset.id;
        const addressBookId = window.state.elementForContextMenu.dataset.addressbook;
        const addressBook = window.state.addressBooks.get(addressBookId);
        if (createSubCategory) {
          const subcategory = await getCategoryStringFromInput();
          if (subcategory == null) return;
          if (categoryStr === "") categoryStr = subcategory;
          else categoryStr += ` / ${subcategory}`;
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
    if (!window.state.allowEdit) {
      e.preventDefault();
      return;
    }
    browser.menus.overrideContext({ context: "tab", tabId: window.state.tab.id });
    window.state.elementForContextMenu = e.target;
    console.log(window.state.elementForContextMenu);
    // Check if the right click originates from contact list
    if (window.state.elementForContextMenu.parentNode.dataset.id != null) {
      // Right click on contact info
      window.state.elementForContextMenu = window.state.elementForContextMenu.parentNode;
      await overrideMenuForContactList();
      return;
    } else if (window.state.elementForContextMenu.dataset.id != null) {
      await overrideMenuForContactList();
      return;
    }
    await overrideMenuForCategoryTree(window.state.elementForContextMenu);
    // Check if the right click originates from category tree
    if (window.state.elementForContextMenu.nodeName === "I")
      // Right click on the expander icon. Use the parent element
      window.state.elementForContextMenu = window.state.elementForContextMenu.parentNode;
    if (window.state.elementForContextMenu.dataset.category == null)
      // No context menu outside category tree
      e.preventDefault();
  });

  browser.menus.onClicked.addListener(async ({ menuItemId }) => {
    const handler = contextMenuHandlers[menuItemId];
    try {
      window.state.allowEdit = false;
      if (handler != null) {
        await handler(window.state.elementForContextMenu);
      } else {
        await dispatchMenuEventsForContactList(menuItemId);
      }
    } finally {
      window.state.allowEdit = true;
    }
  });
}
