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
    let d = new Date();
    let n = d.getTime();
    if (lvl<0) jbCatMan.printDumpsIndent = jbCatMan.printDumpsIndent.slice(0, -2);
    dump("[CategoryManager @ " + n + "] " + jbCatMan.printDumpsIndent + str + "\n");
    if (lvl>0) jbCatMan.printDumpsIndent = jbCatMan.printDumpsIndent + "  ";
  }
}



jbCatMan.init = function () { 
  //enable or disable debug dump messages
  jbCatMan.printDumps = true;
  jbCatMan.printDumpsIndent = "";
  
  //locale object to store names from locale file
  jbCatMan.locale = {};
    
  //data object with all relevant variables, so they can be passed all at once
  jbCatMan.data = {};


  //Check if sogo-connector is installed, and enable sogoSync
  jbCatMan.sogoSync = false;
  jbCatMan.sogoError = "";

  //SynchronizeGroupdavAddressbook is def in sync.addressbook.groupdav.js
  //isGroupdavDirectory is def in /sync.addressbook.groupdav.js which is included by sync.addressbook.groupdav.js
  if (typeof(SynchronizeGroupdavAddressbook) != "function") {
    jbCatMan.jsInclude(["chrome://sogo-connector/content/general/sync.addressbook.groupdav.js"]);
  }

  //Verify
  if (typeof(SynchronizeGroupdavAddressbook)  != "function") {jbCatMan.sogoError = jbCatMan.sogoError + "Required function 'SynchronizeGroupdavAddressbook' is not defined.\n";}
  if (typeof(isGroupdavDirectory) != "function") {jbCatMan.sogoError = jbCatMan.sogoError + "Required function 'isGroupdavDirectory' is not defined.\n";}

  if ( jbCatMan.sogoError != "" ) {
    jbCatMan.dump("SogoSync is disabled, the following dependencies are not met:\n******************\n" + jbCatMan.sogoError + "******************");
  } else {
    jbCatMan.sogoSync = true;
  }
  
  //mainly managed by jbCatMan.scanCategories()
  jbCatMan.data.foundCategories = new Array();
  jbCatMan.data.categoryList = new Array();
  jbCatMan.data.bcc = new Array();
  jbCatMan.data.membersWithoutPrimaryEmail = new Array();
  jbCatMan.data.emails = new Array();
  jbCatMan.data.abSize = 0;
  
  //managed by addressbook_overlay.js
  jbCatMan.data.selectedCategory = "";
  jbCatMan.data.emptyCategories = new Array();
}





jbCatMan.updatePeopleSearchInput = function (name) {
  if (name == "") {
    document.getElementById("peopleSearchInput").value = "";
  } else {
    document.getElementById("peopleSearchInput").value = jbCatMan.locale.prefixForPeopleSearch + ": " + name
  }
}  



jbCatMan.getCardsFromEmail = function (email) {
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

  return abManager.getDirectory(abURI + "?" + "(or" + searchQuery + ")").childCards;
}



jbCatMan.getUIDFromCard = function (card) {
  let CardID = "";
  try {
    CardID = card.getPropertyAsAString("DbRowID"); //DbRowID is not avail on LDAP directories, but since we cannot modify LDAP directories, catman is not working at all on LDAP (isRemote)
  } catch (ex) {}
  if (CardID == "") {
    jbCatMan.scanErrors.push(jbCatMan.getUserNamefromCard(card,"NoName"));
  }
  return CardID;
}



jbCatMan.getCardFromUID = function (UID) {
  let abURI = jbCatMan.data.selectedDirectory;

  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);

  let UUIDQuery = "(DbRowID,=,@V)";
  let searchQuery = UUIDQuery.replace(/@V/g, encodeURIComponent(UID));

  let result = abManager.getDirectory(abURI + "?" + "(or" + searchQuery + ")").childCards;
  if (result.hasMoreElements()) {
    return result.getNext().QueryInterface(Components.interfaces.nsIAbCard);
  } else {
    return null;
  }
}



jbCatMan.getCategoriesfromCard = function (card) {
  let catArray = [];
  try {
    //this line is derived from chrome://sogo-connector/content/addressbook/cardview-overlay.js
    catArray = card.getPropertyAsAString("Categories").split("\u001A");
  } catch (ex) {}  
    
  return catArray;
}


