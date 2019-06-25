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

jbCatMan.addCategoryListEntry = function (abURI, newCategoryName, currentCategoryFilter = []) {
  // Clone the array, do not mod the original array.
  let categoryFilter = currentCategoryFilter.slice();
  categoryFilter.push(newCategoryName);

  let newListItem = document.createElement("richlistitem");
  newListItem.id = btoa(JSON.stringify(categoryFilter)).split("=").join("");
  newListItem.categoryName = newCategoryName;
  newListItem.categoryFilter = categoryFilter;  
  newListItem.categorySize = jbCatMan.getNumberOfFilteredCards(abURI, categoryFilter);
  newListItem.subCategories = jbCatMan.getSubCategories(abURI, categoryFilter);

  if (jbCatMan.hierarchyMode) {
    // If ALL the subCategories are actually larger than this category, return null
    let allSubsLarger = true
    for (let subCat of newListItem.subCategories) {
      if (jbCatMan.data.foundCategories[subCat].length <= newListItem.categorySize)
        allSubsLarger = false;
        break;
    }
    if (newListItem.subCategories.length > 0 && allSubsLarger) 
      return null;
  }
  
  let classes = [];
  for (let i = 0; i < categoryFilter.length; i++) classes.push("level" + i);
  newListItem.setAttribute("class", classes.join(" "));
  newListItem.setAttribute("isOpen", "false");

  if (jbCatMan.hierarchyMode) {
    let categoryMore = document.createElement("hbox");
    if (newListItem.subCategories.length > 0) {
      categoryMore.setAttribute("class", "twisty");
      categoryMore.addEventListener("click", function(e) { jbCatMan.onClickCategoryList(e); }, false);
    }
    categoryMore.setAttribute("flex", "0");
    categoryMore.style["margin-left"] = (currentCategoryFilter.length * 16) + "px";
    newListItem.appendChild(categoryMore);
  }
  
  let categoryName = document.createElement("label");
  categoryName.setAttribute("flex", "1");
  categoryName.setAttribute("value", newCategoryName);
  newListItem.appendChild(categoryName);
  
  let categorySize = document.createElement("label");
  categorySize.setAttribute("flex", "0");
  categorySize.setAttribute("value", newListItem.categorySize);
  newListItem.appendChild(categorySize);
  return newListItem;
}

jbCatMan.toggleCategoryListEntry = function (abURI, element) {
  let categoriesList = document.getElementById("CatManCategoriesList");
  let isOpen = (element.getAttribute("isOpen") == "true");

  if (isOpen) {
    // toggle to closed
    element.setAttribute("isOpen", "false");
    // remove all entries up to the next element with the same level
    while (
      element.nextSibling && 
      element.nextSibling.categoryFilter && 
      Array.isArray(element.nextSibling.categoryFilter) && 
      element.nextSibling.categoryFilter.length > element.categoryFilter.length) {
        element.nextSibling.remove();
    }
  } else {
    // toggle to open
    element.setAttribute("isOpen", "true");
    // add entries
    for (let subCat of element.subCategories) {
      let newItem = jbCatMan.addCategoryListEntry(abURI, subCat, element.categoryFilter);
      if (newItem) categoriesList.insertBefore(newItem, element.nextSibling);    
    }
  }
}

