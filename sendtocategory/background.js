// Setup WindowListener API 
messenger.WindowListener.registerDefaultPrefs("defaults/preferences/pref.js");

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
