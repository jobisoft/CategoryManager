//using mailservices to open message window
Components.utils.import("resource://app/modules/mailServices.js");

let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://sendtocategory/content/category_tools.js");


/* stuff

// Get all properties of a card
props = card.properties;
while (props.hasMoreElements()) {
    prop = props.getNext().QueryInterface(Components.interfaces.nsIProperty); 
    dump("Prop ["+ prop.name+"] = ["+prop.value+"]\n");
}

https://dxr.mozilla.org/comm-central/source/mailnews/addrbook/src/nsAbManager.cpp
Standard field list

https://dxr.mozilla.org/comm-central/source/mailnews/addrbook/src/nsAbDirectoryQuery.cpp#469
CaseInsensitive StringComparison is hardcoded - if two categories with same name but different case -> resultsViewPane will sometimes mix cards, if categories string is equal but just differnt case 





public LDAP Test account
Hostname:ldap.adams.edu
Base DN: ou=people,dc=adams,dc=edu
Port number: 389
Bind DN: LEAVE BLANK
Use secure connection (SSL):UNCHECK


CONCEPT CHANGES
 - do not mess with SOGo UUID, (SOGo is providing UUID from server, if not present)
 - groupDavVersion still needs to be set to -1, to indicate changes?


TODO 
 - rename and delete global category should be possible
 - should categories defined in book1 be available in dropdown/popup in book2 ???
 - bring back SCSearchCriteriaButtonMenu
 - store/restore last addressbook used in messenger as well
*/



//###################################################
// adding additional functions to the local jbCatMan Object
//###################################################

jbCatMan.updateCategoryList = function () {
  jbCatMan.dump("Begin with updateCategoryList()",1);
  jbCatMan.scanCategories(GetSelectedDirectory());
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
  
  //it could be, that a category from emptyCategories is no longer empty (it was scanned) -> remove it from empty
  for (let i = 0; i < jbCatMan.data.categoryList.length; i++) {
    if (jbCatMan.data.emptyCategories.indexOf(jbCatMan.data.categoryList[i]) != -1) {
      jbCatMan.data.emptyCategories.splice(jbCatMan.data.emptyCategories.indexOf(jbCatMan.data.categoryList[i]),1);
    }
  }
  
  //any other category in the empty category list needs to be added now to the category list
  for (let i = 0; i < jbCatMan.data.emptyCategories.length; i++) {
    if (jbCatMan.data.categoryList.indexOf(jbCatMan.data.emptyCategories[i]) < 0) {
      jbCatMan.data.categoryList.push(jbCatMan.data.emptyCategories[i]);
    }
  }
  
  //clear category listbox
  let categoriesList = document.getElementById("CatManCategoriesList");
  categoriesList.clearSelection();
  for (let i=categoriesList.getRowCount(); i>0; i--) {
    categoriesList.removeItemAt(i-1);
  }

  //disable "all" element if global book and global book empty or if remote book
  if (!(abManager.getDirectory(GetSelectedDirectory()).isRemote || (GetSelectedDirectory() == "moz-abdirectory://?" && jbCatMan.data.abSize == 0))) {
      let newListItem = document.createElement("listitem");
      newListItem.setAttribute("id", "");
      let categoryName = document.createElement("listcell");
      categoryName.setAttribute("label", jbCatMan.locale.viewAllCategories);
      categoryName.setAttribute("style", "font-style:italic;");
      newListItem.appendChild(categoryName);
      let categorySize = document.createElement("listcell");
      categorySize.setAttribute("label", jbCatMan.data.abSize);
      categorySize.setAttribute("style", "font-style:italic;");
      newListItem.appendChild(categorySize);
      categoriesList.appendChild(newListItem);
  }
  
  //add all categories from the updated/merged array to the category listbox
  for (let i = 0; i < jbCatMan.data.categoryList.length; i++) {
    let newListItem = document.createElement("listitem");
    newListItem.setAttribute("id", jbCatMan.data.categoryList[i]);

    let categoryName = document.createElement("listcell");
    categoryName.setAttribute("label", jbCatMan.data.categoryList[i]);
    newListItem.appendChild(categoryName);
    let categorySize = document.createElement("listcell");
    if (jbCatMan.data.categoryList[i] in jbCatMan.data.foundCategories) {
      categorySize.setAttribute("label", jbCatMan.data.foundCategories[jbCatMan.data.categoryList[i]].length);
    }
    else {
      categorySize.setAttribute("label", 0);
    }
    newListItem.appendChild(categorySize);
    categoriesList.appendChild(newListItem);
  }

  //Does the displayed result still match the selected category? If not, update SearchResults - WE NEED A BETTER BUT FAST WAYS TO DO THIS
  if (jbCatMan.data.selectedCategory != "") {
    if (jbCatMan.data.selectedCategory in jbCatMan.data.foundCategories) {
      if (document.getElementById('abResultsTree').view.rowCount != jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory].length) {
        jbCatMan.doCategorySearch();
      }
    } else {
      //Selected Category does not exist, fallback 
      ClearCardViewPane();
      jbCatMan.data.selectedCategory = "";
      SetAbView(GetSelectedDirectory());
      if (jbCatMan.data.abSize>0) SelectFirstCard();  
      jbCatMan.updatePeopleSearchInput("");
    }
  } else {
    /* 
        There should not be any action here, since there is no category selected.
        The result pane could be anything (for example a search result) and we
        should not modify it.
      */
  }
  
  jbCatMan.updateButtons();
  
