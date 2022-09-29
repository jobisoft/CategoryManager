import data from "../modules/fake-data-provider.mjs";
import { AddressBook } from "../modules/category.mjs";
import { createContactList } from "./contact-list.mjs";

let collection = AddressBook.fromFakeData(data[0]);
let treeData = collection.toTreeData();

console.log(treeData);

let contacts = createContactList([]);
const categoryTitle = document.getElementById("category-title");

let tree = new Tree("#tree", {
  data: treeData,
  onLabelClickOrDoubleClick: (categoryKey) => {
    if (categoryKey == null) return;
    contacts.data = collection.lookup(categoryKey).contacts;
    categoryTitle.innerText = categoryKey;
    contacts.render();
  },
});
contacts.render();
