import { escapeHtmlAttr, Component } from "../modules/ui/ui.mjs";

function writeAddressBookElement(addressBook, activeAddressBookId) {
  let name = escapeHtmlAttr(addressBook.name);
  let className =
    activeAddressBookId === addressBook.id ? 'class="selected"' : "";
  return `<li data-address-book="${addressBook.id}" ${className}>${name}</li>`;
}

export function createAddressBookList({
  addressBooks,
  activeAddressBookId,
  components: { categoryTitle, contactList, categoryTree },
}) {
  const state = window.state;
  let component = new Component({
    element: "#address-books",
    data: { addressBooks, activeAddressBookId },
    template({ addressBooks, activeAddressBookId }) {
      let elements = addressBooks
        .map((x) => writeAddressBookElement(x, activeAddressBookId))
        .join("\n");
      return elements;
    },
  });
  async function click({ target }) {
    const addressBookId = target.dataset.addressBook;
    if (addressBookId == null) return;
    state.currentAddressBook = state.addressBooks.get(addressBookId);
    state.currentCategoryElement = null;
    categoryTitle.innerText = state.currentAddressBook.name;
    for (const e of target.parentElement.children) {
      e.classList.remove("selected");
    }
    target.classList.toggle("selected");
    return Promise.all([
      categoryTree.update({
        addressBook: state.currentAddressBook,
        activeCategory: null,
      }),
      contactList.update({
        addressBook: state.currentAddressBook,
        contacts: state.currentAddressBook.contacts,
      }),
    ]);
  }
  component.element.addEventListener("click", click);
  return component;
}
