async function main() {
  await setDefaultPrefs({
    "extensions.sendtocategory.to_address": ""
  });
  
  console.log("to_address: " + await getPref("extensions.sendtocategory.to_address")); 
}

main();
