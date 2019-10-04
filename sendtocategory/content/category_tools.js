var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

//create jbCatMan namespace
var jbCatMan = {};

jbCatMan.quickdump = function (str) {
    Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logStringMessage("[CatMan] " + str);
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

  jbCatMan.isMFFABInstalled = jbCatMan.checkIfMFFABInstalled(); //we only need to do this once
  jbCatMan.printDebugCounts = Array();
  jbCatMan.printDebugCounts[jbCatMan.printDumpsIndent] = 0;
  
  jbCatMan.eventUpdateTimeout = null;

  //locale object to store names from locale file
  jbCatMan.locale = {};

  //data object for bulkedit dialog
  jbCatMan.bulk = {};
  
  //data object for category data
  jbCatMan.data = {};
  
  //mainly managed by jbCatMan.scanCategories()
  jbCatMan.data.categoryMembers = [];
  jbCatMan.data.categoryList = [];
  jbCatMan.data.abSize = 0;
  //create a map between directoryIds und abURI, so we can get the abURI for each card even if its directory is not known when using the global address book
  jbCatMan.data.abURI = [];
}



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
    let result = MailServices.ab.getDirectory(abUri + "?(or(IsMailList,=,TRUE))").childCards;
    while (result.hasMoreElements()) {
      let mailListCard = result.getNext().QueryInterface(Components.interfaces.nsIAbCard);
      if (mailListCard.mailListURI == selectedBook.URI) {
        //mailListCard is the card representing the selected mailinglist in the parent directory - add card to mailinglist directory
        let mailListDirectory = MailServices.ab.getDirectory(mailListCard.mailListURI);
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
*/
jbCatMan.modifyCard = function (card) {
  let selectedBook = MailServices.ab.getDirectory(GetSelectedDirectory());
  let abUri;

  //Get abUri, if the global book is selected, get the true card owner from directory.Id
  if (selectedBook.URI == "moz-abdirectory://?") {
      if (card.directoryId == "") throw { name: "jbCatManException", message: "Found card in global book without directoryId (cannot add cards to global book).", toString: function() { return this.name + ": " + this.message; } };
      abUri = jbCatMan.data.abURI[card.directoryId];
  } else abUri = jbCatMan.getWorkAbUri(selectedBook);
  
  //Get the working directory
  let ab = MailServices.ab.getDirectory(abUri);

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
  
  return abUri;
}




//##############################################
// UI related functions
//##############################################

// Using categoryFilter to be able to distinguish between "none", "all" and
// any other value and to be able to actually display multiple categories,
// if that gets implemented.
jbCatMan.updatePeopleSearchInput = function (categoryFilter) {
  if (Array.isArray(categoryFilter) && categoryFilter.length > 0) {
    document.getElementById("peopleSearchInput").value = jbCatMan.locale.prefixForPeopleSearch + ": " + categoryFilter[categoryFilter.length-1];
    
  } else if (categoryFilter == "uncategorized") {
    document.getElementById("peopleSearchInput").value = jbCatMan.locale.prefixForPeopleSearch + ": " + jbCatMan.getLocalizedMessage("viewWithoutCategories");
    
  } else {
    document.getElementById("peopleSearchInput").value = "";
    
  }
}

jbCatMan.getCategorySearchString = function(abURI, categoryFilter) {
    //Filter by categories - http://mxr.mozilla.org/comm-central/source/mailnews/addrbook/src/nsAbQueryStringToExpression.cpp#278
    let searchstring = "";

    if (Array.isArray(categoryFilter)) {

      // encodeURIComponent does NOT encode brackets "(" and ")" - need to do that by hand
      let sep = jbCatMan.getCategorySeperator();
      let field = jbCatMan.getCategoryField();
      let searchCats = [];
      
      for (let category of categoryFilter) {
        let searchFields = [];
        searchFields.push("("+field+",bw,"+encodeURIComponent( category + sep ).replace("(","%28").replace(")","%29") +")");
        searchFields.push("("+field+",ew,"+encodeURIComponent( sep + category ).replace("(","%28").replace(")","%29") +")");
        searchFields.push("("+field+",c,"+encodeURIComponent( sep + category + sep ).replace("(","%28").replace(")","%29") +")");
        searchFields.push("("+field+",=,"+encodeURIComponent( category ).replace("(","%28").replace(")","%29") +")");
        searchCats.push("(or" + searchFields.join("") + ")");
      }
      searchstring =  abURI + "?" + "(or" + searchCats.join("") + ")";

    } else if (categoryFilter == "uncategorized") {
      searchstring =  abURI + "?" + "(or("+jbCatMan.getCategoryField()+",!ex,''))";
      
    } else {
      searchstring = abURI;
      
    }
    
    return searchstring;
}

jbCatMan.getSearchesFromSearchString = function(searchstring) {
  let searches = [];
  if (searchstring.startsWith("moz-abdirectory://?")) {
    searchstring = searchstring.substring(19);
    let allAddressBooks = MailServices.ab.directories;
    while (allAddressBooks.hasMoreElements()) {
       let abook = allAddressBooks.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
       if (abook instanceof Components.interfaces.nsIAbDirectory) { // or nsIAbItem or nsIAbCollection
        searches.push(abook.URI + searchstring);
       }
    }
  } else {
      searches.push(searchstring);
  }
  return searches;
}

jbCatMan.doCategorySearch = function (categoryFilter) {
  let abURI = GetSelectedDirectory();

  if (document.getElementById("CardViewBox") != null) {
    ClearCardViewPane();
  }

  //update results pane based on selected category 
  let searchString = jbCatMan.getCategorySearchString(abURI, categoryFilter);
  SetAbView(searchString);

  if (document.getElementById("CardViewBox") != null) {
    SelectFirstCard();  
  }
  
  jbCatMan.updatePeopleSearchInput(categoryFilter);
}





//##############################################
// cards related functions
//##############################################

// each local card has a unique property DbRowID, which can be used to get (search) this card (not working with LDAP)
// however, it is not unique across different abooks -> append directoryId
jbCatMan.getUIDFromCard = function (card) {
  
  let DbRowID = "";
  
  try {
    DbRowID = card.getPropertyAsAString("DbRowID"); //DbRowID is not avail on LDAP directories, but since we cannot modify LDAP directories, CatMan is not working at all on LDAP (isRemote)
  } catch (ex) {}

  return DbRowID + "\u001A" + card.directoryId
}




// this function expects to be run on a single book only (so DbRowID is unique enough), otherwise the full UID needs to be used to get the card 
jbCatMan.getCardFromUID = function (UID, abURI) {
  let UIDS = UID.split("\u001A");
  let DbRowID = UIDS[0];
  
  let UUIDQuery = "(DbRowID,=,@V)";
  let searchQuery = UUIDQuery.replace(/@V/g, encodeURIComponent(DbRowID));

  let result = MailServices.ab.getDirectory(abURI + "?" + "(or" + searchQuery + ")").childCards;
  if (result.hasMoreElements()) {
    return result.getNext().QueryInterface(Components.interfaces.nsIAbCard);
  } else {
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
    let searchstring = jbCatMan.getCategorySearchString(abURI, [category]);
    let cards = MailServices.ab.getDirectory(searchstring).childCards;

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
  catsArray.sort();
  
  // Sanity check: Do not include parents.
  return catsArray.filter((e, i, a) => (i == (a.length-1)) || !a[i+1].startsWith(e + " / "));
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
  let retval = true;

  // Sanity check: Skip mailing lists.
  if (card.isMailList)
    return false;
  
  // Sanity check: Do not include parents.
  let catsString = jbCatMan.getStringFromCategories(catsArray.filter((e, i, a) => (i == (a.length-1)) || !a[i+1].startsWith(e + " / ")), jbCatMan.getCategorySeperator(field));

  try {
     card.setPropertyAsAString(field, catsString);
  } catch (ex) {
    retval = false;
  }
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

  return userName;
}

jbCatMan.updateCategories = function (mode, oldName, newName) {
  //get address book manager
  let addressBook = MailServices.ab.getDirectory(GetSelectedDirectory()); //GetSelectedDirectory() returns an URI, but we need the directory itself
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
        if (catArray[i] == oldName || catArray[i].startsWith(oldName + " / ")) { // Act upon this category and all sub categories.

          // Perform remove or rename action.
          if (mode == "rename") {
            // oldName and newName include the full hierarchy
            writeCategoriesToCard = true;
            catArray[i] = catArray[i].replace(oldName, newName);
          } else if (mode == "remove") {
            //put the card into the parent of oldname
            writeCategoriesToCard = true;
            let parent = oldName.split(" / ").slice(0, -1).join(" / ");
            if (parent) {
              catArray[i] = parent;
            } else {
              continue;
            }
          }
        }
        
        // It is easier to build a new array, instead of deleting an entry out of an array, which is being looped.
        rebuildCatArray.push(catArray[i]);
      }
      
      
      // Was there a manipulation of the card due to rename or delete request?
      if (writeCategoriesToCard) {
        jbCatMan.setCategoriesforCard(card, rebuildCatArray)
        jbCatMan.modifyCard(card);
      }
    }
  }
}



