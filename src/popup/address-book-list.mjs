import { escapeHtml, Component } from "../modules/ui.mjs";

function writeAddressBookElement(addressBook) {
  let name = escapeHtml(addressBook.name);
  return `<li data-address-book="${name}">${name}</li>`;
}

export function createAddressBookList({ data, click, doubleClick }) {
  let component = new Component({
    element: "#address-books",
    data,
    template(data) {
      let elements = data.map(writeAddressBookElement).join("\n");
      return elements;
    },
  });
  click && component.element.addEventListener("click", click);
  doubleClick && component.element.addEventListener("dblclick", doubleClick);
  return component;
}
