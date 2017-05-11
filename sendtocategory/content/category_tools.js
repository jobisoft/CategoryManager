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
  if (jbCatMan.printDumps) {
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
  }
}
jbCatMan.debug = function (str,lvl) {
  if (jbCatMan.printDebugDumps) {
    jbCatMan.dump(str,lvl);
  } else {
    jbCatMan.printDebugCounts[jbCatMan.printDumpsIndent] =  jbCatMan.printDebugCounts[jbCatMan.printDumpsIndent] + 1;
  }
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
  jbCatMan.printDebugDumps = false;
  jbCatMan.printDumpsIndent = " ";
  
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

// each local card has a unique property DbRowID, which can be used to get (search) this card (not working with LDAP) - however, it is not unique across different abooks
jbCatMan.getUIDFromCard = function (card) {
  jbCatMan.dump("Begin with getUIDFromCard()",1);
  
  //since DbRowID is not unique across different ABs, it is not sufficient for global categoriy searches -> add category property
  let DbRowID = "";
  let categories = "";
  
  try {
    DbRowID = card.getPropertyAsAString("DbRowID"); //DbRowID is not avail on LDAP directories, but since we cannot modify LDAP directories, CatMan is not working at all on LDAP (isRemote)
    categories = card.getPropertyAsAString(jbCatMan.getCategoryField())
  } catch (ex) {}

  jbCatMan.dump("Done with getUIDFromCard()",-1);
  return DbRowID + "\u001A" + categories;
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




//MFFAB integration stuff
jbCatMan.convertCategory = function (abURI, category) {
    //get all cards, which are part of the category we want to convert
    let searchstring = jbCatMan.getCategorySearchString(abURI, category);
    let cards = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager).getDirectory(searchstring).childCards;

    while (cards.hasMoreElements()) {
        let card = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);

        //get both category strings
        let mffabCatString = ""; try { mffabCatString = card.getPropertyAsAString(jbCatMan.getCategoryField(true)); } catch (ex) {} //use MFFAB field
        let standardCatString = ""; try { standardCatString = card.getPropertyAsAString(jbCatMan.getCategoryField(false)); } catch (ex) {} //use standard field

        //get both category strings as arrays
        let mffabCatArray = jbCatMan.getCategoriesFromString(mffabCatString, jbCatMan.getCategorySeperator(true)); //use MFFAB seperator
        let standardCatArray = jbCatMan.getCategoriesFromString(standardCatString, jbCatMan.getCategorySeperator(false)); //use standard seperator
            
        if (jbCatMan.isMFFABCategoryMode()) { //convert from MFFAB to standard

            //add to standard 
            if (standardCatArray.indexOf(category) == -1) standardCatArray.push(category);
            //remove from MFFAB
            let i = mffabCatArray.indexOf(category);
            while (i != -1) {
                mffabCatArray.splice(i,1);
                i = mffabCatArray.indexOf(category);
            } 
            
        } else { //convert from standard to MFFAB
            
            //add to MFFAB
            if (mffabCatArray.indexOf(category) == -1) mffabCatArray.push(category);
            //remove from standard
            let i = standardCatArray.indexOf(category);
            while (i != -1) {
                standardCatArray.splice(i,1);
                i = standardCatArray.indexOf(category);
            } 
        }
        
        //convert array back to strings
        mffabCatString = jbCatMan.getStringFromCategories(mffabCatArray, jbCatMan.getCategorySeperator(true)); //use MFFAB seperator
        standardCatString = jbCatMan.getStringFromCategories(standardCatArray, jbCatMan.getCategorySeperator(false)); //use standard seperator
        
        //set both category strings
        card.setPropertyAsAString(jbCatMan.getCategoryField(true), mffabCatString);
        card.setPropertyAsAString(jbCatMan.getCategoryField(false), standardCatString);
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

jbCatMan.getCategorySeperator = function (mode = jbCatMan.isMFFABCategoryMode()) {
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    
    if (mode) return prefs.getCharPref("morecols.category.separator") + " ";
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

jbCatMan.getCategoriesfromCard = function (card) {
  jbCatMan.debug("Begin with getCategoriesfromCard()",1);
  let catString = "";
  try {
    catString = card.getPropertyAsAString(jbCatMan.getCategoryField());
  } catch (ex) {}
  let catsArray = jbCatMan.getCategoriesFromString(catString);
  jbCatMan.debug("Done with getCategoriesfromCard()",-1);
  return catsArray;
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



//replacement for SOGo's arrayToMultiValue 
jbCatMan.setCategoriesforCard = function (card, catsArray) {
  jbCatMan.dump("Begin with setCategoriesforCard()",1);
  let retval = true;

  // sanity check
  if (card.isMailList)
    return false;
  
  let catsString = jbCatMan.getStringFromCategories(catsArray);

  try {
     card.setPropertyAsAString(jbCatMan.getCategoryField(), catsString);
  } catch (ex) {
    jbCatMan.dump("Could not set Categories.\n");
    retval = false;
  }
  jbCatMan.dump("Done with setCategoriesforCard()",-1);
  return retval;
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



jbCatMan.scanCategories = function (abURI) {
  jbCatMan.dump("Begin with scanCategories()",1);

  //get address book manager
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        

  //concept decision: we remove empty categories on addressbook switch (select) 
  //-> the category array is constantly cleared and build from scan results
  jbCatMan.data.foundCategories = [];
  jbCatMan.data.categoryList = [];
  jbCatMan.data.bcc = [];
  jbCatMan.data.membersWithoutAnyEmail = [];
  jbCatMan.data.emails = [];
  jbCatMan.data.abSize = 0;
  jbCatMan.data.abURI = [];

  
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
      jbCatMan.data.abSize++;

      //Keep track of mapping between directoryID and abURI, to get the owning AB for each card
      if (card.directoryId in jbCatMan.data.abURI == false) {
        jbCatMan.data.abURI[card.directoryId] = addressBook.URI;
      }

      let catArray = jbCatMan.getCategoriesfromCard(card);
      if (catArray.length > 0) {
        //this person belongs to at least one category, extract UUID
        let CardID = jbCatMan.getUIDFromCard(card);
        
        //add card to all categories it belongs to
        for (let i=0; i < catArray.length; i++) {
          //is this category known already?
          //-> foundCategories is using Strings as Keys
          if (catArray[i] in jbCatMan.data.foundCategories == false) {
            jbCatMan.data.foundCategories[catArray[i]] = [];
            jbCatMan.data.bcc[catArray[i]] = [];
            jbCatMan.data.membersWithoutAnyEmail[catArray[i]] = 0;
            jbCatMan.data.emails[catArray[i]] = [];
            jbCatMan.data.categoryList.push(catArray[i]);
          }
          
          //add card to category
          jbCatMan.data.foundCategories[catArray[i]].push(CardID);
          
          //add card to emails-list and bcc-list (if an email is defined)
          let email = jbCatMan.getEmailFromCard(card);
          if (email) {
            jbCatMan.data.emails[catArray[i]].push(email);
            let bccfield = "";
            if (card.displayName != "") {
              bccfield = "\"" + card.displayName + "\"" + " <" + email + ">";
            } else {
              bccfield = email;
            }
            jbCatMan.data.bcc[catArray[i]].push(bccfield);
          } else {
            jbCatMan.data.membersWithoutAnyEmail[catArray[i]]++;
          }
        }
      }
    }
  }
  jbCatMan.data.categoryList.sort();

  //clear SOGo categories if present - we do not use them
  if (jbCatMan.sogoInstalled){
    let prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    prefService.setCharPref("sogo-connector.contacts.categories", "");
  }
  
  jbCatMan.dump("Done with scanCategories()",-1);
}



//init data object and check if SOGo-Connector has been installed
jbCatMan.init();
