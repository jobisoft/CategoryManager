//create jbCatMan namespace
var jbCatMan = {};



//copied from sgo-connector
jbCatMan.jsInclude = function (files, target) {
  let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
  for (let i = 0; i < files.length; i++) {
    jbCatMan.dump("Trying to load: " + files[i] + "\n");
    try {
      loader.loadSubScript(files[i], target);
    }
    catch(e) {
      jbCatMan.sogoError = jbCatMan.sogoError + "category_tools.js failed to include '" + files[i] + "' (" + e + ")\n";
    }
  }
}



jbCatMan.quickdump = function (str) {
    Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logStringMessage("[CatMan] " + str);
}
jbCatMan.dump = function (str,lvl) {
/*  if (jbCatMan.printDumps) {
    //to see dump messages, follow instructions here: https://wiki.mozilla.org/Thunderbird:Debugging_Gloda
    //also enable "javascript.options.showInConsole" and "javascript.options.strict"
    let d = new Date();
    let n = d.getTime();
    if (lvl<0) {
      let debugs =  jbCatMan.printDebugCounts[jbCatMan.printDumpsIndent];
      if (debugs > 0) dump("[CategoryManager @ " + n + "] " + jbCatMan.printDumpsIndent + "Supressed debug messages: " +debugs + "\n");
      jbCatMan.printDebugCounts[jbCatMan.printDumpsIndent] = 0;
      jbCatMan.printDumpsIndent = jbCatMan.printDumpsIndent.slice(0, -2);
    }
    dump("[CategoryManager @ " + n + "] " + jbCatMan.printDumpsIndent + str + "\n");
    if (lvl>0) {
      jbCatMan.printDumpsIndent = jbCatMan.printDumpsIndent + "  ";
      jbCatMan.printDebugCounts[jbCatMan.printDumpsIndent] = 0;
    }
  }*/
}






jbCatMan.getLocalizedMessage = function (msg, replacement = "") {
  let bundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService).createBundle("chrome://sendtocategory/locale/bundle.strings");
  let localized = msg;
  try {
    localized = bundle.GetStringFromName(msg).replace("####", replacement);
  } catch (e) {}
  
  return localized;
}



jbCatMan.init = function () { 
  //enable or disable debug dump messages
  jbCatMan.printDumps = false;
  jbCatMan.printDumpsIndent = " ";
  jbCatMan.sogoError  = "";

  jbCatMan.isMFFABInstalled = jbCatMan.checkIfMFFABInstalled(); //we only need to do this once
  jbCatMan.printDebugCounts = Array();
  jbCatMan.printDebugCounts[jbCatMan.printDumpsIndent] = 0;
  
  jbCatMan.dump("Begin with init()",1);
  
  jbCatMan.eventUpdateTimeout = null;
  jbCatMan.eventSOGoSyncTimeout = null;

  //locale object to store names from locale file
  jbCatMan.locale = {};

  //SOGoSync related stuff
  jbCatMan.sogoInstalled = false;
  jbCatMan.sogoSyncRequest = {};

  //SynchronizeGroupdavAddressbook is def in sync.addressbook.groupdav.js
  //isGroupdavDirectory is def in /sync.addressbook.groupdav.js which is included by sync.addressbook.groupdav.js
  if (typeof(SynchronizeGroupdavAddressbook) != "function") {
    jbCatMan.jsInclude(["chrome://sogo-connector/content/general/sync.addressbook.groupdav.js"]);
  }

  //Verify
  if (typeof(SynchronizeGroupdavAddressbook)  != "function") {
    jbCatMan.dump("SOGo function 'SynchronizeGroupdavAddressbook' is not defined.");
  } else if (typeof(isGroupdavDirectory) != "function") {
    jbCatMan.dump("SOGo function 'isGroupdavDirectory' is not defined.");
  } else {
    jbCatMan.sogoInstalled = true;
  }

  //data object for bulkedit dialog
  jbCatMan.bulk = {};
  
  //data object for category data
  jbCatMan.data = {};
  
  //mainly managed by jbCatMan.scanCategories()
  jbCatMan.data.foundCategories = [];
  jbCatMan.data.categoryList = [];
  jbCatMan.data.bcc = [];
  jbCatMan.data.membersWithoutAnyEmail = [];
  jbCatMan.data.emails = [];
  jbCatMan.data.abSize = 0;
  //create a map between directoryIds und abURI, so we can get the abURI for each card even if its directory is not known when using the global address book
  jbCatMan.data.abURI = [];

  //managed by addressbook_overlay.js
  jbCatMan.data.selectedCategory = "";
  jbCatMan.data.emptyCategories = [];

  // Add listener for card changes to init sync
  jbCatMan.AbListenerToInitSOGoSync.add();
   window.addEventListener("unload", function unloadListener(e) {
        window.removeEventListener("unload", unloadListener, false);
        jbCatMan.AbListenerToInitSOGoSync.remove();
      }, false);

  jbCatMan.dump("Done with init()",-1);
}





