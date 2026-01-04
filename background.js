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
        theme: 'auto',
        defaultSearchEngine: 'google'
      }
    });
  }
});

// アイコンクリック時の処理
chrome.action.onClicked.addListener(async (tab) => {
  // 現在のタブにメッセージを送信して検索バーの表示状態を確認
  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'checkSearchBarVisibility'
    });
    
    // 検索バーが表示されていない場合は検索バーを表示
    if (response && !response.isVisible) {
      await chrome.tabs.sendMessage(tab.id, {
        action: 'showSearchBar'
      });
    } else {
      // 検索バーが表示されている場合は設定画面を開く
      chrome.tabs.create({
        url: chrome.runtime.getURL('settings.html')
      });
    }
  } catch (error) {
    // content scriptが読み込まれていない場合やエラーが発生した場合は設定画面を開く
    console.log('Background: 検索バーの状態確認に失敗、設定画面を開く:', error);
    chrome.tabs.create({
      url: chrome.runtime.getURL('settings.html')
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
  
  if (request.action === 'fetchSearchSuggestions') {
    // 予測検索APIを呼び出し
    fetchSearchSuggestions(request.query)
      .then(suggestions => {
        sendResponse({ success: true, suggestions: suggestions });
      })
      .catch(error => {
        console.error('Background: 予測検索の取得に失敗:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 非同期レスポンスを示す
  }
  
  if (request.action === 'openSettings') {
    // 設定画面を開く
    chrome.tabs.create({
      url: chrome.runtime.getURL('settings.html')
    });
    sendResponse({ success: true });
  }
});

// 予測検索APIの呼び出し関数
async function fetchSearchSuggestions(query) {
  try {
    console.log('Background: 予測検索API呼び出し開始, query:', query);
    
    const apiUrl = `https://www.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`;
    console.log('Background: API URL:', apiUrl);
    
    const response = await fetch(apiUrl);
    console.log('Background: レスポンス受信, status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Background: データ解析完了, data:', data);
    
    if (data && data[1] && data[1].length > 0) {
      console.log('Background: 予測候補取得成功, 候補数:', data[1].length);
      return data[1];
    } else {
      console.log('Background: 予測候補なし');
      return [];
    }
  } catch (error) {
    console.error('Background: 予測検索API呼び出しエラー:', error);
    throw error;
  }
}

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
