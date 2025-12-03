// app.js — shared wiring for home, chat, profile, settings, history
(function () {
  // --- Shared helpers ---
  window.Vidate = {
    go(path) { window.location.href = path; },
    saveSettings(obj) { localStorage.setItem('vidate.settings', JSON.stringify(obj)); },
    loadSettings() { try { return JSON.parse(localStorage.getItem('vidate.settings')) || {}; } catch(e){ return {}; } },
    saveConversations(list) { localStorage.setItem('vidate.conversations', JSON.stringify(list)); },
    loadConversations() { try { return JSON.parse(localStorage.getItem('vidate.conversations')) || []; } catch(e){ return []; } },
    openConversation(conv) { localStorage.setItem('vidate.openConversation', JSON.stringify(conv)); },
    saveProfile(obj) { localStorage.setItem('vidate.profile', JSON.stringify(obj)); },
    loadProfile() { try { return JSON.parse(localStorage.getItem('vidate.profile')) || {}; } catch(e){ return {}; } }
  };

  // Utility: safe query
  function $id(id) { return document.getElementById(id); }
  function on(el, ev, fn) { if (!el) return; el.addEventListener(ev, fn); }

  // --- Generic nav wiring used across pages ---
  function wireNav(map) {
    Object.keys(map).forEach(id => {
      const el = $id(id);
      if (!el) return;
      on(el, 'click', (e) => {
        e.preventDefault();
        Vidate.go(map[id]);
      });
    });
  }

  // --- Home page wiring ---
  function initHome() {
    const start = document.querySelector('.start-box');
    if (start) on(start, 'click', () => Vidate.go('index.html'));

    const map = {
      'nav-profile': 'profile.html',
      'nav-history': 'history.html',
      'nav-settings': 'settings.html',
      'nav-about': 'about.html',
      'nav-home': 'home.html'
    };
    wireNav(map);
  }

  // --- Chat page wiring ---
  function initChat() {
    const navMap = {
      'nav-home': 'home.html',
      'nav-profile': 'profile.html',
      'nav-history': 'history.html',
      'nav-settings': 'settings.html'
    };
    wireNav(navMap);

    // If history opened a conversation, show a small note
    try {
      const raw = localStorage.getItem('vidate.openConversation');
      if (raw) {
        const conv = JSON.parse(raw);
        const chat = document.getElementById('chat');
        if (chat && conv && conv.name) {
          const note = document.createElement('div');
          note.className = 'msg';
          note.innerHTML = `<div class="avatar">V</div><div class="bubble">Opened conversation: ${conv.name}</div>`;
          chat.insertBefore(note, chat.firstChild);
        }
      }
    } catch (e) { /* ignore */ }
    localStorage.removeItem('vidate.openConversation');

    // When sending a message, add a short snippet to history
    const composer = document.getElementById('composer');
    if (composer) {
      composer.addEventListener('submit', () => {
        setTimeout(() => {
          try {
            const convs = Vidate.loadConversations();
            // find last outgoing bubble text as snippet
            const meBubble = document.querySelector('.bubble.me:last-of-type') || document.querySelector('.bubble.me');
            const snippet = meBubble ? (meBubble.textContent || '').slice(0, 120) : 'New message';
            const now = new Date().toLocaleString();
            const conv = { id: 'c' + Date.now(), name: 'Recent Chat', avatar: 'C', time: now, snippet };
            convs.unshift(conv);
            Vidate.saveConversations(convs);
          } catch (e) { /* ignore */ }
        }, 200);
      });
    }

    // quick nav buttons if present
    on($id('btn-invite'), 'click', () => alert('Invite link copied (demo)'));
    on($id('btn-menu'), 'click', () => alert('Open menu (demo)'));
    on($id('btn-attach'), 'click', () => alert('Attach (demo)'));
  }

  // --- Profile page wiring ---
  function initProfile() {
    const navMap = { 'btn-home':'home.html', 'btn-history':'history.html', 'btn-settings':'settings.html', 'nav-home':'home.html', 'nav-profile':'profile.html' };
    wireNav(navMap);

    // load saved profile
    const profile = Vidate.loadProfile();
    if (profile) {
      if (profile.avatar && $id('avatarPreview')) $id('avatarPreview').textContent = profile.avatar;
      if (profile.name && $id('displayName')) $id('displayName').textContent = profile.name.toUpperCase();
      if (profile.handle && $id('displayHandle')) $id('displayHandle').textContent = profile.handle;
      if (profile.bio && $id('bioText')) $id('bioText').textContent = profile.bio;
    }

    // avatar options
    const options = Array.from(document.querySelectorAll('.avatar-option'));
    const avatarPreview = $id('avatarPreview');
    if (options.length && avatarPreview) {
      // mark active if matches saved
      options.forEach(btn => {
        const savedAvatar = profile.avatar;
        if (savedAvatar && btn.dataset && btn.dataset.avatar === savedAvatar) btn.classList.add('active');
      });
      // ensure preview shows something
      if (!avatarPreview.textContent) avatarPreview.textContent = (options[0] && options[0].dataset.avatar) || 'V';

      options.forEach(btn => {
        on(btn, 'click', () => {
          options.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          avatarPreview.textContent = btn.dataset.avatar;
          // persist profile snippet
          const p = {
            avatar: avatarPreview.textContent,
            name: ($id('displayName') && $id('displayName').textContent) || '',
            handle: ($id('displayHandle') && $id('displayHandle').textContent) || '',
            bio: ($id('bioText') && $id('bioText').textContent) || ''
          };
          Vidate.saveProfile(p);
        });
      });
    }

    // Save edits if save button exists
    const saveBtn = $id('saveEdit') || $id('saveEditBtn');
    if (saveBtn) {
      on(saveBtn, 'click', () => {
        const p = {
          avatar: avatarPreview ? avatarPreview.textContent : '',
          name: ($id('nameInput') && $id('nameInput').value) || ($id('displayName') && $id('displayName').textContent) || '',
          handle: ($id('handleInput') && $id('handleInput').value) || ($id('displayHandle') && $id('displayHandle').textContent) || '',
          bio: ($id('bioInput') && $id('bioInput').value) || ($id('bioText') && $id('bioText').textContent) || ''
        };
        Vidate.saveProfile(p);
      });
    }

    // message button to chat
    on($id('messageBtn'), 'click', () => Vidate.go('index.html'));
  }

  // --- Settings page wiring ---
  function initSettings() {
    const navMap = { 'nav-home':'home.html', 'nav-chat':'index.html', 'nav-profile':'profile.html' };
    wireNav(navMap);

    // load settings into controls
    const s = Vidate.loadSettings();
    if (s) {
      if ($id('theme-select')) $id('theme-select').value = s.theme || 'dark';
      if ($id('tone-select')) $id('tone-select').value = s.tone || 'romantic';
      if ($id('model-select')) $id('model-select').value = s.model || 'v1';
      const setToggle = (id, on) => {
        const el = $id(id);
        if (!el) return;
        if (on) el.classList.add('on'); else el.classList.remove('on');
        el.setAttribute('aria-checked', on ? 'true' : 'false');
      };
      setToggle('toggle-drafts', !!s.drafts);
      setToggle('toggle-suggestions', !!s.suggestions);
      setToggle('toggle-push', !!s.push);
      setToggle('toggle-email', !!s.email);
    }

    // toggles keyboard and click
    Array.from(document.querySelectorAll('.toggle')).forEach(t => {
      on(t, 'click', () => {
        const onState = t.classList.toggle('on');
        t.setAttribute('aria-checked', onState ? 'true' : 'false');
      });
      on(t, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t.click(); }});
    });

    // save button
    on($id('save-settings'), 'click', () => {
      const settings = {
        theme: ($id('theme-select') && $id('theme-select').value) || 'dark',
        tone: ($id('tone-select') && $id('tone-select').value) || 'romantic',
        model: ($id('model-select') && $id('model-select').value) || 'v1',
        drafts: $id('toggle-drafts') && $id('toggle-drafts').classList.contains('on'),
        suggestions: $id('toggle-suggestions') && $id('toggle-suggestions').classList.contains('on'),
        push: $id('toggle-push') && $id('toggle-push').classList.contains('on'),
        email: $id('toggle-email') && $id('toggle-email').classList.contains('on')
      };
      Vidate.saveSettings(settings);
      const btn = $id('save-settings');
      if (btn) {
        const prev = btn.textContent;
        btn.textContent = 'Saved';
        setTimeout(()=> btn.textContent = prev || 'Save Changes', 1200);
      }
    });
  }

  // --- History page wiring ---
  function initHistory() {
    const navMap = { 'nav-home':'home.html', 'nav-chat':'index.html', 'nav-settings':'settings.html' };
    wireNav(navMap);

    // render conversations (if page has historyList)
    const listEl = $id('historyList');
    if (!listEl) return;

    function load() { return Vidate.loadConversations(); }
    function save(list) { Vidate.saveConversations(list); }

    function render(list) {
      listEl.innerHTML = '';
      if (!list || !list.length) {
        const empty = document.createElement('div');
        empty.className = 'empty';
        empty.textContent = 'No conversations yet. Start a new chat to see it here.';
        listEl.appendChild(empty);
        $id('count') && ($id('count').textContent = '0');
        return;
      }
      $id('count') && ($id('count').textContent = String(list.length));
      list.forEach(conv => {
        const el = document.createElement('div');
        el.className = 'conv';
        el.tabIndex = 0;
        el.innerHTML = `
          <div style="width:56px;display:flex;align-items:center;justify-content:center;">
            <div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(90deg,var(--vidate),#8b5cf6);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;">
              ${conv.avatar || 'V'}
            </div>
          </div>
          <div class="meta">
            <div class="title-row">
              <div class="name">${conv.name}</div>
              <div class="time">${conv.time}</div>
            </div>
            <div class="snippet">${conv.snippet}</div>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="btn ghost open-btn">Open</button>
            <button class="btn ghost del-btn">Delete</button>
          </div>
        `;
        // open
        on(el.querySelector('.open-btn'), 'click', () => {
          Vidate.openConversation(conv);
          Vidate.go('index.html');
        });
        // delete
        on(el.querySelector('.del-btn'), 'click', () => {
          const remaining = load().filter(c => c.id !== conv.id);
          save(remaining);
          render(remaining);
        });
        listEl.appendChild(el);
      });
    }

    // new conversation
    on($id('new-conv'), 'click', () => {
      const list = load();
      const id = 'c' + Date.now();
      const conv = { id, name: 'New Chat', avatar: 'N', time: 'now', snippet: 'Start of a new conversation' };
      list.unshift(conv);
      save(list);
      render(list);
    });

    // delete all
    on($id('delete-all'), 'click', () => {
      if (!confirm('Delete all conversations? This is a demo action.')) return;
      localStorage.removeItem('vidate.conversations');
      render([]);
    });

    // search
    const searchInput = $id('search');
    if (searchInput) {
      on(searchInput, 'input', () => {
        const q = searchInput.value.trim().toLowerCase();
        const all = load();
        if (!q) return render(all);
        const filtered = all.filter(c => (c.name + ' ' + c.snippet).toLowerCase().includes(q));
        render(filtered);
      });
      on($id('clear-search'), 'click', () => { if (searchInput) searchInput.value = ''; render(load()); });
    }

    // initialize demo data if empty
    let initial = load();
    if (!initial || !initial.length) {
      initial = [
        { id: 'c1', name: 'Asha', avatar: 'A', time: '2h ago', snippet: 'Loved your last message — keep it light!' },
        { id: 'c2', name: 'Ravi', avatar: 'R', time: 'Yesterday', snippet: 'Wanna grab coffee this weekend?' },
        { id: 'c3', name: 'Maya', avatar: 'M', time: '2 days', snippet: 'Haha that made me laugh — tell me more.' }
      ];
      save(initial);
    }
    render(initial);
  }

  // --- Auto-detect page and initialize relevant wiring ---
  document.addEventListener('DOMContentLoaded', () => {
    const path = (location.pathname || '').split('/').pop().toLowerCase();
    // map common names to functions
    if (path === '' || path === 'home.html' || path === 'home') initHome();
    if (path === 'index.html' || path === 'index' || path === 'chat.html') initChat();
    if (path === 'profile.html' || path === 'profile') initProfile();
    if (path === 'settings.html' || path === 'settings') initSettings();
    if (path === 'history.html' || path === 'history' || path === 'conversations.html') initHistory();

    // also wire generic nav ids if present on any page
    wireNav({
      'nav-home':'home.html',
      'nav-chat':'index.html',
      'nav-profile':'profile.html',
      'nav-history':'history.html',
      'nav-settings':'settings.html'
    });

    // load profile into any avatar preview on any page
    try {
      const p = Vidate.loadProfile();
      if (p && p.avatar) {
        const preview = document.querySelectorAll('#avatarPreview, .avatar-preview, .avatar');
        preview.forEach(el => { if (el && el.textContent) el.textContent = p.avatar; });
      }
    } catch(e){}
  });
})();// viDate — Shared app logic and navigation
// Wires all pages together via localStorage and nav links

