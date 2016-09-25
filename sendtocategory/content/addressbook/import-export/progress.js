var jbCatMan = window.opener.jbCatMan;
var jbCatManWizard = window.opener.jbCatManWizard;
var jbCatManWizardProgress = {}

jbCatManWizardProgress.init = function () {
  this.locked = true;
  this.window = window;
  
  // check if desired function exists
  let type = window.arguments[0];
  let typeFunction = jbCatManWizard[type]; 
  if(typeof typeFunction === 'function') {

    // set title
    document.title = "Processing ...";

    // call function to handle type
    typeFunction(this);

  } else {
    document.title = "Uups! <" + type + "> is not known";  //should not happen - progress window can be closed, but advance is not possible
    jbCatManWizard.advance = false;
    this.locked = false;
  }
  
}

jbCatManWizardProgress.onClose = function () {
  return !jbCatManWizardProgress.locked;
}


jbCatManWizardProgress.setProgressBar = function (value) {
  let progressBar = document.getElementById('CatManWizardProgressBar');
  progressBar.value = value;
}

jbCatManWizardProgress.done = function (advance) {
    this.locked = false;
    jbCatManWizard.advance = advance;
    jbCatManWizard.more = false;
    window.close();
}