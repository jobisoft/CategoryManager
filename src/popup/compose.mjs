import { mapIter } from "../modules/iter.mjs";
import { toRFC5322EmailAddress } from "../modules/contact.mjs";
import { id2contact } from "../modules/address-book/index.mjs";

export async function addContactsToComposeDetails(fieldName, state, contacts) {
  const details = await browser.compose.getComposeDetails(state.tab.id);
  const addresses = details[fieldName];
  let map = new Map();
  addresses.forEach((addr) => {
    const { address, name } = emailAddresses.parseOneAddress(addr);
    map.set(address, name);
  });
  Object.keys(contacts).forEach((contactId) => {
    // Add this contact if it doesn't exist in the map
    const { name, email } = state.currentAddressBook.contacts[contactId];
    if (email != null && !map.has(email)) map.set(email, name);
  });
  const emailList = [...mapIter(map.entries(), toRFC5322EmailAddress)];
  // set compose details
  return browser.compose.setComposeDetails(state.tab.id, {
    ...details,
    [fieldName]: emailList,
  });
}

export async function openComposeWindowWithContacts(
  fieldName,
  state,
  contacts
) {
  // Do a filterMap(using a flatMap) to remove contacts that do not have an email address
  // and map the filtered contacts to rfc 5322 email address format.
  const emailList = Object.keys(contacts).flatMap((c) => {
    const contact = id2contact(state.currentAddressBook, c);
    return contact.email == null ? [] : [toRFC5322EmailAddress(contact)];
  });
  return browser.compose.beginNew(null, { [fieldName]: emailList });
}
