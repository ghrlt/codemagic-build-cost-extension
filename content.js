(() => {
  'use strict';

  // 1. Inject page_inject.js into page context (to bypass CSP)
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('page_inject.js');
  script.onload = () => script.remove();
  document.documentElement.appendChild(script);

  // 2. Shared state
  const billingPlans = {};
  const buildsMap = new Map();
  const instanceToPlan = {
    linux: 'buildTime.linux_paid',
    linux_x2: 'buildTime.linux_x2_paid',
    mac_mini: 'buildTime.mac_mini_paid',
    mac_mini_m1: 'buildTime.mac_mini_m1_paid',
    mac_mini_m2: 'buildTime.mac_mini_m2_paid',
    mac_pro: 'buildTime.mac_pro_paid',
    windows_x2: 'buildTime.windows_x2_paid',
    app_preview: 'appPreview.paid'
  };

  // 3. Utility helpers
  const durationMin = (s, e) => s && e ? Math.max((new Date(e) - new Date(s)) / 60000, 0) : 0;
  const waitFor = sel => new Promise(res => {
    if (document.querySelector(sel)) return res();
    const o = new MutationObserver((_, obs) => {
      if (document.querySelector(sel)) { obs.disconnect(); res(); }
    });
    o.observe(document.documentElement, { childList: true, subtree: true });
  });

  // 4. Injection logic
  function injectCostItem(item) {
    if (item.dataset.costInjected) return;
    const idxEl = item.querySelector('.page-builds-item__index');
    if (!idxEl) return;
    const m = idxEl.textContent.match(/\d+/);
    if (!m) return;
    const num = +m[0];
    const b = buildsMap.get(num);
    if (!b) return;

    const rate = billingPlans[instanceToPlan[b.instanceType]] || 0;

    const parseLiveDuration = (txt) => {
      const m = /(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/.exec(txt.trim());
      const mins = (m[1] ? parseInt(m[1]) : 0) + (m[2] ? parseInt(m[2]) / 60 : 0);
      return mins;
    };

    const timing = item.querySelector('.page-builds-item-build-timing');
    if (!timing || timing.querySelector('.build-cost')) return;

    const d = document.createElement('div');
    d.className = 'build-cost';
    d.style.cssText = 'font-weight:bold;margin-top:4px;color:#4caf50';
    timing.appendChild(d);

    const durSpan = item.querySelector('span.build-duration.duration');

    const updateCost = () => {
      if (!durSpan) return;
      const mins = parseLiveDuration(durSpan.textContent);
      const cost = (rate * mins).toFixed(2);
      d.textContent = `💸 $${cost}`;
    };

    updateCost();

    if (durSpan) {
      new MutationObserver(updateCost).observe(durSpan, {
        characterData: true,
        childList: true,
        subtree: true
      });
    }

    item.dataset.costInjected = 'true';
  }


  async function observeList() {
    console.log('[observeList] waiting');
    await waitFor('.page-builds-item');
    console.log('[observeList] ready');
    document.querySelectorAll('.page-builds-item').forEach(injectCostItem);
    new MutationObserver(muts => {
      muts.forEach(m => {
        m.addedNodes.forEach(n => {
          if (n.nodeType === 1 && n.matches('.page-builds-item')) {
            injectCostItem(n);
          }
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  function injectSingle() {
    const id = location.pathname.split('/').pop();
    const b = [...buildsMap.values()].find(x => x._id === id);
    if (!b) return;

    const container = document.querySelector('.page-build-details-overview__list');
    if (!container || !b.instanceType) return;

    const rate = billingPlans[instanceToPlan[b.instanceType]] || 0;

    // Parse "7m 29s" -> minutes as float
    const parseLiveDuration = (txt) => {
      const m = /(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?/.exec(txt.trim());
      const mins = (m[1] ? parseInt(m[1]) : 0) + (m[2] ? parseInt(m[2]) / 60 : 0);
      return mins;
    };

    const updateCost = () => {
      const durSpan = document.querySelector('div.page-build-details-overview__list-item-value span.build-duration.duration');
      if (!durSpan) return;
      const mins = parseLiveDuration(durSpan.textContent);
      const cost = (rate * mins).toFixed(2);
      costLine.textContent = `💸 Estimated build cost: $${cost}`;
    };

    // Create or reuse cost display line
    let costLine = container.querySelector('.build-cost-line');
    if (!costLine) {
      costLine = document.createElement('div');
      costLine.className = 'build-cost-line';
      costLine.style.cssText = 'font-weight:bold;color:#4caf50;margin-top:12px';
      container.appendChild(costLine);
    }

    // Initial update
    updateCost();

    // Watch for duration updates
    const durSpan = document.querySelector('span.build-duration.duration');
    if (durSpan) {
      new MutationObserver(updateCost).observe(durSpan, {
        characterData: true,
        childList: true,
        subtree: true
      });
    }
  }

  async function observeDetail() {
    console.log('[observeDetail] waiting');
    await waitFor('.page-build-details-overview__list');
    console.log('[observeDetail] ready');
    injectSingle();
    new MutationObserver(injectSingle)
      .observe(document.body, { childList: true, subtree: true });
  }

  // 5. Listen for build data from page_inject.js
  window.addEventListener('message', e => {
    if (e.source !== window || e.data.source !== 'codemagic-cost') return;
    const { payload } = e.data;

    if (payload.builds) {
      payload.builds.forEach(b => buildsMap.set(b.index, b));
      console.log('[Builds received]', payload.builds.length);
      // **Trigger injection now that we have builds data**
      if (location.pathname.endsWith('/builds')) {
        document.querySelectorAll('.page-builds-item').forEach(injectCostItem);
      }
    }

    if (payload.build) {
      const b = payload.build;
      if (b.index != null) buildsMap.set(b.index, b);
      console.log('[Single build received]', b.index);
      // **Trigger single injection**
      if (location.pathname.includes('/build/')) {
        injectSingle();
      }
    }
  });

  // 6. Fetch billing plans
  async function fetchPlans() {
    try {
      const resp = await fetch('https://api.codemagic.io/billing/plans');
      const json = await resp.json();
      Object.entries(json.plans).forEach(([k, p]) => {
        billingPlans[k] = parseFloat(p.amountDecimal || '0') / 100;
      });
      console.log('[Billing plans loaded]', billingPlans);
    } catch (err) {
      console.error('Billing plans fetch error', err);
    }
  }

  // 7. SPA navigation
  function onNavigate() {
    const p = location.pathname;
    console.log('[onNavigate]', p);
    if (p.endsWith('/builds')) observeList();
    else if (p.includes('/build/')) observeDetail();
  }

  // 8. Init
  fetchPlans().then(() => {
    onNavigate();
  });
  window.addEventListener('codemagic:locationchange', onNavigate);
})();
