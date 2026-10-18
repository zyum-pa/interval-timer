// Offline setup is independent of workout timing and audio.
(() => {
  const status = document.querySelector("#offline-status");
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    status.textContent = "Offline saving is unavailable here. Use the timer online at its public HTTPS address.";
    return;
  }

  const workers = navigator.serviceWorker;
  const scriptURL = new URL("./sw.js", window.location.href).href;
  let registration;
  let ready = false;
  let failed = false;
  let updateAvailable = false;

  function renderStatus() {
    const message = ready
      ? "Ready for offline use."
      : failed
        ? "Offline copy could not be saved. Use the timer online and try reopening it with internet."
        : "Saving for offline use… Keep this app open with internet.";
    status.textContent = message + (updateAvailable
      ? " Update saved. After your workout, close all timer windows and reopen to use it."
      : "");
  }

  function checkSavedCopy() {
    if (workers.controller?.scriptURL === scriptURL) {
      workers.controller.postMessage({ type: "CHECK_OFFLINE_READY" });
    }
  }

  workers.addEventListener("controllerchange", checkSavedCopy);
  workers.addEventListener("message", (event) => {
    if (event.source !== workers.controller || event.data?.type !== "OFFLINE_STATUS") return;
    ready = event.data.ready === true;
    failed = !ready;
    renderStatus();
  });

  function watchInstallation(worker) {
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed") {
        updateAvailable = Boolean(registration.waiting && workers.controller);
      } else if (worker.state === "redundant" && !ready) {
        failed = true;
      }
      renderStatus();
      checkSavedCopy();
    });
  }

  renderStatus();
  // Existing offline copies are checked even when an online update check fails.
  checkSavedCopy();
  workers.register("./sw.js", { scope: "./", updateViaCache: "none" }).then((result) => {
    registration = result;
    updateAvailable = Boolean(registration.waiting);
    watchInstallation(registration.installing);
    registration.addEventListener("updatefound", () => watchInstallation(registration.installing));
    renderStatus();
    checkSavedCopy();
    workers.ready.then(checkSavedCopy);
  }).catch(() => {
    if (!ready) failed = true;
    renderStatus();
  });

  window.addEventListener("online", () => {
    checkSavedCopy();
    registration?.update().catch(() => {});
  });
})();
