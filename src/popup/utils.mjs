import state from "./state.mjs";
import { lookupCategory } from "../modules/cache/addressbook.mjs";

export function lookupContactsByCategoryElement(element) {
  // find contacts by an category html element
  const categoryKey = element.dataset.category;
  const isUncategorized = element.dataset.uncategorized != null;
  return lookupCategory(state.currentAddressBook, categoryKey, isUncategorized)
    .contacts;
}
