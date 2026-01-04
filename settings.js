// 設定画面のJavaScript

// i18nヘルパー関数
function i18n(key) {
  if (typeof chrome !== 'undefined' && chrome.i18n) {
    return chrome.i18n.getMessage(key) || key;
  }
  return key;
}

// ページの多言語化
function localizePage() {
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n');
    const message = i18n(key);
    if (element.tagName === 'INPUT' && element.type === 'button') {
      element.value = message;
    } else {
      element.textContent = message;
    }
  });
  
  // タイトルも更新
  document.title = i18n('settingsTitle');
}

// 利用可能な検索エンジン・サイト一覧
const availableEngines = {
  'google': { name: 'Google', icon: '🔍', url: 'https://www.google.com/search?q={query}' },
  'bing': { name: 'Bing', icon: '🔎', url: 'https://www.bing.com/search?q={query}' },
  'yahoo': { name: 'Yahoo!', icon: '🌐', url: 'https://search.yahoo.com/search?p={query}' },
  'ecosia': { name: 'Ecosia', icon: '🌳', url: 'https://www.ecosia.org/search?q={query}' },
  'duckduckgo': { name: 'DuckDuckGo', icon: '🦆', url: 'https://duckduckgo.com/?q={query}' },
  'baidu': { name: 'Baidu', icon: '🔍', url: 'https://www.baidu.com/s?wd={query}' },
  'yandex': { name: 'YANDEX', icon: '🔎', url: 'https://yandex.com/search/?text={query}' },
  'naver': { name: 'Naver', icon: '🌐', url: 'https://search.naver.com/search.naver?query={query}' },
  'youtube': { name: 'YouTube', icon: '🎥', url: 'https://www.youtube.com/results?search_query={query}' },
  'wikipedia': { name: 'Wikipedia', icon: '📚', url: 'https://ja.wikipedia.org/wiki/Special:Search?search={query}' },
  'amazon': { name: 'Amazon', icon: '🛒', url: 'https://www.amazon.co.jp/s?k={query}' },
  'twitter': { name: 'Twitter', icon: '🐦', url: 'https://twitter.com/search?q={query}' },
  'reddit': { name: 'Reddit', icon: '🤖', url: 'https://www.reddit.com/search?q={query}' },
  'note': { name: 'note', icon: '📝', url: 'https://note.com/search?q={query}' },
  'quora': { name: 'Quora', icon: '💬', url: 'https://www.quora.com/search?q={query}' },
  'zenn': { name: 'Zenn', icon: '📖', url: 'https://zenn.dev/search?q={query}' },
  'pixiv': { name: 'Pixiv', icon: '🎨', url: 'https://www.pixiv.net/tags/{query}' },
  'chiebukuro': { name: 'Yahoo!知恵袋', icon: '💡', url: 'https://chiebukuro.yahoo.co.jp/search?p={query}' },
  'googlemaps': { name: 'Google Maps', icon: '🗺️', url: 'https://www.google.com/maps/search/{query}' },
  'github': { name: 'GitHub', icon: '💾', url: 'https://github.com/search?q={query}' },
  'stackoverflow': { name: 'Stack Overflow', icon: '💬', url: 'https://stackoverflow.com/search?q={query}' },
  'instagram': { name: 'Instagram', icon: '📷', url: 'https://www.instagram.com/explore/tags/{query}/' },
  'facebook': { name: 'Facebook', icon: '👤', url: 'https://www.facebook.com/search/top/?q={query}' },
  'bluesky': { name: 'Bluesky', icon: '☁️', url: 'https://bsky.app/search?q={query}' },
  'linkedin': { name: 'LinkedIn', icon: '💼', url: 'https://www.linkedin.com/search/results/all/?keywords={query}' },
  'pinterest': { name: 'Pinterest', icon: '📌', url: 'https://www.pinterest.com/search/pins/?q={query}' },
  'tiktok': { name: 'TikTok', icon: '🎵', url: 'https://www.tiktok.com/search?q={query}' },
  'mercari': { name: 'メルカリ', icon: '🛍️', url: 'https://www.mercari.com/jp/search/?keyword={query}' },
  'rakuten': { name: '楽天市場', icon: '🛒', url: 'https://search.rakuten.co.jp/search/mall/{query}/' },
  'cookpad': { name: 'クックパッド', icon: '🍳', url: 'https://cookpad.com/search/{query}' },
  'tabelog': { name: '食べログ', icon: '🍽️', url: 'https://tabelog.com/tokyo/rstLst/?vs=1&sa=&tid=&kw={query}' },
  'nicovideo': { name: 'ニコニコ動画', icon: '📺', url: 'https://www.nicovideo.jp/search/{query}' },
};

// 利用可能なキー
const availableKeys = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');

class SettingsManager {
  constructor() {
    this.currentShortcuts = {};
    this.init();
  }

  async init() {
    // ページの多言語化
    localizePage();
    
    await this.loadSettings();
    this.renderShortcuts();
    this.renderDefaultEngine();
    this.setupEventListeners();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['ghostSearchSettings', 'ghostKeyShortcuts']);
      
      // キーショートカット設定を読み込み
      if (result.ghostKeyShortcuts) {
        this.currentShortcuts = result.ghostKeyShortcuts;
      } else {
        // デフォルト設定
        this.currentShortcuts = {
          'y': 'youtube',
          'w': 'wikipedia',
          'g': 'google',
          'b': 'bing',
          'a': 'amazon',
          't': 'twitter',
          'r': 'reddit',
          'n': 'note',
          'q': 'quora',
          'z': 'zenn',
          'p': 'pixiv',
          'c': 'chiebukuro',
          'm': 'googlemaps',
          'h': 'github',
          's': 'stackoverflow',
          'i': 'instagram',
          'f': 'facebook',
          'u': 'bluesky',
          'e': 'ecosia'
        };
      }
      
