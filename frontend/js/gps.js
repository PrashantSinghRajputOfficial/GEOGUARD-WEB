// Get current location
export function getLocation(callback, errorCallback) {
  if (!navigator.geolocation) {
    if (errorCallback) errorCallback("Geolocation is not supported by your browser");
    return;
  }

  var options = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 0
  };

  navigator.geolocation.getCurrentPosition(
    function(pos) {
      callback(pos.coords.latitude, pos.coords.longitude);
    },
    function(err) {
      var message = "Unable to get location";
      if (err.code === 1) {
        message = "Location permission denied. Please enable it in browser settings.";
      } else if (err.code === 2) {
        message = "Location information unavailable.";
      } else if (err.code === 3) {
        message = "Location request timed out.";
      }
      if (errorCallback) {
        errorCallback(message);
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

  var options = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 5000
  };

  return navigator.geolocation.watchPosition(
    function(pos) {
      callback(pos.coords.latitude, pos.coords.longitude);
    },
    function(err) {
      if (errorCallback) errorCallback(err.message);
    },
    options
  );
}
