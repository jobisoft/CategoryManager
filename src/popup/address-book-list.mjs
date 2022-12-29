import { escapeHtmlAttr, Component } from "../modules/ui.mjs";

function writeAddressBookElement(addressBook, index) {
  let name = escapeHtmlAttr(addressBook.name);
  let className = index === 0 ? 'class="selected"' : "";
  return `<li data-address-book="${addressBook.id}" ${className}>${name}</li>`;
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