const Vidate = {
  // ===== CONFIG =====
  pages: {
    home: 'home.html',
    chat: 'index.html',
    profile: 'profile.html',
    settings: 'settings.html',
    history: 'history.html',
    about: 'about.html'
  },

  // ===== PROFILE =====
  saveProfile(data) {
    localStorage.setItem('vidate_profile', JSON.stringify(data));
  },

  loadProfile() {
    const stored = localStorage.getItem('vidate_profile');
    return stored ? JSON.parse(stored) : this.defaultProfile();
  },

  defaultProfile() {
    return {
      name: 'CHIDROOP',
      handle: '@chidroop',
      bio: 'I help craft messages that feel human. Lover of clean UI and honest conversations.',
      email: 'chidroop@example.com',
      phone: '+91 98xxxxxx',
      location: 'Sriperumbudur, TN',
      pronouns: 'He / Him',
      avatar: 'CH'
    };
  },

  // ===== CONVERSATIONS =====
  saveConversations(conversations) {
    localStorage.setItem('vidate_conversations', JSON.stringify(conversations));
  },

  loadConversations() {
    const stored = localStorage.getItem('vidate_conversations');
    return stored ? JSON.parse(stored) : [];
  },

  addConversation(conversationObj) {
    const conversations = this.loadConversations();
    conversations.unshift({
      id: Date.now(),
      name: conversationObj.name || 'New Chat',
      lastMessage: conversationObj.lastMessage || 'Started conversation',
      timestamp: new Date().toLocaleString(),
      messages: conversationObj.messages || []
    });
    this.saveConversations(conversations);
  },

  // ===== SETTINGS =====
  saveSettings(settings) {
    localStorage.setItem('vidate_settings', JSON.stringify(settings));
  },

  loadSettings() {
    const stored = localStorage.getItem('vidate_settings');
    return stored ? JSON.parse(stored) : this.defaultSettings();
  },

  defaultSettings() {
    return {
      tone: 'Romantic',
      emojiUsage: 'Often',
      model: 'Vidate-AI v1',
      notifications: true,
      soundAlerts: false,
      emailDigest: true,
      onlineStatus: true,
      suggestions: true,
      conversationHistory: true
    };
  },

  // ===== NAVIGATION =====
  go(page) {
    if (this.pages[page]) {
      window.location.href = this.pages[page];
    }
  }
};

