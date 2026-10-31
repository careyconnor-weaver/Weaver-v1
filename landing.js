/* Weaver landing: hero network, scroll reveals, sticky nav, "Book a demo" dialog. */
(function () {
    'use strict';
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ── Hero: a slow network of people; now and then an introduction travels along it.
    function heroNetwork(canvas) {
        var ctx = canvas.getContext('2d');
        if (!ctx) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = 0, H = 0, nodes = [], pulses = [], running = false, visible = true, last = 0, raf = 0;
        var LINK = 150;

        function size() {
            var r = canvas.getBoundingClientRect();
            W = Math.max(1, r.width); H = Math.max(1, r.height);
            canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            LINK = Math.max(110, Math.min(170, W / 9));
            var target = Math.round(Math.min(120, Math.max(36, (W * H) / 15000)));
            while (nodes.length < target) nodes.push(make());
            nodes.length = target;
        }
        function make() {
            return { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12, r: Math.random() < 0.12 ? 2.2 : 1.3 };
        }
        function neighbors(i) {
            var a = nodes[i], out = [];
            for (var j = 0; j < nodes.length; j++) {
                if (j === i) continue;
                var dx = nodes[j].x - a.x, dy = nodes[j].y - a.y;
                if (dx * dx + dy * dy < LINK * LINK) out.push(j);
            }
            return out;
        }
        // An introduction: a chain of 3–5 linked people, lit one after another.
        function startPulse() {
            var i = Math.floor(Math.random() * nodes.length), path = [i];
            for (var k = 0; k < 4; k++) {
                var n = neighbors(path[path.length - 1]).filter(function (j) { return path.indexOf(j) < 0; });
                if (!n.length) break;
                path.push(n[Math.floor(Math.random() * n.length)]);
            }
            if (path.length >= 3) pulses.push({ path: path, t: 0 });
        }
        function draw(ts) {
            var dt = Math.min(48, ts - (last || ts)); last = ts;
            ctx.clearRect(0, 0, W, H);
            var i, j, a, b, dx, dy, d2;
            for (i = 0; i < nodes.length; i++) {
                a = nodes[i];
                if (!reduce) { a.x += a.vx * dt * 0.06 * 16; a.y += a.vy * dt * 0.06 * 16; }
                if (a.x < -20) a.x = W + 20; else if (a.x > W + 20) a.x = -20;
                if (a.y < -20) a.y = H + 20; else if (a.y > H + 20) a.y = -20;
            }
            ctx.lineWidth = 1;
            for (i = 0; i < nodes.length; i++) {
                a = nodes[i];
                for (j = i + 1; j < nodes.length; j++) {
                    b = nodes[j]; dx = a.x - b.x; dy = a.y - b.y; d2 = dx * dx + dy * dy;
                    if (d2 < LINK * LINK) {
                        ctx.strokeStyle = 'rgba(157,180,230,' + (0.16 * (1 - Math.sqrt(d2) / LINK)).toFixed(3) + ')';
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
                    }
                }
            }
            for (i = 0; i < nodes.length; i++) {
                a = nodes[i];
                ctx.fillStyle = a.r > 2 ? 'rgba(220,230,250,0.9)' : 'rgba(157,180,230,0.55)';
                ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
            }
            // pulses
            for (var p = pulses.length - 1; p >= 0; p--) {
                var pl = pulses[p];
                pl.t += dt / 900;
                var seg = Math.floor(pl.t), frac = pl.t - seg;
                if (seg >= pl.path.length - 1 + 1.2) { pulses.splice(p, 1); continue; }
                for (var s = 0; s < pl.path.length - 1; s++) {
                    var n1 = nodes[pl.path[s]], n2 = nodes[pl.path[s + 1]];
                    if (!n1 || !n2) continue;
                    // a dot that wrapped to the other edge breaks the chain; don't draw across the screen
                    if (Math.abs(n2.x - n1.x) > LINK * 1.5 || Math.abs(n2.y - n1.y) > LINK * 1.5) { pl.t = 999; break; }
                    var prog = s < seg ? 1 : s === seg ? frac : 0;
                    var fade = Math.max(0, 1 - Math.max(0, pl.t - (pl.path.length - 1)) / 1.2);
                    if (prog > 0) {
                        ctx.strokeStyle = 'rgba(255,255,255,' + (0.75 * fade).toFixed(3) + ')';
                        ctx.lineWidth = 1.4;
                        ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n1.x + (n2.x - n1.x) * prog, n1.y + (n2.y - n1.y) * prog); ctx.stroke();
                        ctx.fillStyle = 'rgba(255,255,255,' + fade.toFixed(3) + ')';
                        ctx.beginPath(); ctx.arc(n1.x, n1.y, 3, 0, Math.PI * 2); ctx.fill();
                        if (prog === 1 && s === pl.path.length - 2) { ctx.beginPath(); ctx.arc(n2.x, n2.y, 3.4, 0, Math.PI * 2); ctx.fill(); }
                    }
                }
                ctx.lineWidth = 1;
            }
            if (!reduce && pulses.length < 2 && Math.random() < dt / 2600) startPulse();
            if (running) raf = requestAnimationFrame(draw);
        }
        function play() { if (running || reduce || !visible || document.hidden) return; running = true; last = 0; raf = requestAnimationFrame(draw); }
        function stop() { running = false; cancelAnimationFrame(raf); }
        size();
        if (reduce) { startPulse(); pulses.forEach(function (p) { p.t = p.path.length - 1; }); draw(performance.now()); return; }
        window.addEventListener('resize', function () { size(); if (!running) draw(performance.now()); });
        document.addEventListener('visibilitychange', function () { document.hidden ? stop() : play(); });
        if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? play() : stop(); }).observe(canvas);
        setTimeout(startPulse, 900);
        play();
    }

    // ── Reveal statements as they scroll into view.
    function reveals() {
        var els = document.querySelectorAll('#landing-page [data-reveal]');
        if (reduce || !('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('is-in'); }); return; }
        var io = new IntersectionObserver(function (es) {
            es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
        }, { threshold: 0.25, rootMargin: '0px 0px -8% 0px' });
        els.forEach(function (e) { io.observe(e); });
    }

    // ── Nav turns solid once past the hero.
    function stickyNav() {
        var nav = document.querySelector('.lp-nav'), hero = document.querySelector('.lp-hero');
        if (!nav || !hero) return;
        var on = function () { nav.classList.toggle('is-solid', window.scrollY > hero.offsetHeight - 80); };
        window.addEventListener('scroll', on, { passive: true });
        on();
    }

    // ── "Book a demo" dialog.
    var lastFocus = null;
    window.openDemo = function (e) {
        if (e && e.preventDefault) e.preventDefault();
        var d = document.getElementById('lp-demo');
        if (!d) return false;
        lastFocus = document.activeElement;
        d.classList.add('is-open');
        d.setAttribute('aria-hidden', 'false');
        var first = d.querySelector('input:not(.lp-hp-input)');
        setTimeout(function () { if (first) first.focus(); }, 30);
        return false;
    };
    window.closeDemo = function () {
        var d = document.getElementById('lp-demo');
        if (!d) return;
        d.classList.remove('is-open');
        d.setAttribute('aria-hidden', 'true');
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    function demoForm() {
        var d = document.getElementById('lp-demo'), f = document.getElementById('lp-demo-form');
        if (!d || !f) return;
        d.addEventListener('click', function (e) { if (e.target === d) window.closeDemo(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && d.classList.contains('is-open')) window.closeDemo(); });
        f.addEventListener('submit', async function (e) {
            e.preventDefault();
            var msg = document.getElementById('lp-demo-msg'), btn = f.querySelector('button[type=submit]');
            var data = {}; new FormData(f).forEach(function (v, k) { data[k] = v; });
            btn.disabled = true; btn.textContent = 'Sending…'; msg.textContent = '';
            try {
                var res = await fetch('/api/demo-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
                var out = await res.json().catch(function () { return {}; });
                if (!res.ok) throw new Error(out.error || 'Could not send your request.');
                document.getElementById('lp-demo-body').hidden = true;
                document.getElementById('lp-demo-done').hidden = false;
            } catch (err) {
                msg.textContent = err.message || 'Could not send your request. Email info@studentweaver.com instead.';
                btn.disabled = false; btn.textContent = 'Request a demo';
            }
        });
    }

    function init() {
        var c = document.getElementById('lp-network');
        if (c) heroNetwork(c);
        reveals(); stickyNav(); demoForm();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