//##############################################
// SOGoSync related functions
//##############################################

/* 
  A SOGo sync is initiated by jbCatMan.modifyCard which sets a SOGoSyncRequest. The 
  following itemPropertyChanged event will trigger a SOGoSync, if there is a valid request.
*/
jbCatMan.AbListenerToInitSOGoSync = {

  onItemPropertyChanged: function AbListenerToInitSOGoSync_onItemPropertyChanged(aItem, aProperty, aOldValue, aNewValue) {
    if (aItem instanceof Components.interfaces.nsIAbCard) {
      window.clearTimeout(jbCatMan.eventSOGoSyncTimeout);
      jbCatMan.eventSOGoSyncTimeout = window.setTimeout(function() { jbCatMan.dump("Begin trigger by onItemPropertyChanged(SOGoSync)",1); jbCatMan.initSOGoSync(); jbCatMan.dump("Done trigger by onItemPropertyChanged(SOGoSync)",-1);}, 1000);
    }
  },

  add: function AbListenerToInitSOGoSync_add() {
    if (Components.classes["@mozilla.org/abmanager;1"]) {
      // Thunderbird 3+
      Components.classes["@mozilla.org/abmanager;1"]
                .getService(Components.interfaces.nsIAbManager)
                .addAddressBookListener(jbCatMan.AbListenerToInitSOGoSync, Components.interfaces.nsIAbListener.all);
    } else {
      // Thunderbird 2
      Components.classes["@mozilla.org/addressbook/services/session;1"]
                .getService(Components.interfaces.nsIAddrBookSession)
                .addAddressBookListener(jbCatMan.AbListenerToInitSOGoSync, Components.interfaces.nsIAbListener.all);
    }
  },

  remove: function AbListenerToInitSOGoSync_remove() {
    if (Components.classes["@mozilla.org/abmanager;1"]) {
      // Thunderbird 3+
      Components.classes["@mozilla.org/abmanager;1"]
                .getService(Components.interfaces.nsIAbManager)
                .removeAddressBookListener(jbCatMan.AbListenerToInitSOGoSync);
    } else {
      // Thunderbird 2
      Components.classes["@mozilla.org/addressbook/services/session;1"]
                .getService(Components.interfaces.nsIAddrBookSession)
                .removeAddressBookListener(jbCatMan.AbListenerToInitSOGoSync);
    }
  }
};



/*
  Get the parent book, if it is a mailinglist
*/
jbCatMan.getWorkAbUri = function(book) {
  if (book.isMailList) {
    return GetParentDirectoryFromMailingListURI(book.URI);
  } else {
    return book.URI;
  }
}



