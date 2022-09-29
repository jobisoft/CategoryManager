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
});
contacts.render();
