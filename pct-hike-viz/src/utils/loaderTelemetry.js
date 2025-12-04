// Lightweight bridge for updating the HTML bootstrap loader before React mounts.
const getLoader = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.__pctLoader ?? null;
};

const safeUpdate = (message, percent, hint) => {
  const loader = getLoader();
  if (!loader?.update) {
    return;
  }
  loader.update(message, percent, hint);
};

const safeFinish = () => {
  const loader = getLoader();
  if (!loader?.finish) {
    return;
  }
  loader.finish();
};

export const loaderTelemetry = {
  step(message, percent, hint) {
    safeUpdate(message, percent, hint);
  },
  done() {
    safeFinish();
  }
};
