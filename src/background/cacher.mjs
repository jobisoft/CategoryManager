console.info("Initializing cache");

let port;

function connected(p) {
  port = p;
  port.postMessage({ test: "Hello" });
  port.onMessage.addListener((m) => {
    console.log("Received msg from popup", m);
  });
}

browser.runtime.onConnect.addListener(connected);
