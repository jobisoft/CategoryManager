import data from "../modules/fake-data-provider.mjs";
import { CategoryCollection } from "../modules/category.mjs";
import { createTree } from "./tree.mjs";
import { createContactList } from "./contact-list.mjs";

let collection = CategoryCollection.fromFakeData(data[0]);
console.log(collection);

let contacts = createContactList();
let tree = createTree(collection, (event) => {
  console.log(event.target, event.target.dataset);
  const categoryKey = event.target.dataset.category;
  if (categoryKey == null) return;
  contacts.data = collection.lookup(categoryKey).contacts;
  contacts.render();
});
tree.render();
