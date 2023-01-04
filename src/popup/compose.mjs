import { mapIter } from "../modules/iter.mjs";
import { toRFC5322EmailAddress } from "../modules/contact.mjs";

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
  await browser.compose.setComposeDetails(state.tab.id, {
    ...details,
    [fieldName]: emailList,
  });
}
