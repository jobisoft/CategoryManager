import data from "../modules/fake-data-provider.mjs";
import { CategoryCollection } from "../modules/category.mjs";
import { Component } from "../modules/ui.mjs";
import { createTree } from "./tree.mjs";

let collection = CategoryCollection.fromFakeData(data[0]);
console.log(collection);

let tree = createTree(collection, (event) => console.log(event.target.dataset));
tree.render();
