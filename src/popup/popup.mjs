import { createContactList } from "./contact-list.mjs";
import { createCategoryTree } from "./category-tree.mjs";
import { createAddressBookList } from "./address-book-list.mjs";
import { lookupContactsByCategoryElement } from "./utils.mjs";
import { initCustomMenu } from "./custom-menu.mjs";
import { initContextMenu } from "./context-menu.mjs";
import { initModal } from "./modal.mjs";
import state from "./state.mjs";
// global object: emailAddresses, ICAL, MicroModal from popup.html

initModal();

const categoryTitle = document.getElementById("category-title");

const contactList = createContactList({
  addressBook: state.currentAddressBook,
  contacts: state.currentAddressBook?.contacts ?? {},
});

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
  console.log("Active category:", categoryTitle.innerText);
  await categoryTree.update({
    addressBook: state.currentAddressBook,
    activeCategory: categoryTitle.innerText,
  });
  let activeElement = document.getElementsByClassName("active")[0];
  console.log("Active Element after UI update:", activeElement);
  let contacts;
  if (activeElement != null) {
    state.currentCategoryElement = activeElement;
    categoryTitle.innerText = activeElement.dataset.category;
    contacts = lookupContactsByCategoryElement(state.currentCategoryElement);
  } else {
    state.currentCategoryElement = null;
    categoryTitle.innerText = state.currentAddressBook?.name ?? "";
    contacts = state.currentAddressBook?.contacts ?? {};
  }
  console.log("Update contact list using", contacts);
  await contactList.update({
    addressBook: state.currentAddressBook,
    contacts,
  });
}

initCustomMenu(state, categoryTree, updateUI);
initContextMenu(state, updateUI);

addressBookList.render();
categoryTree.render();
contactList.render();
