/*
 * Voluntool — Online section nav.
 * Fills the "Websites" dropdown (and, on websites.html, the main list grid)
 * from the single VOLUNTOOL_SITES data source, then wires up the dropdown so it
 * works with hover, click/tap, and the keyboard.
 */
(function () {
  var sites = window.VOLUNTOOL_SITES;
  if (!Array.isArray(sites)) return;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- Dropdown menu items -------------------------------------------------
  var menu = document.querySelector('.section-nav-dropdown__menu');
  if (menu) {
    menu.innerHTML = sites.map(function (s) {
      return '<a role="menuitem" class="section-nav-dropdown__item" href="' +
        encodeURI(s.page) + '">' + escapeHtml(s.name) + '</a>';
    }).join('');
  }

  // ---- Main list grid (only present on websites.html) ----------------------
  var grid = document.getElementById('sites-grid');
  if (grid) {
    grid.innerHTML = sites.map(function (s) {
      var badgeAttr = s.badgeClass
        ? ' class="badge ' + escapeHtml(s.badgeClass) + '"'
        : ' class="badge" style="' + escapeHtml(s.badgeStyle || '') + '"';
      return '<div class="card">' +
          '<div class="card-icon" style="background:' + escapeHtml(s.iconBg || '#EEF2FF') + ';">' +
            escapeHtml(s.icon || '🔗') + '</div>' +
          '<h3>' + escapeHtml(s.name) + '</h3>' +
          '<p>' + escapeHtml(s.blurb || '') + '</p>' +
          '<div class="card-footer">' +
            '<span' + badgeAttr + '>' + escapeHtml(s.badge || '') + '</span>' +
            '<a href="' + encodeURI(s.page) + '" class="card-link">Learn more →</a>' +
          '</div>' +
        '</div>';
    }).join('');
  }

  // ---- Dropdown interaction (hover via CSS; click/tap + keyboard here) ------
  var dropdown = document.querySelector('.section-nav-dropdown');
  var toggle = dropdown && dropdown.querySelector('.section-nav-dropdown__toggle');
  if (!dropdown || !toggle || !menu) return;

  function open() {
    dropdown.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    menu.hidden = false;
  }
  function close() {
    dropdown.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    menu.hidden = true;
  }
  function isOpen() { return dropdown.classList.contains('open'); }

  menu.hidden = true;

  toggle.addEventListener('click', function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen()) { close(); } else { open(); }
  });

  // Close when clicking/tapping outside the dropdown.
  document.addEventListener('click', function (e) {
    if (!dropdown.contains(e.target)) close();
  });

  // Keyboard: Escape closes; arrows move through items; Enter/Space opens.
  var items = function () { return Array.prototype.slice.call(menu.querySelectorAll('.section-nav-dropdown__item')); };

  toggle.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
      var first = items()[0];
      if (first) first.focus();
    } else if (e.key === 'Escape') {
      close();
    }
  });

  menu.addEventListener('keydown', function (e) {
    var list = items();
    var idx = list.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      close();
      toggle.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      (list[idx + 1] || list[0]).focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      (list[idx - 1] || list[list.length - 1]).focus();
    }
  });
})();
