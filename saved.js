/*
 * Voluntool — shared "saved organizations" store (used by the Map page and the
 * Saved Volunteer Ideas page). Persists to localStorage so both pages agree.
 */
(function () {
  var SAVED_KEY = 'voluntool_saved_v1';
  var LOC_KEY = 'voluntool_user_location_v1';

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; }
    catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
  }

  window.VoluntoolSaved = {
    // --- saved organizations (array of org objects) ---
    getAll: function () {
      var list = read(SAVED_KEY, []);
      return Array.isArray(list) ? list : [];
    },
    isSaved: function (name) {
      return this.getAll().some(function (o) { return o.name === name; });
    },
    save: function (org) {
      var list = this.getAll();
      if (!list.some(function (o) { return o.name === org.name; })) {
        list.push(org);
        write(SAVED_KEY, list);
      }
      return list;
    },
    remove: function (name) {
      var list = this.getAll().filter(function (o) { return o.name !== name; });
      write(SAVED_KEY, list);
      return list;
    },
    // Save if not saved, remove if it is. Returns true when now saved.
    toggle: function (org) {
      if (this.isSaved(org.name)) { this.remove(org.name); return false; }
      this.save(org);
      return true;
    },

    // --- last searched location (so the Saved page can show distance) ---
    setLocation: function (lat, lng, address) {
      write(LOC_KEY, { lat: lat, lng: lng, address: address });
    },
    getLocation: function () {
      return read(LOC_KEY, null);
    },

    // --- great-circle distance in miles (haversine) ---
    distanceMiles: function (lat1, lng1, lat2, lng2) {
      var R = 3958.8, toRad = Math.PI / 180;
      var dLat = (lat2 - lat1) * toRad, dLng = (lng2 - lng1) * toRad;
      var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
  };
})();