/**  Its nice, but uses sogo - I never used it - has to go !!! **

  //  remove all catmenuitems from cat search menu
  let menupopup = document.getElementById("SCSearchCriteriaButtonMenu");
  for (let i = menupopup.childNodes.length ; i > 0; i--) {
    if (menupopup.childNodes[i-1].getAttribute("value") == "catmenuitem") {
      menupopup.removeChild(menupopup.childNodes[i-1]);
    }
  }

  //update search menu dropdown
  if (jbCatMan.data.categoryList.length>0) {
    let newItem = document.createElement("menuseparator");
    newItem.setAttribute("value", "catmenuitem");
    menupopup.appendChild( newItem );

    //update search menu dropdown
    for (let i = 0; i < jbCatMan.data.categoryList.length; i++) {
      let newItem = document.createElement("menuitem");
      newItem.setAttribute("label", jbCatMan.locale.prefixForPeopleSearch + ": " + jbCatMan.data.categoryList[i]);
      newItem.setAttribute("value", "catmenuitem");
      newItem.catName =jbCatMan.data.categoryList[i];
      newItem.addEventListener("command",  function(e){ jbCatMan.data.selectedCategory=e.target.catName; jbCatMan.doCategorySearch(); }, false);
      menupopup.appendChild( newItem );
    }
  } **/
  jbCatMan.dump("Done with updateCategoryList()",-1);
}



jbCatMan.updateButtons = function () {
  jbCatMan.dump("Begin with updateButtons()",1);
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
  let isRemote = true;
  let isGlobal = false;
  let selectedBook = GetSelectedDirectory();
  if (selectedBook) isRemote = abManager.getDirectory(selectedBook).isRemote;
  if (selectedBook == "moz-abdirectory://?") isGlobal = true;

  document.getElementById("CatManContextMenuRemove").disabled = (jbCatMan.data.selectedCategory == "" || isRemote || isGlobal);
  document.getElementById("CatManContextMenuEdit").disabled = (jbCatMan.data.selectedCategory == "" || isRemote || isGlobal);
  document.getElementById("CatManContextMenuBulk").disabled = (jbCatMan.data.selectedCategory == "" || isRemote || isGlobal);

  document.getElementById("CatManContextMenuSend").disabled = (jbCatMan.data.selectedCategory == "" || isRemote); 

  //Import and export for all address books, regardless of category (if no category selected, export entire abook or import without category tagging)
  document.getElementById("CatManContextMenuImportExport").disabled = isRemote || isGlobal;

  document.getElementById("CatManAddContactCategoryButton").disabled = isRemote || isGlobal;

  if (jbCatMan.data.selectedCategory == "") {
    document.getElementById("CatManContextMenuImportExport").label = jbCatMan.locale.menuAllExport;
  } else {
    document.getElementById("CatManContextMenuImportExport").label = jbCatMan.locale.menuExport;
  }

  jbCatMan.dump("Done with updateButtons()",-1);
}



