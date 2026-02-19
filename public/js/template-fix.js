/**
 * Template fix — must load BEFORE custom.min.js
 * Patches PerfectScrollbar to avoid crashes on missing elements.
 * Also creates dummy elements that the template panels expect.
 */
(function () {
    'use strict';

    // 1. Create dummy elements the template needs
    var dummies = ['dlab-demo-content', 'chatbox-msg-area'];
    for (var i = 0; i < dummies.length; i++) {
        if (!document.querySelector('.' + dummies[i])) {
            var el = document.createElement('div');
            el.className = dummies[i];
            el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:auto;';
            document.body.appendChild(el);
        }
    }

    // 2. Monkey-patch PerfectScrollbar to silently fail on missing elements
    if (typeof window.PerfectScrollbar === 'function') {
        var OrigPS = window.PerfectScrollbar;
        window.PerfectScrollbar = function (el, opts) {
            try {
                var target = (typeof el === 'string') ? document.querySelector(el) : el;
                if (!target) {
                    // Return a no-op proxy to avoid errors
                    return { update: function () { }, destroy: function () { } };
                }
                return new OrigPS(target, opts);
            } catch (e) {
                console.warn('[TemplateFix] PerfectScrollbar skipped:', e.message);
                return { update: function () { }, destroy: function () { } };
            }
        };
        // Copy static props
        Object.keys(OrigPS).forEach(function (k) {
            window.PerfectScrollbar[k] = OrigPS[k];
        });
        window.PerfectScrollbar.prototype = OrigPS.prototype;
    }
})();