// ===== INIT ON ALL PAGES =====
document.addEventListener('DOMContentLoaded', () => {
  // Wire navigation
  wireNav();

  // Init page-specific logic
  const currentPage = getCurrentPage();
  if (currentPage === 'home.html' || !currentPage) {
    initHome();
  } else if (currentPage === 'index.html') {
    initChat();
  } else if (currentPage === 'profile.html') {
    initProfile();
  } else if (currentPage === 'settings.html') {
    initSettings();
  } else if (currentPage === 'history.html') {
    initHistory();
  }
});

// Get current page name
function getCurrentPage() {
  const path = window.location.pathname;
  const lastSlash = path.lastIndexOf('/');
  return path.substring(lastSlash + 1) || 'home.html';
}

// ===== UNIVERSAL NAV WIRING =====
function wireNav() {
  // Home
  const navHome = document.getElementById('nav-home');
  if (navHome) navHome.addEventListener('click', () => Vidate.go('home'));

  // Chat
  const navChat = document.getElementById('nav-chat');
  if (navChat) navChat.addEventListener('click', () => Vidate.go('chat'));

  // Profile
  const navProfile = document.getElementById('nav-profile');
  if (navProfile) navProfile.addEventListener('click', () => Vidate.go('profile'));

  // History
  const navHistory = document.getElementById('nav-history');
  if (navHistory) navHistory.addEventListener('click', () => Vidate.go('history'));

  // Settings
  const navSettings = document.getElementById('nav-settings');
  if (navSettings) navSettings.addEventListener('click', () => Vidate.go('settings'));

  // About
  const navAbout = document.getElementById('nav-about');
  if (navAbout) navAbout.addEventListener('click', () => Vidate.go('about'));
}

