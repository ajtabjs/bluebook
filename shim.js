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
})();
