<template>
  <a class="miapoplus-cta" href="https://miapo.app-edufrem.com" target="_blank" rel="noopener">
    <span class="mpc-ic">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8H20l-4.9 3.6 1.9 5.8L12 14.6 7 18.2l1.9-5.8L4 8.8h6.1z" /></svg>
    </span>
    <span class="mpc-tx">
      <strong>MAPO+, ton professeur particulier disponible 24/7</strong>
      <small>Révisions, suivi et orientation par l'IA, à la maison. À découvrir.</small>
    </span>
    <span class="mpc-go">Découvrir
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
    </span>
  </a>
</template>

<script setup></script>

<style scoped>
.miapoplus-cta { display: flex; align-items: center; gap: 14px; padding: 15px 18px; border-radius: 16px; background: linear-gradient(135deg, #f5f3ff, #ede9fe); border: 1px solid #ddd6fe; text-decoration: none; transition: transform .15s ease, box-shadow .15s ease; margin-bottom: 16px; }
.miapoplus-cta:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(124, 58, 237, .18); }
.mpc-ic { display: flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #8b5cf6, #6d28d9); color: #fff; flex-shrink: 0; }
.mpc-tx { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.mpc-tx strong { font-size: 15px; color: #4c1d95; font-family: 'Poppins', sans-serif; }
.mpc-tx small { font-size: 13px; color: #6d28d9; opacity: .85; margin-top: 2px; }
.mpc-go { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; font-size: 14px; color: #7c3aed; white-space: nowrap; font-family: 'Poppins', sans-serif; }
@media (max-width: 640px) { .mpc-go { display: none; } .mpc-tx small { display: none; } }
</style>
