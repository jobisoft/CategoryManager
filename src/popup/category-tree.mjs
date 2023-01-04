import {
  escapeHtmlAttr,
  escapeHtmlContent,
  Component,
} from "../modules/ui.mjs";
import {
  categoryPathToString,
  isLeafCategory,
} from "../modules/address-book/index.mjs";
import { lookupContactsByCategoryElement } from "./utils.mjs";
import {
  addContactsToComposeDetails,
  openComposeWindowWithContacts,
} from "./compose.mjs";
import { showCustomMenu } from "./custom-menu.mjs";

function isActiveCategory(category, activeCategory) {
  return (
    activeCategory != null &&
    category.path === activeCategory.path &&
    category.isUncategorized === activeCategory.isUncategorized
  );
}

function writeTreeLeaf(category, activeCategory) {
  let uncategorizedAttr = category.isUncategorized
    ? 'data-uncategorized=""'
    : "";
  const activeClass = isActiveCategory(category, activeCategory)
    ? "active"
    : "";
  return `<div class="tree-nav__item">
    <p class="tree-nav__item-title ${activeClass}" data-category="${escapeHtmlAttr(
    category.path
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
  const activeClass = isActiveCategory(category, activeCategory)
    ? "active"
    : "";
  const activeCategoryBasePath = categoryPathToString(
    activeCategory?.path,
    activeCategory?.isUncategorized
  );
  const openAttr = activeCategoryBasePath?.startsWith(category.path)
    ? "open"
    : "";
  return `<details class="tree-nav__item is-expandable" ${openAttr}>
  <summary class="tree-nav__item-title ${activeClass}" 
           data-category="${escapeHtmlAttr(category.path)}">
    <i class="tree-nav__expander fa-solid fa-chevron-right"></i>
    ${escapeHtmlContent(category.name)}
  </summary>
  ${children.join("\n")}
  </details>`;
}

export function createCategoryTree({
  addressBook,
  activeCategory,
  components: { categoryTitle, contactList },
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
      return roots.join("\n") + res;
    },
    ...rest,
    showNewCategory() {
      document.getElementsByClassName("new-category")[0].classList.add("show");
    },
    hideNewCategory() {
      document
        .getElementsByClassName("new-category")[0]
        .classList.remove("show");
    },
    getParentDetailsElement(element) {
      while (element != this.element) {
        if (element.nodeName == "DETAILS") {
          return element;
        }
        element = element.parentElement;
      }
      return null;
    },
    hideDragOverHighlight() {
      if (window.state.currentDraggingOverCategoryElement != null) {
        window.state.currentDraggingOverCategoryElement.classList.remove("drag-over");
        window.state.currentDraggingOverCategoryElement = null;
      }
    },
  });
  async function click(event) {
    console.log("Click", event);
    if (event.detail > 1) {
      // Disable click event on double click
      event.preventDefault();
      return false;
    }
    if (event.target.nodeName === "I")
      // A click on the expander
      return;
    event.preventDefault();

    const categoryKey = event.target.dataset.category;
    if (categoryKey == null)
      // Not a click on category
      return;

    if (window.state.currentCategoryElement != null)
      window.state.currentCategoryElement.classList.remove("active");
    window.state.currentCategoryElement = event.target;
    window.state.currentCategoryElement.classList.add("active");
    const newData = {
      addressBook: window.state.currentAddressBook,
      contacts: lookupContactsByCategoryElement(window.state.currentAddressBook, window.state.currentCategoryElement),
    };
    categoryTitle.innerText = categoryKey;
    return contactList.update(newData);
  }
  async function doubleClick(event) {
    const categoryElement = event.target;
    const categoryPath = categoryElement.dataset.category;
    if (categoryPath == null) return;
    const contacts = lookupContactsByCategoryElement(window.state.currentAddressBook, categoryElement);
    if (window.state.isComposeAction) {
      await addContactsToComposeDetails("bcc", contacts);
    } else {
      await openComposeWindowWithContacts("bcc", contacts, categoryPath);
    }
    window.close();
  }
  function dragEnter(e) {
    console.log("Drag Enter");
    this.showNewCategory();
    e.preventDefault();
  }

  function dragOver(e) {
    this.hideDragOverHighlight();
    if (e.target.nodeName === "I" || e.target.nodeName === "#text") {
      // Dragging over the expander or text.
      window.state.currentDraggingOverCategoryElement = e.target.parentElement;
    } else if (e.target.nodeName === "DIV") {
      // Dragging over the container of a leaf category
      window.state.currentDraggingOverCategoryElement = e.target.children[0];
    } else if (e.target.nodeName === "DETAILS") {
      console.warn("Dragging over details!");
      return;
    } else {
      window.state.currentDraggingOverCategoryElement = e.target;
      if (window.state.currentDraggingOverCategoryElement.nodeName === "SUMMARY") {
        window.state.currentDraggingOverCategoryElement.parentElement.open = true;
      }
    }
    window.state.currentDraggingOverCategoryElement.classList.add("drag-over");
    // Do not allow dragging onto uncategorized because it's not a real category.
    e.dataTransfer.dropEffect =
      "uncategorized" in window.state.currentDraggingOverCategoryElement.dataset
        ? "none"
        : "copy";

    console.warn(`Dragging onto`, window.state.currentDraggingOverCategoryElement);
    e.preventDefault();
  }
  async function dragDrop(e) {
    await showCustomMenu(e.pageX, e.pageY, {
      currentDraggingOverCategoryElement:
        window.state.currentDraggingOverCategoryElement,
      currentCategoryElement: window.state.currentCategoryElement,
    });
    const item = e.dataTransfer.items[0];
    if (item.type !== "category-manager/contact") {
      console.error("Invalid item for drag and drop: ", item);
      return;
    }
    item.getAsString((x) => (window.state.currentContactDataFromDragAndDrop = x));
  }
  function dragLeave(e) {
    if (
      e.target == this.element &&
      !("uncategorized" in e.relatedTarget.dataset)
    ) {
      // We are leaving the tree, but not entering an uncategorized category.
      console.warn("Leaving tree!", e);
      this.hideNewCategory();
    }
    const parentDetails = this.getParentDetailsElement(e.target);
    if (parentDetails != null) {
      // Let's fold the category if the mouses leaves it.
      const boundingRect = parentDetails.getBoundingClientRect();
      if (
        !(
          boundingRect.x <= e.pageX &&
          e.pageX <= boundingRect.x + boundingRect.width &&
          boundingRect.y <= e.pageY &&
          e.pageY <= boundingRect.y + boundingRect.height
        )
      )
        parentDetails.open = false;
    }
    this.hideDragOverHighlight();
  }
  component.element.addEventListener("click", click.bind(component));
  component.element.addEventListener("dblclick", doubleClick.bind(component));
  component.element.addEventListener("dragenter", dragEnter.bind(component));
  component.element.addEventListener("dragover", dragOver.bind(component));
  component.element.addEventListener("dragleave", dragLeave.bind(component));
  component.element.addEventListener("drop", dragDrop.bind(component));
  return component;
}
