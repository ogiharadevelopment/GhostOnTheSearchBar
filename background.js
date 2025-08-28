// バックグラウンドスクリプト
// 拡張機能のライフサイクル管理とメッセージ処理

// 拡張機能のインストール時の処理
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('GhostOnTheSearchBar がインストールされました');
    
    // デフォルト設定の初期化
    chrome.storage.sync.set({
      ghostSearchSettings: {
        enabled: true,
        autoHide: true,
        searchEngine: 'google',
        theme: 'auto'
      }
    });
  }
});

// メッセージの処理
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get(['ghostSearchSettings'], (result) => {
      sendResponse(result.ghostSearchSettings || {});
    });
    return true; // 非同期レスポンスを示す
  }
  
  if (request.action === 'updateSettings') {
    chrome.storage.sync.set({
      ghostSearchSettings: request.settings
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === 'performSearch') {
    // 新しいタブで検索を実行
    chrome.tabs.create({
      url: `https://www.google.com/search?q=${encodeURIComponent(request.query)}`
    });
    sendResponse({ success: true });
  }
});

// アクティブタブの変更を監視
chrome.tabs.onActivated.addListener((activeInfo) => {
  // 必要に応じてタブ固有の処理を実行
  console.log('アクティブタブが変更されました:', activeInfo.tabId);
});

// タブの更新を監視
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // ページの読み込み完了時の処理
    console.log('ページが読み込まれました:', tab.url);
  }
});
