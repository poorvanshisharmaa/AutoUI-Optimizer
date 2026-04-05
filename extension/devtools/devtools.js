// Creates the AutoUI panel inside Chrome DevTools
chrome.devtools.panels.create(
  "AutoUI",
  "/icons/icon16.png",
  "/devtools/panel.html",
  () => {}
);
