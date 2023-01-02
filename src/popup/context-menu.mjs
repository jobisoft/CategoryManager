// -------------------
// Native Context Menu
// -------------------

import { createDispatcherForContactListContextMenu } from "../modules/context-menu.mjs";
import {
  addContactsToComposeDetails,
  toRFC5322EmailAddress,
} from "../modules/contact.mjs";
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
  removeContactFromCategory,
} from "./category-edit.mjs";

function makeCategoryMenuHandler(fieldName, state) {
  return async () => {
    const contacts = lookupContactsByCategoryElement(
      state.elementForContextMenu
    );
    if (state.isComposeAction) {
      await addContactsToComposeDetails(fieldName, state.tab, contacts);
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

function overrideMenuForContactList(state) {
  destroyAllMenus();
  createMenuForContact(
    state.currentAddressBook,
    state.elementForContextMenu.dataset.id
  );
}

export function initContextMenu(state, updateUI) {
  const contextMenuHandlers = {
    addToTO: makeCategoryMenuHandler("to", state),
    addToCC: makeCategoryMenuHandler("cc", state),
    addToBCC: makeCategoryMenuHandler("bcc", state),
    deleteCategory() {},
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
          virtualAddressBook: state.allContactsVirtualAddressBook,
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
          virtualAddressBook: state.allContactsVirtualAddressBook,
        });
        return updateUI();
      },
    });

  document.addEventListener("contextmenu", (e) => {
    browser.menus.overrideContext({ context: "tab", tabId: state.tab.id });
    state.elementForContextMenu = e.target;
    console.log(state.elementForContextMenu);
    // Check if the right click originates from contact list
    if (state.elementForContextMenu.parentNode.dataset.id != null) {
      // Right click on contact info
      state.elementForContextMenu = state.elementForContextMenu.parentNode;
      overrideMenuForContactList(state);
      return;
    } else if (state.elementForContextMenu.dataset.id != null) {
      overrideMenuForContactList(state);
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
    if (handler != null) {
      await handler();
    } else {
      await dispatchMenuEventsForContactList(menuItemId);
    }
  });
}