// ===== HOME PAGE INIT =====
function initHome() {
  const startBox = document.querySelector('.start-box');
  if (startBox) {
    startBox.addEventListener('click', () => Vidate.go('chat'));
  }
}

// ===== CHAT PAGE INIT =====
function initChat() {
  // Chat-specific logic already in index.html
  // This is here for future enhancements (e.g., load saved conversations)
}

// ===== PROFILE PAGE INIT =====
function initProfile() {
  const profile = Vidate.loadProfile();

  // Load profile data into form/display
  const displayName = document.getElementById('displayName');
  const displayHandle = document.getElementById('displayHandle');
  const bioText = document.getElementById('bioText');

  if (displayName) displayName.textContent = profile.name;
  if (displayHandle) displayHandle.textContent = profile.handle;
  if (bioText) bioText.textContent = profile.bio;

  // Save button
  const saveEdit = document.getElementById('saveEdit');
  if (saveEdit) {
    saveEdit.addEventListener('click', () => {
      const name = document.getElementById('nameInput')?.value || profile.name;
      const handle = document.getElementById('handleInput')?.value || profile.handle;
      const bio = document.getElementById('bioInput')?.value || profile.bio;

      Vidate.saveProfile({
        ...profile,
        name: name.toUpperCase(),
        handle: handle,
        bio: bio
      });
    });
  }
}

