
let CatMan = new categoryObject();


function updateCategoryList() {
    scanCategories();
    
    //it could be, that a category from emptyCategories is no longer empty (it was scanned) -> remove it from empty
    for (var i = 0; i < CatMan.categoryList.length; i++) {
        if (CatMan.emptyCategories.indexOf(CatMan.categoryList[i]) != -1) {
            CatMan.emptyCategories.splice(CatMan.emptyCategories.indexOf(CatMan.categoryList[i]),1);
        }
    }         
    
    //any other category in the empty category list needs to be added now to the category list
    for (var i = 0; i < CatMan.emptyCategories.length; i++) {
        if (CatMan.categoryList.indexOf(CatMan.emptyCategories[i]) < 0) {
            CatMan.categoryList.push(CatMan.emptyCategories[i]);
        }
    }   
    
    //this will update the category drop down menu
    SCContactCategories.setCategoriesAsArray(CatMan.categoryList);                  
    
    //clear category listbox
    let categoriesList = document.getElementById("CatManCategoriesList");
    categoriesList.clearSelection();
    for (var i=categoriesList.getRowCount(); i>0; i--) {
        categoriesList.removeItemAt(i-1);            
    }                  
    
    //add all categories from the updated/merged array to the category listbox
    for (var i = 0; i < CatMan.categoryList.length; i++) {

        let newListItem = document.createElement("listitem");
        newListItem.setAttribute("id", CatMan.categoryList[i]);

        let categoryName = document.createElement("listcell");
        categoryName.setAttribute("label", CatMan.categoryList[i]);
        newListItem.appendChild(categoryName);	
        let categorySize = document.createElement("listcell");
        if (CatMan.categoryList[i] in CatMan.foundCategories) {
            categorySize.setAttribute("label", CatMan.foundCategories[CatMan.categoryList[i]].length);
        } 
        else {
            categorySize.setAttribute("label", 0);
        }
        newListItem.appendChild(categorySize);            
        categoriesList.appendChild(newListItem);
    }        

    //Does the displayed result still match the selected category? If not, update SearchResults
    if (CatMan.selectedCategory != "") {
        if (CatMan.selectedCategory in CatMan.foundCategories) {
                if (document.getElementById('abResultsTree').view.rowCount != CatMan.foundCategories[CatMan.selectedCategory].length) {
                    doCategorySearch();
                }
        } else {
            //Selected Category does not exist, fallback 
            ClearCardViewPane();
            CatMan.selectedCategory = "";
            SetAbView(GetSelectedDirectory());
            if (CatMan.abSize>0) SelectFirstCard();  
            updatePeopleSearchInput("");
        }
    } else {
        if (document.getElementById('abResultsTree').view.rowCount != CatMan.abSize) {
            ClearCardViewPane();
            SetAbView(GetSelectedDirectory());
            if (CatMan.abSize>0) SelectFirstCard();  
            updatePeopleSearchInput("");
        }
    }
    
    updateButtons();
    
    //remove all catmenuitems from cat search menu
    let menupopup = document.getElementById("SCSearchCriteriaButtonMenu");
    for (let i = menupopup.childNodes.length ; i > 0; i--) {
        if (menupopup.childNodes[i-1].value=="catmenuitem") {
            menupopup.removeChild(menupopup.childNodes[i-1]);
        }
    }

    //update search menu dropdown
    if (CatMan.categoryList.length>0) {            
        let newItem = document.createElement("menuseparator");
        newItem.setAttribute("value", "catmenuitem");
        menupopup.appendChild( newItem );        
    
        //update search menu dropdown
        for (let i = 0; i < CatMan.categoryList.length; i++) {
            let newItem = document.createElement("menuitem");
            newItem.setAttribute("label", prefixForPeopleSearch + ": " + CatMan.categoryList[i]);
            newItem.setAttribute("value", "catmenuitem");
            newItem.setAttribute("oncommand", "CatMan.selectedCategory='"+CatMan.categoryList[i]+"';doCategorySearch();");
            menupopup.appendChild( newItem );
        }        
    }

}

  
function updateButtons() {
    let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
    
    document.getElementById("CatManContextMenuRemove").disabled = (CatMan.selectedCategory == "");
    document.getElementById("CatManContextMenuEdit").disabled = (CatMan.selectedCategory == "");
    document.getElementById("CatManContextMenuSend").disabled = (CatMan.selectedCategory == "");
    document.getElementById("CatManContextMenuBulk").disabled = (CatMan.selectedCategory == "");

    document.getElementById("CatManAddContactCategoryButton").disabled = (abManager.getDirectory(GetSelectedDirectory()).isRemote || !isGroupdavDirectory(GetSelectedDirectory()));    
    document.getElementById("CatManContextMenuAdd").disabled = (abManager.getDirectory(GetSelectedDirectory()).isRemote || !isGroupdavDirectory(GetSelectedDirectory()));    
    
    if (CatMan.selectedCategory == "") {
        document.getElementById("CatManContextMenuRemove").label = menuRemove.replace("##name##","");
        document.getElementById("CatManContextMenuEdit").label = menuEdit.replace("##name##","");
        document.getElementById("CatManContextMenuSend").label = menuSend.replace("##name##","");
        document.getElementById("CatManContextMenuBulk").label = menuBulk.replace("##name##","");
    } else {
        document.getElementById("CatManContextMenuRemove").label = menuRemove.replace("##name##","["+CatMan.selectedCategory+"]");
        document.getElementById("CatManContextMenuEdit").label = menuEdit.replace("##name##","["+CatMan.selectedCategory+"]");
        document.getElementById("CatManContextMenuSend").label = menuSend.replace("##name##","["+CatMan.selectedCategory+"]");
        document.getElementById("CatManContextMenuBulk").label = menuBulk.replace("##name##","["+CatMan.selectedCategory+"]");
    }
    
}









