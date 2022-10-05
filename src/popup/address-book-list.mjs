import { escapeHtml, Component } from "../modules/ui.mjs";

function writeAddressBookElement(addressBook) {
  // todo: use address book id here. There might be duplicates in names
  let name = escapeHtml(addressBook.name);
  return `<li data-address-book="${name}">${name}</li>`;
}

export function createAddressBookList({ data, click }) {
  let component = new Component({
    element: "#address-books",
    data,
    template(data) {
      let elements = data.map(writeAddressBookElement).join("\n");
      return elements;
    },
  });
  click && component.element.addEventListener("click", click);
  component.element.addEventListener("click", ({ target }) => {
    for (const e of target.parentElement.children) {
      e.classList.remove("selected");
    }
    target.classList.toggle("selected");
  });
  return component;
}
