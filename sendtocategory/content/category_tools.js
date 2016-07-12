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



jbCatMan.init = function () { 
  //enable or disable debug dump messages
  jbCatMan.printDumps = false;
  jbCatMan.printDebugDumps = false;
  jbCatMan.printDumpsIndent = " ";
  
  jbCatMan.printDebugCounts = Array();
  jbCatMan.printDebugCounts[jbCatMan.printDumpsIndent] = 0;
  
  jbCatMan.dump("Begin with init()",1);
  
  jbCatMan.eventTimeout = null;
  
  //locale object to store names from locale file
  jbCatMan.locale = {};
    
  //data object with all relevant variables, so they can be passed all at once
  jbCatMan.data = {};


  //Check if sogo-connector is installed
  jbCatMan.sogoInstalled = false;

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
  
  //mainly managed by jbCatMan.scanCategories()
  jbCatMan.data.foundCategories = new Array();
  jbCatMan.data.categoryList = new Array();
  jbCatMan.data.bcc = new Array();
  jbCatMan.data.membersWithoutPrimaryEmail = new Array();
  jbCatMan.data.emails = new Array();
  jbCatMan.data.abSize = 0;
  //create a map between directoryIds und abURI, so we can get the abURI for each card even if its directory is not known when using the global address book
  jbCatMan.data.abURI = new Array();
  
  //managed by addressbook_overlay.js
  jbCatMan.data.selectedCategory = "";
  jbCatMan.data.emptyCategories = new Array();
  jbCatMan.dump("Done with init()",-1);
}





//#######################
// sync related functions
//#######################

/* These functions wrap operations needed to be able to sync cards using the 
   SOGo-connector. If a sync independent from SOGo is going to implemented, 
   just these functions have to be modified */



/* Save a given card using the internal mapping between the 
   directoryId (attribute of card) and directoryURI, so all cards
   can be modified, even if the directoryURI is not known. Also 
   sets the groupDavVersion property to -1, so SOGo catches the
   change and syncs the card. It returns the used abUri. */
jbCatMan.modifyCard = function (card) {
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
  //cannot simply use GetSelectedDirectory(), because the global book cannot modify cards, we need to get the true owner of the card
  let abUri = jbCatMan.data.abURI[card.directoryId];
  let ab = abManager.getDirectory(abUri);

  if (jbCatMan.sogoInstalled && isGroupdavDirectory(ab.URI)) { //TODO - what about sogo books with deactivated sogo?
    let oldDavVersion = card.getProperty("groupDavVersion", "-1");
    card.setProperty("groupDavVersion", "-1"); 
    card.setProperty("groupDavVersionPrev", oldDavVersion);    
  }
  ab.modifyCard(card);
  return ab.URI;
}



/* Create a new card with a unique ID */
jbCatMan.newCard = function (abUri) {
  let card = Components.classes["@mozilla.org/addressbook/cardproperty;1"].createInstance(Components.interfaces.nsIAbCard);
  if (jbCatMan.sogoInstalled && isGroupdavDirectory(abUri)) {  //TODO - what about sogo books with deactivated sogo?
    //Do not mess with UUID, let the server do it
    //let uuid = new UUID();
    //card.setProperty("groupDavKey",uuid);
    card.setProperty("groupDavVersion", "-1"); 
    card.setProperty("groupDavVersionPrev", "-1");
  }
  return card;
}



/* Init sync */
jbCatMan.sync = function (abUri) {
  if (jbCatMan.sogoInstalled && isGroupdavDirectory(abUri)) { //TODO - what about sogo books with deactivated sogo?
    SynchronizeGroupdavAddressbook(abUri);
    jbCatMan.dump("Sync <"+abUri+"> using sogo-connector.");
  } else {
    jbCatMan.dump("Sync request for <"+abUri+">, but sogo is not installed and/or it is not a sogo book - no sync.");
  }
}





//#####################
// UI related functions
//#####################