jbCatMan.writeToCategory = function () {
  jbCatMan.dump("Begin with writeToCategory()",1);
  let currentCategory = jbCatMan.data.selectedCategory;
  let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtocategory.");
  let setting = prefs.getCharPref("to_address"); 

  if (currentCategory!="" && (currentCategory in jbCatMan.data.foundCategories)) {
    let sURL="mailto:";
    //Add envelope addr if specified - or add [ListName] to Subject
    if (setting != "") {
      sURL = sURL + "?to=" + encodeURIComponent(currentCategory) + "<" + encodeURIComponent(setting) + ">";
    } else {
      sURL = sURL + "?subject=" + encodeURIComponent("["+currentCategory+"] ");	    
    }
    //Add BCC
    sURL = sURL + "&bcc=" + encodeURIComponent(jbCatMan.data.bcc[currentCategory].join(", "));

    //create the service, the URI and open the new message window via mailServices
    let ioService =  Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);  
    let aURI = ioService.newURI(sURL, null, null);  
    MailServices.compose.OpenComposeWindowWithURI (null, aURI); 
  }
  jbCatMan.dump("Done with writeToCategory()",-1);
}





//###################################################
// onActions
//###################################################

jbCatMan.onImportExport = function () {
  window.openDialog("chrome://sendtocategory/content/addressbook/import-export/import-export-wizard.xul", "import-export-wizard", "modal,dialog,centerscreen,chrome,resizable=no");
}



jbCatMan.onHelpButton = function () {
  jbCatMan.dump("Begin with onHelpButton()",1);
  let ioservice = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
  let uriToOpen = ioservice.newURI("https://github.com/jobisoft/CategoryManager/wiki/CategoryManager-2.05-Release-Notes", null, null);
  let extps = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);
  extps.loadURI(uriToOpen, null);
  jbCatMan.dump("Done with onHelpButton()",-1);
}



jbCatMan.onToggleDisplay = function (show) {
  jbCatMan.dump("Begin with onToggleDisplay("+show+")",1);
  if (show) {
    document.getElementById('CatManBox').collapsed = false;
    document.getElementById('CatManSplitter').hidden = false;
    document.getElementById('CatManShowBox').hidden = true;
  } else {
    document.getElementById('CatManBox').collapsed = true;
    document.getElementById('CatManSplitter').hidden = true;
    document.getElementById('CatManShowBox').hidden = false;
  }
  jbCatMan.dump("End with onToggleDisplay()",-1);
}

jbCatMan.booksHaveContactsWithProperty = function (field) {
    let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
    let allAddressBooks = abManager.directories;
    while (allAddressBooks.hasMoreElements()) {
        let abook = allAddressBooks.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
        if (abook instanceof Components.interfaces.nsIAbDirectory) { // or nsIAbItem or nsIAbCollection
            let searchstring = abook.URI + "?(or("+field+",!=,))";
            let cards = abManager.getDirectory(searchstring).childCards;
            if (cards && cards.hasMoreElements()) return true;
        }
    }
    return false;
}

