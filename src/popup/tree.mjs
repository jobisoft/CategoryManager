import { escapeHtml, Component } from "../modules/ui.mjs";
import { isEmptyObject } from "../modules/utils.mjs";

// TODO: escape category in data-category

function writeTreeLeaf(prefix, category) {
  return `<div class="tree-nav__item">
    <p class="tree-nav__item-title" data-category="${prefix + category.name}">
      ${escapeHtml(category.name)}
    </p>
  </div>`;
}

function writeTreeNode(prefix, category) {
  console.log(category);
  const children = Object.keys(category.categories).map((key) => {
    const subCategory = category.categories[key];
    return isEmptyObject(subCategory.categories)
      ? writeTreeLeaf(prefix + category.name + " / ", subCategory)
      : writeTreeNode(prefix + category.name + " / ", subCategory);
  });
  return isEmptyObject(category.categories)
    ? writeTreeLeaf(prefix, category)
    : `<details class="tree-nav__item is-expandable">
  <summary class="tree-nav__item-title" 
           data-category="${prefix + category.name}">
    ${escapeHtml(category.name)}
  </summary>
  ${children.join("\n")}
  </details>`;
}

export function createTree(data, handler) {
  let component = new Component({
    element: "#tree",
    data,
    template(data) {
      const html = Object.keys(data.categories)
        .map((key) => writeTreeNode("", data.categories[key]))
        .join("\n");
      return html;
    },
  });
  component.element.addEventListener("click", handler);
  return component;
}
