//using mailservices to open message window
Components.utils.import("resource://app/modules/mailServices.js");

let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://sendtocategory/content/category_tools.js");


/* stuff

props = card.properties;
while (props.hasMoreElements()) {
    prop = props.getNext().QueryInterface(Components.interfaces.nsIProperty); 
    dump("Prop ["+ prop.name+"] = ["+prop.value+"]\n");
}


If a sogo book (without sogo connector) is added cards, there is no groupdavid,
if sogo connector is switched back on - we need to add missing UUID?
- UUID is used and must therefore be present/checked for

use isRemote to not work on LDAP
*/



//###################################################
// adding additional functions to the jbCatMan Object
//###################################################

jbCatMan.updateCategoryList = function () {
  jbCatMan.dump("Begin with updateCategoryList()",1);
  jbCatMan.scanCategories();
  
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

  // add listitem to view contacts of all categories  if there is at least one other category
  if (jbCatMan.data.categoryList.length>0) {
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
    if (document.getElementById('abResultsTree').view.rowCount != jbCatMan.data.abSize) {
      ClearCardViewPane();
      SetAbView(GetSelectedDirectory());
      if (jbCatMan.data.abSize>0) SelectFirstCard();  
      jbCatMan.updatePeopleSearchInput("");
    }
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
  let isRemote = abManager.getDirectory(GetSelectedDirectory()).isRemote;

  document.getElementById("CatManContextMenuRemove").disabled = (jbCatMan.data.selectedCategory == "" || isRemote);
  document.getElementById("CatManContextMenuEdit").disabled = (jbCatMan.data.selectedCategory == "" || isRemote);
  document.getElementById("CatManContextMenuBulk").disabled = (jbCatMan.data.selectedCategory == "" || isRemote);

  //Send should be possible even if not a groupdav, so we can still send from global addressbook (if not deactivated)
  document.getElementById("CatManContextMenuSend").disabled = (jbCatMan.data.selectedCategory == ""); 

  //Import and export for all groupDavs, regardless of category (if no category selected, export entire abook or import without category tagging)
  //document.getElementById("CatManContextMenuImport").disabled = isRemote;
  //document.getElementById("CatManContextMenuExport").disabled = isRemote;

  document.getElementById("CatManAddContactCategoryButton").disabled = isRemote;
  document.getElementById("CatManContextMenuAdd").disabled = isRemote;

  if (jbCatMan.data.selectedCategory == "") {
    //document.getElementById("CatManContextMenuImport").label = jbCatMan.locale.menuAllImport;
    //document.getElementById("CatManContextMenuExport").label = jbCatMan.locale.menuAllExport;
    document.getElementById("CatManContextMenuRemove").label = jbCatMan.locale.menuRemove.replace("##name##","");
    document.getElementById("CatManContextMenuEdit").label = jbCatMan.locale.menuEdit.replace("##name##","");
    document.getElementById("CatManContextMenuSend").label = jbCatMan.locale.menuSend.replace("##name##","");
    document.getElementById("CatManContextMenuBulk").label = jbCatMan.locale.menuBulk.replace("##name##","");
  } else {
    //document.getElementById("CatManContextMenuImport").label = jbCatMan.locale.menuImport.replace("##name##","["+jbCatMan.data.selectedCategory+"]");
    //document.getElementById("CatManContextMenuExport").label = jbCatMan.locale.menuExport.replace("##name##","["+jbCatMan.data.selectedCategory+"]");
    document.getElementById("CatManContextMenuRemove").label = jbCatMan.locale.menuRemove.replace("##name##","["+jbCatMan.data.selectedCategory+"]");
    document.getElementById("CatManContextMenuEdit").label = jbCatMan.locale.menuEdit.replace("##name##","["+jbCatMan.data.selectedCategory+"]");
    document.getElementById("CatManContextMenuSend").label = jbCatMan.locale.menuSend.replace("##name##","["+jbCatMan.data.selectedCategory+"]");
    document.getElementById("CatManContextMenuBulk").label = jbCatMan.locale.menuBulk.replace("##name##","["+jbCatMan.data.selectedCategory+"]");
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
    aURI = ioService.newURI(sURL, null, null);  
    MailServices.compose.OpenComposeWindowWithURI (null, aURI); 
  }
  jbCatMan.dump("Done with writeToCategory()",-1);
}





//###################################################
// onActions
//###################################################

jbCatMan.onImport = function () {
  jbCatMan.dump("todo");
}



jbCatMan.onExport = function () {
  jbCatMan.dump("todo");
}



jbCatMan.onHelpButton = function () {
  let ioservice = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
  let uriToOpen = ioservice.newURI("https://github.com/jobisoft/CategoryManager/wiki/CategoryManager-1.62-Release-Notes", null, null);
  let extps = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"].getService(Components.interfaces.nsIExternalProtocolService);
  extps.loadURI(uriToOpen, null);
}



jbCatMan.onToggleDisplay = function (show) {
  if (show) {
    document.getElementById('CatManBox').collapsed = false;
    document.getElementById('CatManSplitter').hidden = false;
    document.getElementById('CatManShowBox').hidden = true;
  } else {
    document.getElementById('CatManBox').collapsed = true;
    document.getElementById('CatManSplitter').hidden = true;
    document.getElementById('CatManShowBox').hidden = false;
  }
}



jbCatMan.onSelectAddressbook = function () {
  jbCatMan.dump("Begin with onSelectAddressbook()",1);
  jbCatMan.dump("test");
/*  we only need sogo to sync
    if (!jbCatMan.sogoInstalled) {
    document.getElementById("CatManBox").style.display = 'none';
    alert("It looks like the SOGo-Connector Add-On is not installed, which is required for the CategoryManager to work! The following errors have been found:\n\n" + jbCatMan.sogoError + "\n\n" + "If you DO have the SOGo-Connector installed, please report this issue to john.bieling@gmx.de.");
    return false;
  }*/

  let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.sendtocategory.");
  // disable and clear ResultTreePane, if global abook is selected and user enabled this option
  if (gDirTree.view.selection.currentIndex == 0 && prefs.getBoolPref("disable_global_book")) {
    document.getElementById("abResultsTree").disabled = true;
    document.getElementById("peopleSearchInput").disabled = true;
    SetAbView();
  } else {
    document.getElementById("abResultsTree").disabled = false;
    document.getElementById("peopleSearchInput").disabled = false;
  }

  jbCatMan.data.emptyCategories = new Array();
  jbCatMan.data.selectedCategory = "";
  jbCatMan.updateCategoryList();
  prefs.setCharPref("last_book",GetSelectedDirectory());
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
  jbCatMan.data.selectedCategory = "";
  jbCatMan.updateButtons();
}



jbCatMan.onBulkEdit = function () {
  //initializing bulkedit-members
  jbCatMan.data.needToValidateBulkList = false;
  jbCatMan.data.needToSaveBulkList = false;
  jbCatMan.data.bulkList = "";
  jbCatMan.data.saveList = "";
  jbCatMan.data.cardsToBeRemovedFromCategory = new Array();
  jbCatMan.data.selectedDirectory = GetSelectedDirectory();
  
  //all 3 dialogs are called in sequence. Skipped, if canceled.
  window.openDialog("chrome://sendtocategory/content/addressbook/bulkedit_editAddresses.xul", "bulkeditCategory", "modal,centerscreen,chrome,resizable=no", "", jbCatMan.locale.bulkTitle,jbCatMan.data);
  if (jbCatMan.data.needToValidateBulkList) {
    window.openDialog("chrome://sendtocategory/content/addressbook/bulkedit_validateAddresses.xul", "bulkeditCategory", "modal,centerscreen,chrome,width=595,height=600,resizable=yes", "", jbCatMan.locale.bulkTitle,jbCatMan.data);
  }
  if (jbCatMan.data.needToSaveBulkList) {
    window.openDialog("chrome://sendtocategory/content/addressbook/bulkedit_saveAddresses.xul", "bulkeditCategory", "modal,centerscreen,chrome,resizable=yes", "", jbCatMan.locale.bulkTitle,jbCatMan.data);
    jbCatMan.updateCategoryList();
  }
}



jbCatMan.onAddCategory = function () {
  let saveObject = {
    setCategoryName: function CM_setCategoryName(newName) {
      newName=newName.trim();
      if (jbCatMan.data.categoryList.indexOf(newName) < 0) {
        jbCatMan.data.emptyCategories.push(newName);
        alert(jbCatMan.locale.infoAdd.replace("##newname##",newName));
        jbCatMan.updateCategoryList();
      } 
      else {
        alert(jbCatMan.locale.errorAdd.replace("##newname##",newName));
      }
    }
  };
  window.openDialog("chrome://sendtocategory/content/addressbook/edit_category.xul", "addCategory", "modal,centerscreen,chrome,resizable=no", "", jbCatMan.locale.addTitle, saveObject);
}



jbCatMan.onEditCategory = function () {
  if (jbCatMan.data.selectedCategory != "") {
    let saveObject = null;
    //Is it an empty category? If so, we can simply use the sogo rename function, otherwise we have to go through all contacts and rename that category.
    if (jbCatMan.data.selectedCategory in jbCatMan.data.foundCategories) {
      saveObject = {
        setCategoryName: function CM_setCategoryName(newName) {
          newName=newName.trim();
          //It is not allowed to rename a category to a name which exists already
          if (jbCatMan.data.categoryList.indexOf(newName) < 0) {
            if (confirm(jbCatMan.locale.confirmRename.replace("##oldname##",jbCatMan.data.selectedCategory).replace("##newname##",newName).replace("##number##",jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory].length))) {
              jbCatMan.updateCategories("rename",jbCatMan.data.selectedCategory,newName);
              jbCatMan.updatePeopleSearchInput(newName);
              jbCatMan.data.selectedCategory = newName;
            }
          } 
          else {
            alert(jbCatMan.locale.errorRename.replace("##oldname##",jbCatMan.data.selectedCategory).replace("##newname##",newName));
          }
        }
      };
    }
    else {
      saveObject = {
        setCategoryName: function CM_setCategoryName(newName) {
          newName=newName.trim();
          //It is not allowed to rename a category to a name which exists already
          if (jbCatMan.data.categoryList.indexOf(newName) < 0) {
            //this category only exists in the temp
            jbCatMan.data.emptyCategories[jbCatMan.data.emptyCategories.indexOf(jbCatMan.data.selectedCategory)] = newName;
            jbCatMan.updatePeopleSearchInput(newName);
            jbCatMan.data.selectedCategory = newName;
            jbCatMan.updateCategoryList();
          } 
          else {
            alert(jbCatMan.locale.errorRename.replace("##oldname##",jbCatMan.data.selectedCategory).replace("##newname##",newName));
          }
        }
      };
    }
    window.openDialog("chrome://sendtocategory/content/addressbook/edit_category.xul", "editCategory", "modal,centerscreen,chrome,resizable=no", jbCatMan.data.selectedCategory, jbCatMan.locale.editTitle, saveObject);	    		    
  }
}



