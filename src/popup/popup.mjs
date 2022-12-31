import {
  AddressBook,
  lookupCategory,
  id2contact,
  addContactToCategory,
} from "../modules/address-book.mjs";
import { createContactList } from "./contact-list.mjs";
import { createCategoryTree } from "./category-tree.mjs";
import { createAddressBookList } from "./address-book-list.mjs";
import {
  toRFC5322EmailAddress,
  addContactsToComposeDetails,
} from "../modules/contact.mjs";
import {
  createMenuForCategoryTree,
  createMenuForContactList,
  destroyAllMenus,
} from "../modules/context-menu.mjs";
import { setIntersection } from "../modules/utils.mjs";
// global object: emailAddresses, ICAL, MicroModal from popup.html

// ------------------------------------
//  Initialization & Global Variables
// ------------------------------------

let addressBooks = new Map();

const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
const isComposeAction = tab.type == "messageCompose";

let elementForContextMenu,
  currentCategoryElement,
  currentDraggingOverCategoryElement,
  currentContactIdFromDragAndDrop;

// Default to all contacts
let currentAddressBook = addressBooks.get("all-contacts");

// ---------------
//  helper funcs
// ---------------

function fullUpdateUI() {
  currentAddressBook = addressBooks.get("all-contacts");
  if (currentAddressBook == null)
    document.getElementById("info-text").style.display = "initial";
  categoryTitle.innerText = currentAddressBook?.name ?? "";
  addressBookList.update([...addressBooks.values()]);
  categoryTree.update(currentAddressBook);
  contactList.update({
    addressBook: currentAddressBook,
    contacts: currentAddressBook?.contacts ?? {},
  });
}

function updateUI() {
  categoryTree.update(currentAddressBook);
  contactList.update({
    addressBook: currentAddressBook,
    contacts: currentAddressBook?.contacts ?? {},
  });
  categoryTitle.innerText = currentAddressBook?.name ?? "";
}

function lookupContactsByCategoryElement(element) {
  // find contacts by an category html element
  const categoryKey = element.dataset.category;
  const isUncategorized = element.dataset.uncategorized != null;
  return lookupCategory(currentAddressBook, categoryKey, isUncategorized)
    .contacts;
}

// -------------------
// Native Context Menu
// -------------------

function makeMenuEventHandler(fieldName) {
  return async () => {
    const contacts = lookupContactsByCategoryElement(elementForContextMenu);
    if (isComposeAction) {
      await addContactsToComposeDetails(fieldName, tab, contacts);
    } else {
      // Do a filterMap(using a flatMap) to remove contacts that do not have an email address
      // and map the filtered contacts to rfc 5322 email address format.
      const emailList = Object.keys(contacts).flatMap((c) => {
        const contact = id2contact(currentAddressBook, c);
        return contact.email == null ? [] : [toRFC5322EmailAddress(contact)];
      });
      await browser.compose.beginNew(null, { [fieldName]: emailList });
    }
    window.close();
  };
}

function overrideMenuForCategoryTree() {
  destroyAllMenus();
  createMenuForCategoryTree();
}

function overrideMenuForContactList() {
  destroyAllMenus();
  createMenuForContactList(
    currentAddressBook,
    elementForContextMenu.dataset.id
  );
}

document.addEventListener("contextmenu", (e) => {
  browser.menus.overrideContext({ context: "tab", tabId: tab.id });
  elementForContextMenu = e.target;
  console.log(elementForContextMenu);
  // Check if the right click originates from contact list
  if (elementForContextMenu.parentNode.dataset.id != null) {
    // Right click on contact info
    elementForContextMenu = elementForContextMenu.parentNode;
    overrideMenuForContactList();
    return;
  } else if (elementForContextMenu.dataset.id != null) {
    overrideMenuForContactList();
    return;
  }
  overrideMenuForCategoryTree();
  // Check if the right click originates from category tree
  if (elementForContextMenu.nodeName === "I")
    // Right click on the expander icon. Use the parent element
    elementForContextMenu = elementForContextMenu.parentNode;
  if (elementForContextMenu.dataset.category == null)
    // No context menu outside category tree
    e.preventDefault();
});

