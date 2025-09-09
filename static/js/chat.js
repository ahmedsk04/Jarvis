// Morph Chat (zoom morph), space types in textarea, follows HTML 'dark' class
(function () {
  const DURATION = 800; // keep in sync with CSS
  const API_PATH = "/chat-to-colab"; // proxy to Colab (server forwards secret)

  // Ensure portal exists
  let portal = document.querySelector('.morph-portal');
  if (!portal) {
    portal = document.createElement('div');
    portal.className = 'morph-portal';
    document.body.appendChild(portal);
  }

  // Theme sync: your site uses <html class="dark"> (Tailwind darkMode:'class')
  const htmlEl = document.documentElement; // <html> carries 'dark' class in your setup
  function applyPortalTheme() {
    const isDark = htmlEl.classList.contains('dark'); // dark present => dark mode
    portal.classList.toggle('light', !isDark);        // light when 'dark' absent
  }
  // Initial + react to changes
  applyPortalTheme();
  new MutationObserver(applyPortalTheme).observe(htmlEl, { attributes: true, attributeFilter: ['class'] });

  // Backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'mc-backdrop';
  portal.appendChild(backdrop);

  // Launcher + dialog
  const shell = document.createElement('div');
  shell.id = 'morphChat';
  shell.role = 'button';
  shell.tabIndex = 0;
  shell.setAttribute('aria-label', 'Open chat');
  shell.setAttribute('aria-expanded', 'false');
  shell.innerHTML = `
    <span class="iconWrap">
      <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 4c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v11c0 1.1-.9 2-2 2H9l-5 4V4z" fill="#fff"/>
      </svg>
      <span class="hint">Let’s Talk</span>
    </span>
    <div class="content" role="dialog" aria-modal="false" aria-label="Chat dialog">
      <div class="mc-hdr">
        <div>Chat</div>
        <div class="mc-actions"><button class="mc-close" aria-label="Close">✕</button></div>
      </div>
      <div class="mc-body" id="mc-msgs"></div>
      <form class="mc-input" id="mc-form">
        <textarea id="mc-text" placeholder="Type a message" aria-label="Message"></textarea>
        <button type="submit" class="mc-send">Send</button>
      </form>
    </div>
  `;
  portal.appendChild(shell);

  // Refs
  const content = shell.querySelector('.content');
  const closeBtn = shell.querySelector('.mc-close');
  const msgs = shell.querySelector('#mc-msgs');
  const form = shell.querySelector('#mc-form');
  const input = shell.querySelector('#mc-text');
  const sendBtn = shell.querySelector('.mc-send');

  // Helpers
  function wipeMessages() {
    msgs.style.opacity = '0';
    setTimeout(() => { msgs.innerHTML = ''; msgs.style.opacity = ''; }, 150);
  }

  let isAnimating = false;

  function openChat() {
    if (isAnimating || shell.classList.contains('open')) return;
    isAnimating = true;
    backdrop.classList.add('show');
    shell.classList.add('zooming-in');
    requestAnimationFrame(() => {
      shell.classList.add('open');
      shell.setAttribute('aria-expanded', 'true');
      setTimeout(() => { shell.classList.remove('zooming-in'); isAnimating = false; }, DURATION);
    });
    setTimeout(() => input?.focus({ preventScroll: true }), DURATION / 2);
  }
  function closeChat() {
    if (isAnimating || !shell.classList.contains('open')) return;
    isAnimating = true;
    shell.classList.add('zooming-out');
    requestAnimationFrame(() => {
      shell.classList.remove('open');
      shell.setAttribute('aria-expanded', 'false');
      setTimeout(() => {
        shell.classList.remove('zooming-out');
        backdrop.classList.remove('show');
        isAnimating = false;
        wipeMessages();
        try { shell.focus({ preventScroll: true }); } catch(_) {}
      }, DURATION);
    });
  }

  // Click toggle (ignore clicks inside dialog)
  shell.addEventListener('click', (e) => {
    const isOpen = shell.classList.contains('open');
    if (isOpen && content.contains(e.target)) return;
    isOpen ? closeChat() : openChat();
  });

  // Keyboard (only when launcher has focus)
  shell.addEventListener('keydown', (e) => {
    const isOpen = shell.classList.contains('open');
    if (e.target !== shell) return;          // don't interfere with textarea/input
    if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
      e.preventDefault();                    // prevent native "button" activation
      if (!isOpen) openChat();               // open when closed
    }
  });

  // Backdrop & close button
  backdrop.addEventListener('click', closeChat);
  closeBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeChat(); });

  // Global keys: Esc closes; Enter submits while typing; Space in inputs untouched
  document.addEventListener('keydown', (e) => {
    const isOpen = shell.classList.contains('open');
    const inField = e.target === input || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT';
    if (e.key === 'Escape' && isOpen) { e.preventDefault(); closeChat(); }
    if (inField && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });

  // Auto-resize textarea
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(120, input.scrollHeight) + 'px';
  });

  // Network / UI helpers
  function addMsg(kind, text, meta) {
    const el = document.createElement('div');
    el.className = 'mc-msg ' + (kind === 'me' ? 'me' : 'bot');
    if (meta && meta.isError) {
      el.style.opacity = '0.9';
      el.style.background = 'rgba(255,80,80,0.08)';
      el.style.borderColor = 'rgba(255,80,80,0.18)';
    }
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function addTyping() {
    const el = document.createElement('div');
    el.className = 'mc-msg bot typing';
    el.dataset.typing = '1';
    el.innerHTML = 'Jarvis is typing<span class="dots">...</span>';
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  function removeTyping(el) {
    if (!el) return;
    try { el.remove(); } catch(_) {}
  }

  // POST helper with timeout + retry
  async function postJSON(url, body, opts = {}) {
    const timeout = opts.timeout ?? 60000;
    const maxRetries = opts.retries ?? 1;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const r = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(id);
        if (!r.ok) {
          const txt = await r.text().catch(() => '');
          throw new Error(`HTTP ${r.status}: ${txt || r.statusText}`);
        }
        return await r.json();
      } catch (err) {
        if (attempt === maxRetries) throw err;
        // small backoff
        await new Promise(res => setTimeout(res, 500 * (attempt + 1)));
      }
    }
  }

  let pending = false;

  // Submit handler -> call backend -> show response
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (pending) return; // debounce concurrent submissions
    const text = (input.value || '').trim();
    if (!text) return;
    // Add user message
    addMsg('me', text);
    input.value = '';
    input.dispatchEvent(new Event('input'));

    // Add typing indicator
    const typingEl = addTyping();
    pending = true;
    sendBtn.disabled = true;

    try {
      const body = { prompt: text };
      const resp = await postJSON(API_PATH, body, { timeout: 80000, retries: 1 });
      // expected resp: { result: "...", took_seconds: 0.2 } or similar
      let out = '';
      if (resp == null) {
        out = 'No response from server.';
      } else if (typeof resp === 'string') {
        out = resp;
      } else if (resp.result) {
        out = resp.result;
      } else {
        out = JSON.stringify(resp);
      }
      removeTyping(typingEl);
      addMsg('bot', out);
    } catch (err) {
      removeTyping(typingEl);
      console.error('Chat request failed', err);
      addMsg('bot', 'Error: failed to contact chat server. Try again later.', { isError: true });
    } finally {
      pending = false;
      sendBtn.disabled = false;
    }
  });

  // Demo: expose API so other buttons can open the chat
  window.morphChat = {
    open: openChat,
    close: closeChat,
    setTheme: (mode) => {
      if (mode === 'light') { portal.classList.add('light'); return; }
      if (mode === 'dark')  { portal.classList.remove('light'); return; }
      applyPortalTheme();
    }
  };

  // If there's a "chat with jarvis" button somewhere, auto-bind it:
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('[data-chat="jarvis"], #chat-with-jarvis, .chat-with-jarvis');
    if (btn) btn.addEventListener('click', (ev) => { ev.preventDefault(); window.morphChat.open(); });
  });
})();
