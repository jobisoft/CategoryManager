import data from "../modules/fake-data-provider.mjs";
import { AddressBook } from "../modules/category.mjs";
import { createContactList } from "./contact-list.mjs";
import { mapIterator } from "../modules/utils.mjs";
import { createTree } from "./tree.mjs";

let addressBook = AddressBook.fromFakeData(data[2]);
let treeData = addressBook.toTreeData();

console.log(treeData);
const [tab] = await browser.tabs.query({ currentWindow: true, active: true });
const isComposeAction = tab.type == "messageCompose";
let contactList = createContactList(addressBook.contacts);
const categoryTitle = document.getElementById("category-title");
categoryTitle.innerText = addressBook.name;

document.addEventListener("contextmenu", () => {
  console.log(tab);
  browser.menus.overrideContext({ context: "tab", tabId: tab.id });
  console.log("contextmenu");
});

browser.menus.onShown.addListener((info, tab) => {
  // Extra Sugar: Logic to detect if mouse was over a category and enable/disable
  // via menus.update menus (see info.menuIds)
  // You can even change visibility of entries

  // Maybe: https://www.sitepoint.com/community/t/determine-if-mouse-is-over-an-element/4239/4
  console.log(info);
});

browser.menus.onClicked.addListener((info, tab) => {
  console.log(info);
});

function makeFieldUpdatingFunction(fieldName) {
  return async (categoryKey) => {
    const { selectedNodes } = tree;
    // Use email-addresses to parse rfc5322 email addresses.
    // And remove duplicate entries using a Map.
    let map = new Map();
    let details;
    if (isComposeAction) {
      details = await browser.compose.getComposeDetails(tab.id);
      const field = details[fieldName];
      field.forEach((addr) => {
        const { address, name } = emailAddresses.parseOneAddress(addr);
        map.set(address, name);
      });
    } else {
      details = {};
    }

    // retrieve contacts by selected categories and add them to map
    const selectedContacts = addressBook.lookup(categoryKey).contacts;
    for (const { email, name } of selectedContacts) {
      // Respect the user's input.
      if (!map.has(email)) map.set(email, name);
    }

    const emailList = [
      ...mapIterator(map.entries(), ([email, name]) =>
        name ? `${name} <${email}>` : email
      ),
    ];

    if (isComposeAction) {
      // set compose details
      await browser.compose.setComposeDetails(tab.id, {
        ...details,
        [fieldName]: emailList,
      });
    } else {
      // open a new messageCompose window
      await browser.compose.beginNew(null, {
        [fieldName]: emailList,
      });
    }
  };
}

let tree = createTree({
  data: addressBook,
  click(event) {
    if (event.detail > 1) {
      // Disable click event on double click
      event.preventDefault();
      return false;
    }
    console.log(event.target, event.target.dataset);
    const categoryKey = event.target.dataset.category;
    if (categoryKey == null) return;
    contactList.data = addressBook.lookup(categoryKey).contacts;
    categoryTitle.innerText = categoryKey;
    contactList.render();
  },
  async doubleClick(event) {
    const categoryKey = event.target.dataset.category;
    if (categoryKey == null) return;
    contactList.data = addressBook.lookup(categoryKey).contacts;
    // open a new messageCompose window
    await browser.compose.beginNew(null, {
      bcc: contactList.data.map(({ email, name }) =>
        name ? `${name} <${email}>` : email
      ),
    });
    window.close();
  },
});
tree.render();

contactList.render();
