// -------------------------------------------------------
// Custom Context Menu for drag and drop on category tree
// -------------------------------------------------------

import { setIntersection } from "../modules/set.mjs";
import { getCategoryStringFromInput } from "./modal.mjs";
import { addContactToCategory } from "./category-edit.mjs";

const customMenu = document.getElementById("custom-menu");

function updateCustomMenu(allowedActions, currentDraggingOverCategoryElement) {
  for (const item of customMenu.children) {
    item.style.display = allowedActions.has(item.id) ? "block" : "none";
  }
  // Update the text
  if (currentDraggingOverCategoryElement.nodeName == "NAV") {
    customMenu.children[0].innerText = "Add to a new category";
  } else {
    customMenu.children[0].innerText = "Add to this category";
  }
}

const ALLOWED_ACTIONS_ON_NEW_CATEGORY = new Set(["menu-add"]);
const ALLOWED_ACTIONS_DEFAULT = new Set(["menu-add", "menu-add-sub"]);
const ALLOWED_ACTIONS_FROM_NOWHERE = new Set(["menu-add", "menu-add-sub"]);

export function showCustomMenu(
  x,
  y,
  { currentDraggingOverCategoryElement, currentCategoryElement }
) {
  customMenu.style.top = y + "px";
  customMenu.style.left = x + "px";
  let allowedActions = ALLOWED_ACTIONS_DEFAULT;
  if (
    // Dragging over new category or empty area
    currentDraggingOverCategoryElement.classList.contains(
      "new-category-title"
    ) ||
    currentDraggingOverCategoryElement.nodeName == "NAV"
  ) {
    allowedActions = setIntersection(
      allowedActions,
      ALLOWED_ACTIONS_ON_NEW_CATEGORY
    );
  }
  if (currentCategoryElement == null) {
    allowedActions = setIntersection(
      allowedActions,
      ALLOWED_ACTIONS_FROM_NOWHERE
    );
  }
  updateCustomMenu(allowedActions, currentDraggingOverCategoryElement);
  customMenu.classList.add("show");
}

export function hideCustomMenu() {
  customMenu.classList.remove("show");
}

export function initCustomMenu(state, categoryTree, updateUI) {
  document.addEventListener("mousedown", (e) => {
    let element = e.target;
    while (element !== customMenu && element != null) {
      element = element.parentElement;
    }
    if (element == null) {
      customMenu.classList.remove("show");
      categoryTree.hideNewCategory();
      categoryTree.hideDragOverHighlight();
      state.currentContactDataFromDragAndDrop = null;
    }
  });
  customMenu.addEventListener("click", async (e) => {
    if (state.currentContactDataFromDragAndDrop == null) {
      console.error("No contact info from drag & drop!");
      return;
    }
    let categoryStr;
    hideCustomMenu();
    const [addressBookId, contactId] =
      state.currentContactDataFromDragAndDrop.split("\n");
    const addressBook = state.addressBooks.get(addressBookId);
    state.allowEdit = false;
    switch (e.target.id) {
      case "menu-add":
        // Get user input if dragging onto [ New Category ]
        categoryStr =
          state.currentDraggingOverCategoryElement.dataset.category ??
          (await getCategoryStringFromInput());
        if (categoryStr == null) break;
        await addContactToCategory({
          addressBook,
          contactId,
          categoryStr,
          virtualAddressBook: state.allContactsVirtualAddressBook,
        });
        break;
      case "menu-add-sub":
        categoryStr = await getCategoryStringFromInput(
          state.currentDraggingOverCategoryElement.dataset.category
        );
        if (categoryStr == null) break;
        await addContactToCategory({
          addressBook,
          contactId,
          categoryStr,
          virtualAddressBook: state.allContactsVirtualAddressBook,
        });
        break;
      default:
        console.error("Unknown action! from", e.target);
        break;
    }
    state.currentContactDataFromDragAndDrop = null;
    categoryTree.hideNewCategory();
    categoryTree.hideDragOverHighlight();
    await updateUI();
    state.allowEdit = true;
  });
}