jbCatMan.onSelectAddressbook = function () {
  let selectedBook = GetSelectedDirectory();
  jbCatMan.dump("Begin with onSelectAddressbook("+gDirTree.view.selection.currentIndex+","+selectedBook+")",1);
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
  
  if (selectedBook) {
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtocategory.");
    // disable edit functions of addressbook, if SOGo is installed and user enabled this option
    if (jbCatMan.sogoInstalled && prefs.getBoolPref("disable_global_book") && gDirTree.view.selection.currentIndex == 0 ){
        document.getElementById("abResultsTree").disabled = true;
        document.getElementById("CatManInfoBoxClone").hidden = false;
        jbCatMan.BackupABonclick = document.getElementById("abResultsTree").getAttribute("onclick");
        jbCatMan.BackupABcontext = document.getElementById("abResultsTree").getAttribute("context");
        document.getElementById("abResultsTree").setAttribute("onclick","");
        document.getElementById("abResultsTree").setAttribute("context","");
    } else {
        document.getElementById("abResultsTree").disabled = false;
        document.getElementById("CatManInfoBoxClone").hidden = true;
        if (jbCatMan.BackupABonclick) {
            document.getElementById("abResultsTree").setAttribute("onclick", jbCatMan.BackupABonclick);
            document.getElementById("abResultsTree").setAttribute("context", jbCatMan.BackupABcontext);
        }
    }
    
    jbCatMan.data.emptyCategories = [];
    jbCatMan.data.selectedCategory = "";
    jbCatMan.updateCategoryList();
    prefs.setCharPref("last_book",selectedBook);
  } else {
    //if for some reason no address book is selected, select the first one
    gDirTree.view.selection.select(0);
    ChangeDirectoryByURI(GetSelectedDirectory());
  }
  jbCatMan.dump("Done with onSelectAddressbook()",-1);
}



jbCatMan.onSelectCategoryList = function () {
  jbCatMan.dump("Begin with onSelectCategoryList()",1);
  let categoriesList = document.getElementById("CatManCategoriesList");
  if (categoriesList.selectedIndex != -1) {
    jbCatMan.data.selectedCategory = categoriesList.selectedItem.id
    categoriesList.clearSelection();
    jbCatMan.doCategorySearch();
  }
  jbCatMan.updateButtons();
  jbCatMan.dump("Done with onSelectCategoryList()",-1);
}



jbCatMan.onPeopleSearchClick = function () {
  jbCatMan.dump("Begin with onPeopleSearchClick()",1);
  jbCatMan.data.selectedCategory = "";
  jbCatMan.updateButtons();
  jbCatMan.dump("Done with onPeopleSearchClick()",-1);
}

jbCatMan.onSwitchCategoryMode = function (doswitch = true, refreshlist = true) {
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    if (doswitch) prefs.setBoolPref("extensions.sendtocategory.mffab_mode",!prefs.getBoolPref("extensions.sendtocategory.mffab_mode"));

    if (jbCatMan.isMFFABCategoryMode()) document.getElementById("CatManContextMenuMFFABSwitch").label = "switch to standard category mode";
    else document.getElementById("CatManContextMenuMFFABSwitch").label = "switch to MFFAB category mode";
    if (refreshlist && doswitch) jbCatMan.updateCategoryList();
}


jbCatMan.onBulkEdit = function () {
  jbCatMan.dump("Begin with onBulkEdit()",1);
  //initializing bulkedit-members
  jbCatMan.bulk.needToValidateBulkList = false;
  jbCatMan.bulk.needToSaveBulkList = false;
  jbCatMan.bulk.bulkList = "";
  jbCatMan.bulk.saveList = "";
  jbCatMan.bulk.cardsToBeRemovedFromCategory = [];
  jbCatMan.bulk.selectedDirectory = GetSelectedDirectory();
  
  //all 3 dialogs are called in sequence. Skipped, if canceled.
  window.openDialog("chrome://sendtocategory/content/addressbook/bulkedit_editAddresses.xul", "bulkeditCategory", "modal,centerscreen,chrome,resizable=no", "", jbCatMan.locale.bulkTitle);
  if (jbCatMan.bulk.needToValidateBulkList) {
    window.openDialog("chrome://sendtocategory/content/addressbook/bulkedit_validateAddresses.xul", "bulkeditCategory", "modal,centerscreen,chrome,width=595,height=600,resizable=yes", "", jbCatMan.locale.bulkTitle);
  }
  if (jbCatMan.bulk.needToSaveBulkList) {
    window.openDialog("chrome://sendtocategory/content/addressbook/bulkedit_saveAddresses.xul", "bulkeditCategory", "modal,centerscreen,chrome,resizable=yes", "", jbCatMan.locale.bulkTitle);
  }
  jbCatMan.dump("Done with onBulkEdit()",-1);
}



