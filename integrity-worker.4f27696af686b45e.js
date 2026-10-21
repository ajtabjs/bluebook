// Integrity worker stub for Bluebook
// Implements the Comlink protocol expected by the integrity manager

const COM_SYMBOLS = {
  proxy: Symbol("Comlink.proxy"),
  endpoint: Symbol("Comlink.endpoint"),
  releaseProxy: Symbol("Comlink.releaseProxy"),
  finalizer: Symbol("Comlink.finalizer"),
  thrown: Symbol("Comlink.thrown")
};

const handlers = new Map();

// Comlink serialization helpers
function isObject(e) {
  return "object" == typeof e && null !== e || "function" == typeof e;
}

function serialize(e) {
  for (const [name, handler] of handlers) {
    if (handler.canHandle(e)) {
      const [type, transfer] = handler.serialize(e);
      return [{type: "HANDLER", name, value: type}, transfer];
    }
  }
  return [{type: "RAW", value: e}, []];
}

function deserialize(e) {
  if (e.type === "HANDLER") {
    return handlers.get(e.name).deserialize(e.value);
  }
  return e.value;
}

function transfer(e, t) {
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const id = Math.random().toString(36).slice(2);
    channel.port1.addEventListener("message", (event) => {
      if (event.data && event.data.id === id) {
        resolve(event.data);
      }
    });
    channel.port1.start();
    channel.port1.postMessage(Object.assign({id}, e), t);
  });
}

// Handlers for Comlink protocol
handlers.set("proxy", {
  canHandle: (e) => isObject(e) && e[COM_SYMBOLS.proxy],
  serialize: (e) => {
    const {port1, port2} = new MessageChannel();
    exposeToPort(e, port1);
    return [port2, [port2]];
  },
  deserialize: (e) => {
    e.start();
    return wrap(e);
  }
});

handlers.set("throw", {
  canHandle: (e) => isObject(e) && COM_SYMBOLS.thrown in e,
  serialize: ({value: e}) => {
    let t;
    t = e instanceof Error ? {isError: true, value: {message: e.message, name: e.name, stack: e.stack}} : {isError: false, value: e};
    return [t, []];
  },
  deserialize: (e) => {
    if (e.isError) throw Object.assign(new Error(e.value.message), e.value);
    throw e.value;
  }
});

const releasedProxies = new WeakMap();
const finalizationRegistry = "FinalizationRegistry" in globalThis ? new FinalizationRegistry((e) => {
  const t = (releasedProxies.get(e) || 0) - 1;
  releasedProxies.set(e, t);
  if (0 === t) releaseProxy(e);
}) : null;

function wrap(e, t = []) {
  let released = false;
  const proxy = new Proxy(() => {}, {
    get(target, prop) {
      if (released) throw new Error("Proxy has been released and is not useable");
      if (prop === COM_SYMBOLS.releaseProxy) {
        return () => { released = true; releaseProxy(proxy); };
      }
      if (prop === "then") {
        if (0 === t.length) return {then: () => proxy};
        return transfer({type: "GET", path: t.map(String)}).then(deserialize).then((v) => v.then.bind(v));
      }
      return wrap(e, [...t, prop]);
    },
    set(target, prop, value) {
      if (released) throw new Error("Proxy has been released and is not useable");
      const [msg, transferList] = serialize(value);
      return transfer({type: "SET", path: [...t, prop].map(String), value: msg}, transferList).then(deserialize);
    },
    apply(target, thisArg, args) {
      if (released) throw new Error("Proxy has been released and is not useable");
      const last = t[t.length - 1];
      if (last === COM_SYMBOLS.endpoint) return transfer({type: "ENDPOINT"}).then(deserialize);
      if (last === "bind") return wrap(e, t.slice(0, -1));
      const [serializedArgs, transferList] = serializeArgs(args);
      return transfer({type: "APPLY", path: t.map(String), argumentList: serializedArgs}, transferList).then(deserialize);
    },
    construct(target, args) {
      if (released) throw new Error("Proxy has been released and is not useable");
      const [serializedArgs, transferList] = serializeArgs(args);
      return transfer({type: "CONSTRUCT", path: t.map(String), argumentList: serializedArgs}, transferList).then(deserialize);
    }
  });
  const count = (releasedProxies.get(proxy) || 0) + 1;
  releasedProxies.set(proxy, count);
  if (finalizationRegistry) finalizationRegistry.register(proxy, proxy);
  return Object.assign(proxy, {[COM_SYMBOLS.proxy]: true});
}

