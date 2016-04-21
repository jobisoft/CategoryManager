//create jbCatMan namespace
var jbCatMan = {};


 
//copied from sgo-connector
jbCatMan.jsInclude = function (files, target) {
  let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
  for (let i = 0; i < files.length; i++) {
    dump("Trying to load: " + files[i] + "\n");
    try {
      loader.loadSubScript(files[i], target);
    }
    catch(e) {
      jbCatMan.sogoError = jbCatMan.sogoError + "CategoryManager [category_tools.js]: failed to include '" + files[i] + "' (" + e + ")\n\n";
    }
  }
}



jbCatMan.init = function () { 
  //locale object to store names from locale file
  jbCatMan.locale = {};
    
    //data object with all relevant variables, so they can be passed all at once
  jbCatMan.data = {};
    
  //check if SOGo-Connector is installed
  jbCatMan.sogoInstalled = true;
  jbCatMan.sogoAlert = true;
  jbCatMan.sogoError = "";       
 

  if (typeof(SCContactCategories) != "object") {
    jbCatMan.jsInclude(["chrome://sogo-connector/content/addressbook/categories.js"]);
  }

  //SynchronizeGroupdavAddressbook is def in sync.addressbook.groupdav.js
  //isGroupdavDirectory is def in /sync.addressbook.groupdav.js which is included by sync.addressbook.groupdav.js
  if (typeof(SynchronizeGroupdavAddressbook) != "function") {
    jbCatMan.jsInclude(["chrome://sogo-connector/content/general/sync.addressbook.groupdav.js"]);
  }

  //check again
  if (typeof(SynchronizeGroupdavAddressbook)  != "function") {jbCatMan.sogoError = jbCatMan.sogoError + "Required function 'SynchronizeGroupdavAddressbook' is not defined.\n\n";}
  if (typeof(isGroupdavDirectory) != "function") {jbCatMan.sogoError = jbCatMan.sogoError + "Required function 'isGroupdavDirectory' is not defined.\n\n";}
  if (typeof(SCContactCategories) != "object") {jbCatMan.sogoError = jbCatMan.sogoError + "Required object 'SCContactCategories' is not defined.\n\n";}

  if ( jbCatMan.sogoError != "" ) {
      jbCatMan.sogoInstalled = false;
      //to see dump messages, follow instructions here: https://wiki.mozilla.org/Thunderbird:Debugging_Gloda
      dump("CategoryManager needs SOGo-Connector! The following dependencies are not met:\n" + jbCatMan.sogoError);
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

  // This is not used in the code (why is it here?) - but does not work with TB45
  //if (!gQueryURIFormat) {
  //  gQueryURIFormat = Services.prefs.getComplexValue("mail.addr_book.quicksearchquery.format",Components.interfaces.nsIPrefLocalizedString).data;
  //}

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
  // if (!isGroupdavDirectory(uri)) from sync.addressbook.groupdav.js
  try {
    CardID = card.getPropertyAsAString("groupDavKey"); //CardUID
  } catch (ex) {}     
  if (CardID == "") {
    alert("We have a card without ID (groupDavKey): " + jbCatMan.getUserNamefromCard(card,"NoName"));
  }
  
  return CardID;
}



jbCatMan.getCardFromUID = function (UID) {
  let abURI = jbCatMan.data.selectedDirectory;

  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        

  // This is not used in the code (why is it here?) - but does not work with TB45
  //if (!gQueryURIFormat) {
  //  gQueryURIFormat = Services.prefs.getComplexValue("mail.addr_book.quicksearchquery.format",Components.interfaces.nsIPrefLocalizedString).data;
  //}
  
  let UUIDQuery = "(groupDavKey,bw,@V)";
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

  // This is not used in the code (why is it here?) - but does not work with TB45
  //if (!gQueryURIFormat) {
  //  gQueryURIFormat = Services.prefs.getComplexValue("mail.addr_book.quicksearchquery.format",Components.interfaces.nsIPrefLocalizedString).data;
  //}

  if (document.getElementById("CardViewBox") != null) {
    ClearCardViewPane();
  }
  
  let UUIDQuery = "(groupDavKey,bw,@V)";
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
    //SetAbView(GetSelectedDirectory() + "?" + "(or" + searchQuery + ")");
    SetAbView(abURI + "?" + "(or" + searchQuery + ")");
  }
  if (document.getElementById("CardViewBox") != null && jbCatMan.data.selectedCategory in jbCatMan.data.foundCategories) {
    SelectFirstCard();  
  }
  jbCatMan.updatePeopleSearchInput(jbCatMan.data.selectedCategory);
}
    


jbCatMan.updateCategories = function (mode,oldName,newName) {
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
        card.setProperty("Categories", arrayToMultiValue(rebuildCatArray));	//arrayToMultiValue is part of chrome://sogo-connector/content/general/vcards.utils.js
        card.setProperty("groupDavVersion", "-1");
        addressBook.modifyCard(card);
        requireSync=true;
      }                    
    }                    
  }
  
  //trigger a sync request, if cards had been changed
  if (requireSync) {
    if (isGroupdavDirectory(addressBook.URI)) {
      SynchronizeGroupdavAddressbook(addressBook.URI);
    }
  }        
}



jbCatMan.scanCategories = function () {
  //get address book manager
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);        

  //concept decision: we remove empty categories on addressbook switch (select) 
  //-> the sogo category array is constantly cleared and build from scan results
  jbCatMan.data.foundCategories = new Array();
  jbCatMan.data.categoryList = new Array();
  jbCatMan.data.bcc = new Array();
  jbCatMan.data.membersWithoutPrimaryEmail = new Array();
  jbCatMan.data.emails = new Array();
  jbCatMan.data.abSize = 0;

  
  // scan all addressbooks, if this is the new root addressbook (introduced in TB38)
  // otherwise just scan the selected one
  let addressBooks = new Array();
  if (GetSelectedDirectory() == "moz-abdirectory://?") {
    let allAddressBooks = abManager.directories;
    while (allAddressBooks.hasMoreElements()) {
       abook = allAddressBooks.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
       if (abook instanceof Components.interfaces.nsIAbDirectory) { // or nsIAbItem or nsIAbCollection
        addressBooks.push(abook.URI);
       }
    }
  } else {
      addressBooks.push(GetSelectedDirectory()); //GetSelectedDirectory() returns the URI
  }

  
  for (var l = 0; l < addressBooks.length; l++) {
    let addressBook = abManager.getDirectory(addressBooks[l]); //addressBooks contains URIs, but we need the directory itself
    let cards = addressBook.childCards;

    while (isGroupdavDirectory(addressBook.URI) && cards.hasMoreElements()) {
      jbCatMan.data.abSize++;
      card = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
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
}



//init data object and check if SOGo-Connector has been installed
jbCatMan.init();