jbCatMan.onDeleteCategory = function () {
  if (jbCatMan.data.selectedCategory != "") {
    //is it an empty category? If so, we have to check, if it is on the empty category list and remove it
    //if its not an empty category go through all contacts and remove that category.
    if (jbCatMan.data.selectedCategory in jbCatMan.data.foundCategories) {
      if (confirm(jbCatMan.locale.confirmDelete.replace("##oldname##",jbCatMan.data.selectedCategory).replace("##number##",jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory].length))) {
        jbCatMan.updateCategories("remove",jbCatMan.data.selectedCategory);
        jbCatMan.data.selectedCategory = "";
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
}

// disable context menu if not a single card has been selected, or fill context menu with found categories - IMPROVE MULTICARD SELECTION
jbCatMan.onResultsTreeContextMenuPopup = function (event) {
  jbCatMan.dump("Begin with onResultsTreeContextMenuPopup()",1);
  if (this == event.target) {
    // otherwise the reset will be executed when any submenu pops up too... 
    let cards = GetSelectedAbCards();
    let rootEntry = document.getElementById("CatManCategoriesContextMenu");
    rootEntry.disabled = (cards.length != 1);
    if (!rootEntry.disabled) {

        let popup = document.getElementById("CatManCategoriesContextMenu-popup");
        while (popup.lastChild) {
            popup.removeChild(popup.lastChild);
        }

        let allCatsArray = jbCatMan.data.categoryList;
        let thisCatsArray = jbCatMan.getCategoriesfromCard(cards[0]);

        for (let i = 0; i < allCatsArray.length; i++) {
            let newItem = document.createElement("menuitem");
            newItem.setAttribute("label", allCatsArray[i]);
            newItem.setAttribute("type", "checkbox");
            //newItem.setAttribute("autocheck", "false");
            if (thisCatsArray.indexOf(allCatsArray[i]) != -1) {
              newItem.setAttribute("checked", "true");
            } else {
              newItem.setAttribute("checked", "false");
            }
            newItem.addEventListener("click", jbCatMan.onCategoriesContextMenuItemCommand, false);
            popup.appendChild(newItem);
        }

    }
  }
  jbCatMan.dump("Done with onResultsTreeContextMenuPopup()",-1);
}

// a category has been disabled/enabled via context menu -> store in property
jbCatMan.onCategoriesContextMenuItemCommand = function (event) {
  jbCatMan.dump("Begin with onCategoriesContextMenuItemCommand()",1);
  let cards = GetSelectedAbCards();
  let category = this.label;
  let enabled = (event.target.getAttribute("checked") == "false");

  for (let i = 0; i < cards.length; i++) {
    let changed = false;
    let card = cards[i];
    let catsArray = jbCatMan.getCategoriesfromCard(card);
    let catIdx = catsArray.indexOf(category);
  
    if (enabled && catIdx == -1) {
      catsArray.push(category);
      changed = true;
    } else if (!enabled && catIdx != -1) {
      catsArray.splice(catIdx, 1);
      changed = true;
    }

    if (changed) {
      jbCatMan.setCategoriesforCard(card, catsArray);
      let abUri = GetSelectedDirectory(); //WORKS FOR ROOT AB? NO! TODO: Get true AB of card!
      let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
      let ab = abManager.getDirectory(abUri);
      ab.modifyCard(card);
      //trigger sync
    }
  }
  jbCatMan.dump("Done with onCategoriesContextMenuItemCommand()",-1);
}


//###################################################
// event listeners
//###################################################

jbCatMan.AbListener = {

  onItemAdded: function AbListener_onItemAdded(
                                                                  aParentDir,
                                                                  aItem) {
    jbCatMan.updateCategoryList();
  },

  onItemPropertyChanged: function AbListener_onItemPropertyChanged(
                                                                  aItem,
                                                                  aProperty,
                                                                  aOldValue,
                                                                  aNewValue) {
    jbCatMan.updateCategoryList();
  },

  onItemRemoved: function AbListener_onItemRemoved(
                                                                  aParentDir,
                                                                  aItem) {
    jbCatMan.updateCategoryList();
  },

  add: function AbListener_add() {
    if (Components.classes["@mozilla.org/abmanager;1"]) {
      // Thunderbird 3+
      Components.classes["@mozilla.org/abmanager;1"]
                .getService(Components.interfaces.nsIAbManager)
                .addAddressBookListener(jbCatMan.AbListener, Components.interfaces.nsIAbListener.all);
    } else {
      // Thunderbird 2
      Components.classes["@mozilla.org/addressbook/services/session;1"]
                .getService(Components.interfaces.nsIAddrBookSession)
                .addAddressBookListener(jbCatMan.AbListener, Components.interfaces.nsIAbListener.all);
    }
  },

  remove: function AbListener_remove() {
    if (Components.classes["@mozilla.org/abmanager;1"]) {
      // Thunderbird 3+
      Components.classes["@mozilla.org/abmanager;1"]
                .getService(Components.interfaces.nsIAbManager)
                .removeAddressBookListener(jbCatMan.AbListener);
    } else {
      // Thunderbird 2
      Components.classes["@mozilla.org/addressbook/services/session;1"]
                .getService(Components.interfaces.nsIAddrBookSession)
                .removeAddressBookListener(jbCatMan.AbListener);
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
    lastBook = prefs.getCharPref("last_book");
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

  // Add listener for card changes
  jbCatMan.AbListener.add();
   window.addEventListener("unload", function unloadListener(e) {
        window.removeEventListener("unload", unloadListener, false);
        jbCatMan.AbListener.remove();
      }, false);

  // Add listener for action in search input field
  document.getElementById("peopleSearchInput").addEventListener('command', jbCatMan.onPeopleSearchClick, true);

  // Add listener for action in addressbook pane
  document.getElementById("dirTree").addEventListener('select', jbCatMan.onSelectAddressbook, true);

  //Add listener for category context menu
  document.getElementById("abResultsTreeContext").addEventListener("popupshowing", jbCatMan.onResultsTreeContextMenuPopup, false);

}

// run init function after window has been loaded
window.addEventListener("load", function() { jbCatMan.initAddressbook(); }, false);