const contextMenuHandlers = {
  add_to: makeMenuEventHandler("to"),
  add_cc: makeMenuEventHandler("cc"),
  add_bcc: makeMenuEventHandler("bcc"),
};

browser.menus.onShown.addListener((info, tab) => {
  console.log(info, elementForContextMenu);
});

browser.menus.onClicked.addListener(async ({ menuItemId }, tab) => {
  const handler = contextMenuHandlers[menuItemId];
  if (handler != null) {
    handler();
  } else {
    console.error("No handler for", menuItemId);
  }
});

// -------------------
//    UI Elements
// and event handlers
// -------------------

let contactList = createContactList({
  addressBook: currentAddressBook,
  contacts: currentAddressBook?.contacts ?? {},
});

const categoryTitle = document.getElementById("category-title");
categoryTitle.innerText = currentAddressBook?.name ?? "";
let categoryTree = createCategoryTree({
  data: currentAddressBook,
  click(event) {
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

    if (currentCategoryElement != null)
      currentCategoryElement.classList.remove("active");
    currentCategoryElement = event.target;
    currentCategoryElement.classList.add("active");
    const newData = {
      addressBook: currentAddressBook,
      contacts: lookupContactsByCategoryElement(currentCategoryElement),
    };
    categoryTitle.innerText = categoryKey;
    contactList.update(newData);
  },
  async doubleClick(event) {
    const categoryKey = event.target.dataset.category;
    if (categoryKey == null) return;
    const contacts = lookupContactsByCategoryElement(event.target);
    if (isComposeAction) {
      await addContactsToComposeDetails("bcc", tab, contacts);
    } else {
      // open a new messageCompose window
      await browser.compose.beginNew(null, {
        bcc: Object.keys(contacts).flatMap((c) => {
          const contact = id2contact(currentAddressBook, c);
          return contact.email == null ? [] : [toRFC5322EmailAddress(contact)];
        }),
      });
    }
    window.close();
  },
  dragEnter(e) {
    console.log("Drag Enter");
    this.showNewCategory();
    e.preventDefault();
  },
  showNewCategory() {
    document.getElementsByClassName("new-category")[0].classList.add("show");
  },
  hideNewCategory() {
    document.getElementsByClassName("new-category")[0].classList.remove("show");
  },
  dragOver(e) {
    this.hideDragOverHighlight();
    if (e.target.nodeName === "I" || e.target.nodeName === "#text") {
      // Dragging over the expander or text.
      currentDraggingOverCategoryElement = e.target.parentElement;
    } else if (e.target.nodeName === "DIV") {
      // Dragging over the container of a leaf category
      currentDraggingOverCategoryElement = e.target.children[0];
    } else if (e.target.nodeName === "DETAILS") {
      console.warn("Dragging over details!");
      return;
    } else {
      currentDraggingOverCategoryElement = e.target;
      if (currentDraggingOverCategoryElement.nodeName === "SUMMARY") {
        currentDraggingOverCategoryElement.parentElement.open = true;
      }
    }
    currentDraggingOverCategoryElement.classList.add("drag-over");
    // Do not allow dragging onto uncategorized because it's not a real category.
    e.dataTransfer.dropEffect =
      "uncategorized" in currentDraggingOverCategoryElement.dataset
        ? "none"
        : "copy";

    console.warn(`Dragging onto`, currentDraggingOverCategoryElement);
    e.preventDefault();
  },
  hideDragOverHighlight() {
    if (currentDraggingOverCategoryElement != null) {
      currentDraggingOverCategoryElement.classList.remove("drag-over");
      currentDraggingOverCategoryElement = null;
    }
  },
  dragDrop(e) {
    showCustomMenu(e.pageX, e.pageY);
    const item = e.dataTransfer.items[0];
    if (item.type !== "category-manager/contact") {
      console.error("Invalid item for drag and drop: ", item);
      return;
    }
    item.getAsString((x) => (currentContactIdFromDragAndDrop = x));
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
  dragLeave(e) {
    if (e.target == this.element) {
      console.warn("Leaving tree!");
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
  },
});

let addressBookList = createAddressBookList({
  data: [...addressBooks.values()],
  click(event) {
    const addressBookId = event.target.dataset.addressBook;
    if (addressBookId == null) return;
    currentAddressBook = addressBooks.get(addressBookId);
    currentCategoryElement = null;
    categoryTitle.innerText = currentAddressBook.name;
    categoryTree.update(currentAddressBook);
    contactList.update({
      addressBook: currentAddressBook,
      contacts: currentAddressBook.contacts,
    });
  },
});

addressBookList.render();
categoryTree.render();
contactList.render();

function getCategoryStringFromInput(parentCategory = null) {
  const result = prompt(
    `Please enter a (sub)category. 
You can use ' / '(Space, Forward Slash, Space) as a delimiter for creating subcategories.`
  );
  if (result === null) {
    return null;
  } else if (result.trim() === "") {
    // Whitespace or no input!
    // TODO: Validate user input. e.g. ' / asdasd /  / cxv'
    alert(
      "You have inputted an empty/whitespace string! I don't know what to do!"
    );
    return null;
  }
  return parentCategory == null ? result : parentCategory + " / " + result;
}

// ---------------------------
//  Communication with cache
// ---------------------------

let myPort = browser.runtime.connect({ name: "sync" });
myPort.postMessage({ type: "fullUpdate" });
myPort.onMessage.addListener(({ type, args }) => {
  console.log(`Received ${type}`, args);
  messageHandlers[type](args);
});

let messageHandlers = {
  fullUpdate(args) {
    addressBooks = args;
    // The addressBooks lose their prototype in communication
    for (let value of addressBooks.values()) {
      Object.setPrototypeOf(value, AddressBook.prototype);
    }
    fullUpdateUI();
  },
};

// -------------------------------------------------------
// Custom Context Menu for drag and drop on category tree
// -------------------------------------------------------

let customMenu = document.getElementById("custom-menu");

document.addEventListener("mousedown", (e) => {
  let element = e.target;
  while (element !== customMenu && element != null) {
    element = element.parentElement;
  }
  if (element == null) {
    customMenu.classList.remove("show");
    categoryTree.hideNewCategory();
    categoryTree.hideDragOverHighlight();
    currentContactIdFromDragAndDrop = null;
  }
});

function updateCustomMenu(allowedActions) {
  for (const item of customMenu.children) {
    item.style.display = allowedActions.has(item.id) ? "block" : "none";
  }
}

const ALLOWED_ACTIONS_ON_NEW_CATEGORY = new Set(["menu-add", "menu-move"]);
const ALLOWED_ACTIONS_DEFAULT = new Set([
  "menu-add",
  "menu-add-sub",
  "menu-move",
  "menu-move-sub",
]);
const ALLOWED_ACTIONS_FROM_NOWHERE = new Set(["menu-add", "menu-add-sub"]);

function showCustomMenu(x, y) {
  customMenu.style.top = y + "px";
  customMenu.style.left = x + "px";
  let allowedActions = ALLOWED_ACTIONS_DEFAULT;
  console.log(currentDraggingOverCategoryElement);
  if (
    currentDraggingOverCategoryElement.classList.contains("new-category-title")
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
  updateCustomMenu(allowedActions);
  customMenu.classList.add("show");
}

customMenu.addEventListener("click", (e) => {
  if (currentContactIdFromDragAndDrop == null) {
    console.error("No contact info from drag & drop!");
    return;
  }
  let category;
  switch (e.target.id) {
    case "menu-add":
      // Get user input if dragging onto [ New Category ]
      category =
        currentDraggingOverCategoryElement.dataset.category ??
        getCategoryStringFromInput();
      addContactToCategory(
        currentAddressBook,
        currentContactIdFromDragAndDrop,
        category.split(" / ")
      );
      break;
    case "menu-add-sub":
      category = getCategoryStringFromInput(
        currentDraggingOverCategoryElement.dataset.category
      );
      addContactToCategory(
        currentAddressBook,
        currentContactIdFromDragAndDrop,
        category.split(" / ")
      );
      break;
    case "menu-move":
      break;
    case "menu-move-sub":
      break;
    default:
      console.error("Unknown action! from", e.target);
      break;
  }
  currentContactIdFromDragAndDrop = null;
  customMenu.classList.remove("show");
  categoryTree.hideNewCategory();
  categoryTree.hideDragOverHighlight();
  updateUI();
});
