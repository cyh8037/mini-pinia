import { defineStore } from "@/pinia";

export const useOptionsStore = defineStore("optionsStore", {
  state: () => {
    return {
      age: 10,
    };
  },
  getters: {
    parentAge() {
      return this.age + 18;
    },
  },
});
