<script setup>
import { storeToRefs } from "@/pinia";
import { useOptionsStore } from "@/store/optionsStore";
import { useSetupStore } from "@/store/setupStore";

const optionsStore = useOptionsStore();
const { age, parentAge } = storeToRefs(optionsStore);

const setupStore = useSetupStore();
const { count, doubleCount } = storeToRefs(setupStore);
</script>

<template>
  <div>
    {{ age }}
    {{ parentAge }}
    {{ count }}
    {{ doubleCount }}
  </div>
</template>

<style scoped></style>
