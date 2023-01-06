import { mapIter } from "../modules/iter.mjs";
import { toRFC5322EmailAddress } from "../modules/contacts/contact.mjs";

export async function addContactsToComposeDetails(fieldName, state, contacts) {
  const details = await browser.compose.getComposeDetails(state.tab.id);
  const addresses = details[fieldName];

  let map = new Map();
  addresses.forEach((addr) => {
    const { address, name } = emailAddresses.parseOneAddress(addr);
    map.set(address, name);
  });

  // Remove contacts that do not have an email address and map the filtered
  // contacts to rfc 5322 email address format.
  contacts.forEach(contact => {
    // Add this contact if it doesn't exist in the map
    const { name, email } = contact;
    if (email != null && !map.has(email)) map.set(email, name);
  });

  // Set compose details.
  const emailList = [...mapIter(map.entries(), toRFC5322EmailAddress)];
  return browser.compose.setComposeDetails(state.tab.id, {
    ...details,
    [fieldName]: emailList,
  });
}

export async function openComposeWindowWithContacts(
  fieldName,
  state,
  contacts,
  categoryPath
) {
  let map = new Map();

  // Remove contacts that do not have an email address and map the filtered
  // contacts to rfc 5322 email address format.
  contacts.forEach(contact => {
    const { name, email } = contact;
    if (email != null && !map.has(email)) map.set(email, name);
  });

  // Open compose window.
  const emailList = [...mapIter(map.entries(), toRFC5322EmailAddress)];
  return browser.compose.beginNew(null, {
    [fieldName]: emailList,
    subject: `[${categoryPath}]`,
  });
}