jbCatMan.onAddCategory = function () {
  jbCatMan.dump("Begin with onAddCategory()",1);
  window.openDialog("chrome://sendtocategory/content/addressbook/edit_category.xul", "addCategory", "modal,centerscreen,chrome,resizable=no", "", jbCatMan.locale.addTitle, "add");
  jbCatMan.dump("Done with onAddCategory()",-1);
}



jbCatMan.onRenameCategory = function () {
  jbCatMan.dump("Begin with onRenameCategory()",1);
  if (jbCatMan.data.selectedCategory != "") {
    window.openDialog("chrome://sendtocategory/content/addressbook/edit_category.xul", "editCategory", "modal,centerscreen,chrome,resizable=no", jbCatMan.data.selectedCategory, jbCatMan.locale.editTitle, "rename");
  }
  jbCatMan.dump("Done with onRenameCategory()",-1);
}



jbCatMan.onDeleteCategory = function () {
  jbCatMan.dump("Begin with onDeleteCategory()",1);
  if (jbCatMan.data.selectedCategory != "") {
    //is it an empty category? If so, we have to check, if it is on the empty category list and remove it
    //if its not an empty category go through all contacts and remove that category.
    if (jbCatMan.data.selectedCategory in jbCatMan.data.foundCategories) {
      if (confirm(jbCatMan.locale.confirmDelete.replace("##oldname##",jbCatMan.data.selectedCategory).replace("##number##",jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory].length))) {
        jbCatMan.updateCategories("remove",jbCatMan.data.selectedCategory);
        //no longer set category to nothing - updateCategoryList checks, if the current "category filter" is valid, if not it is cleared
        jbCatMan.updateCategoryList();
      }
    }
    else {
      //is it in the empty category list?
      let idx = jbCatMan.data.emptyCategories.indexOf(jbCatMan.data.selectedCategory);
      if (idx != -1) {
        jbCatMan.data.emptyCategories.splice(idx,1);
        jbCatMan.updateCategoryList();
      }
    }
  }
  jbCatMan.dump("Done with onDeleteCategory()",-1);
}



// disable context menu if no card has been selected, or fill context menu with found categories
jbCatMan.onResultsTreeContextMenuPopup = function () {
  jbCatMan.dump("Begin with onResultsTreeContextMenuPopup()",1);

  let cards = GetSelectedAbCards();
  let rootEntry = document.getElementById("CatManCategoriesContextMenu");
  rootEntry.disabled = (cards.length == 0);
  if (!rootEntry.disabled) {

    let popup = document.getElementById("CatManCategoriesContextMenu-popup");
    while (popup.lastChild) {
        popup.removeChild(popup.lastChild);
    }

    let allCatsArray = jbCatMan.data.categoryList;
    for (let k = 0; k < allCatsArray.length; k++) {
      let countIn = 0;
      let countOut = 0;

      for (let i = 0; i < cards.length; i++) {
        if (cards[i].isMailList)
          continue;

        let thisCatsArray = jbCatMan.getCategoriesfromCard(cards[i]);
        if (thisCatsArray.indexOf(allCatsArray[k]) != -1) {
          //this card is in this category
          countIn++;
        } else {
          //this card is not in this category
          countOut++;
        }
      }
      
      let newItem = document.createElement("menuitem");
      //newItem.setAttribute("autocheck", "false");
      newItem.setAttribute("type", "checkbox");
      newItem.setAttribute("value", allCatsArray[k]);
      if (countIn != 0 && countOut == 0) newItem.setAttribute("checked", "true");
      else newItem.setAttribute("checked", "false");        

      //if it is a multiselection, add counts to label and open special popup on click
      if (cards.length > 1) {
        newItem.setAttribute("label", allCatsArray[k] + " ("+countIn + "/" + (countIn + countOut) + ")");
        newItem.addEventListener("click", jbCatMan.onMultiselectCategoriesContextMenuItemCommand, false);
      } else {
        newItem.setAttribute("label", allCatsArray[k]);
        if (cards[0].isMailList) newItem.setAttribute("disabled","true")
        else newItem.addEventListener("click", jbCatMan.onCategoriesContextMenuItemCommand, false);
      }
      
      popup.appendChild(newItem);
    }
  }
  jbCatMan.dump("Done with onResultsTreeContextMenuPopup()",-1);
}