// ===== SETTINGS PAGE INIT =====
function initSettings() {
  const settings = Vidate.loadSettings();

  // Load settings into controls
  const tonePref = document.getElementById('tonePref');
  if (tonePref) tonePref.value = settings.tone;

  const emojiPref = document.getElementById('emojiPref');
  if (emojiPref) emojiPref.value = settings.emojiUsage;

  const modelPref = document.getElementById('modelPref');
  if (modelPref) modelPref.value = settings.model;

  // Toggles
  const toggles = {
    'toggleNotif': settings.notifications,
    'toggleSound': settings.soundAlerts,
    'toggleEmail': settings.emailDigest,
    'toggleOnline': settings.onlineStatus,
    'toggleSuggest': settings.suggestions,
    'toggleHistory': settings.conversationHistory
  };

  Object.entries(toggles).forEach(([id, isActive]) => {
    const toggle = document.getElementById(id);
    if (toggle) {
      if (isActive) toggle.classList.add('active');
      toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
      });
    }
  });

  // Save button
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const newSettings = {
        tone: tonePref?.value || settings.tone,
        emojiUsage: emojiPref?.value || settings.emojiUsage,
        model: modelPref?.value || settings.model,
        notifications: document.getElementById('toggleNotif')?.classList.contains('active'),
        soundAlerts: document.getElementById('toggleSound')?.classList.contains('active'),
        emailDigest: document.getElementById('toggleEmail')?.classList.contains('active'),
        onlineStatus: document.getElementById('toggleOnline')?.classList.contains('active'),
        suggestions: document.getElementById('toggleSuggest')?.classList.contains('active'),
        conversationHistory: document.getElementById('toggleHistory')?.classList.contains('active')
      };
      Vidate.saveSettings(newSettings);
      alert('Settings saved (demo)');
    });
  }
}

// ===== HISTORY PAGE INIT =====
function initHistory() {
  const historyList = document.getElementById('historyList');
  const searchInput = document.getElementById('search');
  const countEl = document.getElementById('count');

  function renderHistory(filter = '') {
    const conversations = Vidate.loadConversations();
    const filtered = conversations.filter(conv =>
      conv.name.toLowerCase().includes(filter.toLowerCase())
    );

    historyList.innerHTML = '';
    if (filtered.length === 0) {
      historyList.innerHTML = '<div class="empty">No conversations yet. Start chatting!</div>';
      if (countEl) countEl.textContent = '0';
      return;
    }

    filtered.forEach(conv => {
      const item = document.createElement('div');
      item.className = 'conv';
      item.innerHTML = `
        <div class="meta">
          <div class="title-row">
            <div class="name">${conv.name}</div>
            <div class="time">${new Date(conv.timestamp).toLocaleString()}</div>
          </div>
          <div class="snippet">${conv.lastMessage || 'No messages'}</div>
        </div>
      `;
      item.addEventListener('click', () => {
        // Open conversation (future: load chat with this conversation's messages)
        Vidate.go('chat');
      });
      historyList.appendChild(item);
    });

    if (countEl) countEl.textContent = filtered.length;
  }

  // Initial render
  renderHistory();

  // Search
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderHistory(e.target.value);
    });
  }

  // Clear search
  const clearSearch = document.getElementById('clear-search');
  if (clearSearch) {
    clearSearch.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      renderHistory();
    });
  }

  // New conversation
  const newConvBtn = document.getElementById('new-conv');
  if (newConvBtn) {
    newConvBtn.addEventListener('click', () => {
      Vidate.go('chat');
    });
  }

  // Delete all
  const deleteAllBtn = document.getElementById('delete-all');
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener('click', () => {
      if (confirm('Delete all conversations? This cannot be undone.')) {
        Vidate.saveConversations([]);
        renderHistory();
      }
    });
  }
}