jbCatMan.scanCategories = function (abURI, field = jbCatMan.getCategoryField(), quickscan = false) {
  //concept decision: we remove empty categories on addressbook switch (select) 
  //-> the category array is constantly cleared and build from scan results
  let data = {};
  if (quickscan === false) data = jbCatMan.data;

  data.categoryMembers = [];
  data.categoryList = [];
  data.abSize = 0;
  data.abURI = [];
  data.cardsWithoutCategories = [];
    
  // scan all addressbooks, if this is the new root addressbook (introduced in TB38)
  // otherwise just scan the selected one
  let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtocategory.");
  let addressBooks = jbCatMan.getSearchesFromSearchString(abURI);

  for (var l = 0; l < addressBooks.length; l++) {
    let addressBook = null;
    if (addressBooks[l]) addressBook = MailServices.ab.getDirectory(addressBooks[l]); //addressBooks contains URIs, but we need the directory itself
    else continue;

    /* Skip LDAP directories: They are never loaded completely, but just those contacts matching a search result.
       If only those are scanned, the user never knows, if a listed category contains all category members or not.
       The function "send email to category" is rendered useless. */
    if (addressBook.isRemote) continue;

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
      let CardID = jbCatMan.getUIDFromCard(card);
      if (catArray.length > 0) {
        //add card to all categories it belongs to
        for (let i=0; i < catArray.length; i++) {
          let catParts = catArray[i].split(" / ");
          
          for (let i=0; i < catParts.length; i++) {
            let cat = catParts.slice(0,i+1).join(" / ");
            //is this category known already?
            if (!data.categoryList.includes(cat)) {
              data.categoryList.push(cat);
              //categoryMembers is using Strings as Keys
              data.categoryMembers[cat] = [];
            }            
            
            //add card to category
            data.categoryMembers[cat].push(CardID);
          }
          
        }
      } else {
        data.cardsWithoutCategories.push(CardID);
      }
    }
  }
  data.categoryList.sort();
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



//init data object
jbCatMan.init();
