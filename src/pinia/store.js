import {
  getCurrentInstance,
  inject,
  reactive,
  effectScope,
  computed,
  isRef,
  isReactive,
  toRefs,
  watch,
} from "vue";
import { piniaSymbol } from "./rootStore";
import { addSubscription, triggerSubscriptions } from "./subscribe";
import { activePinia, setActivePinia } from "./createPinia";

function isComputed(value) {
  return !!(isRef(value) && value.effect);
}

function isObject(value) {
  return typeof value === "object" && value !== null;
}

function mergeReactiveObject(target, state) {
  for (let key in state) {
    let oldValue = target[key];
    let newValue = state[key]; // 这里取值会丧失响应式

    if (isObject(oldValue) && isObject(newValue)) {
      target[key] = mergeReactiveObject(oldValue, newValue);
    } else {
      target[key] = newValue;
    }
  }
}

function createSetupStore(id, setup, pinia, isOption) {
  let scope;

  function $patch(partialStateOrMutatior) {
    if (typeof partialStateOrMutatior === "object") {
      // 新值合并旧值
      mergeReactiveObject(pinia.state.value[id], partialStateOrMutatior);
    } else {
      partialStateOrMutatior(pinia.state.value[id]);
    }
  }
  function $subscribe(callback, options = {}) {
    scope.run(() =>
      watch(
        pinia.state.value[id],
        (state) => {
          callback({ storeId: id }, state);
        },
        options
      )
    );
  }
  function $dispose() {
    scope.stop();
    actionSubscriptions = [];
    pinia._s.delete(id);
  }

  let actionSubscriptions = [];
  const partialStore = {
    $patch,
    $subscribe,
    $dispose,
    $onAction: addSubscription.bind(null, actionSubscriptions),
  };

  const store = reactive(partialStore);
  const initialState = pinia.state.value[id];

  // composition api
  if (!initialState && !isOption) {
    pinia.state.value[id] = {};
  }
  const setupStore = pinia._e.run(() => {
    scope = effectScope();
    return scope.run(() => setup());
  });

  function wrapAction(name, action) {
    return function () {
      const afterCallbackList = [];
      const onErrorCallbackList = [];

      function after(callback) {
        afterCallbackList.push(callback);
      }
      function onError(callback) {
        onErrorCallbackList.push(callback);
      }
      triggerSubscriptions(actionSubscriptions, { after, onError });

      let res;
      try {
        res = action.apply(store, arguments);
      } catch (e) {
        triggerSubscriptions(onErrorCallbackList, e);
      }
      if (res instanceof Promise) {
        return res
          .then((value) => {
            return triggerSubscriptions(afterCallbackList, value);
          })
          .catch((e) => {
            triggerSubscriptions(onErrorCallbackList, e);
            return Promise.reject(e);
          });
      }
      triggerSubscriptions(afterCallbackList, res);
      return res;
    };
  }

  for (let key in setupStore) {
    const prop = setupStore[key];
    if (typeof prop === "function") {
      // 函数劫持：对action中的this和后续逻辑进行处理
      setupStore[key] = wrapAction(key, prop);
    }
    if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
      if (!isOption) {
        pinia.state.value[id][key] = prop;
      }
    }
  }

  store.$id = id;
  pinia._s.set(id, store);

  Object.assign(store, setupStore);
  Object.defineProperty(store, "$state", {
    get: () => pinia.state.value[id],
    set: (state) =>
      $patch(($state) => {
        Object.assign($state, state);
      }),
  });

  pinia._p.forEach((plugin) => {
    // 将插件的返回值作为store的属性
    Object.assign(
      store,
      scope.run(() => plugin({ store }))
    );
  });

  return store;
}

function createOptionsStore(id, options, pinia) {
  const { state, actions, getters } = options;

  function setup() {
    pinia.state.value[id] = state ? state() : {};
    // 需要转换为ref增加响应式
    const localState = toRefs(pinia.state.value[id]);

    return Object.assign(
      localState,
      actions,
      Object.keys(getters || {}).reduce((memo, name) => {
        memo[name] = computed(() => {
          let store = pinia._s.get(id);
          return getters[name].call(store);
        });
        return memo;
      }, {})
    );
  }

  const store = createSetupStore(id, setup, pinia, true);
  store.$reset = function () {
    const newState = state ? state() : {};
    store.$patch((state) => Object.assign(state, newState));
  };
}

export function defineStore(idOrOptions, setup) {
  let id;
  let options;

  if (typeof idOrOptions === "string") {
    id = idOrOptions;
    options = setup;
  } else {
    id = idOrOptions.id;
    options = idOrOptions;
  }

  const isSetupStore = typeof setup === "function";

  function useStore() {
    let instance = getCurrentInstance();
    let pinia = instance && inject(piniaSymbol);

    if (pinia) {
      setActivePinia(pinia);
    }
    pinia = activePinia;

    if (!pinia._s.has[id]) {
      if (isSetupStore) {
        createSetupStore(id, setup, pinia);
      } else {
        createOptionsStore(id, options, pinia);
      }
    }

    return pinia._s.get(id);
  }

  return useStore;
}
