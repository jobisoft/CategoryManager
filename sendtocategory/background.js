// Setup WindowListener API 
messenger.WindowListener.registerDefaultPrefs("defaults/preferences/pref.js");

messenger.WindowListener.registerChromeUrl([
  ["content", "sendtocategory",          "content/"],
  ["locale",  "sendtocategory", "de",    "locale/de/"],
  ["locale",  "sendtocategory", "en-US", "locale/en-US/"],
  ["locale",  "sendtocategory", "fr",    "locale/fr/"],
  ["locale",  "sendtocategory", "es-AR", "locale/es-AR/"],
  ["locale",  "sendtocategory", "ru",    "locale/ru/"],
  ["locale",  "sendtocategory", "pt-BR", "locale/pt-BR/"],
  ["locale",  "sendtocategory", "nl",    "locale/nl/"],
]);

messenger.WindowListener.registerOptionsPage("chrome://sendtocategory/content/preferences/preferences.xul");

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/addressbook/addressbook.xul", 
  "chrome://sendtocategory/content/scripts/addressbook.js");
    
messenger.WindowListener.registerWindow(
  "chrome://messenger/content/addressbook/abContactsPanel.xul", 
  "chrome://sendtocategory/content/scripts/abContactsPanel.js");

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/addressbook/abEditCardDialog.xul", 
  "chrome://sendtocategory/content/scripts/abEditCardDialog.js");

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/addressbook/abNewCardDialog.xul", 
  "chrome://sendtocategory/content/scripts/abNewCardDialog.js");

messenger.WindowListener.startListening();
