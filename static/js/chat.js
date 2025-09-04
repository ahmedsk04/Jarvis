// Morph Chat + Jarvis integration (FastAPI /generate; training format: "User: ...\nAssistant:")
(function () {
  const DURATION = 800; // keep in sync with CSS

  // ---------- Portal + Theme sync ----------
  let portal = document.querySelector('.morph-portal');
  if (!portal) {
    portal = document.createElement('div');
    portal.className = 'morph-portal';
    document.body.appendChild(portal);
  }
  const htmlEl = document.documentElement;
  function applyPortalTheme() {
    const isDark = htmlEl.classList.contains('dark');
    portal.classList.toggle('light', !isDark);
  }
  applyPortalTheme();
  new MutationObserver(applyPortalTheme).observe(htmlEl, { attributes: true, attributeFilter: ['class'] });

  // ---------- Backdrop + Shell ----------
  const backdrop = document.createElement('div');
  backdrop.className = 'mc-backdrop';
  portal.appendChild(backdrop);

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
        <div>Jarvis</div>
        <div class="mc-actions"><button class="mc-close" aria-label="Close">✕</button></div>
      </div>
      <div class="mc-body" id="mc-msgs"></div>
      <form class="mc-input" id="mc-form">
        <textarea id="mc-text" placeholder="Type a message"></textarea>
        <button type="submit" class="mc-send">Send</button>
      </form>
    </div>
  `;
  portal.appendChild(shell);

  // ---------- Refs ----------
  const content = shell.querySelector('.content');
  const closeBtn = shell.querySelector('.mc-close');
  const msgs = shell.querySelector('#mc-msgs');
  const form = shell.querySelector('#mc-form');
  const input = shell.querySelector('#mc-text');

  // ---------- State (history in role/content to match server) ----------
  /** @type {{role:'user'|'assistant', content:string}[]} */
  const history = [];

  // ---------- Helpers ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function wipeMessages() {
    msgs.style.opacity = '0';
    setTimeout(() => { msgs.innerHTML = ''; msgs.style.opacity = ''; }, 150);
    history.length = 0;
  }
  function addMsg(kind, text) {
    const el = document.createElement('div');
    el.className = 'mc-msg ' + (kind === 'me' ? 'me' : 'bot');
    el.innerHTML = escapeHtml(text);
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }
  function setTyping(on) {
    const id = 'mc-typing';
    let el = document.getElementById(id);
    if (on) {
      if (!el) {
        el = document.createElement('div');
        el.id = id;
        el.className = 'mc-msg bot';
        el.innerHTML = `<span class="typing-dots">typing…</span>`;
        msgs.appendChild(el);
        msgs.scrollTop = msgs.scrollHeight;
      }
    } else {
      el && el.remove();
    }
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

    // Welcome on first open
    if (!msgs.querySelector('.mc-msg')) {
      addMsg('bot', "Hi! I’m Jarvis. Ask me anything about Ahmed’s work or general AI/ML.");
    }
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
        // keep history/messages after close; wipe only on long press if you want
      }, DURATION);
    });
  }

  // ---------- Interactions ----------
  shell.addEventListener('click', (e) => {
    const isOpen = shell.classList.contains('open');
    if (isOpen && content.contains(e.target)) return; // clicks inside dialog do nothing
    isOpen ? closeChat() : openChat();
  });
  shell.addEventListener('keydown', (e) => {
    const isOpen = shell.classList.contains('open');
    if (e.target !== shell) return;
    if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (!isOpen) openChat();
    }
  });
  backdrop.addEventListener('click', closeChat);
  closeBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); closeChat(); });

  // Global keys
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

  // ---------- Server call ----------
  async function sendToServer(historyArr) {
    // Backend /generate expects { messages: [{role, content}, ...] }
    const res = await fetch('/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: historyArr })
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
    }
    return res.json(); // {output} OR {status:"loading", estimated_time}
  }

  // ---------- Submit ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = (input.value || '').trim();
    if (!text) return;

    addMsg('me', text);
    history.push({ role: 'user', content: text });
    input.value = '';
    input.dispatchEvent(new Event('input'));

    setTyping(true);
    try {
      let data = await sendToServer(history);

      // Handle HF cold start (503) returning estimated_time
      if (data && data.status === 'loading') {
        const delay = Math.min(8000, Math.ceil((data.estimated_time || 3) * 1000));
        await new Promise(r => setTimeout(r, delay));
        data = await sendToServer(history);
      }

      const reply = (data && data.output) ? String(data.output) : '…';
      setTyping(false);
      addMsg('bot', reply);
      history.push({ role: 'assistant', content: reply });
    } catch (err) {
      setTyping(false);
      addMsg('bot', 'Error: ' + (err?.message || 'Something went wrong'));
    }
  });

  // ---------- Optional public API ----------
  window.morphChat = {
    open: openChat,
    close: closeChat,
    clear: () => { wipeMessages(); },
    setTheme: (mode) => {
      if (mode === 'light') { portal.classList.add('light'); return; }
      if (mode === 'dark')  { portal.classList.remove('light'); return; }
      applyPortalTheme();
    }
  };
})();
