
var jbCatManEditDialog = {};

if (window.opener.jbCatMan) {
  var jbCatMan = window.opener.jbCatMan;
} else {
  let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
  loader.loadSubScript("chrome://sendtocategory/content/category_tools.js");
}

jbCatManEditDialog.Init = function () {
  jbCatMan.dump("Begin with EditDialogInit()",1);

  //Hide SOGo Category Tab
  if (jbCatMan.sogoInstalled) {
    let categoriesTabButton = document.getElementById("categoriesTabButton");
    if (categoriesTabButton) categoriesTabButton.style.display = 'none';
  }

  if (jbCatMan.isMFFABInstalled) {
    if (jbCatMan.sogoInstalled) {
        document.getElementById('abCatManCategoriesDescription').textContent = jbCatMan.getLocalizedMessage("category_description", "Category Manager / SOGo")
    } else {
        document.getElementById('abCatManCategoriesDescription').textContent = jbCatMan.getLocalizedMessage("category_description", "Category Manager")
    }
    document.getElementById('abCatManCategoriesDescription').hidden = false;
  }
  
  /* Bugfix "andre jutisz"
  The original idea was to remove the SOGo code, which was run after the OK button of the
  new/edit dialog was pressed. Thinking about it, we do not need to manipulate the SOGo sync
  code here, just let it do its stuff. All I have to do is to push the categories value from the 
  CatMan-categories-tab into the card, and prevent the SOGo code to push the empty fields from
  the hidden SOGo-categories-tab (which would clear the categories property) */
  if (typeof SCSaveCategories != 'undefined') SCSaveCategories = function() {
      jbCatMan.dump("Skipping SCSaveCategories function.");
  }

  jbCatManEditDialog.AllCatsArray = jbCatMan.scanCategories(gEditCard.abURI, "Categories");
  jbCatManEditDialog.CatsArray = jbCatMan.getCategoriesfromCard(gEditCard.card,"Categories"); 
  
  // add the combo boxes for each category
  for (let i = 0; i < jbCatManEditDialog.CatsArray.length; i++) {
    jbCatManEditDialog.AppendCategory(jbCatManEditDialog.CatsArray[i]);
  }

  // add focus event on empty field
  let emptyField = document.getElementById("abCatManEmptyCategory");
  emptyField.addEventListener("focus", jbCatManEditDialog.OnEmptyFieldFocus, false);  

  jbCatMan.dump("Done with EditDialogInit()",-1);
}





jbCatManEditDialog.OnEmptyFieldFocus = function (event) {
  let newCategory = jbCatManEditDialog.AppendCategory("");
  newCategory.focus();
  event.preventDefault = true;
}

jbCatManEditDialog.OnCategoryBlur = function () {
  let value = this.inputField.value.replace(/(^[ ]+|[ ]+$)/, "", "g");
  if (value.length == 0) {
    this.parentNode.removeChild(this);
  }
}

jbCatManEditDialog.OnCategoryChange = function () {
    if (this.selectedIndex == -1) { // text field was changed
        let value = this.inputField.value;
        if (value.length > 0) {
            if (jbCatManEditDialog.AllCatsArray.indexOf(value) < 0) {
                jbCatManEditDialog.AllCatsArray.push(value);
                let box = document.getElementById("abCatManCategories");
                let lists = box.getElementsByTagName("menulist");
                for (let i = 0; i < lists.length; i++) {
                    jbCatManEditDialog.ResetCategoriesMenu(lists[i]);
                }
            }
        }
    }
}



//triggered by OK Button
jbCatManEditDialog.Save = function () {
  jbCatMan.dump("Begin with EditDialogSave()",1);

  let vbox = document.getElementById("abCatManCategories");
  let menuLists = vbox.getElementsByTagName("menulist");
  let catsArray = [];
  for (var i = 0; i < menuLists.length; i++) {
    let value = menuLists[i].inputField.value.replace(/(^[ ]+|[ ]+$)/, "", "g");
    if (value.length > 0 && catsArray.indexOf(value) == -1) {
      catsArray.push(value);
    }
  }
  jbCatMan.dump("Setting categories to: " + catsArray.join(","));

  jbCatMan.setCategoriesforCard(gEditCard.card, catsArray, "Categories");
  /* BugFix "andre jutisz"
  It is not needed to call ab.modifyCard/ab.addCard, because this is
  taken care of by the dialog itself. */
  jbCatMan.dump("Done with EditDialogSave()",-1);
}

jbCatManEditDialog.AppendCategory = function (catValue) {  
    let vbox = document.getElementById("abCatManCategories");
    let menuList = document.createElement("menulist");
    menuList.setAttribute("editable", true);
    menuList.addEventListener("blur", jbCatManEditDialog.OnCategoryBlur, false);
    menuList.addEventListener("change", jbCatManEditDialog.OnCategoryChange, false);
    menuList.addEventListener("command", jbCatManEditDialog.OnCategoryChange, false);
    jbCatManEditDialog.ResetCategoriesMenu(menuList);
    menuList.value = catValue;
    vbox.appendChild(menuList);
    return menuList;
}

jbCatManEditDialog.ResetCategoriesMenu = function (menu) {
    let popups = menu.getElementsByTagName("menupopup");
    for (let i = 0; i < popups.length; i++) {
        menu.removeChild(popups[i]);
    }

    let menuPopup = document.createElement("menupopup");
    for (let k = 0; k < jbCatManEditDialog.AllCatsArray.length; k++) {
        let item = document.createElement("menuitem");
        item.setAttribute("label", jbCatManEditDialog.AllCatsArray[k]);
        menuPopup.appendChild(item);
    }
    menu.appendChild(menuPopup);
}







//Init on load
window.addEventListener("load", function() { jbCatManEditDialog.Init(); }, false);

//Add eventlistener for OK Button to save category changes
window.addEventListener("dialogaccept", function() { jbCatManEditDialog.Save(); }, false);
