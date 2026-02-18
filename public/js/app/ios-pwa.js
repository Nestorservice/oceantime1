/**
 * iOS PWA Install Prompt & Standalone Detection
 * iOS doesn't show automatic "Add to Home Screen" like Android/Chrome.
 * This script shows a custom install banner for iOS Safari users.
 */
(function () {
    'use strict';

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInStandaloneMode = window.navigator.standalone === true ||
        window.matchMedia('(display-mode: standalone)').matches;
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent);

    // Only show banner on iOS Safari and not already installed
    if (!isIOS || isInStandaloneMode) return;

    // Check if user dismissed the banner before
    const dismissed = localStorage.getItem('tm_ios_banner_dismissed');
    if (dismissed) {
        const dismissedAt = parseInt(dismissed);
        // Show again after 3 days
        if (Date.now() - dismissedAt < 3 * 24 * 60 * 60 * 1000) return;
    }

    // Wait for page to load
    window.addEventListener('load', function () {
        setTimeout(showIOSBanner, 2000);
    });

    function showIOSBanner() {
        const banner = document.createElement('div');
        banner.id = 'ios-install-banner';
        banner.innerHTML = `
            <div style="
                position:fixed;bottom:0;left:0;right:0;z-index:999999;
                background:linear-gradient(135deg,#1E3A5F,#2a5280);
                color:#fff;padding:16px 20px;
                border-radius:1.2rem 1.2rem 0 0;
                box-shadow:0 -4px 20px rgba(0,0,0,.2);
                font-family:'Inter',system-ui,sans-serif;
                animation:iosSlideUp .4s ease;
            ">
                <style>
                    @keyframes iosSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}
                    @keyframes iosBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
                </style>
                <div style="display:flex;align-items:center;gap:14px">
                    <div style="width:48px;height:48px;background:#4DA8DA;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                        <svg width="28" height="28" viewBox="0 0 192 192"><circle cx="96" cy="96" r="64" fill="none" stroke="#fff" stroke-width="6"/><circle cx="96" cy="96" r="4" fill="#fff"/><line x1="96" y1="96" x2="96" y2="56" stroke="#fff" stroke-width="5" stroke-linecap="round"/><line x1="96" y1="96" x2="128" y2="80" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>
                    </div>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:700;font-size:.95rem;margin-bottom:2px">Installer TimeMaster</div>
                        <div style="font-size:.78rem;opacity:.85;line-height:1.3">
                            Appuie sur <span style="display:inline-flex;align-items:center;vertical-align:middle">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4DA8DA" stroke-width="2.5" stroke-linecap="round"><path d="M4 12v6a2 2 0 002 2h12a2 2 0 002-2v-6M12 3v13M8 7l4-4 4 4"/></svg></span>
                            puis <strong>"Sur l'écran d'accueil"</strong>
                        </div>
                    </div>
                    <button onclick="document.getElementById('ios-install-banner').remove();localStorage.setItem('tm_ios_banner_dismissed',Date.now())" 
                        style="background:none;border:none;color:rgba(255,255,255,.6);font-size:1.2rem;padding:4px 8px;cursor:pointer;flex-shrink:0">✕</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
    }
})();
