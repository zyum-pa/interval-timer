// Offline files and update controls are separate from workout timing and sound.
(() => {
  const status = document.querySelector("#offline-status");
  const updateStatus = document.querySelector("#update-status");
  const updatePanel = document.querySelector("#app-updates");
  const button = document.querySelector("#update-button");
  const workout = window.workoutUpdates;
  const pageVersion = document.body.dataset.appVersion;
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    status.textContent = "Offline saving is unavailable here. Use the timer online at its public HTTPS address.";
    if (updateStatus) updateStatus.textContent = "App updates are unavailable here.";
    return;
  }

  const workers = navigator.serviceWorker;
  const scriptURL = new URL("./sw.js", window.location.href).href;
  let registration;
  let ready = false;
  let failed = false;
  let activeVersion;
  let updateError = "";
  let requestedUpdate = false;
  let lockId;
  let lockTimeout;

  function renderStatus() {
    const message = ready ? "" : failed
      ? "Offline copy could not be saved. Use the timer online and try reopening it with internet."
      : "Saving for offline use… Keep this app open with internet.";
    if (status.textContent !== message) status.textContent = message;
    const available = Boolean(registration?.waiting || (activeVersion && activeVersion !== pageVersion));
    if (updatePanel) updatePanel.hidden = !(available || requestedUpdate || lockId || updateError);
    if (button) {
      button.hidden = !available && !requestedUpdate;
      button.disabled = Boolean(workout?.isBusy() || lockId || requestedUpdate);
      button.textContent = requestedUpdate ? "Updating…" : "Update app";
    }
    const updateMessage = requestedUpdate || lockId ? "Updating… Please keep this window open."
      : updateError || (available
        ? workout?.isBusy() ? "Update saved. Finish or reset to update."
          : "Update saved. Tap Update app."
        : "No update is ready to apply. Updates are checked when you open or return to the app online.");
    if (updateStatus && updateStatus.textContent !== updateMessage) updateStatus.textContent = updateMessage;
  }

  function checkSavedCopy() {
    if (workers.controller?.scriptURL === scriptURL) workers.controller.postMessage({ type: "CHECK_OFFLINE_READY" });
  }

  function releaseLock(id) {
    if (!lockId || id !== lockId) return;
    clearTimeout(lockTimeout);
    lockId = undefined;
    workout?.end();
    renderStatus();
  }

  function failUpdate(message) {
    requestedUpdate = false;
    updateError = message;
    releaseLock(lockId);
    renderStatus();
  }

  function acquireLock(id) {
    if (!workout || (lockId && lockId !== id) || workout.isBusy()) return false;
    lockId = id;
    if (!workout.begin()) { lockId = undefined; return false; }
    clearTimeout(lockTimeout);
    // Recover the controls if a worker or another window stops responding.
    lockTimeout = setTimeout(() => failUpdate("The update did not finish. Try again when all timer windows are idle."), 15000);
    return true;
  }

  workers.addEventListener("controllerchange", () => {
    // Only the window whose user clicked Update app reloads automatically.
    if (requestedUpdate && lockId) { window.location.reload(); return; }
    releaseLock(lockId);
    checkSavedCopy();
  });
  workers.addEventListener("message", (event) => {
    if (event.source?.scriptURL !== scriptURL) return;
    if (event.data?.type === "LOCK_FOR_UPDATE") {
      event.ports?.[0]?.postMessage({ allowed: acquireLock(event.data.id) });
      return;
    }
    if (event.data?.type === "UNLOCK_UPDATE") { releaseLock(event.data.id); return; }
    if (event.source !== workers.controller || event.data?.type !== "OFFLINE_STATUS") return;
    ready = event.data.ready === true;
    failed = !ready;
    activeVersion = event.data.version;
    renderStatus();
  });

  button?.addEventListener("click", () => {
    if (requestedUpdate || lockId || workout?.isBusy()) return;
    if (!registration?.waiting && (!activeVersion || activeVersion === pageVersion)) return;
    const id = `${Date.now()}-${Math.random()}`;
    requestedUpdate = true;
    updateError = "";
    if (!acquireLock(id)) { requestedUpdate = false; renderStatus(); return; }
    renderStatus();
    // A different idle window may already have installed the new helper.
    if (!registration?.waiting) { window.location.reload(); return; }
    const channel = new MessageChannel();
    channel.port1.onmessage = (event) => {
      channel.port1.close();
      if (!event.data?.ok) failUpdate(event.data?.reason || "Could not apply the update. Try again.");
    };
    try { registration.waiting.postMessage({ type: "APPLY_UPDATE", id }, [channel.port2]); }
    catch { channel.port1.close(); failUpdate("Could not apply the update. Try again."); }
  });
  if (workout) workout.onChange = renderStatus;

  function watchInstallation(worker) {
    worker?.addEventListener("statechange", () => {
      if (worker.state === "redundant") {
        if (!ready) failed = true;
        updateError = "The new update could not be saved. Your current timer is still available.";
      }
      renderStatus();
      checkSavedCopy();
    });
  }

  renderStatus();
  checkSavedCopy();
  workers.register("./sw.js", { scope: "./", updateViaCache: "none" }).then((result) => {
    registration = result;
    watchInstallation(registration.installing);
    registration.addEventListener("updatefound", () => watchInstallation(registration.installing));
    renderStatus();
    checkSavedCopy();
    workers.ready.then(checkSavedCopy);
  }).catch(() => {
    if (!ready) failed = true;
    updateError = "Could not check for updates. Reconnect and reopen the app to try again.";
    renderStatus();
  });

  function checkForUpdates() {
    checkSavedCopy();
    registration?.update().catch(() => {
      updateError = "Could not check for updates. Your saved timer is still available.";
      renderStatus();
    });
  }
  window.addEventListener("online", checkForUpdates);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdates();
  });
})();
