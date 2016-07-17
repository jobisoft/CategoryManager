/* NOTE: using let for jbCatManExportWizard did not allow to use it onpageshow etc in XUL */
var jbCatMan = window.opener.jbCatMan;
var jbCatManExportWizard = {}


  
  
jbCatManExportWizard.Init = function () {
  
  jbCatManExportWizard.localTimeout = null;

  //locale object to store names from locale file
  jbCatManExportWizard.locale = {};

  /*
    wizardLocked was intended to stop the user from closing the wizard during the 
    actual export. However, preventDefault() does not seem to work on close events,
    even though event.cancelable is true. :-(
  */
  jbCatManExportWizard.wizardLocked = false;
  
  let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
  let addressBook = abManager.getDirectory(window.opener.GetSelectedDirectory()); //GetSelectedDirectory() returns an URI, but we need the directory itself
  jbCatManExportWizard.currentAddressBook = addressBook.dirName;
  jbCatManExportWizard.size = jbCatMan.data.abSize;
  
  // Build useful description
  let desc = document.getElementById('CatManExportDescriptionLabel').textContent;
  let p1 = desc.indexOf("{{");
  let p2 = desc.indexOf("}}", p1);

  let s1 = desc.substring(0, p1);
  let s2 = desc.substring(p1+2, p2);
  let s3 = desc.substring(p2+2).replace("##BOOK##",jbCatManExportWizard.currentAddressBook);

  if (jbCatMan.data.selectedCategory == "") {
    //address book
    document.getElementById('CatManExportDescriptionLabel').textContent = s1.replace("##NUM##",jbCatManExportWizard.size) + s3;
  } else {
    //category
    jbCatManExportWizard.size = jbCatMan.data.foundCategories[jbCatMan.data.selectedCategory].length;
    document.getElementById('CatManExportDescriptionLabel').textContent = s1.replace("##NUM##",jbCatManExportWizard.size) + s2.replace("##CAT##",jbCatMan.data.selectedCategory) + s3;
  }
    
}




/* Adjust wizard page order, based on user input */
jbCatManExportWizard.setNextPage = function (curPage) {
  if (curPage.pageid == "CatManExportType") {
    if (document.getElementById('CatManExportType').value == "vCard") curPage.next = "CatManExportVCardProperties";
    else curPage.next = "CatManExportSelectFile";
  }
}




jbCatManExportWizard.onFinish = function (wizard) {
  // Get userinput from wizard
  let exportType = document.getElementById('CatManExportType').value;
  let emailMapping = document.getElementById('CatManExportEmailMapping').value;
  let fileMode = document.getElementById('CatManExportFileMode').value;
  
  // Open filepicker
  var nsIFilePicker = Components.interfaces.nsIFilePicker;
  var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);

  if (fileMode == "file") {
    fp.init(window, "Select a File", nsIFilePicker.modeSave);

    // Build default filename from book/category/filetype
    let defaultString = jbCatManExportWizard.currentAddressBook;
    if (jbCatMan.data.selectedCategory != "") defaultString = defaultString + "-" + jbCatMan.data.selectedCategory;
    if (exportType == "csv") {
      fp.appendFilter("Comma Seperated Values (UTF-8)" ,"*.csv");
      defaultString = defaultString + ".csv";
    }
    else if (exportType == "vCard") {
      fp.appendFilter("vCard" ,"*.vcf");
      defaultString = defaultString + ".vcf";
    }
    fp.defaultString = defaultString;
    
  }
  else {
    fp.init(window, "Select a Folder", nsIFilePicker.modeGetFolder);
  }

  var res = fp.show();
  if (res != nsIFilePicker.returnCancel) {
    // A valid selection - lock wizard until export is done
    wizard.canRewind = false;    
    wizard.canAdvance = false;
    document.documentElement.getButton("cancel").hidden=true;
    document.documentElement.getButton("back").hidden=true;
    document.documentElement.getButton("finish").hidden=true;
    jbCatManExportWizard.wizardLocked = true;
    
    // Init export
      window.clearTimeout(jbCatManExportWizard.localTimeout);
      jbCatManExportWizard.localTimeout = window.setTimeout(function() { jbCatManExportWizard.doExport(0); }, 10);
    }

  // Always return false - the wizard will only be closed after import/export has finished
  return false;
}




jbCatManExportWizard.doExport = function (progress) {
  let progressBar = document.getElementById('CatManExportProgressBar');
  if (progress == 0) {
     progressBar.style.display="block";
  }
  
  //process contact #progress
  if (jbCatManExportWizard.size == progress) {
    //done
    progressBar.value = 100;
    alert(document.getElementById('CatManExportLocaleDoneExport').value);
    jbCatManExportWizard.wizardLocked = false;
    window.close();
  } else {
    //do actuall export

    //update progress bar
    progressBar.value = (100 * progress) / jbCatManExportWizard.size;

    //next contact
    jbCatManExportWizard.localTimeout = window.setTimeout(function() { jbCatManExportWizard.doExport(progress+1); }, 1);
  }
  
}



//Init on load
window.addEventListener("load", function() { jbCatManExportWizard.Init(); }, false);