/*
  If the selected book is a mailinglist, add the given card (if not already added)
*/
jbCatMan.updateMailinglist = function(abUri, selectedBook, card) {
  if (selectedBook.isMailList) {
    
    //is card already part of selectedBook?
    let UID = jbCatMan.getUIDFromCard(card);
    if (jbCatMan.getCardFromUID(UID, selectedBook.URI)) 
      return;
    
    //find this mailinglist card (nsIAbCard) in the parent directory (selectedBook.URI == mailListCard.mailListURI)
    let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
    let result = abManager.getDirectory(abUri + "?(or(IsMailList,=,TRUE))").childCards;
    while (result.hasMoreElements()) {
      let mailListCard = result.getNext().QueryInterface(Components.interfaces.nsIAbCard);
      if (mailListCard.mailListURI == selectedBook.URI) {
        //mailListCard is the card representing the selected mailinglist in the parent directory - add card to mailinglist directory
        let mailListDirectory = abManager.getDirectory(mailListCard.mailListURI);
        mailListDirectory.addressLists.appendElement(card, false);
        mailListDirectory.editMailListToDatabase(mailListCard);
        return;
      }
    }
  }
}



/* 
  Save a given card using the internal mapping between the directoryId (attribute of card) 
  and directoryURI, so all cards can be modified, even if the directoryURI is not known. 
  Also does all SOGoSync related stuff.
*/
jbCatMan.modifyCard = function (card) {
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);

  let selectedBook = abManager.getDirectory(GetSelectedDirectory());
  let abUri;

  //Get abUri, if the global book is selected, get the true card owner from directory.Id
  if (selectedBook.URI == "moz-abdirectory://?") {
      if (card.directoryId == "") throw { name: "jbCatManException", message: "Found card in global book without directoryId (cannot add cards to global book).", toString: function() { return this.name + ": " + this.message; } };
      abUri = jbCatMan.data.abURI[card.directoryId];
  } else abUri = jbCatMan.getWorkAbUri(selectedBook);

  //SOGo stuff
  if (jbCatMan.sogoInstalled && isGroupdavDirectory(abUri)) { //TODO - what about sogo books with deactivated sogo?
    let oldDavVersion = card.getProperty("groupDavVersion", "-1");
    card.setProperty("groupDavVersion", "-1"); 
    card.setProperty("groupDavVersionPrev", oldDavVersion);
  }
  
  //Get the working directory
  let ab = abManager.getDirectory(abUri);

  //Check, if the card needs to be added  to the working directory - not allowed for global addressbook (we would have thrown already in that case)
  if (card.directoryId == "") {
      //add card to address book
      let newCard = ab.addCard(card);
      //also add card to mailinglist, if needed
      jbCatMan.updateMailinglist(abUri, selectedBook, newCard);
  } else {
    //save card changes
    ab.modifyCard(card);
    //if the selected book is a mailinglist, but the modified card is not in the mailinglist -> add
    jbCatMan.updateMailinglist(abUri, selectedBook, card);
  }
  
  //Keep track of books which need to by synced
  if (jbCatMan.sogoInstalled && isGroupdavDirectory(abUri)) { //TODO - what about sogo books with deactivated sogo?
    jbCatMan.sogoSyncRequest[abUri] = true;
  }

  return abUri;
}



/* Init requested SOGo syncs */
jbCatMan.initSOGoSync = function () {
  if (jbCatMan.sogoInstalled) {
    //check all entries in jbCatMan.sogoSyncRequest
    for (var abUri in jbCatMan.sogoSyncRequest) {
      if (jbCatMan.sogoSyncRequest[abUri] == true && isGroupdavDirectory(abUri)) { //TODO - what about sogo books with deactivated sogo?
        jbCatMan.dump("Sync <"+abUri+"> using sogo-connector.");
        jbCatMan.sogoSyncRequest[abUri] = false;
        SynchronizeGroupdavAddressbook(abUri);
      } else {
        jbCatMan.dump("Skipping sync of <"+abUri+">.");
      }
    }
  }
}





//##############################################
// UI related functions
//##############################################

