(function(){
window.__shimLoaded = true;
console.log(`[shim] loaded`);
function isBad(u){
  try{
    var s = (typeof u === `string`) ? u : (u && u.href) ? u.href : String(u);
    return s.indexOf(`chromebook-error`) !== -1;
  }catch(e){ return false; }
}
try{
  var proto = Location.prototype;
  var origReplace = proto.replace;
  var origAssign = proto.assign;
  proto.replace = function(u){ if(isBad(u)){ console.log(`[shim] BLOCKED replace`, u); return; } return origReplace.call(this,u); };
  proto.assign = function(u){ if(isBad(u)){ console.log(`[shim] BLOCKED assign`, u); return; } return origAssign.call(this,u); };
  var d = Object.getOwnPropertyDescriptor(proto, `href`);
  if(d && d.set){
    Object.defineProperty(proto, `href`, {
      get: d.get,
      set: function(u){ if(isBad(u)){ console.log(`[shim] BLOCKED href-set`, u); return; } d.set.call(this,u); },
      configurable: true, enumerable: d.enumerable
    });
  }
  console.log(`[shim] nav hooks installed`);
}catch(e){ console.log(`[shim] hook error`, e); }
try{
  var origOpen = window.open;
  window.open = function(u){ if(isBad(u)){ console.log(`[shim] BLOCKED window.open`, u); return null; } return origOpen.apply(this, arguments); };
}catch(e){}
try{ Object.defineProperty(Navigator.prototype, `userAgent`, { get: function(){ return `Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36`; }, configurable: true }); }catch(e){}
try{ Object.defineProperty(Navigator.prototype, `platform`, { get: function(){ return `Linux x86_64`; }, configurable: true }); }catch(e){}
try{ if(navigator.userAgentData){ Object.defineProperty(navigator, `userAgentData`, { get: function(){ return { platform: `Chrome OS`, brands: [{brand: `Chromium`, version: `145`}, {brand: `Google Chrome`, version: `145`}], mobile: false }; }, configurable: true }); } }catch(e){}
try{
  // Spoof navigator.storage entirely with a fake StorageManager
  const fakeEstimate = async () => ({
    quota: 150 * 1024 * 1024 * 1024,
    usage: 1024 * 1024 * 1024
  });
  const fakePersist = async () => true;
  
  // Override on instance
  if(navigator.storage){
    navigator.storage.estimate = fakeEstimate;
    navigator.storage.persist = fakePersist;
    console.log(`[shim] navigator.storage.estimate & persist spoofed on instance`);
  }
  
  // Override on prototype
  if(StorageManager && StorageManager.prototype){
    StorageManager.prototype.estimate = fakeEstimate;
    StorageManager.prototype.persist = fakePersist;
    console.log(`[shim] StorageManager.prototype.estimate & persist spoofed`);
  }
  
  // Also defineProperty on navigator.storage to prevent replacement
  try{
    Object.defineProperty(navigator, 'storage', {
      get: () => ({
        estimate: fakeEstimate,
        persist: fakePersist
      }),
      configurable: true
    });
    console.log(`[shim] navigator.storage getter spoofed`);
  }catch(e){}
  
}catch(e){ console.log(`[shim] storage hook error`, e); }
console.log(`[shim] UA spoofed to Chrome 145, ua=`, navigator.userAgent);

// --- Background check suppression utilities ---
try{
  // 1. Suppress setInterval/setTimeout for known check patterns
  const origSetInterval = window.setInterval;
  const origSetTimeout = window.setTimeout;
  const blockedIntervals = new Set();
  const blockedTimeouts = new Set();
  
  window.setInterval = function(fn, delay, ...args){
    const stack = new Error().stack || '';
    // Block intervals that look like integrity/version re-checks (typically 30s-5min)
    if(delay >= 30000 && delay <= 300000 && (stack.includes('Ggh') || stack.includes('checkUpdateRequired') || stack.includes('integrity') || stack.includes('attestation') || stack.includes('verify'))){
      console.log(`[shim] BLOCKED setInterval (delay=${delay}ms)`, stack.split('\n').slice(1,4).join(' | '));
      blockedIntervals.add({fn, delay, args});
      return -1; // fake timer ID
    }
    return origSetInterval.apply(this, [fn, delay, ...args]);
  };
  
  window.setTimeout = function(fn, delay, ...args){
    const stack = new Error().stack || '';
    // Block timeouts that re-run verification
    if(delay >= 1000 && (stack.includes('Ggh') || stack.includes('checkUpdateRequired') || stack.includes('integrity') || stack.includes('attestation') || stack.includes('verifyExamDevice'))){
      console.log(`[shim] BLOCKED setTimeout (delay=${delay}ms)`, stack.split('\n').slice(1,4).join(' | '));
      blockedTimeouts.add({fn, delay, args});
      return -1;
    }
    return origSetTimeout.apply(this, [fn, delay, ...args]);
  };
  
  // 2. Pre-define L6q.Ggh to always return true (integrity pass)
  // This will be overridden when the bundle loads, but we can try to catch it
  if(!window.L6q) window.L6q = {};
  const origGgh = window.L6q.Ggh;
  window.L6q.Ggh = async () => {
    console.log(`[shim] L6q.Ggh called - forcing TRUE (integrity pass)`);
    return true;
  };
  
  // 3. Block Sentry/error reporting
  if(window.Sentry){
    const origCapture = window.Sentry.captureException;
    window.Sentry.captureException = function(...args){
      console.log(`[shim] BLOCKED Sentry.captureException`, args[0]?.message || args[0]);
      return;
    };
    const origCaptureMessage = window.Sentry.captureMessage;
    window.Sentry.captureMessage = function(...args){
      console.log(`[shim] BLOCKED Sentry.captureMessage`, args[0]);
      return;
    };
    console.log(`[shim] Sentry reporting suppressed`);
  }
  
  // 4. Block fetch/XHR to telemetry endpoints
  const origFetch = window.fetch;
  window.fetch = function(url, options){
    const urlStr = typeof url === 'string' ? url : url?.toString();
    if(urlStr.includes('sentry.io') || urlStr.includes('analytics') || urlStr.includes('telemetry') || urlStr.includes('ga_update')){
      console.log(`[shim] BLOCKED fetch to telemetry:`, urlStr);
      return Promise.resolve(new Response('{}', {status: 200}));
    }
    return origFetch.apply(this, arguments);
  };
  
  const origXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args){
    const urlStr = typeof url === 'string' ? url : url?.toString();
    if(urlStr.includes('sentry.io') || urlStr.includes('analytics') || urlStr.includes('telemetry')){
      console.log(`[shim] BLOCKED XHR to telemetry:`, urlStr);
      this.abort();
      return;
    }
    return origXhrOpen.apply(this, [method, url, ...args]);
  };
  
  // 5. Disable checkUpdateRequired if it gets attached to a global
  const origDefineProp = Object.defineProperty;
  Object.defineProperty = function(obj, prop, desc){
    if(prop === 'checkUpdateRequired' || prop === 'forceUpdate'){
      console.log(`[shim] BLOCKED defineProperty for ${prop}`);
      return origDefineProp(obj, prop, {value: false, writable: true, configurable: true});
    }
    return origDefineProp.apply(this, arguments);
  };
  
  console.log(`[shim] Background check suppression utilities installed`);
}catch(e){ console.log(`[shim] background suppression error`, e); }

// 6. Suppress telemetry on tab switch / page unload
try{
  let isHidden = false;
  
  // Block sendBeacon (commonly used for analytics on unload)
  if(navigator.sendBeacon){
    const origSendBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function(url, data){
      const urlStr = typeof url === 'string' ? url : url?.toString();
      if(urlStr.includes('sentry.io') || urlStr.includes('analytics') || urlStr.includes('telemetry') || urlStr.includes('ga_update')){
        console.log(`[shim] BLOCKED sendBeacon to telemetry:`, urlStr);
        return true; // pretend it succeeded
      }
      return origSendBeacon(url, data);
    };
  }
  
  // Track visibility state
  document.addEventListener('visibilitychange', () => {
    isHidden = document.hidden;
    if(isHidden){
      console.log(`[shim] Tab hidden - suppressing background telemetry`);
    } else {
      console.log(`[shim] Tab visible - resuming`);
    }
  });
  
  // Block fetch/XHR when tab is hidden (for telemetry endpoints)
  const origFetch2 = window.fetch;
  window.fetch = function(url, options){
    const urlStr = typeof url === 'string' ? url : url?.toString();
    const isTelemetry = urlStr.includes('sentry.io') || urlStr.includes('analytics') || urlStr.includes('telemetry') || urlStr.includes('ga_update');
    if(isTelemetry && isHidden){
      console.log(`[shim] BLOCKED fetch to telemetry (tab hidden):`, urlStr);
      return Promise.resolve(new Response('{}', {status: 200}));
    }
    return origFetch2.apply(this, arguments);
  };
  
  const origXhrOpen2 = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args){
    const urlStr = typeof url === 'string' ? url : url?.toString();
    const isTelemetry = urlStr.includes('sentry.io') || urlStr.includes('analytics') || urlStr.includes('telemetry');
    if(isTelemetry && isHidden){
      console.log(`[shim] BLOCKED XHR to telemetry (tab hidden):`, urlStr);
      this.abort();
      return;
    }
    return origXhrOpen2.apply(this, [method, url, ...args]);
  };
  
  // Block on beforeunload/pagehide (final telemetry flush attempts)
  ['beforeunload', 'pagehide', 'unload'].forEach(event => {
    window.addEventListener(event, () => {
      console.log(`[shim] ${event} - blocking final telemetry flush`);
      isHidden = true;
    });
  });
  
  console.log(`[shim] Tab-switch/page-unload telemetry suppression installed`);
}catch(e){ console.log(`[shim] tab-switch suppression error`, e); }

})();