// a category has been clicked on in the context menu while multiple contacts have been selected -> open special edit dialog to make changes
jbCatMan.onMultiselectCategoriesContextMenuItemCommand = function (event) {
  window.openDialog("chrome://sendtocategory/content/addressbook/catsedit.xul", "editCategory", "modal,centerscreen,chrome,resizable=no", this.value);
}



// a category has been clicked on in the context menu while a single contact has been selected ->  invert current category property
jbCatMan.onCategoriesContextMenuItemCommand = function (event) {
  jbCatMan.dump("Begin with onCategoriesContextMenuItemCommand()",1);
  let cards = GetSelectedAbCards();
  let category = this.value;
  let enabled = (event.target.getAttribute("checked") == "false");
  
  for (let i = 0; i < cards.length; i++) {
    let writeCategoriesToCard = false;
    let card = cards[i];
    let catsArray = jbCatMan.getCategoriesfromCard(card);
    let catIdx = catsArray.indexOf(category);
  
    if (enabled && catIdx == -1) {
      catsArray.push(category);
      writeCategoriesToCard = true;
    } else if (!enabled && catIdx != -1) {
      catsArray.splice(catIdx, 1);
      writeCategoriesToCard = true;
    }

    if (writeCategoriesToCard) {
      jbCatMan.setCategoriesforCard(card, catsArray);
      let abUri = jbCatMan.modifyCard(card);
    }
  }

  jbCatMan.dump("Done with onCategoriesContextMenuItemCommand()",-1);
}