jbCatMan.setCategoriesforCard = function (card, catsArray) {
  try {
     card.setPropertyAsAString("Categories", catsArray.join("\u001A"));
  } catch (ex) {
    jbCatMan.dump("Could not set Categories.\n");
    return false;
  }
  return true;
}


jbCatMan.getUserNamefromCard = function (card,fallback) {
    let userName = "";
    try {
        userName = card.getPropertyAsAString("DisplayName"); 
    } catch (ex) {}
    if (userName == "") try {
        userName = card.getPropertyAsAString("FirstName") + " " + card.getPropertyAsAString("LastName");
    } catch (ex) {}
    if (userName == "") userName = fallback;
    return userName;
}



jbCatMan.doCategorySearch = function () {
  let abURI = GetSelectedDirectory();

  if (document.getElementById("CardViewBox") != null) {
    ClearCardViewPane();
  }
  //http://mxr.mozilla.org/comm-central/source/mailnews/addrbook/src/nsAbQueryStringToExpression.cpp#278
  let UUIDQuery = "(DbRowID,=,@V)"; //groupDavKey
  let searchQuery = "";
  
  if (jbCatMan.data.selectedCategory in jbCatMan.data.foundCategories) {
    //build searchQuery from UUID List of selected category
    for (let i=0; i<jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory].length; i++) {
      searchQuery = searchQuery + UUIDQuery.replace(/@V/g, encodeURIComponent(jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory][i]));
    }        
  }

  // view all contatcs
  if ( jbCatMan.data.selectedCategory == "" ) {
    SetAbView(abURI);
  } else {
    SetAbView(abURI + "?" + "(or" + searchQuery + ")");
  }
  if (document.getElementById("CardViewBox") != null && jbCatMan.data.selectedCategory in jbCatMan.data.foundCategories) {
    SelectFirstCard();  
  }
  jbCatMan.updatePeopleSearchInput(jbCatMan.data.selectedCategory);
}
    


jbCatMan.updateCategories = function (mode,oldName,newName) {
  jbCatMan.dump("Begin with updateCategories("+mode+","+oldName+","+newName+")",1);
  //get address book manager
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
  let addressBook = abManager.getDirectory(GetSelectedDirectory()); //GetSelectedDirectory() returns an URI, but we need the directory itself

  let cards = addressBook.childCards;
  let requireSync = false;
  
  while (cards.hasMoreElements()) {
    card = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
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
        card.setProperty("groupDavVersion", "-1"); //TODO
        addressBook.modifyCard(card);
        requireSync=true;
      }
    }
  }
  
  //trigger a sync request, if cards had been changed
  if (requireSync) { //TODO - use a hook instead??
    if (jbCatMan.sogoSync) {
      if (isGroupdavDirectory(addressBook.URI)) {
        //SynchronizeGroupdavAddressbook(addressBook.URI);
        jbCatMan.dump("I would sync now using sogo-connector.");
      } else {
        jbCatMan.dump("There have been changes, sogo is installed, but this is not a sogo book - no sync.");
      }
    } else {
        jbCatMan.dump("There have been changes, sogo is not installed. - no sync.");
    }
  }
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
       abook = allAddressBooks.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
       if (abook instanceof Components.interfaces.nsIAbDirectory) { // or nsIAbItem or nsIAbCollection
        addressBooks.push(abook.URI);
       }
    }
  } else {
      addressBooks.push(GetSelectedDirectory()); //GetSelectedDirectory() returns the URI
  }

  jbCatMan.scanErrors = new Array();
  for (var l = 0; l < addressBooks.length; l++) {
    let addressBook = abManager.getDirectory(addressBooks[l]); //addressBooks contains URIs, but we need the directory itself
    let cards = addressBook.childCards;

    while (cards.hasMoreElements()) {
      card = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
      jbCatMan.data.abSize++;
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
  if (jbCatMan.scanErrors.length > 0) {
    msg = "There are " + jbCatMan.scanErrors.length + " contact cards without a propper ID (DbRowID). That should not happen.\n";
    for (let i=0; i < jbCatMan.scanErrors.length; i++) {
      if (i>5) {
        msg = msg + "\n...";
        break;
      } else {
        msg = msg + "\n" + jbCatMan.scanErrors[i];
      }
    }
    alert(msg);
  }
  jbCatMan.dump("Done with scanCategories()",-1);
}




//init data object and check if SOGo-Connector has been installed
jbCatMan.init();