jbCatMan.updatePeopleSearchInput = function (name) {
  jbCatMan.dump("Begin with updatePeopleSearchInput()",1);
  if (name == "") {
    document.getElementById("peopleSearchInput").value = "";
  } else {
    document.getElementById("peopleSearchInput").value = jbCatMan.locale.prefixForPeopleSearch + ": " + name
  }
  jbCatMan.dump("Done with updatePeopleSearchInput()",-1);
}


jbCatMan.getCategorySearchString = function(abURI, category) {
    if (category == "") return abURI;

    let searchKeys = "";
    // encodeURIComponent does NOT encode brackets "(" and ")" - need to do that by hand
    let sep = jbCatMan.getCategorySeperator();
    let field = jbCatMan.getCategoryField();
    searchKeys = searchKeys + "("+field+",bw,"+encodeURIComponent( category + sep ).replace("(","%28").replace(")","%29") +")";
    searchKeys = searchKeys + "("+field+",ew,"+encodeURIComponent( sep + category ).replace("(","%28").replace(")","%29") +")";
    searchKeys = searchKeys + "("+field+",c,"+encodeURIComponent( sep + category + sep ).replace("(","%28").replace(")","%29") +")";
    searchKeys = searchKeys + "("+field+",=,"+encodeURIComponent( category ).replace("(","%28").replace(")","%29") +")";

    return abURI + "?" + "(or" + searchKeys + ")";
}

jbCatMan.doCategorySearch = function () {
  jbCatMan.dump("Begin with doCategorySearch()",1);
  let abURI = GetSelectedDirectory();

  if (document.getElementById("CardViewBox") != null) {
    ClearCardViewPane();
  }

  // update results pane based on selected category
  if ( jbCatMan.data.selectedCategory == "" ) {
    SetAbView(abURI);
    SelectFirstCard();
  } else {

    let searchString = jbCatMan.getCategorySearchString(abURI, jbCatMan.data.selectedCategory);
    jbCatMan.dump("SearchString is <"+searchString+">");
    
    //Filter by categories - http://mxr.mozilla.org/comm-central/source/mailnews/addrbook/src/nsAbQueryStringToExpression.cpp#278
    SetAbView(searchString);
    if (document.getElementById("CardViewBox") != null && jbCatMan.data.selectedCategory in jbCatMan.data.foundCategories) {
      SelectFirstCard();  
    }
  }
  
  jbCatMan.updatePeopleSearchInput(jbCatMan.data.selectedCategory);
  jbCatMan.dump("Done with doCategorySearch()",-1);  
}





//##############################################
// cards related functions
//##############################################

// each local card has a unique property DbRowID, which can be used to get (search) this card (not working with LDAP)
// however, it is not unique across different abooks -> append directoryId
jbCatMan.getUIDFromCard = function (card) {
  jbCatMan.dump("Begin with getUIDFromCard()",1);
  
  let DbRowID = "";
  
  try {
    DbRowID = card.getPropertyAsAString("DbRowID"); //DbRowID is not avail on LDAP directories, but since we cannot modify LDAP directories, CatMan is not working at all on LDAP (isRemote)
  } catch (ex) {}

  jbCatMan.dump("Done with getUIDFromCard()",-1);
  return DbRowID + "\u001A" + card.directoryId
}




// this function expects to be run on a single book only (so DbRowID is unique enough), otherwise the full UID needs to be used to get the card 
jbCatMan.getCardFromUID = function (UID, abURI) {
  jbCatMan.dump("Begin with getCardFromUID("+UID+")",1);
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);

  let UIDS = UID.split("\u001A");
  let DbRowID = UIDS[0];
  
  let UUIDQuery = "(DbRowID,=,@V)";
  let searchQuery = UUIDQuery.replace(/@V/g, encodeURIComponent(DbRowID));

  let result = abManager.getDirectory(abURI + "?" + "(or" + searchQuery + ")").childCards;
  if (result.hasMoreElements()) {
    jbCatMan.dump("Done with getCardFromUID()",-1);
    return result.getNext().QueryInterface(Components.interfaces.nsIAbCard);
  } else {
    jbCatMan.dump("Done with getCardFromUID()",-1);
    return null;
  }
}



