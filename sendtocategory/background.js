async function main() {
  
  // Setup preference handler.
  // The prefBranchHandler.js is loaded by manifest.json into the background page.
  // If all calls to set/get preference outside of the background script have been
  // replaced by runtime messaging or background notifications (through
  // preferences.js from ADS), the used storage backend can be changed just by
  // loading a different preference handler, for example localStorageHandler.js.
  prefBranchHandler.init(
    {
      seperator: "\u001A",
      to_address: "1",
      disable_global_book: true,
    },
    "extensions.sendtocategory."
  );
  prefBranchHandler.enableListeners();

  /*
   * Setup WindowListener API 
   */

  messenger.WindowListener.registerChromeUrl([
    ["content", "sendtocategory",          "content/"]
  ]);

  messenger.WindowListener.registerOptionsPage("chrome://sendtocategory/content/preferences/preferences.xhtml");

  messenger.WindowListener.registerWindow(
    "chrome://messenger/content/addressbook/addressbook.xhtml", 
    "chrome://sendtocategory/content/scripts/addressbook.js");
      
  messenger.WindowListener.registerWindow(
    "chrome://messenger/content/addressbook/abContactsPanel.xhtml", 
    "chrome://sendtocategory/content/scripts/abContactsPanel.js");

  messenger.WindowListener.registerWindow(
    "chrome://messenger/content/addressbook/abEditCardDialog.xhtml", 
    "chrome://sendtocategory/content/scripts/commonCardDialog.js");

  messenger.WindowListener.registerWindow(
    "chrome://messenger/content/addressbook/abNewCardDialog.xhtml", 
    "chrome://sendtocategory/content/scripts/commonCardDialog.js");

  messenger.WindowListener.startListening();
}

main();