jbCatMan.updatePeopleSearchInput = function (name) {
  jbCatMan.dump("Begin with updatePeopleSearchInput()",1);
  if (name == "") {
    document.getElementById("peopleSearchInput").value = "";
  } else {
    document.getElementById("peopleSearchInput").value = jbCatMan.locale.prefixForPeopleSearch + ": " + name
  }
  jbCatMan.dump("Done with updatePeopleSearchInput()",-1);
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

    let searchKeys = new Array();
    if (jbCatMan.data.selectedCategory in jbCatMan.data.foundCategories) {
      //build searchQuery from UUID List of selected category
      for (let i=0; i<jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory].length; i++) {
        //CardIDs stored in foundCategories actually contains DbRowID and the category string -> category string is enough for (global) category serach
        let UIDS = jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory][i].split("\u001A");
        let searchKey = "(Categories,=,"+encodeURIComponent(UIDS.slice(1).join("\u001A"))+")";
        if (searchKeys.indexOf(searchKey) == -1) {
          searchKeys.push(searchKey);
        }
      }
    }

    //Filter by categories - http://mxr.mozilla.org/comm-central/source/mailnews/addrbook/src/nsAbQueryStringToExpression.cpp#278
    SetAbView(abURI + "?" + "(or" + searchKeys.join("") + ")");
    if (document.getElementById("CardViewBox") != null && jbCatMan.data.selectedCategory in jbCatMan.data.foundCategories) {
      SelectFirstCard();  
    }
  }
  
  jbCatMan.updatePeopleSearchInput(jbCatMan.data.selectedCategory);
  jbCatMan.dump("Done with doCategorySearch()",-1);  
}





//########################
// cards related functions
//########################

jbCatMan.getCardsFromEmail = function (email) {
  jbCatMan.dump("Begin with getCardsFromEmail("+email+")",1);
  let abURI = jbCatMan.data.selectedDirectory;

  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        

  let EmailQuery = "(PrimaryEmail,bw,@V)(SecondEmail,bw,@V)";
  let searchQuery = EmailQuery.replace(/@V/g, encodeURIComponent(email));

  //special treatment for googlemail.com
  if (email.indexOf("gmail.com")>0) {
    searchQuery = searchQuery + EmailQuery.replace(/@V/g, encodeURIComponent(email.replace("gmail.com","googlemail.com")));
  } else if (email.indexOf("googlemail.com")>0) {
    searchQuery = searchQuery + EmailQuery.replace(/@V/g, encodeURIComponent(email.replace("googlemail.com","gmail.com")));
  }
  
  jbCatMan.dump("Done with getCardsFromEmail()",-1);
  return abManager.getDirectory(abURI + "?" + "(or" + searchQuery + ")").childCards;
}



// each card has a localId and knows the directoryId of the book it is stored in - this Id cannot be used to get (search) this card, but it is unique across books - not used
jbCatMan.getTBUIDFromCard = function (card) {
    return card.localId+"@"+card.directoryId;
}





// each local card has a unique property DbRowID, which can be used to get (search) this card (not working with LDAP) - however, it is not unique across different abooks
jbCatMan.getUIDFromCard = function (card) {
  jbCatMan.dump("Begin with getUIDFromCard()",1);
  
  //the DbRowID is not unique across different ABs, so it is not sufficient for global categoriy searches -> add category property
  let DbRowID = "";
  let categories = "";
  
  try {
    DbRowID = card.getPropertyAsAString("DbRowID"); //DbRowID is not avail on LDAP directories, but since we cannot modify LDAP directories, catman is not working at all on LDAP (isRemote)
    categories = card.getPropertyAsAString("Categories")
  } catch (ex) {}

  jbCatMan.dump("Done with getUIDFromCard()",-1);
  return DbRowID + "\u001A" + categories;
}



jbCatMan.getCardFromUID = function (UID) {
  jbCatMan.dump("Begin with getCardFromUID("+UID+")",1);
  let abURI = jbCatMan.data.selectedDirectory;

  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);

  //getCardFromUID is only used in bulkEdit, which is not allowed for global AB, so DbRowID is unique enough
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