jbCatMan.moveCategoryBetweenArrays = function (category, srcArray, dstArray) {
    let removedCats = [];

    //remove from srcArray
    let startAt = (category == "") ? 0 : srcArray.indexOf(category);
    let howmany = (category == "") ? srcArray.length : 1;
    while (startAt != -1) {
        removedCats = srcArray.splice(startAt, howmany); //returns an array with the removed cat - if a single cat is present multiple times, we still get an array with only one entry (it gets overwritten)
        startAt = srcArray.indexOf(category);
    }

    //add all removed cats to dstArray 
    for (let i=0; i<removedCats.length; i++) {
        if (dstArray.indexOf(removedCats[i]) == -1) dstArray.push(removedCats[i]);
    }
}

//MFFAB integration stuff
jbCatMan.convertCategory = function (abURI, category) {
    //get all cards, which are part of the category we want to convert (is empty if all cats get converted)
    let searchstring = jbCatMan.getCategorySearchString(abURI, category);
    let cards = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager).getDirectory(searchstring).childCards;

    while (cards.hasMoreElements()) {
        let card = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);

        let mffabCatArray = jbCatMan.getCategoriesfromCard(card, "Category");
        let standardCatArray = jbCatMan.getCategoriesfromCard(card, "Categories");

        //if a single cat is to be converted, we take that cat out of the old property and put it into the other property
        //if all cats are to be converted, we take out ALL cats from the old prop and add all found cats to the other property
        if (jbCatMan.isMFFABCategoryMode()) { //convert from MFFAB to standard
            jbCatMan.moveCategoryBetweenArrays(category, mffabCatArray, standardCatArray);
        } else { //convert from standard to MFFAB
            jbCatMan.moveCategoryBetweenArrays(category, standardCatArray, mffabCatArray);
        }
        
        jbCatMan.setCategoriesforCard(card, mffabCatArray, "Category");
        jbCatMan.setCategoriesforCard(card, standardCatArray, "Categories");
        jbCatMan.modifyCard(card);
    }
}


jbCatMan.checkIfMFFABInstalled = function () {
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    let sep = "";
    try {
        sep = prefs.getCharPref("morecols.category.separator");
    } catch (ex) {}
    if (sep != "") return true;
    else return false;
}

jbCatMan.isMFFABCategoryMode = function () {
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    //make sure, if MFFAB mode is activated, we can actually get the seperator
    //switch back to standard mode, if not possible
    if (prefs.getBoolPref("extensions.sendtocategory.mffab_mode")) {
        //user requested MFFAB mode, is MFFAB installed?
        if (jbCatMan.isMFFABInstalled) return true;
            
        //if we are still here, MFAAB is not installed, switch to default mode
        prefs.setBoolPref("extensions.sendtocategory.mffab_mode",false); 
    } 
    return false;
}

jbCatMan.getCategorySeperator = function (field = jbCatMan.getCategoryField()) {
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    
    if (field == "Category") return prefs.getCharPref("morecols.category.separator") + " ";
    else return prefs.getCharPref("extensions.sendtocategory.seperator");
}

jbCatMan.getCategoryField = function (mode = jbCatMan.isMFFABCategoryMode()) {
    //everytime we switch books, this information is re-querried
    if (mode) return "Category";
    else return "Categories";
}





jbCatMan.getCategoriesFromString = function(catString, seperator = jbCatMan.getCategorySeperator()) {
  let catsArray = [];
  if (catString.trim().length>0) catsArray = catString.split(seperator).filter(String);
  return catsArray;
}

jbCatMan.getStringFromCategories = function(catsArray, seperator = jbCatMan.getCategorySeperator()) {
  if (catsArray.length == 0) return "";
  else {
    let checkedArray = [];
    for (let i = 0; i < catsArray.length; i++) {
      if (catsArray[i] && catsArray[i] != "" && checkedArray.indexOf(catsArray[i]) == -1) {
        checkedArray.push(catsArray[i]);
      }
    }
    return checkedArray.join(seperator);
  }
}

