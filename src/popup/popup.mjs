import { createContactList } from "./contact-list.mjs";
import { createCategoryTree } from "./category-tree.mjs";
import { createAddressBookList } from "./address-book-list.mjs";
import { lookupContactsByCategoryElement } from "./utils.mjs";
import { initCustomMenu } from "./custom-menu.mjs";
import { initContextMenu } from "./context-menu.mjs";
import { initModal } from "./modal.mjs";
import { initErrorHandler } from "./error-handler.mjs";
import { registerCacheUpdateCallback } from "../modules/address-book/cache.mjs";
// global object: emailAddresses, ICAL, MicroModal from popup.html

import State from "./state.mjs";
// Put the state object onto the window (it is our own popup window, so no risk of
// namespace collisions).
window.state = new State();
await window.state.init();

// i18n
document.getElementById("info-text").innerText = await browser.i18n.getMessage(
  "info.no-address-book"
);
document.getElementById("spinner-text").innerText =
  await browser.i18n.getMessage("info.spinner-text");

initModal();
initErrorHandler();

const categoryTitle = document.getElementById("category-title");

const contactList = createContactList(
  {
    addressBook: window.state.currentAddressBook,
    contacts: window.state.currentAddressBook?.contacts ?? {},
  }
);

const categoryTree = createCategoryTree({
  addressBook: window.state.currentAddressBook,
  activeCategory: null,
  components: { categoryTitle, contactList },
});

const addressBookList = createAddressBookList({
  data: [...window.state.addressBooks.values()],
  components: { categoryTitle, categoryTree, contactList },
});

async function updateUI() {
  console.log("Active category:", window.state.currentCategoryElement);
  await categoryTree.update({
    addressBook: window.state.currentAddressBook,
    activeCategory:
      window.state.currentCategoryElement != null
        ? {
            path: window.state.currentCategoryElement.dataset.category,
            isUncategorized:
              "uncategorized" in window.state.currentCategoryElement.dataset,
          }
        : null,
  });
  let activeElement = document.getElementsByClassName("active")[0];
  console.log("Active Element after UI update:", activeElement);
  let contacts;
  if (activeElement != null) {
    window.state.currentCategoryElement = activeElement;
    categoryTitle.innerText = activeElement.dataset.category;
    contacts = lookupContactsByCategoryElement(window.state.currentAddressBook, window.state.currentCategoryElement);
  } else {
    window.state.currentCategoryElement = null;
    categoryTitle.innerText = window.state.currentAddressBook?.name ?? "";
    contacts = window.state.currentAddressBook?.contacts ?? {};
  }
  await contactList.update({
    addressBook: window.state.currentAddressBook,
    contacts,
  });
}

registerCacheUpdateCallback(window.state.addressBooks, updateUI);

initCustomMenu(categoryTree, updateUI);
initContextMenu(updateUI);

addressBookList.render();
categoryTree.render();
contactList.render();
categoryTitle.innerText = window.state.currentAddressBook?.name ?? "";
