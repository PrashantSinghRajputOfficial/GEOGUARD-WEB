// Get current location with better error handling
export function getLocation(callback, errorCallback) {
  if (!navigator.geolocation) {
    if (errorCallback) errorCallback("Geolocation is not supported by your browser");
    return;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0
  };

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      callback(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      let message = "Unable to get location";
      switch(err.code) {
        case err.PERMISSION_DENIED:
          message = "Location permission denied. Please enable it in browser settings.";
          break;
        case err.POSITION_UNAVAILABLE:
          message = "Location information unavailable.";
          break;
        case err.TIMEOUT:
          message = "Location request timed out.";
          break;
      }
      if (errorCallback) {
        errorCallback(message);
      } else {
        console.error(message);
      }
    },
    options
  );
}

// Watch location continuously
export function watchLocation(callback, errorCallback) {
  if (!navigator.geolocation) {
    if (errorCallback) errorCallback("Geolocation is not supported");
    return null;
  }

  const options = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 5000
  };

  return navigator.geolocation.watchPosition(
    (pos) => callback(pos.coords.latitude, pos.coords.longitude),
    (err) => {
      if (errorCallback) errorCallback(err.message);
    },
    options
  );
}