jbCatMan.getCategoriesfromCard = function (card, field = jbCatMan.getCategoryField()) {
  let catString = "";
  try {
    catString = card.getPropertyAsAString(field);
  } catch (ex) {}
  let catsArray = jbCatMan.getCategoriesFromString(catString, jbCatMan.getCategorySeperator(field));
  return catsArray;
}

jbCatMan.setCategoriesforCard = function (card, catsArray,  field = jbCatMan.getCategoryField()) {
  jbCatMan.dump("Begin with setCategoriesforCard()",1);
  let retval = true;

  // sanity check
  if (card.isMailList)
    return false;
  
  let catsString = jbCatMan.getStringFromCategories(catsArray, jbCatMan.getCategorySeperator(field));

  try {
     card.setPropertyAsAString(field, catsString);
  } catch (ex) {
    jbCatMan.dump("Could not set Categories.\n");
    retval = false;
  }
  jbCatMan.dump("Done with setCategoriesforCard()",-1);
  return retval;
}



jbCatMan.getEmailFromCard = function (card) {
  if (card.primaryEmail) return card.primaryEmail
  else {
    let email = "";
    try {
      email = card.getPropertyAsAString("SecondEmail");
    } catch (ex) {}
    return email;
  }
}



jbCatMan.getUserNamefromCard = function (card) {
  jbCatMan.dump("Begin with getUserNamefromCard()",1);
  let userName = "";
  let fallback = jbCatMan.locale.bulkEditNoName;
  // if no name is present, but an email, use the first part of the email as fallback for name - this is how TB is doing it as well
  if (card.primaryEmail) fallback = card.primaryEmail.split("@")[0];
  
  try {
      userName = card.getPropertyAsAString("DisplayName"); 
  } catch (ex) {}
  if (userName == "") try {
      userName = card.getPropertyAsAString("FirstName") + " " + card.getPropertyAsAString("LastName");
  } catch (ex) {}
  if (userName == "") userName = fallback;

  jbCatMan.dump("Done with getUserNamefromCard()",-1);
  return userName;
}



jbCatMan.updateCategories = function (mode,oldName,newName) {
  jbCatMan.dump("Begin with updateCategories("+mode+","+oldName+","+newName+")",1);
  //get address book manager
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
  let addressBook = abManager.getDirectory(GetSelectedDirectory()); //GetSelectedDirectory() returns an URI, but we need the directory itself

  let cards = addressBook.childCards;

  while (true) {
    let more = false;
    try { more = cards.hasMoreElements() } catch (ex) {} 
    if (!more) break;
    let card = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
    let catArray = jbCatMan.getCategoriesfromCard(card);
    let rebuildCatArray = [];
        
    if (catArray.length > 0) {  
      let writeCategoriesToCard = false;
      for (let i=0; i < catArray.length; i++) {
        //Before we process this card, we check for a category delete or category rename request and do the manipulation on the fly, writeback is done later
        if (mode == "rename" && catArray[i] == oldName) {
          catArray[i] = newName;
          writeCategoriesToCard = true;
        }
        if (mode == "remove" && catArray[i] == oldName) {
          writeCategoriesToCard = true;
          continue;
        }
        //It is easier to build a new array, instead of deleting an entry out of an array, which is being looped
        rebuildCatArray.push(catArray[i]);
      }
      
      //was there a manipulation of the card due to rename or delete request? If so, write that into the card
      if (writeCategoriesToCard) {
        jbCatMan.setCategoriesforCard(card, rebuildCatArray)
        jbCatMan.modifyCard(card);
      }
    }
  }

  jbCatMan.dump("Done with updateCategories()",-1);
}



