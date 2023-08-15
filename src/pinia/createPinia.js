import { ref, effectScope } from "vue";
import { piniaSymbol } from "./rootStore";

export let activePinia;
export const setActivePinia = (pinia) => (activePinia = pinia);

export function createPinia() {
  const scope = effectScope();
  const state = scope.run(() => ref({}));

  const _p = []; // plugin集合
  const pinia = {
    _p,
    _s: new Map(), // 存储所有的store
    _e: scope, // 停止所有状态/响应式监听
    state, // 存储所有的状态
    install(app) {
      setActivePinia(pinia);
      // composition api
      app.provide(piniaSymbol, pinia);
      // 模版中$pinia
      app.config.globalProperties.$pinia = pinia;
    },
    use(plugin) {
      _p.push(plugin);
      return this;
    },
  };

  return pinia;
}
