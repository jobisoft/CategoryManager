import data from "../modules/fake-data-provider.mjs";
import { AddressBook } from "../modules/category.mjs";
import { createContactList } from "./contact-list.mjs";
import { mapIterator } from "../modules/utils.mjs";

let addressBook = AddressBook.fromFakeData(data[2]);
let treeData = addressBook.toTreeData();

console.log(treeData);

let contacts = createContactList(addressBook.contacts);
const categoryTitle = document.getElementById("category-title");
categoryTitle.innerText = addressBook.name;

let tree = new Tree("#tree", {
  data: treeData,
  onLabelClickOrDoubleClick: (categoryKey) => {
    if (categoryKey == null) return;
    contacts.data = addressBook.lookup(categoryKey).contacts;
    categoryTitle.innerText = categoryKey;
    contacts.render();
  },
});

function bindActionToButton(id, f) {
  let button = document.getElementById(id);
  button.addEventListener("click", f, false);
}

function makeButtonEventHandler(fieldName) {
  return async (e) => {
    // No idea on how to grab tab id of the compose window.
    // Using browser.tabs.query as a work around
    const tab = await browser.tabs.query({ currentWindow: true });
    const details = await browser.compose.getComposeDetails(tab[0].id);
    const field = details[fieldName];
    const { selectedNodes } = tree;
    // Use email-addresses to parse rfc5322 email addresses.
    // And remove duplicate entries using a Map.
    let map = new Map();
    field.forEach((addr) => {
      const { address, name } = emailAddresses.parseOneAddress(addr);
      map.set(address, name);
    });

    // retrieve contacts by selected categories and add them to map
    // 1. (TODO) remove sub categories if the parent category is selected
    // 2. add contacts to map
    // The current implementation doesn't remove overlapping categories. Do this optimization in the future.
    selectedNodes.forEach(({ id, status }) => {
      // do not select indeterminate nodes
      if (status != 2) return;
      addressBook.lookup(id).contacts.forEach(({ name, email }) => {
        // Respect the user's input. Do not overwrite user input
        if (!map.has(email)) map.set(email, name);
      });
    });

    // set compose details
    await browser.compose.setComposeDetails(tab[0].id, {
      ...details,
      [fieldName]: [
        ...mapIterator(map.entries(), ([email, name]) =>
          name ? `${name} <${email}>` : email
        ),
      ],
    });

    window.close();
  };
}

bindActionToButton("btn-to", makeButtonEventHandler("to"));
bindActionToButton("btn-cc", makeButtonEventHandler("cc"));
bindActionToButton("btn-bcc", makeButtonEventHandler("bcc"));

contacts.render();
