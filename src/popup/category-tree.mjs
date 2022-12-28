import { escapeHtml, Component } from "../modules/ui.mjs";
import { isEmptyObject } from "../modules/utils.mjs";

function writeTreeLeaf(prefix, category) {
  let uncategorizedAttr = category.isUncategorized
    ? 'data-uncategorized=""'
    : "";
  return `<div class="tree-nav__item">
    <p class="tree-nav__item-title" data-category="${escapeHtml(
      prefix + category.name
    )}" ${uncategorizedAttr}>
      ${escapeHtml(category.name)}
    </p>
  </div>`;
}

export function writeTreeNode(prefix, category) {
  const newPrefix = prefix + category.name + " / ";
  let children = Object.keys(category.categories).map((key) => {
    const subCategory = category.categories[key];
    return isEmptyObject(subCategory.categories)
      ? writeTreeLeaf(newPrefix, subCategory)
      : writeTreeNode(newPrefix, subCategory);
  });
  const uncategorizedCategory = category.uncategorized;
  if (uncategorizedCategory != null) {
    children.push(
      // `uncategorized` is always the last one and needs special handling
      writeTreeLeaf(newPrefix, uncategorizedCategory)
    );
  }
  return isEmptyObject(category.categories)
    ? writeTreeLeaf(prefix, category)
    : `<details class="tree-nav__item is-expandable">
  <summary class="tree-nav__item-title" 
           data-category="${escapeHtml(prefix + category.name)}">
    <i class="tree-nav__expander fa-solid fa-chevron-right"></i>
    ${escapeHtml(category.name)}
  </summary>
  ${children.join("\n")}
  </details>`;
}

export function createCategoryTree({ data, click, doubleClick }) {
  let component = new Component({
    element: "#tree",
    data,
    template(data) {
      if (data == null) return "";
      let roots = Object.keys(data.categories).map((key) =>
        writeTreeNode("", data.categories[key])
      );
      const uncategorizedCategory = data.uncategorized;
      if (uncategorizedCategory != null) {
        roots.push(writeTreeLeaf("", uncategorizedCategory));
      }
      return roots.join("\n");
    },
  });
  click && component.element.addEventListener("click", click);
  doubleClick && component.element.addEventListener("dblclick", doubleClick);
  return component;
}
