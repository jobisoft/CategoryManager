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
  data: [...state.addressBooks.values()],
  components: { categoryTitle, categoryTree, contactList },
});

async function updateUI() {
  // TODO : Maybe use deferred task to collapse multiple UI redraw requests into
  //        a single one. Currently, with large changeset, the user can sometimes
  //        see the individual steps. For example when renaming a category, the
  //        new one might be added first (and shown) before the old one is removed.
  //        The deferred task would reschedule the UI redraw by 250ms and if there
  //        is a new redraw request coming in before those 250ms have elapsed, the
  //        timer is reset to 250ms again.
  console.log("Active category:", state.currentCategoryElement);
  await categoryTree.update({
    addressBook: state.currentAddressBook,
    activeCategory:
      state.currentCategoryElement != null
        ? {
            path: state.currentCategoryElement.dataset.category,
            isUncategorized:
              "uncategorized" in state.currentCategoryElement.dataset,
          }
        : null,
  });
  let activeElement = document.getElementsByClassName("active")[0];
  console.log("Active Element after UI update:", activeElement);
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

registerCacheUpdateCallback(state.addressBooks, updateUI);

initCustomMenu(categoryTree);
initContextMenu();

addressBookList.render();
categoryTree.render();
contactList.render();
categoryTitle.innerText = state.currentAddressBook?.name ?? "";
