import { printToConsole } from "../modules/utils.mjs"
import { createContactList } from "./contact-list.mjs";
import { createCategoryTree } from "./category-tree.mjs";
import { createAddressBookList } from "./address-book-list.mjs";
import { lookupContactsByCategoryElement } from "./utils.mjs";
import { initCustomMenu } from "./drag-menu.mjs";
import { initContextMenu } from "./context-menu.mjs";
import { initModal } from "./modal.mjs";
import State from "./state.mjs";
import { registerCacheUpdateCallback } from "../modules/cache/listeners.mjs";
import { initErrorHandler } from "./error-handler.mjs";

// global object: emailAddresses, ICAL, MicroModal from popup.html

initErrorHandler();

// Put the state object onto the window (it is our own popup window, so no risk of
// namespace collisions).
const state = new State();
window.state = state;
await state.init();

// This needs to be awaited only once, all following calls in this window are
// synchronous.
await printToConsole.log(state.addressBooks);

// i18n
document.getElementById("info-text").innerText = await browser.i18n.getMessage(
  "info.no-address-book"
);
document.getElementById("spinner-text").innerText =
  await browser.i18n.getMessage("info.spinner-text");

initModal();

const categoryTitle = document.getElementById("category-title");

const contactList = createContactList(
  {
    addressBook: state.currentAddressBook,
    contacts: state.currentAddressBook?.contacts ?? new Map(),
  },
  state
);

const categoryTree = createCategoryTree({
  addressBook: state.currentAddressBook,
  activeCategory: null,
  components: { categoryTitle, contactList },
});

const addressBookList = createAddressBookList({
  addressBooks: [...state.addressBooks.values()],
  activeAddressBookId: "all-contacts",
  components: { categoryTitle, categoryTree, contactList },
});


/**
 * Wrapper for updateUI() to collapse multiple UI update requests.
 */
let updateTimerId = undefined;
function requestUpdateUI() {
  if (typeof updateTimerId === 'number') {
    clearTimeout(updateTimerId);
  }
  updateTimerId = setTimeout(updateUI, 250);
}

async function updateUI() {
  if (!state.addressBooks.has(state.currentAddressBook.id)) {
    // The current address book was removed, so we need to switch to the "all contacts" address book
    state.currentAddressBook = state.allContactsVirtualAddressBook;
    state.currentCategoryElement = null;
  }
  await addressBookList.update({
    addressBooks: [...state.addressBooks.values()],
    activeAddressBookId: state.currentAddressBook.id,
  });
  printToConsole.log("Active category:", state.currentCategoryElement);
  await categoryTree.update({
    addressBook: state.currentAddressBook,
    activeCategory:
      state.currentCategoryElement != null
        ? {
          path: state.currentCategoryElement.dataset.category,
          isUncategorized: !!state.currentCategoryElement.dataset.uncategorized,
        }
        : null,
  });
  let activeElement = document.getElementsByClassName("active")[0];
  printToConsole.log("Active Element after UI update:", activeElement);
  let contacts;
  if (activeElement != null) {
    state.currentCategoryElement = activeElement;
    categoryTitle.innerText = activeElement.dataset.category;
    contacts = lookupContactsByCategoryElement(
      state.currentCategoryElement,
      state.currentAddressBook
    );
  } else {
    state.currentCategoryElement = null;
    categoryTitle.innerText = state.currentAddressBook?.name ?? "";
    contacts = state.currentAddressBook?.contacts ?? new Map();
  }
  await contactList.update({
    addressBook: state.currentAddressBook,
    contacts,
  });
}

registerCacheUpdateCallback(state.addressBooks, requestUpdateUI);

initCustomMenu(categoryTree);
initContextMenu();

addressBookList.render();
categoryTree.render();
contactList.render();
categoryTitle.innerText = state.currentAddressBook?.name ?? "";
