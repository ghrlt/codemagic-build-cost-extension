(() => {
    'use strict';

    // // patch window.fetch to capture calls to /builds
    // const originalFetch = window.fetch;
    // window.fetch = async (input, init) => {
    //     const response = await originalFetch(input, init);
    //     const url = typeof input === 'string' ? input : input.url;
    //     console.log('fetch', url);
    //     if (url.includes('/builds')) {
    //         response.clone().json().then(data => {
    //             window.postMessage({
    //                 source: 'codemagic-cost',
    //                 payload: data
    //             }, '*');
    //         }).catch(() => { });
    //     }
    //     return response;
    // };

    // patch XMLHttpRequest to capture calls to /builds
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url, ...args) {
        this._url = url;
        return origOpen.call(this, method, url, ...args);
    };

    XMLHttpRequest.prototype.send = function (body) {
        this.addEventListener('load', () => {
            if (this._url && this._url.includes('/builds')) {
                try {
                    const data = JSON.parse(this.responseText);
                    window.postMessage({
                        source: 'codemagic-cost',
                        payload: data
                    }, '*');
                } catch { }
            }
        });
        return origSend.call(this, body);
    };

    const wrap = fnName => {
        const orig = history[fnName];
        history[fnName] = function (...args) {
            const ret = orig.apply(this, args);
            window.dispatchEvent(new CustomEvent('codemagic:locationchange'));
            return ret;
        };
    };
    wrap('pushState');
    wrap('replaceState');
    window.addEventListener('popstate', () =>
        window.dispatchEvent(new CustomEvent('codemagic:locationchange'))
    );
})();
