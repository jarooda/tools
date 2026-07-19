<script setup lang="ts">
import { APP_NAME } from '@/lib/config'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <span>
      © {{ year }}
      <a href="https://jaluwibowo.id" target="_blank" rel="noopener noreferrer">Jalu Wibowo Aji</a>
      — {{ APP_NAME }}, privacy-first web utilities.
    </span>
    <span>Everything runs locally. Nothing is ever uploaded.</span>
  </footer>
</template>

<style scoped>
.site-footer {
  padding-top: var(--space-8, 2rem);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  color: var(--text-tertiary);
  font-size: 13px;
}
.site-footer a {
  color: inherit;
  text-decoration: none;
  font-weight: 550;
}
.site-footer a:hover {
  color: var(--text-secondary);
  text-decoration: underline;
}
</style>
