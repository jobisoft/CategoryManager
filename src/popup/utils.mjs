import { lookupCategory } from "../modules/cache/addressbook.mjs";

export function lookupContactsByCategoryElement(element, addressBook) {
  // Find contacts by an category html element.
  const categoryKey = element.dataset.category;
  const isUncategorized = !!element.dataset.uncategorized;
  return lookupCategory(addressBook, categoryKey, isUncategorized)
    .contacts;
}
