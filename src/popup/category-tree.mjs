import { escapeHtml, Component } from "../modules/ui.mjs";
import { isEmptyObject } from "../modules/utils.mjs";

function writeTreeLeaf(prefix, category) {
  return `<div class="tree-nav__item">
    <p class="tree-nav__item-title" data-category="${escapeHtml(
      prefix + category.name
    )}">
      ${escapeHtml(category.name)}
    </p>
  </div>`;
}

export function writeTreeNode(prefix, category) {
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
           data-category="${escapeHtml(prefix + category.name)}">
    ${escapeHtml(category.name)}
  </summary>
  ${children.join("\n")}
  </details>`;
}
