let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://sendtocategory/content/category_tools.js");

async function main() {
	jbCatMan.loadLocales(document);
	await jbCatMan.loadPreferences(document);
}

window.addEventListener("load", main);
