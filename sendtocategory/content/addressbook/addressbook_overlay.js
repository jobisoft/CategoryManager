//using mailservices to open message window
var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

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
    categoriesList.getItemAtIndex(i-1).remove();
  }

  //disable "all" element if global book and global book empty or if remote book
  if (!(abManager.getDirectory(GetSelectedDirectory()).isRemote || (GetSelectedDirectory() == "moz-abdirectory://?" && jbCatMan.data.abSize == 0))) {
    let newListItem = document.createElement("richlistitem");
    newListItem.setAttribute("id", "");
    newListItem.setAttribute("type", "all");
    let categoryName = document.createElement("label");
    categoryName.setAttribute("flex", "1");
    categoryName.setAttribute("value", jbCatMan.locale.viewAllCategories);
    categoryName.setAttribute("style", "font-style:italic;");
    newListItem.appendChild(categoryName);
    let categorySize = document.createElement("label");
    categorySize.setAttribute("flex", "0");
    categorySize.setAttribute("value", jbCatMan.data.abSize);
    categorySize.setAttribute("style", "font-style:italic;");
    newListItem.appendChild(categorySize);
    categoriesList.appendChild(newListItem);
  }
    
  //disable cardsWithoutCategories for  global and remote book 
  if (!(abManager.getDirectory(GetSelectedDirectory()).isRemote || GetSelectedDirectory() == "moz-abdirectory://?" )) {
    let newListItem = document.createElement("richlistitem");
    newListItem.setAttribute("id", "");
    newListItem.setAttribute("type", "uncategorized");
    let categoryName = document.createElement("label");
    categoryName.setAttribute("flex", "1");
    categoryName.setAttribute("value", jbCatMan.getLocalizedMessage("viewWithoutCategories"));
    categoryName.setAttribute("style", "font-style:italic;");
    newListItem.appendChild(categoryName);
    let categorySize = document.createElement("label");
    categorySize.setAttribute("flex", "0");
    categorySize.setAttribute("value", jbCatMan.data.cardsWithoutCategories.length);
    categorySize.setAttribute("style", "font-style:italic;");
    newListItem.appendChild(categorySize);
    categoriesList.appendChild(newListItem);
  }
  
  //add all categories from the updated/merged array to the category listbox
  for (let i = 0; i < jbCatMan.data.categoryList.length; i++) {
    let newListItem = document.createElement("richlistitem");
    newListItem.setAttribute("id", jbCatMan.data.categoryList[i]);
    newListItem.setAttribute("type", "category");

    let categoryName = document.createElement("label");
    categoryName.setAttribute("flex", "1");
    categoryName.setAttribute("value", jbCatMan.data.categoryList[i]);
    newListItem.appendChild(categoryName);
    let categorySize = document.createElement("label");
    categorySize.setAttribute("flex", "0");
    if (jbCatMan.data.categoryList[i] in jbCatMan.data.foundCategories) {
      categorySize.setAttribute("value", jbCatMan.data.foundCategories[jbCatMan.data.categoryList[i]].length);
    }
    else {
      categorySize.setAttribute("value", "0");
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
      jbCatMan.updatePeopleSearchInput("");
      SetAbView(GetSelectedDirectory());
      SelectFirstCard();
    }
  } else {
    /* 
        There should not be any action here, since there is no category selected.
        The result pane could be anything (for example a search result) and we
        should not modify it.
      */
  }
  
  jbCatMan.updateButtons();
  jbCatMan.dump("Done with updateCategoryList()",-1);
}

jbCatMan.updateContextMenu = function () {
    let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
    let isRemote = true;
    let isGlobal = false;
    let isAll = (jbCatMan.data.selectedCategory == "");
    let isUncategorized = (jbCatMan.data.selectedCategoryType == "uncategorized");
    let selectedBook = GetSelectedDirectory();

    if (selectedBook) isRemote = abManager.getDirectory(selectedBook).isRemote;
    if (selectedBook == "moz-abdirectory://?") isGlobal = true;

    document.getElementById("CatManContextMenuRemove").disabled = (isAll || isRemote || isGlobal);
    document.getElementById("CatManContextMenuEdit").disabled = (isAll || isRemote || isGlobal);
    document.getElementById("CatManContextMenuBulk").disabled = (isAll || isRemote || isGlobal);
    document.getElementById("CatManContextMenuMFFABConvert").disabled = (isUncategorized || isRemote || isGlobal || jbCatMan.data.categoryList.length == 0);

    document.getElementById("CatManContextMenuSend").disabled = (isAll || isRemote); 

    //Import and export for all address books, regardless of category (if no category selected, export entire abook or import without category tagging)
    document.getElementById("CatManContextMenuImportExport").disabled = isRemote || isGlobal;

    if (jbCatMan.data.selectedCategoryType == "all") {
        document.getElementById("CatManContextMenuImportExport").label = jbCatMan.locale.menuAllExport;
    } else {
        document.getElementById("CatManContextMenuImportExport").label = jbCatMan.locale.menuExport;
    }
  
    //Special MFFAB entries
    let all = "_";
    if (jbCatMan.data.selectedCategoryType == "all") all = "_all_";
    
    if (jbCatMan.isMFFABCategoryMode()) {
        document.getElementById("CatManContextMenuMFFABConvert").label = jbCatMan.getLocalizedMessage("convert"+all+"to_standard_category");
  } else {
        document.getElementById("CatManContextMenuMFFABConvert").label = jbCatMan.getLocalizedMessage("convert"+all+"to_MFFAB_category");
    }
  
}