jbCatMan.scanCategories = function (abURI, field = jbCatMan.getCategoryField(), quickscan = false) {
  jbCatMan.dump("Begin with scanCategories()",1);

  //get address book manager
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        

  //concept decision: we remove empty categories on addressbook switch (select) 
  //-> the category array is constantly cleared and build from scan results
  let data = {};
  if (quickscan === false) data = jbCatMan.data;

  data.foundCategories = [];
  data.categoryList = [];
  data.bcc = [];
  data.membersWithoutAnyEmail = [];
  data.emails = [];
  data.abSize = 0;
  data.abURI = [];
  
  // scan all addressbooks, if this is the new root addressbook (introduced in TB38)
  // otherwise just scan the selected one
  let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtocategory.");
  let addressBooks = [];

  if (abURI == "moz-abdirectory://?") {
    let allAddressBooks = abManager.directories;
    while (allAddressBooks.hasMoreElements()) {
       let abook = allAddressBooks.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
       if (abook instanceof Components.interfaces.nsIAbDirectory) { // or nsIAbItem or nsIAbCollection
        addressBooks.push(abook.URI);
       }
    }
  } else {
      addressBooks.push(abURI); //GetSelectedDirectory() returns the URI
  }

  for (var l = 0; l < addressBooks.length; l++) {
    let addressBook = null;
    if (addressBooks[l]) addressBook = abManager.getDirectory(addressBooks[l]); //addressBooks contains URIs, but we need the directory itself
    else continue;

    /* Skip LDAP directories: They are never loaded completely, but just those contacts matching a search result.
       If only those are scanned, the user never knows, if a listed category contains all category members or not.
       The function "send email to category" is rendered useless. */
    if (addressBook.isRemote) continue;

    jbCatMan.dump("Scanning <"+addressBook.URI+">");
    let cards = addressBook.childCards;
    while (true) {
      let more = false;
      try { more = cards.hasMoreElements() } catch (ex) {} 
      if (!more) break;

      let card = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
      data.abSize++;

      //Keep track of mapping between directoryID and abURI, to get the owning AB for each card
      if (card.directoryId in data.abURI == false) {
        data.abURI[card.directoryId] = addressBook.URI;
      }

      let catArray = jbCatMan.getCategoriesfromCard(card, field);
      if (catArray.length > 0) {
        //this person belongs to at least one category, extract UUID
        let CardID = jbCatMan.getUIDFromCard(card);
        
        //add card to all categories it belongs to
        for (let i=0; i < catArray.length; i++) {
          //is this category known already?
          //-> foundCategories is using Strings as Keys
          if (catArray[i] in data.foundCategories == false) {
            data.foundCategories[catArray[i]] = [];
            data.bcc[catArray[i]] = [];
            data.membersWithoutAnyEmail[catArray[i]] = 0;
            data.emails[catArray[i]] = [];
            data.categoryList.push(catArray[i]);
          }
          
          //add card to category
          data.foundCategories[catArray[i]].push(CardID);
          
          //add card to emails-list and bcc-list (if an email is defined)
          let email = jbCatMan.getEmailFromCard(card);
          if (email) {
            data.emails[catArray[i]].push(email);
            let bccfield = "";
            if (card.displayName != "") {
              bccfield = "\"" + card.displayName + "\"" + " <" + email + ">";
            } else {
              bccfield = email;
            }
            data.bcc[catArray[i]].push(bccfield);
          } else {
            data.membersWithoutAnyEmail[catArray[i]]++;
          }
        }
      }
    }
  }
  data.categoryList.sort();

  //clear SOGo categories if present - we do not use them
  if (jbCatMan.sogoInstalled){
    let prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    prefService.setCharPref("sogo-connector.contacts.categories", "");
  }
  
  jbCatMan.dump("Done with scanCategories()",-1);
  return data.categoryList;
}




//###################################################
// override global functions
//###################################################

/********************************************************************************
 SelectFirstCard() seems to be broken.
********************************************************************************/
SelectFirstCard = function() {
  if (gAbView && gAbView.selection && gAbView.rowCount > 0) gAbView.selection.select(0);
}



//init data object and check if SOGo-Connector has been installed
jbCatMan.init();
