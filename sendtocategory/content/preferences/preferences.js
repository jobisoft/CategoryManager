let loader = Components.classes["@mozilla.org/moz/jssubscript-loader;1"].getService(Components.interfaces.mozIJSSubScriptLoader);
loader.loadSubScript("chrome://sendtocategory/content/category_tools.js");

jbCatMan.loadLocales(document);

Preferences.addAll([
	{ id: "extensions.sendtocategory.to_address", type: "unichar" },
]);