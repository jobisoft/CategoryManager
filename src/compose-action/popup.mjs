import data from "../modules/fake-data-provider.mjs";
import { CategoryCollection } from "../modules/category.mjs";
import { createTree } from "./tree.mjs";
import { createContactList } from "./contact-list.mjs";

let collection = CategoryCollection.fromFakeData(data[0]);
console.log(collection);

let contacts = createContactList([]);
const categoryTitle = document.getElementById("category-title");
let tree = createTree(collection, (event) => {
  console.log(event.target, event.target.dataset);
  const categoryKey = event.target.dataset.category;
  if (categoryKey == null) return;
  event.target.dataset.selected = "selected";
  contacts.data = collection.lookup(categoryKey).contacts;
  categoryTitle.innerText = categoryKey;
  contacts.render();
});
tree.render();
contacts.render();
