/* Presentation only. Authentication and password visibility remain Keycloak's responsibility. */
(() => {
  'use strict';
  const root = document.documentElement;
  const storageKey = 'fsp-scout-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  let preference = null;
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored === 'light' || stored === 'dark') preference = stored;
  } catch (_) {
    // Storage can be unavailable in a private or restricted browser.
  }
  const apply = (theme) => { root.dataset.theme = theme; };
  apply(preference || (system.matches ? 'dark' : 'light'));

  system.addEventListener('change', () => {
    if (!preference) apply(system.matches ? 'dark' : 'light');
  });

  document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('fsp-theme-toggle');
    const announcer = document.querySelector('.fsp-announcer');
    if (toggle) {
      toggle.hidden = false;
      toggle.addEventListener('click', () => {
        preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
        apply(preference);
        try { window.localStorage.setItem(storageKey, preference); } catch (_) { /* Keep the in-page choice. */ }
        if (announcer) announcer.textContent = preference === 'dark' ? announcer.dataset.themeDark : announcer.dataset.themeLight;
      });
    }

    // Associate inherited server-side errors and dynamic User Profile hints with their fields.
    for (const field of document.querySelectorAll('input:not([type="hidden"]), select, textarea')) {
      if (!field.id) continue;
      const ids = ['input-error-', 'form-help-text-before-', 'form-help-text-after-']
        .map((prefix) => prefix + field.id).filter((id) => document.getElementById(id));
      if (field.id === 'password-new' && document.getElementById('input-error-password')) ids.push('input-error-password');
      if (ids.length) {
        const existing = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
        field.setAttribute('aria-describedby', [...new Set([...existing, ...ids])].join(' '));
      }
    }

    // Prevent a duplicate submission without removing the clicked submitter's name/value
    // from the browser's form payload. Do not interfere with cancel/alternate-flow actions.
    for (const form of document.querySelectorAll('form')) {
      const labels = {
        'kc-form-login': 'pendingLogin',
        'kc-register-form': 'pendingRegister',
        'kc-reset-password-form': 'pendingReset',
        'kc-passwd-update-form': 'pendingSave',
      };
      if (labels[form.id]) form.dataset.fspPendingLabel = document.body.dataset[labels[form.id]];
      let pending = false;
      const reset = () => {
        pending = false;
        form.removeAttribute('aria-busy');
        for (const button of form.querySelectorAll('[data-fsp-pending]')) {
          if (button.tagName === 'INPUT') button.value = button.dataset.fspOriginal;
          else button.textContent = button.dataset.fspOriginal;
          button.disabled = false;
          button.removeAttribute('data-fsp-pending');
          button.removeAttribute('data-fsp-original');
        }
      };
      window.addEventListener('pageshow', reset);
      form.addEventListener('submit', (event) => {
        if (event.defaultPrevented) return;
        if (pending) { event.preventDefault(); return; }
        const button = event.submitter;
        if (!button || button.name === 'cancel-aia' || button.classList.contains('g-recaptcha')) return;
        pending = true;
        form.setAttribute('aria-busy', 'true');
        button.dataset.fspOriginal = button.tagName === 'INPUT' ? button.value : button.textContent;
        button.dataset.fspPending = '';
        // The timeout runs after the browser has collected form data, including submitter.
        window.setTimeout(() => {
          button.disabled = true;
          const text = form.dataset.fspPendingLabel;
          if (text) {
            if (button.tagName === 'INPUT') button.value = text;
            else button.textContent = text;
          }
        }, 0);
        // Restore the form if navigation was cancelled or the browser stayed on this page.
        window.setTimeout(reset, 15000);
      });
    }
  });
})();
