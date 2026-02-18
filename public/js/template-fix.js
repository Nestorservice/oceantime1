/**
 * Template fix — must load BEFORE custom.min.js
 * Creates dummy elements that PerfectScrollbar and template panels expect.
 */
(function () {
    // Elements that custom.min.js tries to init PerfectScrollbar on
    var dummies = ['dlab-demo-content', 'chatbox-msg-area'];
    for (var i = 0; i < dummies.length; i++) {
        if (!document.querySelector('.' + dummies[i])) {
            var el = document.createElement('div');
            el.className = dummies[i];
            el.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:auto;';
            document.body.appendChild(el);
        }
    }
})();
