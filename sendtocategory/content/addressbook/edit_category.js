var jbCatMan = window.opener.jbCatMan;
var dialogType = "";

function editCategoryLoad()
{
    document.getElementById("categoryName").value = window.arguments[0];
    document.title = window.arguments[1];
    dialogType = window.arguments[2];
    
    document.addEventListener("dialogaccept", function(event) {
        let rv = doOK();
        if (!rv) event.preventDefault(); // Prevent the dialog closing.
    });
}

function doOK()
{
    let newName = document.getElementById("categoryName").value.trim();
    if (newName == "") {
      return false;
    }
    
    switch (dialogType) {
      case "add":
        if (jbCatMan.data.categoryList.indexOf(newName) < 0) {
          jbCatMan.data.emptyCategories.push(newName);
          alert(jbCatMan.locale.infoAdd.replace("##newname##",newName));
          jbCatMan.updateCategoryList();
        } 
        else {
          alert(jbCatMan.locale.errorAdd.replace("##newname##",newName));
        }
        break;
      
      case "rename":
        //It is not allowed to rename a category to a name which exists already
        if (jbCatMan.data.categoryList.indexOf(newName) < 0) {

          if (jbCatMan.data.selectedCategory in jbCatMan.data.foundCategories) {
              //go through all contacts and rename that category
              if (confirm(jbCatMan.locale.confirmRename.replace("##oldname##",jbCatMan.data.selectedCategory).replace("##newname##",newName).replace("##number##",jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory].length))) {
                jbCatMan.updateCategories("rename",jbCatMan.data.selectedCategory,newName);
                jbCatMan.updatePeopleSearchInput(newName);
                jbCatMan.data.selectedCategory = newName;
              }
          } else {
              //this category only exists in the temp
              jbCatMan.data.emptyCategories[jbCatMan.data.emptyCategories.indexOf(jbCatMan.data.selectedCategory)] = newName;
              jbCatMan.updatePeopleSearchInput(newName);
              jbCatMan.data.selectedCategory = newName;
              jbCatMan.updateCategoryList();
          }
          
        } else {
            alert(jbCatMan.locale.errorRename.replace("##oldname##",jbCatMan.data.selectedCategory).replace("##newname##",newName));
        }
        break;
        
      default:
        alert("unknown command");
    }

    return true;
}
