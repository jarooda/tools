<script setup lang="ts">
import GlobalCommandPalette from '@/components/tool/GlobalCommandPalette.vue'
import { Toaster } from '@/components/ui/toast'
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <GlobalCommandPalette />
    <Toaster />
  </div>
</template>
