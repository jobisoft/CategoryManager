import data from "../modules/fake-data-provider.mjs";
import { CategoryCollection } from "../modules/category.mjs";

let collection = CategoryCollection.fromFakeData(data[0]);
console.log(collection);