jbCatMan.updateButtons = function () {
    let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
    let isRemote = true;
    let isGlobal = false;
    let isAll = (jbCatMan.data.selectedCategoryType == "all");
    let selectedBook = GetSelectedDirectory();
    if (selectedBook) isRemote = abManager.getDirectory(selectedBook).isRemote;
    if (selectedBook == "moz-abdirectory://?") isGlobal = true;

    document.getElementById("CatManAddContactCategoryButton").disabled = isRemote || isGlobal;

    if (jbCatMan.isMFFABCategoryMode()) {
        document.getElementById("CatManBoxLabel").value = jbCatMan.getLocalizedMessage("found_categories", "(MFFAB) ");
        document.getElementById("CatManModeSlider").src = "chrome://sendtocategory/skin/slider-on.png";
    } else {
        document.getElementById("CatManBoxLabel").value = jbCatMan.getLocalizedMessage("found_categories", "");
        document.getElementById("CatManModeSlider").src = "chrome://sendtocategory/skin/slider-off.png";
    }
    document.getElementById("CatManModeSlider").hidden = !jbCatMan.isMFFABInstalled;
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
  let uriToOpen = ioservice.newURI("https://github.com/jobisoft/CategoryManager/wiki/F.A.Q.", null, null);
  let extps = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);
  extps.loadURI(uriToOpen, null);
  jbCatMan.dump("Done with onHelpButton()",-1);
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
    jbCatMan.data.selectedCategory = categoriesList.selectedItem.id;
    jbCatMan.data.selectedCategoryType = categoriesList.selectedItem.getAttribute("type");
    categoriesList.clearSelection();
    jbCatMan.doCategorySearch();
  }
  jbCatMan.updateButtons();
  jbCatMan.dump("Done with onSelectCategoryList()",-1);
}



jbCatMan.onPeopleSearchClick = function () {
  jbCatMan.dump("Begin with onPeopleSearchClick()",1);
  jbCatMan.data.selectedCategory = "";
  jbCatMan.dump("Done with onPeopleSearchClick()",-1);
}

jbCatMan.onConvertCategory = function () {
    jbCatMan.convertCategory(GetSelectedDirectory(), jbCatMan.data.selectedCategory);
    jbCatMan.updateCategoryList();
}

jbCatMan.onSwitchCategoryMode = function () {
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    prefs.setBoolPref("extensions.sendtocategory.mffab_mode",!prefs.getBoolPref("extensions.sendtocategory.mffab_mode"));

    //updateList
    jbCatMan.updateCategoryList();
    
    //check selected card after update
    let cards = GetSelectedAbCards();
    if (cards.length == 1 && cards[0].isMailList == false) DisplayCardViewPane(cards[0]);
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

  //Add listener for category context menu in results pane
  document.getElementById("CatManCategoriesContextMenu-popup").addEventListener("popupshowing", function () { jbCatMan.dump("Begin trigger by event onResultsTreeContextMenuPopup()",1); jbCatMan.onResultsTreeContextMenuPopup(); jbCatMan.dump("Done trigger by event onResultsTreeContextMenuPopup()",-1); } , false);

  //Add listener for category context menu in category pane
  document.getElementById("CatManContextMenu").addEventListener("popupshowing", jbCatMan.updateContextMenu , false);
  
  //Add listener for changed selection in results pane, to update CardViewPane
  document.getElementById("abResultsTree").addEventListener("select", jbCatMan.onAbResultsPaneSelectionChanged, false);

  //show/hide special MFFAB context menu entries
  document.getElementById("CatManContextMenuMFFABSplitter").hidden = !jbCatMan.isMFFABInstalled;
  document.getElementById("CatManContextMenuMFFABConvert").hidden = !jbCatMan.isMFFABInstalled;
  
  //if MFFAB is installed and default category mode, check if it might be better to silently switch to MFFAB mode
  if (jbCatMan.isMFFABInstalled && !jbCatMan.isMFFABCategoryMode()) {
    let hasCategories = jbCatMan.booksHaveContactsWithProperty("Categories");
    let hasCategory = jbCatMan.booksHaveContactsWithProperty("Category");
    if (hasCategory && !hasCategories) jbCatMan.onSwitchCategoryMode();
  }

  //hide SOGo Categories ContextMenu
  if (document.getElementById("sc-categories-contextmenu")) document.getElementById("sc-categories-contextmenu").style.display = 'none';

  //hide SOGo categories field in CardViewPane
  if (document.getElementById("SCCvCategories")) document.getElementById("SCCvCategories").hidden = true;
  
  jbCatMan.dump("Done with initAddressbook()",-1);
}


jbCatMan.onAbResultsPaneSelectionChanged = function () {
  let cards = window.GetSelectedAbCards();

  if (cards.length == 1) {
    let cats = jbCatMan.getCategoriesfromCard(cards[0]).sort().join(", ");
    let CatManCategoriesLabel = document.getElementById("CatManCategoriesLabel");    
    document.getElementById("CatManCategoriesHeader").hidden = !cvSetNodeWithLabel(CatManCategoriesLabel, CatManCategoriesLabel.getAttribute("CatManCategoriesLabelText"), cats);
  } else {
    document.getElementById("CatManCategoriesHeader").hidden = true;
  }

}
  


// run init function after window has been loaded
window.addEventListener("load", function() { jbCatMan.initAddressbook(); }, false);
