import data from "../modules/fake-data-provider.mjs";
import { CategoryCollection } from "../modules/category.mjs";
import { createTree } from "./tree.mjs";
import { createContactList } from "./contact-list.mjs";

let collection = CategoryCollection.fromFakeData(data[0]);
let treeData = collection.toTreeData();

console.log(treeData);

let contacts = createContactList([]);
const categoryTitle = document.getElementById("category-title");

let tree = new Tree("#tree", {
  data: treeData,
  onLabelClick: (categoryKey) => {
    if (categoryKey == null) return;
    contacts.data = collection.lookup(categoryKey).contacts;
    categoryTitle.innerText = categoryKey;
    contacts.render();
  },
});
contacts.render();
