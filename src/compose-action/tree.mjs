import { escapeHtml, Component } from "../modules/ui.mjs";
import { isEmptyObject } from "../modules/utils.mjs";

// TODO: escape category in data-category

function writeTreeLeaf(prefix, category) {
  return `<div class="tree-nav__item">
  <a class="tree-nav__item-title" data-category="${
    prefix + category.name
  }">${escapeHtml(category.name)}</a>
  </div>`;
}

function writeTreeNode(prefix, category) {
  console.log(category);
  const children = Object.keys(category.subCategories).map((key) => {
    const subCategory = category.subCategories[key];
    return isEmptyObject(subCategory.subCategories)
      ? writeTreeLeaf(prefix + category.name + "/", subCategory)
      : writeTreeNode(prefix + category.name + "/", subCategory);
  });
  return isEmptyObject(category.subCategories)
    ? writeTreeLeaf(prefix, category)
    : `<details class="tree-nav__item is-expandable">
  <summary class="tree-nav__item-title" 
           data-category="${prefix + category.name + "/"}">
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
      return Object.keys(data.categories)
        .map((key) => writeTreeNode("", data.categories[key]))
        .join("\n");
    },
  });
  component.element.addEventListener("click", handler);
  return component;
}
