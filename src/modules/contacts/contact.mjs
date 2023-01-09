/**
 * This module includes methods to access Thunderbird contacts and read, parse and
 * update their vcard strings.
 */

import {
  removeImplicitCategories,
  expandImplicitCategories,
} from "../cache/index.mjs";
import { arrayEqual, printToConsole } from "../utils.mjs";
// global object: ICAL from external ical.js

const ERR_OPERATION_CANCEL = await browser.i18n.getMessage(
  "errors.operation-cancel"
);
const ERR_CONTACT_UPDATE_FAILURE = await browser.i18n.getMessage(
  "errors.contact-update-failure"
);
const ERR_OPCANCEL_UPDATE_FAILURE =
  ERR_OPERATION_CANCEL + " " + ERR_CONTACT_UPDATE_FAILURE;
const ERR_HINT_MOST_LIKELY = await browser.i18n.getMessage(
  "errors.hint.most-likely"
);
const ERR_HINT_COMMON_REASONS = await browser.i18n.getMessage(
  "errors.hint.common-reasons"
);
const ERR_REASON_ADDRESS_BOOK_READONLY = await browser.i18n.getMessage(
  "errors.reason.address-book-readonly"
);
const ERR_REASON_CONTACT_CHANGED = await browser.i18n.getMessage(
  "errors.reason.contact-changed"
);

export function getError(str, id) {
  const error = new Error(`${str}
  ${ERR_HINT_COMMON_REASONS}
  1. ${id === 1 ? ERR_HINT_MOST_LIKELY : ""}${ERR_REASON_ADDRESS_BOOK_READONLY}
  2. ${id === 2 ? ERR_HINT_MOST_LIKELY : ""}${ERR_REASON_CONTACT_CHANGED}`);
  error.id = id;
  return error;
}

/**
 * Modify the category string of a vCard.
 * 
 * @param {*} contact - contact to work on
 * @param {array} categories - new categories
 */
export async function updateCategoriesForVCard(contact, categories) {
  const {
    properties: { vCard },
  } = await browser.contacts.get(contact.id);
  const component = new ICAL.Component(ICAL.parse(vCard));

  const newCategories = removeImplicitCategories(categories)
  const cachedCategories = removeImplicitCategories([...contact.categories]);
  const backendCategories = removeImplicitCategories(
    component.getAllProperties("categories").flatMap((x) => x.getValues())
  );

  if (!arrayEqual(backendCategories, cachedCategories)) {
    printToConsole.error("Categories have been changed outside category manager!");
    printToConsole.log("Currently stored categories", structuredClone(backendCategories));
    printToConsole.log("Currently cached categories", structuredClone(cachedCategories));
    throw getError(ERR_OPCANCEL_UPDATE_FAILURE, 2);
  }

  if (arrayEqual(backendCategories, newCategories)) {
    // No change, return
    printToConsole.warn("No change made to the vCard!");
    return;
  }

  // Store new categories.
  component.removeAllProperties("categories");
  if (newCategories.length > 0) {
    var categoriesProperty = new ICAL.Property("categories");
    categoriesProperty.setValues(newCategories);
    component.addProperty(categoriesProperty);
  }

  const newVCard = component.toString();
  printToConsole.log("new vCard:", newVCard);
  try {
    await browser.contacts.update(contact.id, { vCard: newVCard });
  } catch (e) {
    printToConsole.error("Error when updating contact: ", e);
    throw getError(ERR_OPCANCEL_UPDATE_FAILURE, 1);
  }
  return null;
}

export function parseContact({
  id,
  parentId,
  properties: { vCard, DisplayName },
}) {
  const component = new ICAL.Component(ICAL.parse(vCard));
  const categories = expandImplicitCategories(component
    .getAllProperties("categories")
    .flatMap((x) => x.getValues())
  );
  return {
    id,
    addressBookId: parentId,
    email: component.getFirstPropertyValue("email"),
    name: DisplayName,
    categories: new Set(categories),
  };
}

export function toRFC5322EmailAddress(value) {
  // Accepts: [email, name] or { email, name }
  let email, name;
  if (Array.isArray(value)) {
    [email, name] = value;
  } else {
    ({ email, name } = value);
  }
  return name ? `${name} <${email}>` : email;
}