      // その他の設定
      if (result.ghostSearchSettings) {
        document.getElementById('wheel-scroll-search-engine').value = result.ghostSearchSettings.wheelScrollSearchEngine || 'google';
        document.getElementById('enabled-toggle').checked = result.ghostSearchSettings.enabled !== false;
      } else {
        // デフォルト値
        document.getElementById('wheel-scroll-search-engine').value = 'google';
      }
    } catch (error) {
      console.error('設定の読み込みに失敗:', error);
    }
  }

  renderShortcuts() {
    const grid = document.getElementById('shortcuts-grid');
    grid.innerHTML = '';

    availableKeys.forEach(key => {
      const item = document.createElement('div');
      item.className = 'shortcut-item';
      
      const currentEngine = this.currentShortcuts[key] || '';
      
      item.innerHTML = `
        <span class="shortcut-key">${key.toUpperCase()}</span>
        <select class="shortcut-select" data-key="${key}">
          <option value="">${i18n('notSet')}</option>
          ${Object.entries(availableEngines).map(([id, engine]) => 
            `<option value="${id}" ${currentEngine === id ? 'selected' : ''}>${engine.icon} ${engine.name}</option>`
          ).join('')}
        </select>
      `;
      
      grid.appendChild(item);
    });
  }

  renderDefaultEngine() {
    // ホイールスクロール時の検索エンジン選択（8つの主要検索エンジンのみ）
    const wheelScrollSelect = document.getElementById('wheel-scroll-search-engine');
    wheelScrollSelect.innerHTML = `<option value="">${i18n('selectPlease')}</option>`;
    
    const wheelScrollEngines = ['google', 'bing', 'yahoo', 'ecosia', 'duckduckgo', 'baidu', 'yandex', 'naver'];
    wheelScrollEngines.forEach(id => {
      if (availableEngines[id]) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = `${availableEngines[id].icon} ${availableEngines[id].name}`;
        wheelScrollSelect.appendChild(option);
      }
    });
  }

  setupEventListeners() {
    // 保存ボタン
    document.getElementById('save-btn').addEventListener('click', () => {
      this.saveSettings();
    });
    
    // リセットボタン
    document.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm(i18n('resetConfirm'))) {
        this.resetSettings();
      }
    });
  }

  async saveSettings() {
    try {
      // キーショートカット設定を収集
      const shortcuts = {};
      document.querySelectorAll('.shortcut-select').forEach(select => {
        const key = select.dataset.key;
        const value = select.value;
        if (value) {
          shortcuts[key] = value;
        }
      });
      
      console.log('💾 Settings: 保存するキーショートカット設定:', shortcuts);
      console.log('💾 Settings: 保存するキーショートカット数:', Object.keys(shortcuts).length);
      
      const settings = {
        enabled: document.getElementById('enabled-toggle').checked,
        defaultSearchEngine: 'google', // 固定値（後方互換性のため）
        wheelScrollSearchEngine: document.getElementById('wheel-scroll-search-engine').value || 'google'
      };
      console.log('💾 Settings: 保存する設定:', settings);
      
      // 設定を保存
      await chrome.storage.sync.set({
        ghostKeyShortcuts: shortcuts,
        ghostSearchSettings: settings
      });
      
      console.log('💾 Settings: ストレージに保存完了');
      
      // すべてのタブに設定変更を通知（content scriptが読み込まれているタブのみ）
      const message = {
        action: 'settingsUpdated',
        shortcuts: shortcuts,
        settings: settings
      };
      console.log('💾 Settings: メッセージを送信:', message);
      
      const allTabs = await chrome.tabs.query({});
      console.log('💾 Settings: 全タブ数:', allTabs.length);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const tab of allTabs) {
        // 設定画面のタブは除外
        if (tab.url && tab.url.includes('settings.html')) {
          console.log(`💾 Settings: タブ ${tab.id} は設定画面のためスキップ`);
          continue;
        }
        
        try {
          await chrome.tabs.sendMessage(tab.id, message);
          successCount++;
          console.log(`💾 Settings: タブ ${tab.id} にメッセージ送信成功`);
        } catch (error) {
          failCount++;
          // メッセージ送信失敗は無視（content scriptが読み込まれていないタブなど）
          console.log(`💾 Settings: タブ ${tab.id} へのメッセージ送信失敗（無視）:`, error.message);
        }
      }
      
      console.log(`💾 Settings: メッセージ送信完了 - 成功: ${successCount}, 失敗: ${failCount}`);
      
      alert(i18n('settingsSaved'));
    } catch (error) {
      console.error('設定の保存に失敗:', error);
      alert(i18n('settingsSaveFailed'));
    }
  }

  async resetSettings() {
    try {
      await chrome.storage.sync.remove(['ghostKeyShortcuts']);
      this.currentShortcuts = {};
      this.renderShortcuts();
      document.getElementById('wheel-scroll-search-engine').value = 'google';
      document.getElementById('enabled-toggle').checked = true;
      alert(i18n('settingsReset'));
    } catch (error) {
      console.error('設定のリセットに失敗:', error);
      alert(i18n('settingsResetFailed'));
    }
  }
}

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  new SettingsManager();
});

