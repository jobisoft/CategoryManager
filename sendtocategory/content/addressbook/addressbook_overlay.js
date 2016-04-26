//using mailservices to open message window
Components.utils.import("resource://app/modules/mailServices.js");

let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://sendtocategory/content/category_tools.js");

//###################################################
//adding additional functions to the jbCatMan Object
//###################################################

jbCatMan.updateCategoryList = function () {
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
  
  //this will update the category drop down menu
  SCContactCategories.setCategoriesAsArray(jbCatMan.data.categoryList);
  
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
  
  //remove all catmenuitems from cat search menu
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
  }
}



jbCatMan.updateButtons = function () {
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
  
  document.getElementById("CatManContextMenuRemove").disabled = (jbCatMan.data.selectedCategory == "" || !isGroupdavDirectory(GetSelectedDirectory()));
  document.getElementById("CatManContextMenuEdit").disabled = (jbCatMan.data.selectedCategory == "" || !isGroupdavDirectory(GetSelectedDirectory()));
  document.getElementById("CatManContextMenuSend").disabled = (jbCatMan.data.selectedCategory == "");
  document.getElementById("CatManContextMenuBulk").disabled = (jbCatMan.data.selectedCategory == "" || !isGroupdavDirectory(GetSelectedDirectory()));

  if (jbCatMan.sogoInstalled) {
    document.getElementById("CatManAddContactCategoryButton").disabled = (abManager.getDirectory(GetSelectedDirectory()).isRemote || !isGroupdavDirectory(GetSelectedDirectory()));    
    document.getElementById("CatManContextMenuAdd").disabled = (abManager.getDirectory(GetSelectedDirectory()).isRemote || !isGroupdavDirectory(GetSelectedDirectory()));    
  } else {
    document.getElementById("CatManAddContactCategoryButton").disabled = true;
    document.getElementById("CatManContextMenuAdd").disabled = true;
  }
  
  if (jbCatMan.data.selectedCategory == "") {
    document.getElementById("CatManContextMenuRemove").label = jbCatMan.locale.menuRemove.replace("##name##","");
    document.getElementById("CatManContextMenuEdit").label = jbCatMan.locale.menuEdit.replace("##name##","");
    document.getElementById("CatManContextMenuSend").label = jbCatMan.locale.menuSend.replace("##name##","");
    document.getElementById("CatManContextMenuBulk").label = jbCatMan.locale.menuBulk.replace("##name##","");
  } else {
    document.getElementById("CatManContextMenuRemove").label = jbCatMan.locale.menuRemove.replace("##name##","["+jbCatMan.data.selectedCategory+"]");
    document.getElementById("CatManContextMenuEdit").label = jbCatMan.locale.menuEdit.replace("##name##","["+jbCatMan.data.selectedCategory+"]");
    document.getElementById("CatManContextMenuSend").label = jbCatMan.locale.menuSend.replace("##name##","["+jbCatMan.data.selectedCategory+"]");
    document.getElementById("CatManContextMenuBulk").label = jbCatMan.locale.menuBulk.replace("##name##","["+jbCatMan.data.selectedCategory+"]");
  }    
}



jbCatMan.writeToCategory = function () {
  let currentCategory = jbCatMan.data.selectedCategory;
  let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("accessibility.");
  let branch = prefs.getChildList("", {});
  let setting = branch["sendtocategory.toaddress"];

  if ("" + setting == "undefined") {
    setting = "";
  }
    
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
  } else {
    //no need to alert
    //alert("Selected Category does not contain any contacts.");
  }
}










//############
// onActions
//############

jbCatMan.onSelectAddressbook = function () {
  if (!jbCatMan.sogoInstalled) {
    document.getElementById("CatManBox").style.display = 'none';
    if (jbCatMan.sogoAlert) alert("It looks like the SOGo-Connector Add-On is not installed, which is required for the CategoryManager to work! The following errors have been found:\n\n" + jbCatMan.sogoError + "\n\n" + "If you DO have the SOGo-Connector installed, please report this issue to john.bieling@gmx.de.");
    jbCatMan.sogoAlert = false;
    return false;
  }
  jbCatMan.data.emptyCategories = new Array();
  jbCatMan.data.selectedCategory = "";
  jbCatMan.updateCategoryList();
}        



jbCatMan.onSelectCategoryList = function () {
  let categoriesList = document.getElementById("CatManCategoriesList");
  if (categoriesList.selectedIndex != -1) {
    jbCatMan.data.selectedCategory = categoriesList.selectedItem.id
    categoriesList.clearSelection();
    jbCatMan.doCategorySearch();
  }    
  jbCatMan.updateButtons();
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










//############################
// override global functions
//############################

jbCatMan.onEnterInSearchBar_ORIG = onEnterInSearchBar;
onEnterInSearchBar = function() {
  rval = jbCatMan.onEnterInSearchBar_ORIG();
  jbCatMan.onPeopleSearchClick();
  return rval;
}



jbCatMan.DirPaneSelectionChange_ORIG = DirPaneSelectionChange;
DirPaneSelectionChange = function() {
  rval = jbCatMan.DirPaneSelectionChange_ORIG();
  jbCatMan.onSelectAddressbook();
  return rval;
}



jbCatMan.SynchronizeGroupdavAddressbook_ORIG = null;
if (jbCatMan.sogoInstalled) {
  jbCatMan.SynchronizeGroupdavAddressbook_ORIG = SynchronizeGroupdavAddressbook;
  SynchronizeGroupdavAddressbook = function(uri) {
    rval = jbCatMan.SynchronizeGroupdavAddressbook_ORIG(uri);
    jbCatMan.updateCategoryList();
    return rval;
  }
}