function writeToCategory() {
    var currentCategory = CatMan.selectedCategory;
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("accessibility.");
    let branch = prefs.getChildList("", {});
    let setting = branch["sendtocategory.toaddress"];

    if ("" + setting == "undefined") {
	setting = "";
    }
	    
    if (currentCategory!="" && (currentCategory in CatMan.foundCategories)) {
	
	var sURL="mailto:";
	//Add envelope addr if specified - or add [ListName] to Subject
	if (setting != "") {
		var sURL = sURL + "?to=" + encodeURIComponent(currentCategory) + "<" + encodeURIComponent(setting) + ">";
	} else {
	sURL = sURL + "?subject=" + encodeURIComponent("["+currentCategory+"] ");	    
	}
	//Add BCC
	sURL = sURL + "&bcc=" + encodeURIComponent(CatMan.bcc[currentCategory].join(", "));
	
	//create the service, the URI and open the new message window
	var msgComposeService = Components.classes["@mozilla.org/messengercompose;1"].getService(Components.interfaces.nsIMsgComposeService);  
	var ioService =  Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);  
	aURI = ioService.newURI(sURL, null, null);  
	msgComposeService.OpenComposeWindowWithURI (null, aURI);        
	
    } else {
	    //no need to alert
	    //alert("Selected Category does not contain any contacts.");	    
    }
}





//###########
// onActions
//###########

 function onSelectAddressbook() {
    if (typeof(SynchronizeGroupdavAddressbook) != "function") {
        document.getElementById("CatManBox").style.display = 'none';
        alert("It looks like the sogo conector is not installed, which is required for the category manager (or the currently implemented method to detect, if the sogo connector is installed, does not work)!");
        return false;
    }
    CatMan.emptyCategories = new Array();
    CatMan.selectedCategory = "";
    updateCategoryList();
}        


function onSelectCategoryList() {        
    let categoriesList = document.getElementById("CatManCategoriesList");
    if (categoriesList.selectedIndex != -1) {
        CatMan.selectedCategory = categoriesList.selectedItem.id
        categoriesList.clearSelection();
        doCategorySearch();
    }    
    updateButtons();                
}   


function onPeopleSearchClick() {
    CatMan.selectedCategory = "";
    updateButtons();
}


function onBulkEdit() {
    //Adding a member to CatMan here, which is not used anywhere else, so no need to include it in init sequence
    CatMan.needToValidateBulkList = false;
    CatMan.needToSaveBulkList = false;
    CatMan.bulkList = "";
    CatMan.saveList = "";
    CatMan.CardsToBeRemovedFromCategory = new Array();
    CatMan.selectedDirectory = GetSelectedDirectory();
    window.openDialog("chrome://sendtocategory/content/addressbook/bulkedit_editAddresses.xul", "bulkeditCategory", "modal,centerscreen,chrome,resizable=no", "", bulkTitle,CatMan);
    if (CatMan.needToValidateBulkList) {
        window.openDialog("chrome://sendtocategory/content/addressbook/bulkedit_validateAddresses.xul", "bulkeditCategory", "modal,centerscreen,chrome,width=595,height=600,resizable=yes", "", bulkTitle,CatMan);
    }
    if (CatMan.needToSaveBulkList) {
        window.openDialog("chrome://sendtocategory/content/addressbook/bulkedit_saveAddresses.xul", "bulkeditCategory", "modal,centerscreen,chrome,resizable=yes", "", bulkTitle,CatMan);
        updateCategoryList();
    }    
}


