import { escapeHtml, Component } from "../modules/ui.mjs";
import { writeTreeNode } from "./category-tree.mjs";

function writeAddressBookUI(addressBook) {
  let name = escapeHtml(addressBook.name);
  let categoryTree = Object.keys(addressBook.categories)
    .map((key) => writeTreeNode("", addressBook.categories[key]))
    .join("\n");
  return `<details class="tree-nav__item is-expandable">
    <summary class="tree-nav__item-title"
             data-address-book="${name}">
      ${name}
    </summary>
    ${categoryTree}
    </details>`;
}

export function createAddressBookExplorer({ data, click, doubleClick }) {
  let component = new Component({
    element: "#explorer",
    data,
    template(data) {
      return data.map(writeAddressBookUI).join("\n");
    },
  });
  click && component.element.addEventListener("click", click);
  doubleClick && component.element.addEventListener("dblclick", doubleClick);
  return component;
}
