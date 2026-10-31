/* ===================================================================
   WEAVER ROUTER: gives every screen its own address.

   studentweaver.com/                  landing page
   studentweaver.com/app/assistant     (and /app/library, /app/network, ...)
   studentweaver.com/app/network/<id>  one contact

   Screens are still sections of one page. This file keeps the address
   bar in step with the visible section, so refresh, the back and
   forward buttons, bookmarks and links in emails all land on the right
   screen. It runs after script.js, assistant.js and workspace-ui.js.
   =================================================================== */
(function () {
    'use strict';

    // Section id in the page  <->  path segment in the address
    var ROUTES = [
        ['assistant', 'assistant', 'Assistant'],
        ['library', 'library', 'Library'],
        ['review', 'review', 'Review'],
        ['documents', 'documents', 'Documents'],
        ['checklists', 'checklists', 'Checklists'],
        ['contacts', 'network', 'My network'],
        ['strengthening-net', 'follow-ups', 'Follow-ups'],
        ['outcomes', 'outcomes', 'Outcomes'],
        ['club', 'club', 'Club'],
        ['console', 'console', 'Club console'],
        ['upload-notes', 'add-contacts', 'Add contacts'],
        ['tips-tricks', 'playbook', 'Playbook'],
        ['dashboard', 'overview', 'Overview'],
        ['settings', 'settings', 'Settings'],
    ];
    var BY_SECTION = {}, BY_SLUG = {};
    ROUTES.forEach(function (r) { BY_SECTION[r[0]] = r; BY_SLUG[r[1]] = r; });
    var DEFAULT = 'assistant';
    var PENDING_KEY = 'weaver_pending_route';
    var BASE_TITLE = 'Weaver';

    var replaying = false;      // true while we navigate because of the address (no new history entry)
    var explicitLogout = false;

    function own(table, key) { return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : null; }
    function appVisible() { var a = document.getElementById('app-container'); return !!(a && a.style.display !== 'none'); }
    function setTitle(label) { document.title = label ? label + ' – ' + BASE_TITLE : BASE_TITLE; }

    // Read an address into { section, contactId }.
    function parse(pathname, hash) {
        var parts = String(pathname || '').replace(/\/+$/, '').split('/').filter(Boolean);
        if (parts[0] === 'app') {
            var slug = parts[1] || DEFAULT;
            if (slug === 'network' && parts[2]) {
                if (parts[2] === 'map') return { section: 'network-map' };
                return { section: 'contact-detail', contactId: decodeURIComponent(parts[2]).slice(0, 100) };
            }
            var r = own(BY_SLUG, slug);
            return { section: r ? r[0] : DEFAULT };
        }
        // Older links used #section (for example the follow-up reminder emails).
        var h = String(hash || '').replace(/^#/, '');
        if (h && own(BY_SECTION, h)) return { section: h };
        return null;
    }

    function pathFor(section, contactId) {
        if (section === 'contact-detail' && contactId) return '/app/network/' + encodeURIComponent(contactId);
        if (section === 'network-map') return '/app/network/map';
        var r = own(BY_SECTION, section);
        return '/app/' + (r ? r[1] : DEFAULT);
    }

    function record(section, contactId, label) {
        if (replaying || !appVisible()) return;
        var path = pathFor(section, contactId);
        if (location.pathname !== path || location.hash) history.pushState({ section: section, contactId: contactId || null }, '', path);
        setTitle(label);
    }

    // Show a screen for an address, without adding to history.
    function go(route, attempt) {
        if (!route) route = { section: DEFAULT };
        replaying = true;
        try {
            if (route.section === 'contact-detail') {
                var found = (typeof getContacts === 'function' ? getContacts() : []).some(function (c) { return String(c.id) === route.contactId; });
                if (found && typeof window.showContactDetail === 'function') {
                    window.showContactDetail(route.contactId);
                } else if ((attempt || 0) < 6) {
                    // Contacts may still be loading from the server.
                    replaying = false;
                    setTimeout(function () { go(route, (attempt || 0) + 1); }, 500);
                    return;
                } else {
                    clickSection('contacts');
                    history.replaceState({ section: 'contacts' }, '', pathFor('contacts'));
                }
            } else if (route.section === 'network-map' && typeof window.showNetworkMap === 'function') {
                window.showNetworkMap();
            } else {
                clickSection(route.section);
            }
        } finally {
            replaying = false;
        }
    }

    function clickSection(section) {
        var link = document.querySelector('.nav-link[href="#' + section + '"]');
        if (!link) { link = document.querySelector('.nav-link[href="#' + DEFAULT + '"]'); section = DEFAULT; }
        if (link) link.click();
        var r = own(BY_SECTION, section);
        setTitle(r ? r[2] : '');
    }

    // ---- follow navigation done by the rest of the app ----

    // Every sidebar, mobile-tab and in-app "go to" link is a .nav-link click.
    document.addEventListener('click', function (e) {
        var link = e.target && e.target.closest && e.target.closest('.nav-link[href^="#"]');
        if (!link) return;
        var section = link.getAttribute('href').slice(1);
        var r = own(BY_SECTION, section);
        if (r) record(section, null, r[2]);
    });

    function wrap(name, after) {
        var original = window[name];
        if (typeof original !== 'function') return;
        window[name] = function () {
            var result = original.apply(this, arguments);
            try { after.apply(this, arguments); } catch (e) { /* never break navigation */ }
            return result;
        };
    }

    wrap('showContactDetail', function (contactId) {
        var c = (typeof getContacts === 'function' ? getContacts() : []).find(function (x) { return String(x.id) === String(contactId); });
        record('contact-detail', String(contactId), c && c.name ? c.name : 'Contact');
    });
    wrap('showNetworkMap', function () { record('network-map', null, 'Network map'); });

    // Entering the app: open the screen in the address (or the one saved before sign-in).
    wrap('showAppView', function () {
        var route = parse(location.pathname, location.hash);
        var pending = null;
        try { pending = sessionStorage.getItem(PENDING_KEY); sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
        if (!route && pending) route = parse(pending, '');
        route = route || { section: DEFAULT };
        history.replaceState({ section: route.section, contactId: route.contactId || null }, '', pathFor(route.section, route.contactId) + location.search);
        setTimeout(function () { go(route); }, 0);
    });

    // Leaving the app: back to the landing page address. If the visitor was sent here
    // from an app address while signed out, remember it so sign-in returns them there.
    wrap('showLandingView', function () {
        if (/^\/app(\/|$)/.test(location.pathname)) {
            if (!explicitLogout) { try { sessionStorage.setItem(PENDING_KEY, location.pathname); } catch (e) {} }
            history.replaceState(null, '', '/' + location.search);
        }
        explicitLogout = false;
        setTitle('');
    });
    var originalLogout = window.logout;
    if (typeof originalLogout === 'function') {
        window.logout = function () {
            explicitLogout = true;
            try { sessionStorage.removeItem(PENDING_KEY); } catch (e) {}
            return originalLogout.apply(this, arguments);
        };
    }

    // Back and forward buttons.
    window.addEventListener('popstate', function () {
        if (!appVisible()) return;
        var route = parse(location.pathname, location.hash);
        if (!route) { // went back to "/" while signed in: stay in the app
            history.replaceState({ section: DEFAULT }, '', pathFor(DEFAULT));
            route = { section: DEFAULT };
        }
        go(route);
    });

    // The page may already be showing the app (sign-in ran before this file loaded).
    if (appVisible()) {
        var route = parse(location.pathname, location.hash) || { section: DEFAULT };
        history.replaceState({ section: route.section }, '', pathFor(route.section, route.contactId) + location.search);
        go(route);
    } else if (/^\/app(\/|$)/.test(location.pathname)) {
        // Signed out on an app address: show the landing page and ask them to sign in.
        try { sessionStorage.setItem(PENDING_KEY, location.pathname); } catch (e) {}
        // Keep the query (for example ?checkout=success from Stripe) for the rest of the app to read.
        history.replaceState(null, '', '/' + location.search);
        setTimeout(function () {
            if (!appVisible() && typeof window.openAuthModal === 'function') window.openAuthModal('login');
        }, 300);
    }

    window.wvRouter = { pathFor: pathFor, parse: parse };
})();
