let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://sendtocategory/content/category_tools.js");


jbCatMan.EditDialogInit = function () {

  //Enable CatManCategory Tab
  let abCatManCategoriesTabButton = document.getElementById("abCatManCategoriesTabButton");
  abCatManCategoriesTabButton.style.display = 'block'; 
  
  jbCatMan.scanCategories(gEditCard.abURI);
  jbCatMan.EditDialogAllCatsArray = jbCatMan.data.categoryList;

  jbCatMan.EditDialogCatsArray = [];
  try {
    jbCatMan.EditDialogCatsArray = gEditCard.card.getPropertyAsAString("Categories").split("\u001A");
  } catch (ex) {}  

  //dump(gEditCard.abURI + "\n");
  //dump(jbCatMan.data.abURI[gEditCard.card.directoryId] + "\n");


  // add the combo boxes for each category
  for (let i = 0; i < jbCatMan.EditDialogCatsArray.length; i++) {
    jbCatMan.EditDialogAppendCategory(jbCatMan.EditDialogCatsArray[i]);
  }

  // add focus event on empty field
  let emptyField = document.getElementById("abCatManEmptyCategory");
  emptyField.addEventListener("focus", jbCatMan.EditDialogOnEmptyFieldFocus, false);  
}





jbCatMan.EditDialogOnEmptyFieldFocus = function (event) {
  let newCategory = jbCatMan.EditDialogAppendCategory("");
  newCategory.focus();
  event.preventDefault = true;
}

jbCatMan.EditDialogOnCategoryBlur = function () {
  let value = this.inputField.value.replace(/(^[ ]+|[ ]+$)/, "", "g");
  if (value.length == 0) {
    this.parentNode.removeChild(this);
  }
}

jbCatMan.EditDialogOnCategoryChange = function () {
    if (this.selectedIndex == -1) { // text field was changed
        let value = this.inputField.value;
        if (value.length > 0) {
            if (jbCatMan.EditDialogAllCatsArray.indexOf(value) < 0) {
                jbCatMan.EditDialogAllCatsArray.push(value);
                let box = document.getElementById("abCatManCategories");
                let lists = box.getElementsByTagName("menulist");
                for (let i = 0; i < lists.length; i++) {
                    jbCatMan.EditDialogResetCategoriesMenu(lists[i]);
                }
            }
        }
    }
}




jbCatMan.EditDialogSaveCategories = function () {
  jbCatMan.dump("Begin with EditDialogSaveCategories()",1);
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

  jbCatMan.setCategoriesforCard(gEditCard.card, catsArray);
  jbCatMan.dump("Done with EditDialogSaveCategories()",-1);
  
}

jbCatMan.EditDialogAppendCategory = function (catValue) {  
    let vbox = document.getElementById("abCatManCategories");
    let menuList = document.createElement("menulist");
    menuList.setAttribute("editable", true);
    menuList.addEventListener("blur", jbCatMan.EditDialogOnCategoryBlur, false);
    menuList.addEventListener("change", jbCatMan.EditDialogOnCategoryChange, false);
    menuList.addEventListener("command", jbCatMan.EditDialogOnCategoryChange, false);
    jbCatMan.EditDialogResetCategoriesMenu(menuList);
    menuList.value = catValue;
    vbox.appendChild(menuList);
    return menuList;
}

jbCatMan.EditDialogResetCategoriesMenu = function (menu) {
    let popups = menu.getElementsByTagName("menupopup");
    for (let i = 0; i < popups.length; i++) {
        menu.removeChild(popups[i]);
    }

    let menuPopup = document.createElement("menupopup");
    for (let k = 0; k < jbCatMan.EditDialogAllCatsArray.length; k++) {
        let item = document.createElement("menuitem");
        item.setAttribute("label", jbCatMan.EditDialogAllCatsArray[k]);
        menuPopup.appendChild(item);
    }
    menu.appendChild(menuPopup);
}



// run init function after edit window has been loaded and save categories on OK - if SOGo-connector is not installed
if (jbCatMan.sogoInstalled == false) {
  window.addEventListener("load", function() { jbCatMan.EditDialogInit(); }, false);
  window.addEventListener("dialogaccept", function() { jbCatMan.EditDialogSaveCategories(); }, false);
}
