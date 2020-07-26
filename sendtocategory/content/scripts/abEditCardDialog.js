// called on window load or on add-on activation while window is already open
function onLoad(wasAlreadyOpen) {
  console.log("Load of abEditCardDialog.js");
}

// called on window unload or on add-on deactivation while window is still open
function onUnload(isAddOnShutDown) {
  console.log("Unload of abEditCardDialog.js");
}
