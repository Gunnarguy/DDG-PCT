import { useCallback, useEffect, useRef, useState } from "react";
import {
  describeGeolocationError,
  describeGeolocationSupport,
} from "../utils/trailPosition";

const METERS_TO_FEET = 3.280839895;
const METERS_PER_SECOND_TO_MPH = 2.236936;

/**
 * A continuously updating GPS fix, or an explanation of why there isn't one.
 *
 * Deliberately never starts on its own without prior consent. Browsers show a
 * permission prompt on the first call, and a dashboard that demands location
 * the instant it loads trains people to dismiss the prompt. The one exception
 * is when the Permissions API reports the grant already exists: then the watch
 * resumes silently, so reopening the app on trail shows the dot immediately
 * instead of demanding another tap.
 *
 * A failed reading never blanks the last good fix. Under canopy or in a canyon
 * dropouts are routine, and a dot that vanishes every time the sky closes in is
 * worse than a dot that is thirty seconds stale and labelled as such.
 */
export const useLiveLocation = () => {
  const [fix, setFix] = useState(null);
  const [error, setError] = useState(null);
  const [isWatching, setIsWatching] = useState(false);
  const [isAwaitingFirstFix, setIsAwaitingFirstFix] = useState(false);
  const [fixAgeSeconds, setFixAgeSeconds] = useState(null);
  const watchIdRef = useRef(null);
  const hasFixRef = useRef(false);
  const fixTimestampRef = useRef(null);

  const unsupportedReason = describeGeolocationSupport();

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
    setIsAwaitingFirstFix(false);
  }, []);

  const start = useCallback(() => {
    if (unsupportedReason || watchIdRef.current !== null) return;

    setError(null);
    setIsWatching(true);
    setIsAwaitingFirstFix(!hasFixRef.current);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        hasFixRef.current = true;
        fixTimestampRef.current = position.timestamp;
        setIsAwaitingFirstFix(false);
        setFixAgeSeconds(0);
        setError(null);
        setFix({
          coordinates: [position.coords.longitude, position.coords.latitude],
          accuracyFeet: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy * METERS_TO_FEET
            : null,
          altitudeFeet: Number.isFinite(position.coords.altitude)
            ? position.coords.altitude * METERS_TO_FEET
            : null,
          speedMph: Number.isFinite(position.coords.speed)
            ? Math.max(0, position.coords.speed) * METERS_PER_SECOND_TO_MPH
            : null,
          heading: Number.isFinite(position.coords.heading)
            ? position.coords.heading
            : null,
          timestamp: position.timestamp,
        });
      },
      (positionError) => {
        setError(describeGeolocationError(positionError));
        setIsAwaitingFirstFix(false);
        // A denied permission will never resolve itself, so stop burning the
        // battery on it. A timeout or a lost fix might, so keep watching.
        if (positionError?.code === 1) stop();
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 5000,
      },
    );
  }, [stop, unsupportedReason]);

  const toggle = useCallback(() => {
    if (isWatching) stop();
    else start();
  }, [isWatching, start, stop]);

  // Ages the last fix so a dot that has quietly stopped moving can be labelled
  // stale rather than trusted. Recomputed from the fix timestamp on every tick
  // instead of incremented, so a throttled background tab does not under-report
  // how old the reading is.
  useEffect(() => {
    if (!isWatching) return undefined;
    const timerId = setInterval(() => {
      if (fixTimestampRef.current === null) return;
      setFixAgeSeconds(
        Math.max(0, Math.round((Date.now() - fixTimestampRef.current) / 1000)),
      );
    }, 10000);
    return () => clearInterval(timerId);
  }, [isWatching]);

  // Resume without prompting when the grant already exists. The Permissions
  // API is not universally implemented for geolocation (Safari in particular),
  // and a rejection there simply means we wait for a tap.
  useEffect(() => {
    if (unsupportedReason) return undefined;
    let cancelled = false;

    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((status) => {
        if (!cancelled && status.state === "granted") start();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [start, unsupportedReason]);

  useEffect(() => stop, [stop]);

  return {
    fix,
    fixAgeSeconds,
    error,
    isWatching,
    isAwaitingFirstFix,
    unsupportedReason,
    start,
    stop,
    toggle,
  };
};

export default useLiveLocation;