//###################################################
// event listeners
//###################################################

 /*
  AbListener should detect bulk changes and only call updateCategoryList() after
  the last event. This is achieved by using clearTimeout and setTimeout on each
  event, so if a new event comes in while the timeout for the last one is not yet
  done, it gets postponed.
*/
 jbCatMan.AbListenerToUpdateCategoryList = {
  onItemAdded: function AbListenerToUpdateCategoryList_onItemAdded(aParentDir, aItem) {
    if (aItem instanceof Components.interfaces.nsIAbCard) {
      window.clearTimeout(jbCatMan.eventUpdateTimeout);
      jbCatMan.eventUpdateTimeout = window.setTimeout(function() { jbCatMan.dump("Begin trigger by onItemAdded(UpdateList)",1); jbCatMan.updateCategoryList(); jbCatMan.dump("Done trigger by onItemAdded(UpdateList)",-1);}, 1000);
    }
  },

  onItemPropertyChanged: function AbListenerToUpdateCategoryList_onItemPropertyChanged(aItem, aProperty, aOldValue, aNewValue) {
    if (aItem instanceof Components.interfaces.nsIAbCard) {
      window.clearTimeout(jbCatMan.eventUpdateTimeout);
      jbCatMan.eventUpdateTimeout = window.setTimeout(function() { jbCatMan.dump("Begin trigger by onItemPropertyChanged(UpdateList)",1); jbCatMan.updateCategoryList(); jbCatMan.dump("Done trigger by onItemPropertyChanged(UpdateList)",-1);}, 1000);
    }
  },

  onItemRemoved: function AbListenerToUpdateCategoryList_onItemRemoved(aParentDir, aItem) {
    if (aItem instanceof Components.interfaces.nsIAbCard) {
      window.clearTimeout(jbCatMan.eventUpdateTimeout);
      jbCatMan.eventUpdateTimeout = window.setTimeout(function() { jbCatMan.dump("Begin trigger by onItemRemoved(UpdateList)",1); jbCatMan.updateCategoryList(); jbCatMan.dump("Done trigger by onItemRemoved(UpdateList)",-1);}, 1000);
    }
  },

  add: function AbListenerToUpdateCategoryList_add() {
    if (Components.classes["@mozilla.org/abmanager;1"]) {
      // Thunderbird 3+
      Components.classes["@mozilla.org/abmanager;1"]
                .getService(Components.interfaces.nsIAbManager)
                .addAddressBookListener(jbCatMan.AbListenerToUpdateCategoryList, Components.interfaces.nsIAbListener.all);
    } else {
      // Thunderbird 2
      Components.classes["@mozilla.org/addressbook/services/session;1"]
                .getService(Components.interfaces.nsIAddrBookSession)
                .addAddressBookListener(jbCatMan.AbListenerToUpdateCategoryList, Components.interfaces.nsIAbListener.all);
    }
  },

  remove: function AbListenerToUpdateCategoryList_remove() {
    if (Components.classes["@mozilla.org/abmanager;1"]) {
      // Thunderbird 3+
      Components.classes["@mozilla.org/abmanager;1"]
                .getService(Components.interfaces.nsIAbManager)
                .removeAddressBookListener(jbCatMan.AbListenerToUpdateCategoryList);
    } else {
      // Thunderbird 2
      Components.classes["@mozilla.org/addressbook/services/session;1"]
                .getService(Components.interfaces.nsIAddrBookSession)
                .removeAddressBookListener(jbCatMan.AbListenerToUpdateCategoryList);
    }
  }
};





//###################################################
// override global functions
//###################################################

/********************************************************************************
 SelectFirstAddressBook() is defined in abCommon.js and is called only during 
 addressbook init in addressbook.js. So modifiying this function is the most 
 simple way, to load the last used addressbook, instead of the first one.
********************************************************************************/
jbCatMan.SelectFirstAddressBook_ORIG = SelectFirstAddressBook;
SelectFirstAddressBook = function() {
  jbCatMan.dump("Begin with SelectFirstAddressBook()",1);
  let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtocategory.");

  // Use standard SelectFirstAddressBook function, if the user does not want to load the last used book
  if (!prefs.getBoolPref("remember_last_book")) {
    jbCatMan.SelectFirstAddressBook_ORIG();
  } else {  
    //find index of lastBook - if not found we will end up with the first one
    let lastBook = prefs.getCharPref("last_book");
    let lastBookIndex = gDirTree.view.rowCount-1;
    while (gDirectoryTreeView.getDirectoryAtIndex(lastBookIndex).URI != lastBook && lastBookIndex > 0) {
      lastBookIndex--;
    }

    if (gDirTree.view.selection.currentIndex != lastBookIndex) {
      gDirTree.view.selection.select(lastBookIndex);
      if (gPreviousDirTreeIndex != lastBookIndex) {
        ChangeDirectoryByURI(GetSelectedDirectory());
      }
      gAbResultsTree.focus();  
    }
  }
  jbCatMan.dump("Done with SelectFirstAddressBook()",-1);
}



