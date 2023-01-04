import { lookupCategory } from "../modules/address-book/address-book.mjs";

export function lookupContactsByCategoryElement(addressbookCache, element) {
  // find contacts by an category html element
  const categoryKey = element.dataset.category;
  const isUncategorized = element.dataset.uncategorized != null;
  return lookupCategory(addressbookCache, categoryKey, isUncategorized)
    .contacts;
}
