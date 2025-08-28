// ポップアップのJavaScript
// 設定の管理と統計の表示

class PopupManager {
  constructor() {
    this.settings = {};
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
    this.loadStats();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['ghostSearchSettings']);
      this.settings = result.ghostSearchSettings || {
        enabled: true,
        autoHide: true,
        searchEngine: 'google',
        theme: 'auto'
      };
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error);
      this.settings = {
        enabled: true,
        autoHide: true,
        searchEngine: 'google',
        theme: 'auto'
      };
    }
  }

  setupEventListeners() {
    // 設定の変更を監視
    document.getElementById('enabled-toggle').addEventListener('change', (e) => {
      this.settings.enabled = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('auto-hide-toggle').addEventListener('change', (e) => {
      this.settings.autoHide = e.target.checked;
      this.saveSettings();
    });

    document.getElementById('search-engine-select').addEventListener('change', (e) => {
      this.settings.searchEngine = e.target.value;
      this.saveSettings();
    });

    document.getElementById('theme-select').addEventListener('change', (e) => {
      this.settings.theme = e.target.value;
      this.saveSettings();
      this.applyTheme();
    });

    // フッターボタンのイベント
    document.getElementById('reset-stats').addEventListener('click', () => {
      this.resetStats();
    });

    document.getElementById('export-settings').addEventListener('click', () => {
      this.exportSettings();
    });
  }

  updateUI() {
    // 設定値をUIに反映
    document.getElementById('enabled-toggle').checked = this.settings.enabled;
    document.getElementById('auto-hide-toggle').checked = this.settings.autoHide;
    document.getElementById('search-engine-select').value = this.settings.searchEngine;
    document.getElementById('theme-select').value = this.settings.theme;

    // テーマの適用
    this.applyTheme();
  }

  applyTheme() {
    const body = document.body;
    const container = document.querySelector('.popup-container');

    // 既存のテーマクラスを削除
    body.classList.remove('theme-light', 'theme-dark');
    container.classList.remove('theme-light', 'theme-dark');

    if (this.settings.theme === 'auto') {
      // システムの設定に従う
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        body.classList.add('theme-dark');
        container.classList.add('theme-dark');
      } else {
        body.classList.add('theme-light');
        container.classList.add('theme-light');
      }
    } else {
      // 手動設定
      body.classList.add(`theme-${this.settings.theme}`);
      container.classList.add(`theme-${this.settings.theme}`);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.sync.set({
        ghostSearchSettings: this.settings
      });
      
      // アクティブタブに設定変更を通知
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, {
          action: 'settingsUpdated',
          settings: this.settings
        }).catch(() => {
          // メッセージの送信に失敗した場合（タブが読み込まれていないなど）は無視
        });
      }
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
    }
  }

  async loadStats() {
    try {
      const result = await chrome.storage.sync.get(['ghostStats']);
      const stats = result.ghostStats || {
        totalSearches: 0,
        totalAdditions: 0
      };

      document.getElementById('total-searches').textContent = stats.totalSearches;
      document.getElementById('total-additions').textContent = stats.totalAdditions;
    } catch (error) {
      console.error('統計の読み込みに失敗しました:', error);
    }
  }

  async resetStats() {
    if (confirm('統計をリセットしますか？この操作は元に戻せません。')) {
      try {
        await chrome.storage.sync.set({
          ghostStats: {
            totalSearches: 0,
            totalAdditions: 0
          }
        });
        
        document.getElementById('total-searches').textContent = '0';
        document.getElementById('total-additions').textContent = '0';
        
        // 成功メッセージ
        this.showNotification('統計をリセットしました');
      } catch (error) {
        console.error('統計のリセットに失敗しました:', error);
        this.showNotification('統計のリセットに失敗しました', 'error');
      }
    }
  }

  async exportSettings() {
    try {
      const exportData = {
        settings: this.settings,
        exportDate: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ghost-search-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      this.showNotification('設定をエクスポートしました');
    } catch (error) {
      console.error('設定のエクスポートに失敗しました:', error);
      this.showNotification('設定のエクスポートに失敗しました', 'error');
    }
  }

  showNotification(message, type = 'success') {
    // シンプルな通知を表示
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // スタイルの適用
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 20px',
      borderRadius: '6px',
      color: 'white',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: '10000',
      animation: 'slideIn 0.3s ease-out',
      backgroundColor: type === 'success' ? '#34a853' : '#ea4335'
    });

    document.body.appendChild(notification);

    // 3秒後に自動削除
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// アニメーション用のCSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ポップアップの初期化
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