/********************************************************************************
 This is copied from SOGo to include the categories field in the card view pane.
 If the SOGo-connector is installed, DisplayCardViewPane() is not touched and the
 SOGo version is used (//sogo-connector/content/addressbook/cardview-overlay.js)
********************************************************************************/
jbCatMan.DisplayCardViewPane_ORIG = DisplayCardViewPane;
if (!jbCatMan.sogoInstalled) DisplayCardViewPane = function(card) {
        jbCatMan.DisplayCardViewPane_ORIG.apply(window, arguments);
        let CatManCategoriesLabel = document.getElementById("CatManCategoriesLabel");
        let cats = jbCatMan.getCategoriesfromCard(card).sort().join(", ");
        cvSetNodeWithLabel(CatManCategoriesLabel, CatManCategoriesLabel.getAttribute("CatManCategoriesLabelText"), cats);
}





//###################################################
// init
//###################################################

jbCatMan.initAddressbook = function() {
  jbCatMan.dump("Begin with initAddressbook()",1);
  // Add listener for card changes to update CategoryList
  jbCatMan.AbListenerToUpdateCategoryList.add();
   window.addEventListener("unload", function unloadListener(e) {
        window.removeEventListener("unload", unloadListener, false);
        jbCatMan.AbListenerToUpdateCategoryList.remove();
      }, false);

  // Add listener for action in search input field
  document.getElementById("peopleSearchInput").addEventListener('command', function () { jbCatMan.dump("Begin trigger by event onPeopleSearchClick()",1); jbCatMan.onPeopleSearchClick(); jbCatMan.dump("Done trigger by event onPeopleSearchClick()",-1); } , true);

  // Add listener for action in addressbook pane
  document.getElementById("dirTree").addEventListener('select', function () { jbCatMan.dump("Begin trigger by event onSelectAddressbook()",1); jbCatMan.onSelectAddressbook(); jbCatMan.dump("Done trigger by event onSelectAddressbook()",-1); }, true);

  //Add listener for category context menu
  document.getElementById("CatManCategoriesContextMenu-popup").addEventListener("popupshowing", function () { jbCatMan.dump("Begin trigger by event onResultsTreeContextMenuPopup()",1); jbCatMan.onResultsTreeContextMenuPopup(); jbCatMan.dump("Done trigger by event onResultsTreeContextMenuPopup()",-1); } , false);

  //Hide SOGo Categories ContextMenu
  let sogoContextMenu = document.getElementById("sc-categories-contextmenu");
  if (sogoContextMenu) sogoContextMenu.style.display = 'none';

  //add element via JS/DOM instead of XUL/overlay, because the containing HBOX has no ID
  var CatManInfoBox = document.getElementById("CatManInfoBox");
  var CatManInfoBoxClone = CatManInfoBox.cloneNode(true);
  CatManInfoBoxClone.id = "CatManInfoBoxClone";

  var localResultsOnlyMessage = document.getElementById("localResultsOnlyMessage");
  localResultsOnlyMessage.parentNode.insertBefore(CatManInfoBoxClone, localResultsOnlyMessage);

  //show/hide special MFFAB context menu entries
  document.getElementById("CatManContextMenuMFFABSplitter").hidden = !jbCatMan.isMFFABInstalled;
  document.getElementById("CatManContextMenuMFFABSwitch").hidden = !jbCatMan.isMFFABInstalled;
  
  //if MFFAB is installed and default category mode, check if it might be better to silently switch to MFFAB mode
  let doswitch = false;
  if (jbCatMan.isMFFABInstalled && !jbCatMan.isMFFABCategoryMode()) {
    let hasCategories = jbCatMan.booksHaveContactsWithProperty("Categories");
    let hasCategory = jbCatMan.booksHaveContactsWithProperty("Category");
    if (hasCategory && !hasCategories) doswitch = true;
  }
  
  //onSwitch sets the context menu labels after switching, however if doswitch is false, switching itself is skipped
  //do not refresh categorylist, because there is no list yet
  jbCatMan.onSwitchCategoryMode(doswitch, false);
  
  jbCatMan.dump("Done with initAddressbook()",-1);
}

// run init function after window has been loaded
window.addEventListener("load", function() { jbCatMan.initAddressbook(); }, false);
