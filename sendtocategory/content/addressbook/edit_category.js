var jbCatMan = window.opener.jbCatMan;
var dialogType = "";
var originalName = "";

function editCategoryLoad()
{
    originalName = window.arguments[0];
    document.getElementById("categoryName").value = originalName;
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
          alert(jbCatMan.locale.infoAdd.replace("##newname##", newName));
          jbCatMan.updateCategoryList();
        } 
        else {
          alert(jbCatMan.locale.errorAdd.replace("##newname##", newName));
        }
        break;
      
      case "rename":
        //It is not allowed to rename a category to a name which exists already
        if (jbCatMan.data.categoryList.indexOf(newName) < 0) {

          if (originalName in jbCatMan.data.foundCategories) {
              // Go through all contacts and rename that category.
              if (confirm(jbCatMan.locale.confirmRename.replace("##oldname##", originalName).replace("##newname##", newName).replace("##number##", jbCatMan.data.foundCategories[originalName].length))) {
                // Manipulate selectedCategoryFilter.
                for (let i=0; i < jbCatMan.data.selectedCategoryFilter.length; i++) {
                  if (jbCatMan.data.selectedCategoryFilter[i] == originalName) jbCatMan.data.selectedCategoryFilter[i] = newName;
                }
                jbCatMan.updateCategories("rename", originalName, newName);
              }
          } else {
              //this category only exists in the temp
              jbCatMan.data.emptyCategories[jbCatMan.data.emptyCategories.indexOf(originalName)] = newName;
                for (let i=0; i < jbCatMan.data.selectedCategoryFilter.length; i++) {
                  if (jbCatMan.data.selectedCategoryFilter[i] == originalName) jbCatMan.data.selectedCategoryFilter[i] = newName;
                }
              jbCatMan.updateCategoryList();
          }
          
        } else {
            alert(jbCatMan.locale.errorRename.replace("##oldname##", originalName).replace("##newname##", newName));
        }
        break;
        
      default:
        alert("unknown command");
    }

    return true;
}
