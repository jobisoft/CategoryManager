import { createContactList } from "./contact-list.mjs";
import { createCategoryTree } from "./category-tree.mjs";
import { createAddressBookList } from "./address-book-list.mjs";
import { lookupContactsByCategoryElement } from "./utils.mjs";
import { initCustomMenu } from "./drag-menu.mjs";
import { initContextMenu } from "./context-menu.mjs";
import { initModal } from "./modal.mjs";
import state from "./state.mjs";
import { registerCacheUpdateCallback } from "../modules/cache/listeners.mjs";
// global object: emailAddresses, ICAL, MicroModal from popup.html

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
    contacts: state.currentAddressBook?.contacts ?? {},
  },
  state
);

const categoryTree = createCategoryTree({
  addressBook: state.currentAddressBook,
  activeCategory: null,
  state,
  components: { categoryTitle, contactList },
});

const addressBookList = createAddressBookList({
  data: [...state.addressBooks.values()],
  state,
  components: { categoryTitle, categoryTree, contactList },
});

async function updateUI() {
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
    contacts = state.currentAddressBook?.contacts ?? {};
  }
  await contactList.update({
    addressBook: state.currentAddressBook,
    contacts,
  });
}

registerCacheUpdateCallback(state.addressBooks, updateUI);

initCustomMenu(state, categoryTree);
initContextMenu(state);

addressBookList.render();
categoryTree.render();
contactList.render();
categoryTitle.innerText = state.currentAddressBook?.name ?? "";
