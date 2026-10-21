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
// CRITICAL: the platform bundle (vendor-private.js) gates its entire module map behind
// w205U.F4j(), which regex-matches navigator.userAgent AND navigator.appVersion against a
// " CrOS <token> " pattern. If appVersion is not spoofed to match the UA, F4j() returns false,
// `return R$_[4]` is skipped, chunk 696 ships `undefined`, module 18973 (L6q) never registers,
// and the app dies at boot with "Cannot read properties of undefined (reading 'call')".
try{ Object.defineProperty(Navigator.prototype, `appVersion`, { get: function(){ return `5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36`; }, configurable: true }); }catch(e){}
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
  
  // Lockdown/device lock bypass: spoof fullscreen and pointer lock
  // Use document.documentElement (html) as the spoofed element - it's a real Element with requestFullscreen
  const lockdownElement = document.documentElement;
  
  // Spoof fullscreenElement and pointerLockElement to return the real documentElement
  try {
    Object.defineProperty(document, 'fullscreenElement', {
      get: () => lockdownElement,
      configurable: true
    });
    Object.defineProperty(document, 'pointerLockElement', {
      get: () => lockdownElement,
      configurable: true
    });
    Object.defineProperty(document, 'webkitFullscreenElement', {
      get: () => lockdownElement,
      configurable: true
    });
    Object.defineProperty(document, 'mozFullScreenElement', {
      get: () => lockdownElement,
      configurable: true
    });
    Object.defineProperty(document, 'msFullscreenElement', {
      get: () => lockdownElement,
      configurable: true
    });
    Object.defineProperty(document, 'webkitPointerLockElement', {
      get: () => lockdownElement,
      configurable: true
    });
    Object.defineProperty(document, 'mozPointerLockElement', {
      get: () => lockdownElement,
      configurable: true
    });
    // Critical: fullscreenEnabled must return true for lockdown check
    Object.defineProperty(document, 'fullscreenEnabled', {
      get: () => true,
      configurable: true
    });
    // Also spoof prefixed fullscreenEnabled (Q92C may check these)
    Object.defineProperty(document, 'webkitFullscreenEnabled', {
      get: () => true,
      configurable: true
    });
    Object.defineProperty(document, 'mozFullScreenEnabled', {
      get: () => true,
      configurable: true
    });
    Object.defineProperty(document, 'msFullscreenEnabled', {
      get: () => true,
      configurable: true
    });
    console.log(`[shim] fullscreen/pointerLock elements spoofed to documentElement`);
  } catch(e) { console.log(`[shim] fullscreen spoof error`, e); }
  
  // Override requestFullscreen to always succeed AND dispatch fullscreenchange
  const origRequestFullscreen = Element.prototype.requestFullscreen;
  Element.prototype.requestFullscreen = function(options) {
    console.log(`[shim] requestFullscreen called on`, this.tagName, '- forcing success');
    // Set fullscreenElement to this element
    Object.defineProperty(document, 'fullscreenElement', {
      get: () => this,
      configurable: true
    });
    Object.defineProperty(document, 'webkitFullscreenElement', {
      get: () => this,
      configurable: true
    });
    Object.defineProperty(document, 'mozFullScreenElement', {
      get: () => this,
      configurable: true
    });
    Object.defineProperty(document, 'msFullscreenElement', {
      get: () => this,
      configurable: true
    });
    // Dispatch fullscreenchange event
    setTimeout(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
      document.dispatchEvent(new Event('webkitfullscreenchange'));
      document.dispatchEvent(new Event('mozfullscreenchange'));
      document.dispatchEvent(new Event('MSFullscreenChange'));
    }, 0);
    return Promise.resolve();
  };
  
  // Override exitFullscreen to no-op
  const origExitFullscreen = document.exitFullscreen;
  document.exitFullscreen = function() {
    console.log(`[shim] exitFullscreen called - no-op`);
    Object.defineProperty(document, 'fullscreenElement', {
      get: () => null,
      configurable: true
    });
    setTimeout(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    }, 0);
    return Promise.resolve();
  };
  
  // Override requestPointerLock to always succeed AND dispatch pointerlockchange
  const origRequestPointerLock = Element.prototype.requestPointerLock;
  Element.prototype.requestPointerLock = function() {
    console.log(`[shim] requestPointerLock called on`, this.tagName, '- forcing success');
    Object.defineProperty(document, 'pointerLockElement', {
      get: () => this,
      configurable: true
    });
    Object.defineProperty(document, 'webkitPointerLockElement', {
      get: () => this,
      configurable: true
    });
    Object.defineProperty(document, 'mozPointerLockElement', {
      get: () => this,
      configurable: true
    });
    setTimeout(() => {
      document.dispatchEvent(new Event('pointerlockchange'));
      document.dispatchEvent(new Event('webkitpointerlockchange'));
      document.dispatchEvent(new Event('mozpointerlockchange'));
    }, 0);
    return Promise.resolve();
  };
  
  // Override exitPointerLock to no-op
  const origExitPointerLock = document.exitPointerLock;
  document.exitPointerLock = function() {
    console.log(`[shim] exitPointerLock called - no-op`);
    Object.defineProperty(document, 'pointerLockElement', {
      get: () => null,
      configurable: true
    });
    setTimeout(() => {
      document.dispatchEvent(new Event('pointerlockchange'));
    }, 0);
    return Promise.resolve();
  };
  
  // Also cover webkit/moz prefixes
  try {
    Element.prototype.webkitRequestFullscreen = Element.prototype.requestFullscreen;
    Element.prototype.mozRequestFullScreen = Element.prototype.requestFullscreen;
    Element.prototype.webkitRequestPointerLock = Element.prototype.requestPointerLock;
    Element.prototype.mozRequestPointerLock = Element.prototype.requestPointerLock;
    document.webkitExitFullscreen = document.exitFullscreen;
    document.mozExitFullscreen = document.exitFullscreen;
    document.webkitExitPointerLock = document.exitPointerLock;
    document.mozExitPointerLock = document.exitPointerLock;
  } catch(e) {}
  
  console.log(`[shim] Lockdown/device lock bypass installed`);
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
  
  // 2b. Spoof L6q.bSx (eviction detection storage) to always return valid marker
  // This prevents "you've started this test on another device" errors
  if(!window.L6q.bSx) window.L6q.bSx = {};
  const fakeBstItem = { value: 'eviction-marker-valid', timestamp: Date.now() };
  window.L6q.bSx.getItem = window.L6q.bSx.getItem || (async (key) => {
    console.log(`[shim] L6q.bSx.getItem(${key}) - returning valid marker`);
    return fakeBstItem;
  });
  window.L6q.bSx.setItem = window.L6q.bSx.setItem || (async (key, value) => {
    console.log(`[shim] L6q.bSx.setItem(${key}) - allowing`);
    return true;
  });
  // Also support the minified method names (5217=setItem, 213=getItem)
  window.L6q.bSx[5217] = window.L6q.bSx.setItem;
  window.L6q.bSx[213] = window.L6q.bSx.getItem;
  console.log(`[shim] L6q.bSx (eviction detection) spoofed`);
  
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
  
  // 4. Block fetch/XHR to telemetry endpoints ONLY (not exam APIs)
  const TELEMETRY_DOMAINS = ['sentry.io', 'o516766.ingest.sentry.io'];
  const TELEMETRY_PATHS = ['/envelope/', '/api/5667256/', '/api/telemetry/', '/api/analytics/', '/ga_update'];
  
  function isTelemetryUrl(urlStr) {
    // Only block known telemetry domains
    for (const domain of TELEMETRY_DOMAINS) {
      if (urlStr.includes(domain)) return true;
    }
    // Only block specific telemetry paths on collegeboard.org
    for (const path of TELEMETRY_PATHS) {
      if (urlStr.includes(path)) return true;
    }
    return false;
  }
  
  const origFetch = window.fetch;
  window.fetch = function(url, options){
    const urlStr = typeof url === 'string' ? url : url?.toString();
    if (isTelemetryUrl(urlStr)) {
      console.log(`[shim] BLOCKED fetch to telemetry:`, urlStr);
      return Promise.resolve(new Response('{}', {status: 200}));
    }
    // Intercept GraphQL mutations for deviceSwitchAllowed - force ALLOWED response
    if (urlStr.includes('graphql') || urlStr.includes('api') || urlStr.includes('collegeboard.org')) {
      const bodyStr = options?.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : '';
      if (bodyStr.includes('deviceSwitchAllowed') || bodyStr.includes('deviceSwitchStatus')) {
        console.log(`[shim] INTERCEPTED deviceSwitchAllowed mutation - forcing ALLOWED`);
        return Promise.resolve(new Response(JSON.stringify({
          data: {
            deviceSwitchAllowed: 'ALLOWED',
            deviceSwitchStatus: {
              allowed: true,
              status: 'ALLOWED'
            }
          }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      // Also intercept verifyExamDeviceId
      if (bodyStr.includes('verifyExamDeviceId')) {
        console.log(`[shim] INTERCEPTED verifyExamDeviceId - forcing success`);
        return Promise.resolve(new Response(JSON.stringify({
          data: { verifyExamDeviceId: { success: true } }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      // Intercept getRegistrationCheckinStatus
      if (bodyStr.includes('getRegistrationCheckinStatus')) {
        console.log(`[shim] INTERCEPTED getRegistrationCheckinStatus - forcing 0`);
        return Promise.resolve(new Response(JSON.stringify({
          data: { getRegistrationCheckinStatus: 0 }
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
    }
    return origFetch.apply(this, arguments);
  };
  
  const origXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args){
    const urlStr = typeof url === 'string' ? url : url?.toString();
    if (isTelemetryUrl(urlStr)) {
      console.log(`[shim] BLOCKED XHR to telemetry:`, urlStr);
      this.abort();
      return;
    }
    // Intercept GraphQL mutations for deviceSwitchAllowed
    if (urlStr.includes('graphql') || urlStr.includes('api') || urlStr.includes('collegeboard.org')) {
      this._shimInterceptGraphQL = true;
    }
    return origXhrOpen.apply(this, [method, url, ...args]);
  };

  const origXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(body){
    if (this._shimInterceptGraphQL && body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      if (bodyStr.includes('deviceSwitchAllowed') || bodyStr.includes('deviceSwitchStatus')) {
        console.log(`[shim] INTERCEPTED XHR deviceSwitchAllowed - forcing ALLOWED`);
        this._shimForceResponse = { data: { deviceSwitchAllowed: 'ALLOWED', deviceSwitchStatus: { allowed: true, status: 'ALLOWED' } } };
      }
      if (bodyStr.includes('verifyExamDeviceId')) {
        console.log(`[shim] INTERCEPTED XHR verifyExamDeviceId - forcing success`);
        this._shimForceResponse = { data: { verifyExamDeviceId: { success: true } } };
      }
      if (bodyStr.includes('getRegistrationCheckinStatus')) {
        console.log(`[shim] INTERCEPTED XHR getRegistrationCheckinStatus - forcing 0`);
        this._shimForceResponse = { data: { getRegistrationCheckinStatus: 0 } };
      }
    }
    return origXhrSend.apply(this, arguments);
  };

  const origXhrOnLoad = XMLHttpRequest.prototype.onload;
  XMLHttpRequest.prototype.onload = function(e) {
    if (this._shimForceResponse) {
      Object.defineProperty(this, 'responseText', { value: JSON.stringify(this._shimForceResponse), configurable: true });
      Object.defineProperty(this, 'response', { value: JSON.stringify(this._shimForceResponse), configurable: true });
      Object.defineProperty(this, 'status', { value: 200, configurable: true });
      Object.defineProperty(this, 'statusText', { value: 'OK', configurable: true });
      console.log(`[shim] Forced XHR response:`, this._shimForceResponse);
    }
    if (origXhrOnLoad) return origXhrOnLoad.call(this, e);
  };
  
  // 5. Disable checkUpdateRequired if it gets attached to window (only on window/global)
  const origDefineProp = Object.defineProperty;
  Object.defineProperty = function(obj, prop, desc){
    // Only block checkUpdateRequired/forceUpdate when defined directly on window
    if(obj === window && (prop === 'checkUpdateRequired' || prop === 'forceUpdate')){
      console.log(`[shim] BLOCKED defineProperty for ${prop} on window`);
      return origDefineProp(obj, prop, {value: false, writable: true, configurable: true});
    }
    // Allow all other Object.defineProperty calls to proceed normally.
    // NOTE: must use Reflect.apply with an explicit `Object` receiver -- using `this` breaks
    // ("TypeError: Illegal invocation") whenever the method is called detached.
    return Reflect.apply(origDefineProp, Object, arguments);
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
      if (isTelemetryUrl(urlStr)) {
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
    const isTelemetry = isTelemetryUrl(urlStr);
    if(isTelemetry && isHidden){
      console.log(`[shim] BLOCKED fetch to telemetry (tab hidden):`, urlStr);
      return Promise.resolve(new Response('{}', {status: 200}));
    }
    return origFetch2.apply(this, arguments);
  };
  
  const origXhrOpen2 = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args){
    const urlStr = typeof url === 'string' ? url : url?.toString();
    const isTelemetry = isTelemetryUrl(urlStr);
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
