import { defineStore } from "@/pinia";
import { ref, computed } from "vue";

export const useSetupStore = defineStore("setupStore", () => {
  const count = ref(20);
  const doubleCount = computed(() => count.value * 2);

  return { count, doubleCount };
});
