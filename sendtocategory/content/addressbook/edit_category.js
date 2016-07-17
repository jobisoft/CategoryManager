var saveObject = null;

function editCategoryLoad()
{
    document.getElementById("categoryName").value = window.arguments[0];
    document.title = window.arguments[1];
    saveObject = window.arguments[2];
}

function doOK()
{
    if (saveObject) {
        saveObject.setCategoryName(document.getElementById("categoryName").value);
    }
}