jbCatMan.updateCategoryList = function () {
  jbCatMan.dump("Begin with updateCategoryList()",1);
  jbCatMan.scanCategories(GetSelectedDirectory());
  let abURI = GetSelectedDirectory();
  
  // It could be, that a category from emptyCategories is no longer empty (it was scanned) -> remove it from empty.
  for (let i = 0; i < jbCatMan.data.categoryList.length; i++) {
    if (jbCatMan.data.emptyCategories.indexOf(jbCatMan.data.categoryList[i]) != -1) {
      jbCatMan.data.emptyCategories.splice(jbCatMan.data.emptyCategories.indexOf(jbCatMan.data.categoryList[i]),1);
    }
  }
  
  // Any other category in the empty category list needs to be added now to the category list.
  for (let i = 0; i < jbCatMan.data.emptyCategories.length; i++) {
    if (jbCatMan.data.categoryList.indexOf(jbCatMan.data.emptyCategories[i]) < 0) {
      jbCatMan.data.categoryList.push(jbCatMan.data.emptyCategories[i]);
    }
  }
  
  // Save current open-states.
  let categoriesList = document.getElementById("CatManCategoriesList");
  let openNodes = categoriesList.querySelectorAll('richlistitem[isOpen=true]');  
  let openFilters = [];
  for (let openNode of openNodes) {
    openFilters.push(JSON.stringify(openNode.categoryFilter));
  }
  // Sort order must be reversed, otherwise child elements are before parent elements (which will skip the childs).
  openFilters.sort().reverse();
   
  // Clear current  list.
  categoriesList.clearSelection();
  for (let i=categoriesList.getRowCount(); i>0; i--) {
    categoriesList.getItemAtIndex(i-1).remove();
  }

  // Disable "all" element if global book and global book empty or if remote book.
  if (!(MailServices.ab.getDirectory(abURI).isRemote)) {// || (abURI == "moz-abdirectory://?" && jbCatMan.data.abSize == 0))) {
    let newListItem = document.createElement("richlistitem");
    newListItem.categoryFilter = "none";
    newListItem.id = btoa(JSON.stringify(newListItem.categoryFilter)).split("=").join("");
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
  
  // Add all categories from the updated/merged array to the category listbox.
  for (let i = 0; i < jbCatMan.data.categoryList.length; i++) {
    let newItem = jbCatMan.addCategoryListEntry(abURI, jbCatMan.data.categoryList[i]);
    if (newItem) categoriesList.appendChild(newItem);
  }

  // Restore open states.
  for (let openFilter of openFilters) {
    let node = categoriesList.querySelector("#" + btoa(openFilter).split("=").join(""));  
    if (node) jbCatMan.toggleCategoryListEntry(abURI, node);
  }
  
  // Disable "cardsWithoutCategories" element if global book and global book empty or if remote book
  if (!(MailServices.ab.getDirectory(abURI).isRemote)) {// || (abURI == "moz-abdirectory://?" && jbCatMan.data.cardsWithoutCategories.length == 0))) {
    let newListItem = document.createElement("richlistitem");
    newListItem.categoryFilter = "uncategorized";
    newListItem.id = btoa(JSON.stringify(newListItem.categoryFilter)).split("=").join("");

    if (jbCatMan.hierarchyMode) {
      let categoryMore = document.createElement("hbox");
      categoryMore.setAttribute("flex", "0");
      newListItem.appendChild(categoryMore);
    }
    
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
  
  // Check, if the former selected element still exists and select it again.
  if (jbCatMan.data.selectedCategoryFilter) {
    let node = categoriesList.querySelector("#" + btoa(JSON.stringify(jbCatMan.data.selectedCategoryFilter)).split("=").join(""));  
    if (node) {
      categoriesList.selectedItem = node;
      
      // Final check: Is the result view pane up to date? This is still not the best way to do it ...
      if (document.getElementById('abResultsTree').view.rowCount != node.categorySize) {
        jbCatMan.doCategorySearch(jbCatMan.data.selectedCategoryFilter);
      }
      
    } else {
      jbCatMan.data.selectedCategoryFilter = "";
      ClearCardViewPane();
      jbCatMan.updatePeopleSearchInput();
      SetAbView(abURI);
      SelectFirstCard();
    }
  }
  
  jbCatMan.updateButtons();
  jbCatMan.dump("Done with updateCategoryList()",-1);
}

jbCatMan.updateContextMenu = function () {
    let isRemote = true;
    let isGlobal = false;
    let isAll = (jbCatMan.data.selectedCategoryFilter == "none");
    let isUncategorized = (jbCatMan.data.selectedCategoryFilter == "uncategorized");
    let isDeeperLevel = (Array.isArray(jbCatMan.data.selectedCategoryFilter) &&  jbCatMan.data.selectedCategoryFilter.length > 1);
    let selectedBook = GetSelectedDirectory();

    if (selectedBook) isRemote = MailServices.ab.getDirectory(selectedBook).isRemote;
    if (selectedBook == "moz-abdirectory://?") isGlobal = true;

    document.getElementById("CatManContextMenuRemove").disabled = (isAll || isRemote || isGlobal || isUncategorized);
    document.getElementById("CatManContextMenuRename").disabled = (isAll || isRemote || isGlobal || isUncategorized);
    document.getElementById("CatManContextMenuBulk").disabled = (isAll || isRemote || isGlobal || isDeeperLevel || isUncategorized);
    document.getElementById("CatManContextMenuMFFABConvert").disabled = (isUncategorized || isRemote || isGlobal || isDeeperLevel || jbCatMan.data.categoryList.length == 0);

    document.getElementById("CatManContextMenuSend").disabled = (isAll || isRemote || isDeeperLevel || isUncategorized); 

    //Import and export for all address books, regardless of category (if no category selected, export entire abook or import without category tagging)
    document.getElementById("CatManContextMenuImportExport").disabled = isRemote || isGlobal;

    if (isAll) {
        document.getElementById("CatManContextMenuImportExport").label = jbCatMan.locale.menuAllExport;
    } else {
        document.getElementById("CatManContextMenuImportExport").label = jbCatMan.locale.menuExport;
    }
  
    //Special MFFAB entries
    let all = isAll ? "_all_" : "_";
    
    if (jbCatMan.isMFFABCategoryMode()) {
        document.getElementById("CatManContextMenuMFFABConvert").label = jbCatMan.getLocalizedMessage("convert"+all+"to_standard_category");
  } else {
        document.getElementById("CatManContextMenuMFFABConvert").label = jbCatMan.getLocalizedMessage("convert"+all+"to_MFFAB_category");
    }
  
}

jbCatMan.updateButtons = function () {
    let isRemote = true;
    let isGlobal = false;
    let isAll = (jbCatMan.data.selectedCategoryFilter == "none");
    let selectedBook = GetSelectedDirectory();
    if (selectedBook) isRemote = MailServices.ab.getDirectory(selectedBook).isRemote;
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

  let searchstring = jbCatMan.getCategorySearchString(GetSelectedDirectory(), jbCatMan.data.selectedCategoryFilter);
  let searches = jbCatMan.getSearchesFromSearchString(searchstring);

  let bcc = [];
  for (let search of searches) {
    let cards = MailServices.ab.getDirectory(search).childCards;
    
    while (cards.hasMoreElements()) {
      let card = cards.getNext().QueryInterface(Components.interfaces.nsIAbCard);
      let email = jbCatMan.getEmailFromCard(card);
      if (email) {
        let entry = card.displayName 
                        ?  "\"" + card.displayName + "\"" + " <" + email + ">"
                        : email;
        bcc.push(entry);
      }
    }
  }
  
  let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtocategory.");
  let setting = prefs.getCharPref("to_address"); 

  if (bcc.length > 0) {
    let sURL="mailto:";
    //Add envelope addr if specified - or add [ListName] to Subject
    if (setting != "") {
      sURL = sURL + "?to=" + encodeURIComponent(currentCategory) + "<" + encodeURIComponent(setting) + ">";
    } else {
      sURL = sURL + "?subject=" + encodeURIComponent("["+ jbCatMan.data.selectedCategoryFilter.join(" & ") +"] ");	    
    }
    //Add BCC
    sURL = sURL + "&bcc=" + encodeURIComponent(bcc.join(", "));

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
    let allAddressBooks = MailServices.ab.directories;
    while (allAddressBooks.hasMoreElements()) {
        let abook = allAddressBooks.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
        if (abook instanceof Components.interfaces.nsIAbDirectory) { // or nsIAbItem or nsIAbCollection
            let searchstring = abook.URI + "?(or("+field+",!=,))";
            let cards = MailServices.ab.getDirectory(searchstring).childCards;
            if (cards && cards.hasMoreElements()) return true;
        }
    }
    return false;
}

jbCatMan.onSelectAddressbook = function () {
  let selectedBook = GetSelectedDirectory();
  jbCatMan.dump("Begin with onSelectAddressbook("+gDirTree.view.selection.currentIndex+","+selectedBook+")",1);
  
  if (selectedBook) {
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtocategory.");
    jbCatMan.data.emptyCategories = [];
    jbCatMan.data.selectedCategoryFilter = "";
    jbCatMan.updateCategoryList();
  } else {
    //if for some reason no address book is selected, select the first one
    gDirTree.view.selection.select(0);
    ChangeDirectoryByURI(GetSelectedDirectory());
  }
  jbCatMan.dump("Done with onSelectAddressbook()",-1);
}


jbCatMan.onClickCategoryList = function (event) {
  jbCatMan.dump("Begin with onSelectCategoryList()",1);
  let categoriesList = document.getElementById("CatManCategoriesList");
  let abURI = GetSelectedDirectory();

  if (categoriesList.selectedIndex != -1 && categoriesList.selectedItem.subCategories.length > 0) {
    jbCatMan.toggleCategoryListEntry(abURI, categoriesList.selectedItem);
  }
}

jbCatMan.onSelectCategoryList = function () {
  jbCatMan.dump("Begin with onSelectCategoryList()",1);
  let categoriesList = document.getElementById("CatManCategoriesList");
  if (categoriesList.selectedIndex != -1) {
    jbCatMan.data.selectedCategoryFilter = categoriesList.selectedItem.categoryFilter;
    jbCatMan.doCategorySearch(jbCatMan.data.selectedCategoryFilter);
  }
  jbCatMan.updateButtons();
  jbCatMan.dump("Done with onSelectCategoryList()",-1);
}



jbCatMan.onPeopleSearchClick = function () {
  jbCatMan.dump("Begin with onPeopleSearchClick()",1);
  jbCatMan.data.selectedCategoryFilter = "none";
  document.getElementById("CatManCategoriesList").clearSelection();
  jbCatMan.dump("Done with onPeopleSearchClick()",-1);
}

jbCatMan.onConvertCategory = function () {
    let categoriesList = document.getElementById("CatManCategoriesList");
    let category = categoriesList.selectedItem.categoryName;
    if (category) {
      jbCatMan.convertCategory(GetSelectedDirectory(), category);
      // Remove the deleted category from the list
      jbCatMan.data.selectedCategoryFilter = jbCatMan.data.selectedCategoryFilter.filter( x => x != category)
      if ( jbCatMan.data.selectedCategoryFilter.length == 0)  jbCatMan.data.selectedCategoryFilter = "";
      jbCatMan.updateCategoryList();
    }
}

jbCatMan.onSwitchCategoryMode = function () {
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    prefs.setBoolPref("extensions.sendtocategory.mffab_mode",!prefs.getBoolPref("extensions.sendtocategory.mffab_mode"));

    //updateList
    jbCatMan.data.selectedCategoryFilter = "";
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
  let categoriesList = document.getElementById("CatManCategoriesList");
  if (categoriesList.selectedItem.categoryName) {
    window.openDialog("chrome://sendtocategory/content/addressbook/edit_category.xul", "editCategory", "modal,centerscreen,chrome,resizable=no", categoriesList.selectedItem.categoryName, jbCatMan.locale.editTitle, "rename");
  }
  jbCatMan.dump("Done with onRenameCategory()",-1);
}



jbCatMan.onDeleteCategory = function () {
  jbCatMan.dump("Begin with onDeleteCategory()",1);
  let categoriesList = document.getElementById("CatManCategoriesList");
  let category = categoriesList.selectedItem.categoryName;
  if (category) {
    // Is it an empty category? If so, we have to check, if it is on the empty category list and remove it.
    // If its not an empty category go through all contacts and remove that category.
    if (category in jbCatMan.data.foundCategories) {
      if (confirm(jbCatMan.locale.confirmDelete.replace("##oldname##", category).replace("##number##", jbCatMan.data.foundCategories[category].length))) {
        jbCatMan.updateCategories("remove", category);
      }
    }
    else {
      // Is it in the empty category list?
      let idx = jbCatMan.data.emptyCategories.indexOf(category);
      if (idx != -1) {
        jbCatMan.data.emptyCategories.splice(idx,1);
        // Remove the deleted category from the list.
        jbCatMan.data.selectedCategoryFilter = jbCatMan.data.selectedCategoryFilter.filter( x => x != category)
        if ( jbCatMan.data.selectedCategoryFilter.length == 0)  jbCatMan.data.selectedCategoryFilter = "";
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
    MailServices.ab.addAddressBookListener(jbCatMan.AbListenerToUpdateCategoryList, Components.interfaces.nsIAbListener.all);
  },

  remove: function AbListenerToUpdateCategoryList_remove() {
    MailServices.ab.removeAddressBookListener(jbCatMan.AbListenerToUpdateCategoryList);
  }
};








//###################################################
// init
//###################################################

jbCatMan.initAddressbook = function() {
  jbCatMan.dump("Begin with initAddressbook()",1);

  //add categories field to details view
  let CatManCategoriesHeader = document.createElement("description");
  CatManCategoriesHeader.id = "CatManCategoriesHeader";
  CatManCategoriesHeader.setAttribute("class", "CardViewHeading");
  CatManCategoriesHeader.textContent = jbCatMan.locale.categories;

  let CatManCategoriesLabel = document.createElement("description");
  CatManCategoriesLabel.id= "CatManCategoriesLabel";
  CatManCategoriesLabel.setAttribute("class", "CardViewText");
  CatManCategoriesLabel.CatManCategoriesLabelText = "";
  
  let cvbCategories = document.createElement("vbox");
  cvbCategories.id = "cvbCategories";
  cvbCategories.setAttribute("class", "cardViewGroup");
  cvbCategories.appendChild(CatManCategoriesHeader);
  cvbCategories.appendChild(CatManCategoriesLabel);

  let cvbPhone = document.getElementById("cvbPhone");
  cvbPhone.parentNode.insertBefore(cvbCategories, cvbPhone);
  
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

  document.getElementById("CatManCategoriesList").addEventListener("dblclick", function() { jbCatMan.writeToCategory(); }, false);
  document.getElementById("CatManCategoriesList").addEventListener("select", function() { jbCatMan.onSelectCategoryList(); }, false);
  
  jbCatMan.dump("Done with initAddressbook()",-1);
}


jbCatMan.onAbResultsPaneSelectionChanged = function () {
  let cards = window.GetSelectedAbCards();

  if (cards.length == 1) {
    let cats = jbCatMan.getCategoriesfromCard(cards[0]).sort().join(", ");
    let CatManCategoriesLabel = document.getElementById("CatManCategoriesLabel");    
    document.getElementById("cvbCategories").collapsed = !cvSetNodeWithLabel(CatManCategoriesLabel, CatManCategoriesLabel.getAttribute("CatManCategoriesLabelText"), cats);
  } else {
    document.getElementById("cvbCategories").collapsed = true;
  }

}
  


// run init function after window has been loaded
window.addEventListener("load", function() { jbCatMan.initAddressbook(); }, false);
