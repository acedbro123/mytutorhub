/*
 * Voluntool — shared "saved organizations" store (used by the Map page and the
 * Saved Volunteer Ideas page). Persists to localStorage so both pages agree.
 */
(function () {
  var SAVED_KEY = 'voluntool_saved_v1';
  var LOC_KEY = 'voluntool_user_location_v1';
  var HOURS_KEY = 'voluntool_hours_v1';

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
    },

    // --- service-hours log ---
    // Stored as { "<orgName>": [ {id, date, hours, note}, ... ] }, keyed by the
    // organization's name (its stable id), NOT by any array index.
    hours: {
      _all: function () {
        var o = read(HOURS_KEY, {});
        return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
      },
      _save: function (o) { write(HOURS_KEY, o); },
      _genId: function () {
        return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
      },
      forOrg: function (name) {
        var a = this._all()[name];
        return Array.isArray(a) ? a : [];
      },
      add: function (name, entry) {
        var all = this._all();
        if (!Array.isArray(all[name])) all[name] = [];
        var e = {
          id: this._genId(),
          date: entry.date,
          hours: Number(entry.hours) || 0,
          note: entry.note || ''
        };
        all[name].push(e);
        this._save(all);
        return e;
      },
      update: function (name, id, patch) {
        var all = this._all(), list = all[name] || [];
        for (var i = 0; i < list.length; i++) {
          if (list[i].id === id) {
            if (patch.date != null) list[i].date = patch.date;
            if (patch.hours != null) list[i].hours = Number(patch.hours) || 0;
            if (patch.note != null) list[i].note = patch.note;
          }
        }
        this._save(all);
      },
      remove: function (name, id) {
        var all = this._all();
        all[name] = (all[name] || []).filter(function (e) { return e.id !== id; });
        if (all[name].length === 0) delete all[name];
        this._save(all);
      },
      subtotal: function (name) {
        return this.forOrg(name).reduce(function (s, e) { return s + (Number(e.hours) || 0); }, 0);
      },
      total: function () {
        var all = this._all(), sum = 0;
        for (var k in all) if (all.hasOwnProperty(k)) {
          sum += all[k].reduce(function (s, e) { return s + (Number(e.hours) || 0); }, 0);
        }
        return sum;
      },
      orgsWithHours: function () { return Object.keys(this._all()); },
      // Flat rows for CSV export: [{ org, date, hours, note }]
      flat: function () {
        var all = this._all(), rows = [];
        for (var k in all) if (all.hasOwnProperty(k)) {
          all[k].forEach(function (e) {
            rows.push({ org: k, date: e.date, hours: e.hours, note: e.note });
          });
        }
        return rows;
      }
    }
  };
})();
