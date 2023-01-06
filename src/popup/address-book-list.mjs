import { escapeHtmlAttr, Component } from "../modules/ui.mjs";

function writeAddressBookElement(addressBook, index) {
  let name = escapeHtmlAttr(addressBook.name);
  let className = index === 0 ? 'class="selected"' : "";
  return `<li data-address-book="${addressBook.id}" ${className}>${name}</li>`;
}

export function createAddressBookList({
  data,
  state,
  components: { categoryTitle, contactList, categoryTree },
}) {
  let component = new Component({
    element: "#address-books",
    data,
    template(data) {
      let elements = data.map(writeAddressBookElement).join("\n");
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
        contacts: state.currentAddressBook.contactKeys,
      }),
    ]);
  }
  component.element.addEventListener("click", click);
  return component;
}