function onAddCategory() {
    let this_ = this;
    let saveObject = {
        setCategoryName: function CM_setCategoryName(newName) {
                if (CatMan.categoryList.indexOf(newName) < 0) {
                    CatMan.emptyCategories.push(newName);
                    alert(infoAdd.replace("##newname##",newName));
                    //call updateCategoryList directly, no need to go via sync listener
                    updateCategoryList();
                } 
                else {
                    alert(errorAdd.replace("##newname##",newName));
                }
        }
    };
    window.openDialog("chrome://sendtocategory/content/addressbook/edit_category.xul", "addCategory", "modal,centerscreen,chrome,resizable=no", "", addTitle, saveObject);
}    


function onEditCategory() {
    if (CatMan.selectedCategory != "") {
        let this_ = this;
        let saveObject = null;
        //Is it an empty category? If so, we can simply use the sogo rename function, otherwise we have to go through all contacts and rename that category.
        if (CatMan.selectedCategory in CatMan.foundCategories) {
            saveObject = {
                setCategoryName: function CM_setCategoryName(newName) {
                        //It is not allowed to rename a category to a name which exists already
                        if (CatMan.categoryList.indexOf(newName) < 0) {
                            if (confirm(confirmRename.replace("##oldname##",CatMan.selectedCategory).replace("##newname##",newName).replace("##number##",CatMan.foundCategories[CatMan.selectedCategory].length))) {
                                updateCategories("rename",CatMan.selectedCategory,newName);
                                updatePeopleSearchInput(newName);
                                CatMan.selectedCategory = newName;
                            }
                        } 
                        else {
                            alert(errorRename.replace("##oldname##",CatMan.selectedCategory).replace("##newname##",newName));
                        }
                }
            };                
        } 
        else {
            saveObject = {
                setCategoryName: function CM_setCategoryName(newName) {
                        //It is not allowed to rename a category to a name which exists already
                        if (CatMan.categoryList.indexOf(newName) < 0) {
                            //this category only exists in the temp
                            CatMan.emptyCategories[CatMan.emptyCategories.indexOf(CatMan.selectedCategory)] = newName;
                            updatePeopleSearchInput(newName);
                            CatMan.selectedCategory = newName;
                            updateCategoryList();
                        } 
                        else {
                            alert(errorRename.replace("##oldname##",CatMan.selectedCategory).replace("##newname##",newName));
                        }
                }
            };
        }
            
        window.openDialog("chrome://sendtocategory/content/addressbook/edit_category.xul", "editCategory", "modal,centerscreen,chrome,resizable=no", CatMan.selectedCategory, editTitle, saveObject);	    		    
    }
}    


function onDeleteCategory() {
    if (CatMan.selectedCategory != "") {
        //is it an empty category? If so, we have to check, if it is on the empty category list and remove it
        //if its not an empty category go through all contacts and remove that category.
        if (CatMan.selectedCategory in CatMan.foundCategories) {
            if (confirm(confirmDelete.replace("##oldname##",CatMan.selectedCategory).replace("##number##",CatMan.foundCategories[CatMan.selectedCategory].length))) {
                updateCategories("remove",CatMan.selectedCategory);
                //no need to update selectedCategory, he will realize, that it is no longer there
            }
        } 
        else {
            //is it in the empty category list?
            var idx = CatMan.emptyCategories.indexOf(CatMan.selectedCategory);
            if (idx != -1) {
                CatMan.emptyCategories.splice(idx,1);
                updateCategoryList();
            }
        }	    
    }
}
    


//override onEnterInSearchBar()
var onEnterInSearchBar_ORIG = onEnterInSearchBar;
onEnterInSearchBar = function() {
    rval = onEnterInSearchBar_ORIG();
    onPeopleSearchClick();
    return rval;
}


//override DirPaneSelectionChange()
var DirPaneSelectionChange_ORIG = DirPaneSelectionChange;
DirPaneSelectionChange = function() {
    rval = DirPaneSelectionChange_ORIG();
    onSelectAddressbook();
    return rval;
}

//override SynchronizeGroupdavAddressbook()
var SynchronizeGroupdavAddressbook_ORIG = SynchronizeGroupdavAddressbook;
SynchronizeGroupdavAddressbook = function(uri) {
    rval = SynchronizeGroupdavAddressbook_ORIG(uri);
    updateCategoryList();
    return rval;
}
