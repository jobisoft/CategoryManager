// -------------------
// Native Context Menu
// -------------------

import { createDispatcherForContactListContextMenu } from "../modules/context-menu.mjs";
import { toRFC5322EmailAddress } from "../modules/contact.mjs";
import { addContactsToComposeDetails } from "./compose.mjs";
import { lookupContactsByCategoryElement } from "./utils.mjs";
import { id2contact } from "../modules/address-book/index.mjs";
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

function makeCategoryMenuHandler(fieldName, state) {
  return async (categoryElement) => {
    const contacts = lookupContactsByCategoryElement(categoryElement);
    if (state.isComposeAction) {
      await addContactsToComposeDetails(fieldName, state, contacts);
    } else {
      // Do a filterMap(using a flatMap) to remove contacts that do not have an email address
      // and map the filtered contacts to rfc 5322 email address format.
      const emailList = Object.keys(contacts).flatMap((c) => {
        const contact = id2contact(state.currentAddressBook, c);
        return contact.email == null ? [] : [toRFC5322EmailAddress(contact)];
      });
      await browser.compose.beginNew(null, { [fieldName]: emailList });
    }
    window.close();
  };
}

function overrideMenuForCategoryTree(categoryElement) {
  destroyAllMenus();
  createMenuForCategoryTree(categoryElement);
}

async function overrideMenuForContactList(state) {
  destroyAllMenus();
  await createMenuForContact(
    state.currentAddressBook,
    state.elementForContextMenu.dataset.id
  );
}

export function initContextMenu(state, updateUI) {
  const contextMenuHandlers = {
    addToTO: makeCategoryMenuHandler("to", state),
    addToCC: makeCategoryMenuHandler("cc", state),
    addToBCC: makeCategoryMenuHandler("bcc", state),
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
      await overrideMenuForContactList(state);
      return;
    } else if (state.elementForContextMenu.dataset.id != null) {
      await overrideMenuForContactList(state);
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