function serializeArgs(args) {
  const serialized = args.map(serialize);
  return [serialized.map((s) => s[0]), serialized.flatMap((s) => s[1])];
}

function expose(e, t = globalThis, n = ["*"]) {
  t.addEventListener("message", (function i(o) {
    if (!o || !o.data) return;
    if (!n.some((e) => e === "*" || e instanceof RegExp && e.test(o.origin) || e === o.origin)) {
      return console.warn(`Invalid origin '${o.origin}' for comlink proxy`);
    }
    const {id: r, type: c, path: l} = Object.assign({path: []}, o.data);
    const args = (o.data.argumentList || []).map(deserialize);
    let result;
    try {
      const target = l.slice(0, -1).reduce((e, t) => e[t], e);
      const method = l.reduce((e, t) => e[t], e);
      switch (c) {
        case "GET": result = method; break;
        case "SET": target[l.slice(-1)[0]] = args[0]; result = true; break;
        case "APPLY": result = method.apply(target, args); break;
        case "CONSTRUCT": result = new method(...args); break;
        case "ENDPOINT": {
          const {port1, port2} = new MessageChannel();
          exposeToPort(e, port1);
          result = [port2, [port2]];
        } break;
        case "RELEASE": result = void 0; break;
        default: return;
      }
    } catch (e) {
      result = {value: e, [COM_SYMBOLS.thrown]: 0};
    }
    Promise.resolve(result).catch((e) => ({value: e, [COM_SYMBOLS.thrown]: 0})).then((n) => {
      const [msg, transfer] = serialize(n);
      o.source.postMessage(Object.assign(Object.assign({}, msg), {id: r}), transfer);
      if (c === "RELEASE") {
        o.source.removeEventListener("message", i);
        if (t[COM_SYMBOLS.finalizer]) t[COM_SYMBOLS.finalizer]();
      }
    });
  }), {once: false});
}

function exposeToPort(e, port) {
  expose(e, port, ["*"]);
}

function releaseProxy(e) {
  if ("FinalizationRegistry" in globalThis && finalizationRegistry) finalizationRegistry.unregister(e);
  releasedProxies.delete(e);
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "ENDPOINT") {
    expose(api, event.ports[0], ["*"]);
  }
});

// Integrity Manager API
const api = {
  // Called by the wrapper to get credentials
  getCredentials: async (arg) => {
    console.log('[integrity-worker] getCredentials called', arg);
    return "stub-token";
  },

  // Called by wrapper on error
  onError: (err, ctx) => {
    console.log('[integrity-worker] onError', err, ctx);
  },

  // Integrity manager methods
  onCheckInHandler: async () => {
    console.log('[integrity-worker] onCheckInHandler');
    return {success: true};
  },

  onExamStartHandler: async () => {
    console.log('[integrity-worker] onExamStartHandler');
    return {success: true};
  },

  onExamIntegrityEvent: async (event) => {
    console.log('[integrity-worker] onExamIntegrityEvent', event);
    return {success: true};
  },

  onResponseHandler: async (response) => {
    console.log('[integrity-worker] onResponseHandler', response);
    return {success: true};
  },

  onExamEndHandler: async (data) => {
    console.log('[integrity-worker] onExamEndHandler', data);
    return {success: true};
  },

  onMonitoringCaptureHandler: async (data) => {
    console.log('[integrity-worker] onMonitoringCaptureHandler', data);
    return {success: true};
  },

  onMonitoringUploadHandler: async () => {
    console.log('[integrity-worker] onMonitoringUploadHandler');
    return {success: true};
  }
};

console.log('[integrity-worker] Loaded and ready');