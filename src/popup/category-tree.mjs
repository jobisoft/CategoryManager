import {
  escapeHtmlAttr,
  escapeHtmlContent,
  Component,
} from "../modules/ui.mjs";
import { isLeafCategory } from "../modules/category.mjs";

function writeTreeLeaf(category, activeCategory) {
  let uncategorizedAttr = category.isUncategorized
    ? 'data-uncategorized=""'
    : "";
  let categoryStr = category.path;
  let activeClass = categoryStr === activeCategory ? "active" : "";
  return `<div class="tree-nav__item">
    <p class="tree-nav__item-title ${activeClass}" data-category="${escapeHtmlAttr(
    categoryStr
  )}" ${uncategorizedAttr}>
      ${escapeHtmlContent(category.name)}
    </p>
  </div>`;
}

export function writeTreeNode(category, activeCategory) {
  let children = Object.keys(category.categories).map((key) => {
    const subCategory = category.categories[key];
    return isLeafCategory(subCategory)
      ? writeTreeLeaf(subCategory, activeCategory)
      : writeTreeNode(subCategory, activeCategory);
  });
  const uncategorizedCategory = category.uncategorized;
  if (uncategorizedCategory != null) {
    children.push(
      // `uncategorized` is always the last one and needs special handling
      writeTreeLeaf(uncategorizedCategory, activeCategory)
    );
  }
  if (isLeafCategory(category)) return writeTreeLeaf(category, activeCategory);
  const categoryStr = category.path;
  const activeClass = categoryStr === activeCategory ? "active" : "";
  const openAttr = activeCategory?.startsWith(categoryStr) ? "open" : "";
  return `<details class="tree-nav__item is-expandable" ${openAttr}>
  <summary class="tree-nav__item-title ${activeClass}" 
           data-category="${escapeHtmlAttr(categoryStr)}">
    <i class="tree-nav__expander fa-solid fa-chevron-right"></i>
    ${escapeHtmlContent(category.name)}
  </summary>
  ${children.join("\n")}
  </details>`;
}

export function createCategoryTree({
  addressBook,
  activeCategory,
  click,
  doubleClick,
  dragEnter,
  dragOver,
  dragLeave,
  dragDrop,
  ...rest
}) {
  let component = new Component({
    element: "#tree",
    data: { addressBook, activeCategory },
    template({ addressBook, activeCategory }) {
      let res = `<div class="tree-nav__item new-category"><p class="tree-nav__item-title new-category-title">[ New Category ]</p></div>\n`;
      if (addressBook == null) return res;
      let roots = Object.keys(addressBook.categories).map((key) =>
        writeTreeNode(addressBook.categories[key], activeCategory)
      );
      const uncategorizedCategory = addressBook.uncategorized;
      if (uncategorizedCategory != null) {
        roots.push(writeTreeLeaf(uncategorizedCategory, activeCategory));
      }
      return res + roots.join("\n");
    },
    ...rest,
    activeCategory,
  });
  click && component.element.addEventListener("click", click.bind(component));
  doubleClick &&
    component.element.addEventListener("dblclick", doubleClick.bind(component));
  dragEnter &&
    component.element.addEventListener("dragenter", dragEnter.bind(component));
  dragOver &&
    component.element.addEventListener("dragover", dragOver.bind(component));
  dragLeave &&
    component.element.addEventListener("dragleave", dragLeave.bind(component));
  dragDrop &&
    component.element.addEventListener("drop", dragDrop.bind(component));
  return component;
}
