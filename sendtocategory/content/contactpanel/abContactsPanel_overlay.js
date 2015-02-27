
let CatMan = new categoryObject();

function contactPanelCategoryMenuInit() {
   
        let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
        scanCategories(abManager.getDirectory(document.getElementById('addressbookList').value));

        let menulist = document.getElementById("CatManCategoryFilterList");
        menulist.selectedItem = null;
        var itemCount = menulist.itemCount;
        for( var i = (itemCount-1); i >= 0; i-- ) menulist.removeItemAt(i);
        
        let menupopup = document.getElementById("CatManCategoryFilterListPopup");
        let newItem = document.createElement("menuitem");
        newItem.setAttribute("label", placeholderText);
        newItem.setAttribute("value", "");
        menupopup.appendChild( newItem );
        
        for (var i = 0; i < CatMan.categoryList.length; i++) {
            let newItem = document.createElement("menuitem");
            newItem.setAttribute("label", "- " + CatMan.categoryList[i]);
            newItem.setAttribute("value", CatMan.categoryList[i]);
            menupopup.appendChild( newItem );
        }        
        menulist.selectedItem = menulist.getItemAtIndex(0);
        
        if (CatMan.categoryList.length == 0) {
            menulist.disabled = true;
        } else {
            menulist.disabled = false;
        }
        updatePeopleSearchInput("");
}


function contactPanelCategoryMenuChanged() {      
	CatMan.selectedCategory = document.getElementById("CatManCategoryFilterList").value; 
        
        let menulist = document.getElementById("CatManCategoryFilterList");
        menulist.selectedItem = menulist.getItemAtIndex(0);
	
	doCategorySearch(document.getElementById('addressbookList').value);
}

    