jbCatMan.getCategoriesfromCard = function (card) {
  jbCatMan.debug("Begin with getCategoriesfromCard()",1);
  let catsArray = [];
  try {
    catsArray = card.getPropertyAsAString("Categories").split("\u001A");
  } catch (ex) {}  
  jbCatMan.debug("Done with getCategoriesfromCard()",-1);
  return catsArray;
}



//replacement for SOGo's arrayToMultiValue 
jbCatMan.setCategoriesforCard = function (card, catsArray) {
  jbCatMan.dump("Begin with setCategoriesforCard()",1);
  let retval = true;
  try {
     card.setPropertyAsAString("Categories", catsArray.join("\u001A"));
  } catch (ex) {
    jbCatMan.dump("Could not set Categories.\n");
    retval = false;
  }
  jbCatMan.dump("Done with setCategoriesforCard()",-1);
  return retval;
}



jbCatMan.getUserNamefromCard = function (card,fallback) {
  jbCatMan.dump("Begin with getUserNamefromCard()",1);
  let userName = "";
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
  let changed = false;

  while (cards.hasMoreElements()) {
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
        changed = true;
      }
    }
  }

  if (changed) jbCatMan.sync(addressBook.URI);
  jbCatMan.dump("Done with updateCategories()",-1);
}



jbCatMan.scanCategories = function () {
  jbCatMan.dump("Begin with scanCategories()",1);

  //get address book manager
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        

  //concept decision: we remove empty categories on addressbook switch (select) 
  //-> the category array is constantly cleared and build from scan results
  jbCatMan.data.foundCategories = new Array();
  jbCatMan.data.categoryList = new Array();
  jbCatMan.data.bcc = new Array();
  jbCatMan.data.membersWithoutPrimaryEmail = new Array();
  jbCatMan.data.emails = new Array();
  jbCatMan.data.abSize = 0;
  jbCatMan.data.abURI = new Array();

  
  // scan all addressbooks, if this is the new root addressbook (introduced in TB38)
  // otherwise just scan the selected one
  let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtocategory.");
  let addressBooks = new Array();

  if (GetSelectedDirectory() == "moz-abdirectory://?") {
    let allAddressBooks = abManager.directories;
    while (allAddressBooks.hasMoreElements()) {
       if (prefs.getBoolPref("disable_global_book")) {
         break;
       }
       let abook = allAddressBooks.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
       if (abook instanceof Components.interfaces.nsIAbDirectory) { // or nsIAbItem or nsIAbCollection
        addressBooks.push(abook.URI);
       }
    }
  } else {
      addressBooks.push(GetSelectedDirectory()); //GetSelectedDirectory() returns the URI
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

    while (cards.hasMoreElements()) {
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
            jbCatMan.data.foundCategories[catArray[i]] = new Array();
            jbCatMan.data.bcc[catArray[i]] = new Array();
            jbCatMan.data.membersWithoutPrimaryEmail[catArray[i]] = new Array();
            jbCatMan.data.emails[catArray[i]] = new Array();
            jbCatMan.data.categoryList.push(catArray[i]);
          }
          
          //add card to category
          jbCatMan.data.foundCategories[catArray[i]].push(CardID);
          
          //add card to emails-list and bcc-list (if primaryEmail is defined)
          if (card.primaryEmail != "") {
            jbCatMan.data.emails[catArray[i]].push(card.primaryEmail);
            let bccfield = "";
            if (card.displayName != "") {
              bccfield = "\"" + card.displayName + "\"" + " <" + card.primaryEmail + ">";
            } else {
              bccfield = card.primaryEmail;
            }
            jbCatMan.data.bcc[catArray[i]].push(bccfield);
          } else {
            jbCatMan.data.membersWithoutPrimaryEmail[catArray[i]].push(card.primaryEmail);
          }
        }
      }
    }
  }
  jbCatMan.data.categoryList.sort();
  jbCatMan.dump("Done with scanCategories()",-1);
}



//init data object and check if SOGo-Connector has been installed
jbCatMan.init();
