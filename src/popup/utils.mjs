import { lookupCategory } from "../modules/address-book/address-book.mjs";

export function lookupContactsByCategoryElement(element, currentAddressBook) {
  // find contacts by an category html element
  const categoryKey = element.dataset.category;
  const isUncategorized = element.dataset.uncategorized != null;
  return lookupCategory(currentAddressBook, categoryKey, isUncategorized)
    .contactKeys;
}
