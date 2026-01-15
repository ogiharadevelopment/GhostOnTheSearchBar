// テキスト選択検出と検索ツールバー表示のメインロジック
console.log('📝 GhostSearchBar: クラス定義開始');
class GhostSearchBar {
  constructor() {
    console.log('📝 GhostSearchBar: コンストラクタ開始');
    this.searchBar = null;
    this.ghostInterface = null;
    this.ghostMark = null;
    this.ghostGuide = null;
    this.fixedGhostInterface = null;
    this.selectedText = '';
    this.isVisible = false;
    this.isEnabled = true;
    this.settings = {};
    this.isTextSelected = false; // テキスト選択状態を追跡
    this.isSearchBarVisible = false; // サーチバーの表示状態を追跡
    this.isDragged = false; // ドラッグ状態を追跡
    this.lastSelectionRect = null; // 最後の選択範囲を記録
    this.lastSelectedText = ''; // 最後に選択されたテキストを記録
    
    // 検索エンジン設定
    this.searchEngineZones = [
      { start: 0, end: 25, engine: 'google', name: 'Google', color: '#ffd700', borderColor: 'rgba(255, 215, 0, 0.8)', shiftEngine: 'duckduckgo' },
      { start: 26, end: 50, engine: 'bing', name: 'Bing', color: '#0078d4', borderColor: 'rgba(0, 120, 212, 0.8)', shiftEngine: 'baidu' },
      { start: 51, end: 75, engine: 'yahoo', name: 'Yahoo!', color: '#6001d2', borderColor: 'rgba(96, 1, 210, 0.8)', shiftEngine: 'yandex' },
      { start: 76, end: 100, engine: 'ecosia', name: 'Ecosia', color: '#008000', borderColor: 'rgba(0, 128, 0, 0.8)', shiftEngine: 'naver' }
    ];
    
    // シフトキー時の検索エンジン定義
    this.shiftSearchEngines = {
      'duckduckgo': { name: 'DuckDuckGo', color: '#ff5722', borderColor: 'rgba(255, 87, 34, 0.8)', url: 'https://duckduckgo.com/?q=' },
      'baidu': { name: 'Baidu', color: '#f44336', borderColor: 'rgba(244, 67, 54, 0.8)', url: 'https://www.baidu.com/s?wd=' },
      'yandex': { name: 'YANDEX', color: '#ffc107', borderColor: 'rgba(255, 193, 7, 0.8)', url: 'https://yandex.com/search/?text=' },
      'naver': { name: 'Naver', color: '#4caf50', borderColor: 'rgba(76, 175, 80, 0.8)', url: 'https://search.naver.com/search.naver?query=' }
    };
    
    // 統一状態管理システム
    this.searchEngineState = {
      displayEngine: null,      // 表示用エンジン（タイトルに表示される）
      lockedEngine: null,       // ロックされたエンジン（実際の検索で使用）
      currentEngine: null,      // 現在のエンジン（マウス位置による）
      isTransitioning: false,   // 切り替え中フラグ
      lastUpdateType: null      // 最後の更新タイプ（'full', 'title-only', 'lock-only'）
    };
    
    // 後方互換性のためのプロパティ（段階的に移行）
    this.currentSearchEngine = null; // 初期状態はnull（常に色が変わるように）
    this.currentZone = null;
    this.lockedSearchEngine = null; // 固定された検索エンジン
    this.lockedZone = null; // 固定されたゾーン
    
    // モード管理（通常・休眠・スリープ）
    this.interfaceMode = 'normal'; // 'normal', 'dormant', 'sleep'
    
    // マウス位置の追跡
    this.lastMousePosition = { x: 0, y: 0 };
    this.currentMouseX = 0; // 現在のマウスX座標
    this.currentMouseY = 0; // 現在のマウスY座標
    this.isInGhostArea = false; // ゴーストエリア内にいるかのフラグ
    
    // シフトキー状態の追跡
    this.isShiftPressed = false;
    this.isShiftMode = false; // シフトモードの状態（トグル式）
    
    // キーショートカット定義（デフォルト）- 言語/地域に応じて動的に生成
    this.defaultKeyShortcuts = this.generateLocalizedShortcuts();
    
    // 現在のキーショートカット（設定から読み込む）
    this.keyShortcuts = { ...this.defaultKeyShortcuts };
    
    // 検索履歴管理（ページごと）
    this.searchHistory = {};
    this.maxHistoryPerPage = 10;
    
    // キーショートカット説明ポップアップ
    this.shortcutTooltip = null;
    this.isSearchButtonHovered = false;
    
    // 多言語対応の設定
    this.language = this.detectLanguage();
    this.region = this.detectRegion();
    this.texts = this.getLocalizedTexts();
    
    console.log('📝 GhostSearchBar: コンストラクタ完了、言語設定:', this.language, '地域:', this.region, 'init()呼び出し');
    this.init();
  }
  
  // 地域を検出
  detectRegion() {
    const language = navigator.language || navigator.userLanguage || 'en';
    const parts = language.split('-');
    
    // 言語コードと地域コードを取得
    if (parts.length >= 2) {
      return parts[1].toUpperCase(); // 例: 'JP', 'US', 'GB'
    }
    
    // 地域コードがない場合は言語コードから推測
    const primaryLanguage = parts[0];
    const regionMap = {
      'ja': 'JP',
      'en': 'US',
      'zh': 'CN',
      'ko': 'KR',
      'fr': 'FR',
      'de': 'DE',
      'es': 'ES',
      'it': 'IT',
      'pt': 'BR',
      'ru': 'RU'
    };
    
    return regionMap[primaryLanguage] || 'US';
  }
  
  // 言語/地域に応じたショートカットを生成
  generateLocalizedShortcuts() {
    // 最新の言語・地域を再検出
    const lang = this.detectLanguage();
    const region = this.detectRegion();
    
    // Amazonの地域別URL
    const amazonDomains = {
      'JP': 'https://www.amazon.co.jp/s?k={query}',
      'US': 'https://www.amazon.com/s?k={query}',
      'UK': 'https://www.amazon.co.uk/s?k={query}',
      'DE': 'https://www.amazon.de/s?k={query}',
      'FR': 'https://www.amazon.fr/s?k={query}',
      'IT': 'https://www.amazon.it/s?k={query}',
      'ES': 'https://www.amazon.es/s?k={query}',
      'CA': 'https://www.amazon.ca/s?k={query}',
      'AU': 'https://www.amazon.com.au/s?k={query}',
      'CN': 'https://www.amazon.cn/s?k={query}'
    };
    
    // Wikipediaの言語別URL
    const wikipediaLanguages = {
      'ja': 'https://ja.wikipedia.org/wiki/Special:Search?search={query}',
      'en': 'https://en.wikipedia.org/wiki/Special:Search?search={query}',
      'zh': 'https://zh.wikipedia.org/wiki/Special:Search?search={query}',
      'ko': 'https://ko.wikipedia.org/wiki/Special:Search?search={query}',
      'fr': 'https://fr.wikipedia.org/wiki/Special:Search?search={query}',
      'de': 'https://de.wikipedia.org/wiki/Special:Search?search={query}',
      'es': 'https://es.wikipedia.org/wiki/Special:Search?search={query}',
      'it': 'https://it.wikipedia.org/wiki/Special:Search?search={query}',
      'pt': 'https://pt.wikipedia.org/wiki/Special:Search?search={query}',
      'ru': 'https://ru.wikipedia.org/wiki/Special:Search?search={query}',
      'ar': 'https://ar.wikipedia.org/wiki/Special:Search?search={query}'
    };
    
    // Googleの地域別URL（hlパラメータで言語指定）
    const googleUrl = `https://www.google.com/search?q={query}&hl=${lang}`;
    
    // Yahoo!の地域別URL
    const yahooDomains = {
      'JP': 'https://search.yahoo.co.jp/search?p={query}',
      'US': 'https://search.yahoo.com/search?p={query}',
      'UK': 'https://uk.search.yahoo.com/search?p={query}',
      'AU': 'https://au.search.yahoo.com/search?p={query}',
      'CA': 'https://ca.search.yahoo.com/search?p={query}'
    };
    
    // Yahoo!知恵袋の地域別URL
    const chiebukuroDomains = {
      'JP': 'https://chiebukuro.yahoo.co.jp/search?p={query}',
      'US': 'https://answers.yahoo.com/search/search_result?p={query}',
      'UK': 'https://uk.answers.yahoo.com/search/search_result?p={query}'
    };
    
    return {
      'y': { name: 'YouTube', icon: '🎥', url: `https://www.youtube.com/results?search_query={query}&gl=${region}` },
      'w': { name: 'Wikipedia', icon: '📚', url: wikipediaLanguages[lang] || wikipediaLanguages['en'] },
      'g': { name: 'Google', icon: '🔍', url: googleUrl },
      'b': { name: 'Bing', icon: '🔎', url: `https://www.bing.com/search?q={query}&setlang=${lang}` },
      'a': { name: 'Amazon', icon: '🛒', url: amazonDomains[region] || amazonDomains['US'] },
      't': { name: 'Twitter', icon: '🐦', url: 'https://twitter.com/search?q={query}' },
      'r': { name: 'Reddit', icon: '🤖', url: 'https://www.reddit.com/search?q={query}' },
      'n': { name: 'note', icon: '📝', url: 'https://note.com/search?q={query}' },
      'q': { name: 'Quora', icon: '💬', url: 'https://www.quora.com/search?q={query}' },
      'z': { name: 'Zenn', icon: '📖', url: 'https://zenn.dev/search?q={query}' },
      'p': { name: 'Pixiv', icon: '🎨', url: 'https://www.pixiv.net/tags/{query}' },
      'c': { name: 'Yahoo!知恵袋', icon: '💡', url: chiebukuroDomains[region] || chiebukuroDomains['JP'] },
      'm': { name: 'Google Maps', icon: '🗺️', url: `https://www.google.com/maps/search/{query}?hl=${lang}` },
      'h': { name: 'GitHub', icon: '💾', url: 'https://github.com/search?q={query}' },
      's': { name: 'Stack Overflow', icon: '💬', url: 'https://stackoverflow.com/search?q={query}' },
      'i': { name: 'Instagram', icon: '📷', url: 'https://www.instagram.com/explore/tags/{query}/' },
      'f': { name: 'Facebook', icon: '👤', url: 'https://www.facebook.com/search/top/?q={query}' },
      'u': { name: 'Bluesky', icon: '☁️', url: 'https://bsky.app/search?q={query}' },
      'e': { name: 'Ecosia', icon: '🌳', url: 'https://www.ecosia.org/search?q={query}' }
    };
  }

  init() {
    console.log('🔧 GhostSearchBar: 初期化開始');
    
    // テキスト選択イベントの監視
    document.addEventListener('mouseup', this.handleTextSelection.bind(this));
    document.addEventListener('keyup', this.handleTextSelection.bind(this));
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
    
    // 右クリック時にゴーストインターフェースを一時的に非表示
    document.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    
    console.log('🔧 GhostSearchBar: イベントリスナー設定完了');
    
    // 検索ツールバーの作成
    this.createSearchBar();
    console.log('🔧 GhostSearchBar: 検索ツールバー作成完了');
    
    // 検索ツールバーの存在確認
    if (this.searchBar) {
      console.log('✅ GhostSearchBar: 検索ツールバー作成成功 - 要素:', this.searchBar);
    } else {
      console.log('❌ GhostSearchBar: 検索ツールバー作成失敗');
    }
    
    // ゴーストインターフェースの作成
    this.createGhostInterface();
    console.log('🔧 GhostSearchBar: ゴーストインターフェース作成完了');
    
    // 固定ゴーストインターフェースの作成
    this.createFixedGhostInterface();
    console.log('🔧 GhostSearchBar: 固定ゴーストインターフェース作成完了');
    
    // 設定の読み込み
    this.loadSettings();
    
    // 設定変更のメッセージリスナー
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // 検索バーの表示状態を確認
      if (request.action === 'checkSearchBarVisibility') {
        sendResponse({ isVisible: this.isSearchBarVisible });
        return true;
      }
      
      // 検索バーを表示
      if (request.action === 'showSearchBar') {
        if (!this.searchBar) {
          this.createSearchBar();
        }
        this.showSearchBarWithHistory();
        sendResponse({ success: true });
        return true;
      }
      
      // 設定更新通知
      if (request.action === 'settingsUpdated') {
        console.log('🔄 GhostSearchBar: 設定変更メッセージ受信:', request);
        
        if (request.settings) {
          this.settings = request.settings;
          console.log('🔄 GhostSearchBar: 設定を更新:', this.settings);
        }
        
        if (request.shortcuts) {
          console.log('🔄 GhostSearchBar: キーショートカット設定を受信:', request.shortcuts);
          console.log('🔄 GhostSearchBar: 更新前のkeyShortcuts:', this.keyShortcuts);
          this.loadKeyShortcuts(request.shortcuts);
          console.log('🔄 GhostSearchBar: 更新後のkeyShortcuts:', this.keyShortcuts);
          
          // 検索エンジン選択エリアを更新
          this.updateEngineDropdownAfterSettingsChange();
        }
        
        if (this.settings && this.settings.enabled === false) {
          this.disable();
        } else {
          this.enable();
        }
        
        sendResponse({ success: true });
      }
    });
    
    console.log('🔧 GhostSearchBar: 初期化完了');
  }


  handleTextSelection(event) {
    console.log('🔍 GhostSearchBar: テキスト選択イベント発火', event.type, 'button:', event.button);
    
    // 拡張機能が無効化されている場合は何もしない
    if (!this.isEnabled) {
      console.log('🔍 GhostSearchBar: 拡張機能が無効化されているため処理をスキップ');
      return;
    }
    
    // 右クリックの場合は処理しない（コンテキストメニューを妨げない）
    if (event.button === 2 || event.type === 'contextmenu') {
      console.log('🔍 GhostSearchBar: 右クリックイベントのため処理をスキップ');
      return;
    }
    
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    console.log('🔍 GhostSearchBar: 選択されたテキスト:', selectedText, '長さ:', selectedText.length);
    
    if (selectedText && selectedText.length > 0) {
      this.selectedText = selectedText;
      this.isTextSelected = true; // 選択状態を記録
      
      // 新しいテキストが選択された場合はドラッグ状態をリセット
      if (this.selectedText !== this.lastSelectedText) {
        this.isDragged = false;
        this.lastSelectedText = this.selectedText;
        console.log('新しいテキスト選択 - ドラッグ状態をリセット');
      }
      
      // サーチバーが表示されている場合でも自動的にテキストを追加しない（ユーザーが手動で選択するまで待つ）
      
      console.log('🔍 GhostSearchBar: テキスト選択状態を記録:', this.isTextSelected);
      console.log('🔍 GhostSearchBar: テキスト選択時はゴーストインターフェースを表示しない（固定インターフェースを維持）');
      // 固定ゴーストインターフェースは表示したまま維持
    } else {
      console.log('🔍 GhostSearchBar: テキストが選択されていないため、インターフェースを非表示');
      this.hideGhostInterface();
      // サーチバーは非表示にしない（×ボタンでのみ消える）
      // this.hideSearchBar();
      this.isTextSelected = false; // 選択状態をクリア
    }
  }

  // テキスト選択解除の検出を改善
  handleSelectionChange() {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    console.log('🔍 GhostSearchBar: selectionchange発火 - 選択テキスト:', selectedText, '長さ:', selectedText.length, 'isTextSelected:', this.isTextSelected);
    
    // 実際にテキストが選択されている場合は何もしない
    if (selectedText && selectedText.length > 0) {
      console.log('🔍 GhostSearchBar: テキストが選択されているため処理をスキップ');
      return;
    }
    
    // テキストが選択されていない場合のみ処理
    if (!selectedText || selectedText.length === 0) {
      // 選択状態フラグも確認
      if (this.isTextSelected) {
        
        console.log('🔍 GhostSearchBar: 選択解除検出 - 固定ゴーストインターフェースを維持');
        // 固定ゴーストインターフェースは表示したまま維持
        // サーチバーは非表示にしない（×ボタンでのみ消える）
        // this.hideSearchBar();
        this.isTextSelected = false; // 選択状態をクリア
      } else {
        console.log('🔍 GhostSearchBar: 選択状態フラグがfalseのため処理をスキップ');
      }
    }
  }

  // 破線を表示
 

  // 破線生成ロジック
 

  // 文字位置計算ロジック（複数ノード対応）
 

  // 指定された位置の文字の正確な矩形を取得（複数ノード対応）


  // テキストノードを取得（複数ノード対応）
 

  // 破線要素を作成（下辺のみ）


  // 破線要素のイベントを設定
  setupDashedLineEvents(dashedLine, charPos) {
    // マウスオーバーイベント
    dashedLine.addEventListener('mouseenter', (e) => {
      console.log('🔍 [DEBUG] 破線マウスオーバー:', charPos.char, charPos.index);
      this.handleDashedLineHover(dashedLine, true);
    });
    
    // マウスリーブイベント
    dashedLine.addEventListener('mouseleave', (e) => {
      console.log('🔍 [DEBUG] 破線マウスリーブ:', charPos.char, charPos.index);
      this.handleDashedLineHover(dashedLine, false);
    });
    
    // ホイールスクロールイベント
    dashedLine.addEventListener('wheel', (e) => {
      console.log('🔍 [DEBUG] 破線でのホイールスクロール:', e.deltaY);
      this.handleDashedLineWheel(e, charPos);
    }, { passive: false });
  }

  // 破線をクリア


  // マウスオーバー効果の処理
  handleDashedLineHover(dashedLine, isHover) {
    console.log('🔍 [DEBUG] handleDashedLineHover: 開始, isHover:', isHover);
    
    if (isHover) {
      // 赤い破線を黄色に変更
      dashedLine.className = 'ghost-yellow-dashed-line';
      this.dashedLineElements.yellow.push(dashedLine);
      
      // 赤い破線の配列から削除
      const redIndex = this.dashedLineElements.red.indexOf(dashedLine);
      if (redIndex > -1) {
        this.dashedLineElements.red.splice(redIndex, 1);
      }
      
      console.log('🔍 [DEBUG] handleDashedLineHover: 赤→黄に変更');
    } else {
      // 黄色い破線を赤に戻す
      dashedLine.className = 'ghost-red-dashed-line';
      this.dashedLineElements.red.push(dashedLine);
      
      // 黄色い破線の配列から削除
      const yellowIndex = this.dashedLineElements.yellow.indexOf(dashedLine);
      if (yellowIndex > -1) {
        this.dashedLineElements.yellow.splice(yellowIndex, 1);
      }
      
      console.log('🔍 [DEBUG] handleDashedLineHover: 黄→赤に戻す');
    }
  }

  // 破線でのホイールスクロール処理
  handleDashedLineWheel(event, charPos) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('🔍 [DEBUG] handleDashedLineWheel: 開始, deltaY:', event.deltaY, 'charPos:', charPos);
    
    if (event.deltaY < 0) {
      // 上スクロール: 検索バーに追加
      console.log('🔍 [DEBUG] handleDashedLineWheel: 上スクロール - 検索バーに追加');
      if (this.isSearchBarVisible) {
        this.addSelectedTextToSearchBar();
      } else {
        this.showSearchBar();
      }
    } else if (event.deltaY > 0) {
      // 下スクロール: 即座に検索実行
      console.log('🔍 [DEBUG] handleDashedLineWheel: 下スクロール - 即座に検索実行');
      this.performImmediateSearch(this.selectedText);
    }
    
    // 破線をクリア
    this.clearDashedLines();
    
    console.log('🔍 [DEBUG] handleDashedLineWheel: 完了');
  }

  // ゴーストインターフェースを破線領域に合わせて配置（複数対応）


  // 連続する文字グループを検出


  // グループごとのゴーストインターフェースを作成


  // ゴーストインターフェースのイベントを設定




  // ゴーストインターフェースのマウスオーバー処理




  // 右クリック時の処理
  handleContextMenu(event) {
    console.log('🖱️ GhostSearchBar: 右クリックイベント発火');
    
    // テキスト選択状態を確認
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    
    if (selectedText && selectedText.length > 0) {
      console.log('🖱️ GhostSearchBar: 右クリック時 - テキスト選択を維持');
      // テキストが選択されている場合は選択状態を維持
      this.isTextSelected = true;
      this.selectedText = selectedText;
    }
    
    // ゴーストインターフェースを一時的に非表示（コンテキストメニューを妨げない）
    if (this.ghostInterface && this.ghostInterface.style.display === 'block') {
      console.log('🖱️ GhostSearchBar: 右クリック時 - ゴーストインターフェースを一時非表示');
      this.ghostInterface.style.visibility = 'hidden';
      
      // 右クリックメニューが閉じられた後に再表示
      setTimeout(() => {
        if (this.ghostInterface) {
          console.log('🖱️ GhostSearchBar: 右クリック後 - ゴーストインターフェースを再表示');
          this.ghostInterface.style.visibility = 'visible';
        }
      }, 100);
    }
  }


  createSearchBar() {
    // 検索ツールバーのHTML要素を作成
    this.searchBar = document.createElement('div');
    this.searchBar.id = 'ghost-search-bar';
    this.searchBar.innerHTML = `
      <div class="ghost-search-container">
        <div class="ghost-search-header">
          <span class="ghost-search-title" id="ghost-search-title">Google</span>
          <div class="ghost-search-header-buttons">
            <button class="ghost-search-settings-btn" id="ghost-settings-btn" tabindex="0" title="設定画面へ">⚙️</button>
            <button class="ghost-search-clear-bar" id="ghost-clear-bar-btn" tabindex="0" title="検索バーを閉じる">✕</button>
          </div>
        </div>
        <div class="ghost-search-content">
          <div class="ghost-search-input-container">
            <input type="text" class="ghost-search-input" id="ghost-search-input" placeholder="${this.texts.searchPlaceholder}" autocomplete="off">
            <div class="ghost-search-engine-selector" id="ghost-engine-selector">
              <button class="ghost-engine-select-btn" id="ghost-engine-select-btn" tabindex="0">
                <span class="engine-select-name" id="engine-select-name">Google</span>
              </button>
              <div class="ghost-engine-dropdown" id="ghost-engine-dropdown" style="display: none;">
                <!-- 検索エンジン選択肢がここに表示される -->
              </div>
            </div>
            <button class="ghost-search-clear-input" id="ghost-clear-input-btn" tabindex="0" title="検索ワードを消去">×</button>
            <button class="ghost-search-execute" id="ghost-execute-btn" tabindex="0">🔍</button>
          </div>
          <div class="ghost-search-suggestions" id="ghost-search-suggestions" style="display: none;">
            <!-- 予測検索候補がここに表示される -->
          </div>
          <div class="ghost-search-history" id="ghost-search-history" style="display: none;">
            <!-- 検索履歴がここに表示される -->
          </div>
        </div>
      </div>
    `;

    // イベントリスナーの設定
    const executeBtn = this.searchBar.querySelector('#ghost-execute-btn');
    const clearInputBtn = this.searchBar.querySelector('#ghost-clear-input-btn');
    const clearBarBtn = this.searchBar.querySelector('#ghost-clear-bar-btn');
    const settingsBtn = this.searchBar.querySelector('#ghost-settings-btn');
    const engineSelectBtn = this.searchBar.querySelector('#ghost-engine-select-btn');
    const engineDropdown = this.searchBar.querySelector('#ghost-engine-dropdown');
    
    executeBtn.addEventListener('click', () => {
      this.performDefaultSearch();
    });
    
    clearInputBtn.addEventListener('click', () => {
      const searchInput = this.searchBar.querySelector('#ghost-search-input');
      searchInput.value = '';
      searchInput.focus();
      this.hideSuggestions();
      this.hideHistory();
    });
    
    clearBarBtn.addEventListener('click', () => {
      this.hideSearchBar();
    });
    
    settingsBtn.addEventListener('click', () => {
      this.openSettingsPage();
    });
    
    // 検索エンジン選択エリアの設定
    this.setupEngineSelector(engineSelectBtn, engineDropdown);

    // 検索入力フィールドのイベントリスナー
    const searchInput = this.searchBar.querySelector('#ghost-search-input');
    searchInput.addEventListener('input', (e) => {
      e.stopPropagation();
      this.handleSearchInput(e);
    });

    searchInput.addEventListener('keydown', (e) => {
      // 検索エンジン選択エリアにマウスオーバーしている場合の処理
      if (this.isEngineSelectorHovered) {
        const key = e.key.toLowerCase();
        // 検索エンジン選択用のキーショートカットの場合は入力をブロック
        if (this.keyShortcuts[key] && key.length === 1) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('🔧 GhostSearchBar: インプット欄へのキー入力をブロック（検索エンジン選択用）:', key);
          return;
        }
      }
      
      // シフトキーとコントロールキーはゴーストインターフェースに伝播させる
      if (e.key === 'Shift' || e.key === 'Control') {
        // イベントの伝播を停止しない（ゴーストインターフェースに伝播させる）
        this.handleSearchKeydown(e);
      } else {
        // その他のキーは通常通り伝播を停止
        e.stopPropagation();
        this.handleSearchKeydown(e);
      }
    });

    searchInput.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, { passive: false });

    // サーチバー全体でホイールスクロールを透過しないようにする
    this.searchBar.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }, { passive: false });

    // 予測変換選択肢のホイールスクロールイベント
    const suggestionsContainer = this.searchBar.querySelector('#ghost-search-suggestions');
    suggestionsContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      this.handleSuggestionWheel(e);
    }, { passive: false });

    // ドラッグ移動は削除（新しい要件では不要）

    // ページに追加
    document.body.appendChild(this.searchBar);
    
    // 位置は表示時に設定（ゴーストエリアの下）
  }
  
  // 検索バーの位置をゴーストエリアの下に設定
  positionSearchBar() {
    if (!this.searchBar || !this.fixedGhostInterface) return;
    
    const ghostRect = this.fixedGhostInterface.getBoundingClientRect();
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    // ゴーストエリアの下に配置
    this.searchBar.style.position = 'fixed';
    this.searchBar.style.left = ghostRect.left + 'px';
    this.searchBar.style.top = (ghostRect.bottom + 5) + 'px';
    this.searchBar.style.transform = 'none';
    this.searchBar.style.width = ghostRect.width + 'px';
  }

  // ドラッグ移動とリサイズの設定
  setupDragAndDrop() {
    const dragHandle = this.searchBar.querySelector('#ghost-drag-handle');
    let isDragging = false;
    let isResizing = false;
    let startX, startY, startLeft, startTop, startWidth;
    let resizeDirection = ''; // 'left' or 'right'

    // ドラッグ移動
    dragHandle.addEventListener('mousedown', (e) => {
      if (e.target.id === 'ghost-close-btn') return; // 閉じるボタンは除外
      
      isDragging = true;
      this.isDragged = true; // ドラッグ状態を設定
      startX = e.clientX;
      startY = e.clientY;
      
      // 固定位置での現在位置を取得
      const rect = this.searchBar.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      
      this.searchBar.style.cursor = 'grabbing';
      e.preventDefault();
    });

    // リサイズハンドル（左右の端）
    const leftResizeHandle = document.createElement('div');
    leftResizeHandle.className = 'ghost-resize-handle ghost-resize-left';
    leftResizeHandle.innerHTML = '⋮';
    
    const rightResizeHandle = document.createElement('div');
    rightResizeHandle.className = 'ghost-resize-handle ghost-resize-right';
    rightResizeHandle.innerHTML = '⋮';
    
    this.searchBar.appendChild(leftResizeHandle);
    this.searchBar.appendChild(rightResizeHandle);

    // 左端リサイズ
    leftResizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      resizeDirection = 'left';
      startX = e.clientX;
      
      // 固定位置での現在位置を取得
      const rect = this.searchBar.getBoundingClientRect();
      startLeft = rect.left;
      startWidth = this.searchBar.offsetWidth;
      
      this.searchBar.style.cursor = 'ew-resize';
      e.preventDefault();
      e.stopPropagation();
    });

    // 右端リサイズ
    rightResizeHandle.addEventListener('mousedown', (e) => {
      isResizing = true;
      resizeDirection = 'right';
      startX = e.clientX;
      startWidth = this.searchBar.offsetWidth;
      this.searchBar.style.cursor = 'ew-resize';
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        // 固定位置での移動
        this.searchBar.style.position = 'fixed';
        this.searchBar.style.left = (startLeft + deltaX) + 'px';
        this.searchBar.style.top = (startTop + deltaY) + 'px';
        this.searchBar.style.transform = 'none';
      } else if (isResizing) {
        const deltaX = e.clientX - startX;
        
        if (resizeDirection === 'left') {
          const newWidth = startWidth - deltaX;
          if (newWidth >= 300) { // 最小幅
            this.searchBar.style.width = newWidth + 'px';
            this.searchBar.style.position = 'fixed';
            this.searchBar.style.left = (startLeft + deltaX) + 'px';
            this.searchBar.style.transform = 'none';
          }
        } else if (resizeDirection === 'right') {
          const newWidth = startWidth + deltaX;
          if (newWidth >= 300) { // 最小幅
            this.searchBar.style.width = newWidth + 'px';
          }
        }
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        this.searchBar.style.cursor = 'grab';
        
        // ドラッグ終了後、少し遅延してからドラッグ状態をリセット
        // これにより新しい選択範囲に追従できるようになる
        setTimeout(() => {
          this.isDragged = false;
          console.log('ドラッグ状態をリセット - 新しい選択範囲に追従可能');
        }, 1000); // 1秒後にリセット
      } else if (isResizing) {
        isResizing = false;
        this.searchBar.style.cursor = 'grab';
      }
    });
  }

  createGhostInterface() {
    console.log('👻 GhostSearchBar: createGhostInterface 開始');
    
    // サーチバーゴーストインターフェースの作成
    this.ghostInterface = document.createElement('div');
    this.ghostInterface.id = 'search-bar-ghost-interface';
    this.ghostInterface.className = 'search-bar-ghost-interface';
    console.log('👻 GhostSearchBar: ゴーストインターフェース要素作成完了');
    
    // サーチバーゴーストマークの作成
    this.ghostMark = document.createElement('div');
    this.ghostMark.id = 'search-bar-ghost-mark';
    this.ghostMark.className = 'search-bar-ghost-mark';
    console.log('👻 GhostSearchBar: ゴーストマーク要素作成完了');
    
    // サーチバーゴーストガイドの作成
    this.ghostGuide = document.createElement('div');
    this.ghostGuide.id = 'search-bar-ghost-guide';
    this.ghostGuide.className = 'search-bar-ghost-guide';
    this.ghostGuide.innerHTML = `
      <div class="ghost-guide-content">
        <div class="ghost-guide-title">${this.language === 'ja' ? '操作方法' : 'How to Use'}</div>
        <div class="ghost-guide-item">
          <span class="ghost-guide-icon">⬆️</span>
          <span class="ghost-guide-text">${this.texts.wheelUpHint}</span>
        </div>
        <div class="ghost-guide-item">
          <span class="ghost-guide-icon">⬇️</span>
          <span class="ghost-guide-text">${this.texts.wheelDownHint}</span>
        </div>
      </div>
    `;
    console.log('👻 GhostSearchBar: ゴーストガイド要素作成完了');

    // イベントリスナーの設定
    console.log('👻 GhostSearchBar: イベントリスナー設定開始');
    
    // ホイールスクロールイベント
    this.ghostInterface.addEventListener('wheel', (event) => {
      console.log('🔄 GhostSearchBar: ホイールイベント発火（直接）', event.deltaY);
      this.handleWheelScroll(event);
    }, { passive: false });
    
    // マウスエンターイベント
    this.ghostInterface.addEventListener('mouseenter', (event) => {
      console.log('🖱️ GhostSearchBar: マウスエンターイベント発火（直接）');
      this.showSearchBarGhostMark(event);
    });
    
    // マウスリーブイベント
    this.ghostInterface.addEventListener('mouseleave', (event) => {
      console.log('🖱️ GhostSearchBar: マウスリーブイベント発火（直接）');
      this.hideSearchBarGhostMark(event);
    });
    
    // 追加のイベントリスナー（確実性のため）
    this.ghostInterface.addEventListener('mouseover', (event) => {
      console.log('🖱️ GhostSearchBar: mouseoverイベント発火', event);
      this.showSearchBarGhostMark(event);
    });
    
    this.ghostInterface.addEventListener('mouseout', (event) => {
      console.log('🖱️ GhostSearchBar: mouseoutイベント発火', event);
      this.hideSearchBarGhostMark(event);
    });
    
    // マウスダウンイベント（右クリック準備）
    this.ghostInterface.addEventListener('mousedown', (event) => {
      console.log('🖱️ GhostSearchBar: mousedownイベント発火', event.button);
      if (event.button === 2) {
        console.log('🖱️ GhostSearchBar: 右クリック準備 - 選択を維持');
        // 右クリックの場合は選択を維持
        event.preventDefault();
      }
    });
    
    // 上ドラッグで検索ワードを追加
    this.ghostInterface.addEventListener('mousedown', (event) => {
      if (event.button === 0) { // 左クリック
        this.setupUpDrag(event);
      }
    });
    
    console.log('👻 GhostSearchBar: イベントリスナー設定完了');

    // ページに追加
    document.body.appendChild(this.ghostInterface);
    document.body.appendChild(this.ghostMark);
    document.body.appendChild(this.ghostGuide);
    console.log('👻 GhostSearchBar: DOM要素追加完了');
    
    // 要素の存在確認
    console.log('👻 GhostSearchBar: 要素確認 - インターフェース:', !!this.ghostInterface);
    console.log('👻 GhostSearchBar: 要素確認 - マーク:', !!this.ghostMark);
    console.log('👻 GhostSearchBar: 要素確認 - ガイド:', !!this.ghostGuide);
  }

  // 固定ゴーストインターフェースの作成
  createFixedGhostInterface() {
    console.log('🔧 GhostSearchBar: createFixedGhostInterface 開始');
    
    // 固定ゴーストインターフェースの作成
    this.fixedGhostInterface = document.createElement('div');
    this.fixedGhostInterface.id = 'fixed-ghost-interface';
    this.fixedGhostInterface.className = 'fixed-ghost-interface';
    console.log('🔧 GhostSearchBar: 固定ゴーストインターフェース要素作成完了');
    
    // イベントリスナーの設定
    this.setupFixedGhostInterfaceEvents();
    
    // DOMに追加（document.bodyの子要素として）
    document.body.appendChild(this.fixedGhostInterface);
    
    // 初期状態は表示（常に表示を維持）
    this.fixedGhostInterface.style.display = 'block';
    
    // 初期状態のモードに応じた視覚的フィードバック
    this.updateModeVisualFeedback();
    
    console.log('🔧 GhostSearchBar: 固定ゴーストインターフェース作成完了');
  }

  // 固定ゴーストインターフェースのイベント設定
  setupFixedGhostInterfaceEvents() {
    console.log('🔧 GhostSearchBar: setupFixedGhostInterfaceEvents 開始');
    
    // マウスオーバー状態の追跡
    this.isMouseOverGhost = false;
    this.previousActiveElement = null; // 元のフォーカス位置を保存
    this.savedSelection = null; // 保存されたテキスト選択（Range）
    this.savedSelectionText = null; // 保存されたテキスト選択（文字列）
    
    // フォーカス可能にする（必要に応じて）
    this.fixedGhostInterface.setAttribute('tabindex', '-1'); // デフォルトではフォーカスを受け取らない
    this.fixedGhostInterface.style.outline = 'none';
    
    // documentレベルでマウス位置を追跡し、isInGhostAreaを更新
    document.addEventListener('mousemove', (e) => {
      this.currentMouseX = e.clientX;
      this.currentMouseY = e.clientY;
      this.lastMousePosition.x = e.clientX;
      this.lastMousePosition.y = e.clientY;
      
      const wasInGhostArea = this.isInGhostArea;
      this.isInGhostArea = this.isMouseInGhostArea(e.clientX, e.clientY);
      
      // ゴーストエリアに入った時
      if (this.isInGhostArea && !wasInGhostArea) {
        this.onEnterGhostArea();
      }
      // ゴーストエリアから出た時
      else if (!this.isInGhostArea && wasInGhostArea) {
        this.onLeaveGhostArea();
      }
      
      // ゴーストエリア内にいる時は、マウス位置から検索エンジン領域を判定
      if (this.isInGhostArea) {
        this.handleMouseMove(e);
      }
    });
    
    // documentレベルでホイールイベントを監視
    document.addEventListener('wheel', (e) => {
      // ゴーストエリア内でのホイールイベントを処理
      // pointer-events: none にしているため、e.target がゴーストインターフェースになることはない
      // そのため、isInGhostArea のみで判定する
      if (!this.isInGhostArea) return;
      
      // スリープモードの場合は何もしない
      if (this.interfaceMode === 'sleep') {
        console.log('🔄 GhostSearchBar: スリープモード中 - ホイールスクロールを無視');
        return;
      }
      
      // ホイールイベントを処理して背景への伝達を遮断
      // preventDefault()を呼ぶことで、ページのスクロールを防ぐ
      e.preventDefault();
      e.stopPropagation();
      
      console.log('🔄 GhostSearchBar: 固定インターフェースホイールスクロール', e.deltaY);
      console.log('🔄 [DEBUG] ホイールスクロール時 - 現在のモード:', this.interfaceMode);
      
      // テキストが選択されているかチェック
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();
      const hasSelectedText = selectedText && selectedText.length > 0;
      
      // savedSelectionText を優先的に使用
      const textToUse = this.savedSelectionText || selectedText;
      const hasText = textToUse && textToUse.length > 0;
      
      if (hasText) {
        // テキスト選択時
        this.selectedText = textToUse;
        this.isTextSelected = true;
        
        if (e.deltaY < 0) {
          // 上スクロール: 検索バー+予測変換を表示
          console.log('🔄 GhostSearchBar: 上スクロール（テキスト選択時） - 検索バー+予測変換表示');
          this.showSearchBarWithPredictions(textToUse);
        } else if (e.deltaY > 0) {
          // 下スクロール: ブラウザ既定検索エンジンで即座検索
          console.log('🔄 GhostSearchBar: 下スクロール（テキスト選択時） - 既定検索エンジンで即座検索');
          this.performImmediateDefaultSearch(textToUse);
        }
      } else {
        // テキスト未選択時
        if (e.deltaY < 0 || e.deltaY > 0) {
          // 上下どちらでも検索バー+履歴を表示
          console.log('🔄 GhostSearchBar: スクロール（テキスト未選択時） - 検索バー+履歴表示');
          this.showSearchBarWithHistory();
        }
      }
    }, { capture: true, passive: false });
    
    // クリック透過処理（参考プロジェクトの方法）
    document.addEventListener('click', (e) => {
      if (!this.isInGhostArea) return;
      
      // 一時的にゴーストインターフェースをpointer-events: noneにする
      const originalPointerEvents = this.fixedGhostInterface.style.pointerEvents;
      this.fixedGhostInterface.style.pointerEvents = 'none';
      
      // マウス位置の要素を取得
      const elementAtPoint = document.elementFromPoint(this.currentMouseX, this.currentMouseY);
      
      // pointer-eventsを元に戻す
      this.fixedGhostInterface.style.pointerEvents = originalPointerEvents;
      
      if (elementAtPoint && elementAtPoint !== this.fixedGhostInterface) {
        console.log('🔄 クリック透過: 下の要素に転送', elementAtPoint);
        
        // 新しいイベントを作成して下の要素に転送
        const newEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: this.currentMouseX,
          clientY: this.currentMouseY,
          button: e.button,
          buttons: e.buttons,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey
        });
        
        setTimeout(() => {
          elementAtPoint.dispatchEvent(newEvent);
        }, 0);
      }
    }, true);
    
    // 右クリック透過処理
    document.addEventListener('contextmenu', (e) => {
      if (!this.isInGhostArea) return;
      
      // 一時的にゴーストインターフェースをpointer-events: noneにする
      const originalPointerEvents = this.fixedGhostInterface.style.pointerEvents;
      this.fixedGhostInterface.style.pointerEvents = 'none';
      
      // マウス位置の要素を取得
      const elementAtPoint = document.elementFromPoint(this.currentMouseX, this.currentMouseY);
      
      // pointer-eventsを元に戻す
      this.fixedGhostInterface.style.pointerEvents = originalPointerEvents;
      
      if (elementAtPoint && elementAtPoint !== this.fixedGhostInterface) {
        console.log('🔄 右クリック透過: 下の要素に転送', elementAtPoint);
        
        // 新しいイベントを作成して下の要素に転送
        const newEvent = new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: this.currentMouseX,
          clientY: this.currentMouseY,
          button: e.button,
          buttons: e.buttons,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          metaKey: e.metaKey
        });
        
        setTimeout(() => {
          elementAtPoint.dispatchEvent(newEvent);
        }, 0);
      }
    }, true);
    
    // Ctrlキーイベント（モード切り替え）
    document.addEventListener('keydown', (event) => {
      if (!this.isInGhostArea) return;
      
      if (event.key === 'Control') {
        console.log('⌨️ GhostSearchBar: Ctrlキー検出（ゴーストエリア内）');
        this.cycleInterfaceMode();
        event.preventDefault();
        event.stopPropagation();
      }
      
      if (event.key === 'Shift') {
        console.log('⌨️ GhostSearchBar: Shiftキー検出（ゴーストエリア内）', { 
          isSearchBarVisible: this.isSearchBarVisible,
          isShiftMode: this.isShiftMode 
        });
        this.isShiftPressed = true;
        this.toggleShiftMode();
        event.preventDefault();
        event.stopPropagation();
      }
    });
    
    // シフトキー離上イベント
    document.addEventListener('keyup', (event) => {
      if (event.key === 'Shift') {
        console.log('⌨️ GhostSearchBar: Shiftキー離上');
        this.isShiftPressed = false;
        // シフトモードはトグル式なので離上時は何もしない
      }
    });
    
    console.log('🔧 GhostSearchBar: setupFixedGhostInterfaceEvents 完了');
  }
  
  // ゴーストエリアに入った時の処理
  onEnterGhostArea() {
    console.log('🖱️ GhostSearchBar: ゴーストエリアに入りました - キー入力検索を有効化');
    
    // 検索バーが表示されている場合、インプットフィールドからフォーカスを外す
    if (this.isSearchBarVisible && this.searchBar) {
      const searchInput = this.searchBar.querySelector('#ghost-search-input');
      if (searchInput && document.activeElement === searchInput) {
        searchInput.blur();
        console.log('🖱️ GhostSearchBar: 検索バーのインプットフィールドからフォーカスを外しました');
      }
    }
    
    // 現在のテキスト選択を保存（フォーカスを移す前に）
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      // テキストを先に取得（フォーカスを移す前に）
      const savedText = range.toString().trim();
      console.log('🖱️ GhostSearchBar: テキスト選択を検出:', savedText, '長さ:', savedText.length);
      
      if (savedText.length > 0) {
        // テキストを先に保存（最重要）
        this.savedSelectionText = savedText;
        // Rangeをクローンして保存（復元用）
        try {
          this.savedSelection = range.cloneRange();
          console.log('🖱️ GhostSearchBar: テキスト選択を保存完了 - テキスト:', this.savedSelectionText, 'Range:', this.savedSelection);
        } catch (error) {
          console.log('⚠️ GhostSearchBar: Rangeのクローンに失敗:', error);
          this.savedSelection = null;
        }
      } else {
        this.savedSelection = null;
        this.savedSelectionText = null;
        console.log('🖱️ GhostSearchBar: テキスト選択が空のため保存しません');
      }
    } else {
      this.savedSelection = null;
      this.savedSelectionText = null;
      console.log('🖱️ GhostSearchBar: テキスト選択が存在しません');
    }
    
    // 現在のフォーカス位置を保存
    this.previousActiveElement = document.activeElement;
    console.log('🖱️ GhostSearchBar: 元のフォーカス位置を保存:', this.previousActiveElement);
    
    // 常にフォーカスを移す（キー入力をインターセプトするため）
    this.fixedGhostInterface.setAttribute('tabindex', '0');
    this.fixedGhostInterface.focus();
    console.log('🖱️ GhostSearchBar: ゴーストインターフェースにフォーカスを移しました（テキスト選択:', this.savedSelectionText || 'なし', '）');
    
    this.isMouseOverGhost = true;
    this.setupKeyInputSearch();
  }
  
  // ゴーストエリアから出た時の処理
  onLeaveGhostArea() {
    console.log('🖱️ GhostSearchBar: ゴーストエリアから出ました - キー入力検索を無効化');
    
    this.isMouseOverGhost = false;
    this.removeKeyInputSearch();
    
    // 保存されたテキスト選択を復元
    if (this.savedSelection) {
      try {
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(this.savedSelection);
        console.log('🖱️ GhostSearchBar: テキスト選択を復元しました:', this.savedSelectionText);
      } catch (error) {
        console.log('⚠️ GhostSearchBar: テキスト選択の復元に失敗:', error);
      }
      this.savedSelection = null;
      this.savedSelectionText = null;
    }
    
    // 元のフォーカス位置に戻す（スクロールを防ぐ）
    if (this.previousActiveElement && document.body.contains(this.previousActiveElement)) {
      try {
        // スクロール位置を保存（フォールバック用）
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        
        // preventScrollオプションを使用してフォーカスを戻す
        if (typeof this.previousActiveElement.focus === 'function') {
          // preventScrollがサポートされているかチェック
          try {
            this.previousActiveElement.focus({ preventScroll: true });
            console.log('🖱️ GhostSearchBar: 元のフォーカス位置に戻しました（preventScroll使用）:', this.previousActiveElement);
          } catch (e) {
            // preventScrollがサポートされていない場合は通常のfocusを使用
            // その後、スクロール位置を復元
            this.previousActiveElement.focus();
            // スクロール位置を復元
            requestAnimationFrame(() => {
              window.scrollTo(scrollX, scrollY);
            });
            console.log('🖱️ GhostSearchBar: 元のフォーカス位置に戻しました（スクロール位置復元）:', this.previousActiveElement);
          }
        } else {
          console.log('⚠️ GhostSearchBar: focusメソッドが利用できません');
        }
      } catch (error) {
        console.log('⚠️ GhostSearchBar: フォーカス復元に失敗:', error);
      }
    } else if (!this.savedSelection) {
      // テキスト選択がない場合のみ、bodyにフォーカスを戻す（スクロールを防ぐ）
      try {
        document.body.focus({ preventScroll: true });
        console.log('🖱️ GhostSearchBar: bodyにフォーカスを戻しました（preventScroll使用）');
      } catch (e) {
        // フォールバック: 通常のfocusを使用
        document.body.focus();
        console.log('🖱️ GhostSearchBar: bodyにフォーカスを戻しました');
      }
    }
    this.previousActiveElement = null;
    
    // tabindexを戻す
    this.fixedGhostInterface.setAttribute('tabindex', '-1');
    
    // 検索エンジンをリセット
    this.resetToDefaultEngine();
  }


  // シフトモードのトグル
  toggleShiftMode() {
    this.isShiftMode = !this.isShiftMode;
    console.log('🔀 GhostSearchBar: シフトモード切り替え:', this.isShiftMode ? 'ON' : 'OFF');
    
    // 現在のマウス位置で検索エンジンを切り替え
    this.handleMouseMove({ clientX: this.lastMousePosition.x, clientY: this.lastMousePosition.y });
  }

  // マウス位置がゴーストエリア内かどうかを判定
  isMouseInGhostArea(mouseX, mouseY) {
    if (!this.fixedGhostInterface) return false;
    
    const rect = this.fixedGhostInterface.getBoundingClientRect();
    return mouseX >= rect.left && mouseX <= rect.right && 
           mouseY >= rect.top && mouseY <= rect.bottom;
  }

  // マウス位置から検索エンジン領域を判定
  handleMouseMove(event) {
    const rect = this.fixedGhostInterface.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const percentage = (mouseX / rect.width) * 100;
    
    const zone = this.getMouseZone(percentage);
    
    if (zone) {
      // スリープモードの場合は何もしない
      if (this.interfaceMode === 'sleep') {
        return;
      }
      
      // シフトモード状態に応じて検索エンジンを決定
      let targetEngine;
      if (this.isShiftMode && zone.shiftEngine) {
        targetEngine = zone.shiftEngine;
        console.log('🔀 GhostSearchBar: シフトモードON - 検索エンジン切り替え:', zone.engine, '→', targetEngine);
      } else {
        targetEngine = zone.engine;
        console.log('🖱️ GhostSearchBar: 通常モード - 検索エンジン:', targetEngine);
      }
      
      // 休眠モードまたは通常モードの場合
      if (targetEngine !== this.currentSearchEngine) {
        console.log('🖱️ [DEBUG] エンジン切り替え:', this.currentSearchEngine, '→', targetEngine);
        // 統一状態管理システムを使用 - 完全更新（UI更新も含む）
        this.updateSearchEngineState(targetEngine, 'full');
      }
    }
  }

  // マウス位置のパーセンテージから検索エンジン領域を取得
  getMouseZone(percentage) {
    return this.searchEngineZones.find(zone => 
      percentage >= zone.start && percentage <= zone.end
    );
  }

  // 統一状態管理システム - 検索エンジン状態の更新
  updateSearchEngineState(newEngine, updateType = 'full') {
    console.log('🔄 [DEBUG] updateSearchEngineState開始:', { newEngine, updateType });
    
    // 通常の検索エンジンかシフトキー時の検索エンジンかを判定
    let zone = this.searchEngineZones.find(z => z.engine === newEngine);
    let isShiftEngine = false;
    
    if (!zone) {
      // シフトキー時の検索エンジンをチェック
      if (this.shiftSearchEngines[newEngine]) {
        isShiftEngine = true;
        console.log('🔀 [DEBUG] シフトキー時の検索エンジン:', newEngine);
      } else {
        console.log('❌ [DEBUG] updateSearchEngineState: 無効なエンジン:', newEngine);
        return false;
      }
    }
    
    // 状態更新
    const oldState = { ...this.searchEngineState };
    this.searchEngineState.isTransitioning = true;
    this.searchEngineState.lastUpdateType = updateType;
    
    switch (updateType) {
      case 'title-only':
        // タイトルのみ更新（文章保持）
        this.searchEngineState.displayEngine = newEngine;
        console.log('🔄 [DEBUG] タイトルのみ更新:', newEngine);
        this.updateSearchBarTitleOnly();
        break;
        
      case 'lock-only':
        // ロックのみ更新
        this.searchEngineState.lockedEngine = newEngine;
        console.log('🔄 [DEBUG] ロックのみ更新:', newEngine);
        break;
        
      case 'current-only':
        // 現在のエンジンのみ更新（マウス位置による）
        this.searchEngineState.currentEngine = newEngine;
        this.currentSearchEngine = newEngine; // 後方互換性
        this.currentZone = zone; // 後方互換性
        console.log('🔄 [DEBUG] 現在のエンジンのみ更新:', newEngine);
        break;
        
      case 'full':
      default:
        // 完全更新
        this.searchEngineState.currentEngine = newEngine;
        this.searchEngineState.displayEngine = newEngine;
        this.searchEngineState.lockedEngine = newEngine;
        
        // 後方互換性
        this.currentSearchEngine = newEngine;
        this.currentZone = zone;
        this.lockedSearchEngine = newEngine;
        this.lockedZone = zone;
        
        console.log('🔄 [DEBUG] 完全更新:', newEngine);
        
        // UI更新（ツールチップは表示しない）
        if (isShiftEngine) {
          const shiftEngineInfo = this.shiftSearchEngines[newEngine];
          this.updateBorderColor(shiftEngineInfo.borderColor);
        } else {
          this.updateBorderColor(zone.borderColor);
        }
        
        // タイトル更新は不要（新しいUIにはタイトルがない）
        break;
    }
    
    this.searchEngineState.isTransitioning = false;
    
    console.log('✅ [DEBUG] updateSearchEngineState完了:', {
      oldState,
      newState: this.searchEngineState,
      updateType
    });
    
    return true;
  }

  // 統一状態管理システム - タイトルのみ更新（文章保持）
  updateSearchBarTitleOnly() {
    console.log('🔄 [DEBUG] updateSearchBarTitleOnly: 開始');
    
    if (!this.isSearchBarVisible || !this.searchBar) {
      console.log('❌ [DEBUG] updateSearchBarTitleOnly: サーチバーが表示されていません');
      return;
    }
    
    const titleElement = this.searchBar.querySelector('.ghost-search-title');
    if (!titleElement) {
      console.log('❌ [DEBUG] updateSearchBarTitleOnly: タイトル要素が見つかりません');
      return;
    }
    
    const displayEngine = this.searchEngineState.displayEngine || this.searchEngineState.lockedEngine || 'google';
    
    // シフトキー時の検索エンジンをチェック
    if (this.shiftSearchEngines[displayEngine]) {
      const shiftEngineInfo = this.shiftSearchEngines[displayEngine];
      const oldTitle = titleElement.textContent;
      titleElement.textContent = shiftEngineInfo.name;
      console.log('🔀 [DEBUG] updateSearchBarTitleOnly: シフトキー時の検索エンジン:', shiftEngineInfo.name);
      console.log('✅ [DEBUG] updateSearchBarTitleOnly: タイトル更新完了:', oldTitle, '→', shiftEngineInfo.name);
    } else {
      const zone = this.searchEngineZones.find(z => z.engine === displayEngine);
      
      if (zone) {
        const oldTitle = titleElement.textContent;
        titleElement.textContent = zone.name;
        
        console.log('✅ [DEBUG] updateSearchBarTitleOnly: タイトル更新完了:', oldTitle, '→', zone.name);
      } else {
        console.log('❌ [DEBUG] updateSearchBarTitleOnly: ゾーンが見つかりません:', displayEngine);
      }
    }
  }

  // 検索エンジンの切り替え（統一状態管理システムを使用）
  switchSearchEngine(zone) {
    console.log('🔄 [DEBUG] switchSearchEngine開始 - 新しいゾーン:', zone.name);
    console.log('🔄 [DEBUG] 切り替え前の検索エンジン:', this.currentSearchEngine);
    console.log('🔄 [DEBUG] 現在のモード:', this.interfaceMode);
    
    // 統一状態管理システムを使用
    this.updateSearchEngineState(zone.engine, 'full');
    
    console.log('🔄 [DEBUG] switchSearchEngine完了');
  }

  // 破線の色を更新
  updateBorderColor(color) {
    this.fixedGhostInterface.style.borderTopColor = color;
    this.fixedGhostInterface.style.borderLeftColor = color;
  }

  // デフォルトエンジンにリセット
  resetToDefaultEngine() {
    console.log('🔄 [DEBUG] resetToDefaultEngine開始 - 現在の検索エンジン:', this.currentSearchEngine);
    console.log('🔄 [DEBUG] resetToDefaultEngine - 現在のモード:', this.interfaceMode);
    
    if (this.interfaceMode === 'sleep') {
      // スリープモード: 破線を完全に非表示
      this.updateBorderColor('transparent');
      console.log('🔄 [DEBUG] スリープモード - 破線を透明に');
    } else if (this.interfaceMode === 'dormant') {
      // 休眠モード: 破線を透明に（マウスオーバー時のみ検索エンジンの色を表示）
      this.updateBorderColor('transparent');
      console.log('🔄 [DEBUG] 休眠モード - 破線を透明に');
    } else {
      // 通常モード: デフォルトは赤色の破線
      const defaultColor = 'rgba(255, 0, 0, 0.8)';
      this.updateBorderColor(defaultColor);
      console.log('🔄 [DEBUG] 通常モード - 赤色破線にリセット');
    }
    
    this.currentSearchEngine = null; // 初期状態にリセット
    this.currentZone = null; // デフォルト状態ではゾーンなし
    console.log('🔄 [DEBUG] resetToDefaultEngine完了');
  }

  // インターフェースモードの切り替え
  cycleInterfaceMode() {
    const modes = ['normal', 'dormant', 'sleep'];
    const currentIndex = modes.indexOf(this.interfaceMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const oldMode = this.interfaceMode;
    this.interfaceMode = modes[nextIndex];
    
    console.log('🔄 GhostSearchBar: モード切り替え:', oldMode, '→', this.interfaceMode);
    
    // モードに応じた視覚的フィードバック
    this.updateModeVisualFeedback();
  }

  // モードに応じた視覚的フィードバック
  updateModeVisualFeedback() {
    console.log('🎨 GhostSearchBar: 視覚的フィードバック更新 - モード:', this.interfaceMode);
    
    if (this.interfaceMode === 'sleep') {
      // スリープモード: 破線を完全に非表示
      this.updateBorderColor('transparent');
      console.log('🎨 スリープモード: 破線を透明に設定');
    } else if (this.interfaceMode === 'dormant') {
      // 休眠モード: 破線を透明に（マウスオーバー時のみ色が変わる）
      this.updateBorderColor('transparent');
      console.log('🎨 休眠モード: 破線を透明に設定（マウスオーバー時のみ色表示）');
    } else {
      // 通常モード: 赤色の破線を表示
      this.updateBorderColor('rgba(255, 0, 0, 0.8)');
      console.log('🎨 通常モード: 赤色破線を表示');
    }
  }


  // 検索エンジンを固定（統一状態管理システムを使用）
  lockSearchEngine() {
    const engineToLock = this.searchEngineState.currentEngine || this.currentSearchEngine || 'google';
    console.log('🔒 [DEBUG] lockSearchEngine - 現在の検索エンジンを固定:', engineToLock);
    
    // 統一状態管理システムを使用
    this.updateSearchEngineState(engineToLock, 'lock-only');
    
    console.log('🔒 [DEBUG] 固定された検索エンジン:', this.searchEngineState.lockedEngine);
  }

  // 固定された検索エンジンを取得（統一状態管理システムを使用）
  getLockedSearchEngine() {
    const result = this.searchEngineState.lockedEngine || 
                   this.searchEngineState.currentEngine || 
                   this.lockedSearchEngine || 
                   this.currentSearchEngine || 
                   'google';
    
    console.log('🔒 [DEBUG] getLockedSearchEngine:', {
      stateLockedEngine: this.searchEngineState.lockedEngine,
      stateCurrentEngine: this.searchEngineState.currentEngine,
      legacyLockedEngine: this.lockedSearchEngine,
      legacyCurrentEngine: this.currentSearchEngine,
      result: result
    });
    return result;
  }

  // サーチバーのタイトルを更新
  updateSearchBarTitle() {
    console.log('🔄 [DEBUG] updateSearchBarTitle: 開始');
    
    if (!this.searchBar) {
      console.log('❌ [DEBUG] updateSearchBarTitle: サーチバーが存在しない');
      return;
    }
    
    const titleElement = this.searchBar.querySelector('.ghost-search-title');
    if (!titleElement) {
      console.log('❌ [DEBUG] updateSearchBarTitle: タイトル要素が見つからない');
      return;
    }
    
    const lockedEngine = this.getLockedSearchEngine();
    console.log('🔄 [DEBUG] updateSearchBarTitle: ロックされた検索エンジン:', lockedEngine);
    
    // シフトキー時の検索エンジンをチェック
    if (this.shiftSearchEngines[lockedEngine]) {
      const shiftEngineInfo = this.shiftSearchEngines[lockedEngine];
      const oldTitle = titleElement.textContent;
      titleElement.textContent = shiftEngineInfo.name;
      console.log('🔀 [DEBUG] updateSearchBarTitle: シフトキー時の検索エンジン:', shiftEngineInfo.name);
      console.log('✅ [DEBUG] updateSearchBarTitle: タイトル更新完了:', oldTitle, '→', shiftEngineInfo.name);
    } else {
      const zone = this.searchEngineZones.find(z => z.engine === lockedEngine);
      console.log('🔄 [DEBUG] updateSearchBarTitle: 見つかったゾーン:', zone);
      
      if (zone) {
        const oldTitle = titleElement.textContent;
        titleElement.textContent = zone.name;
        console.log('✅ [DEBUG] updateSearchBarTitle: タイトル更新完了:', oldTitle, '→', zone.name);
        console.log('📝 [DEBUG] サーチバータイトル更新:', zone.name);
      } else {
        titleElement.textContent = 'Google';
        console.log('📝 [DEBUG] サーチバータイトル更新: Google (デフォルト)');
      }
    }
  }

  // ツールチップ機能は削除（ゴーストエリアには表示しない）

  // ツールチップ機能は削除（ゴーストエリアには表示しない）

  showGhostInterface(event) {
    console.log('👻 GhostSearchBar: showGhostInterface 呼び出し');
    
    if (!this.ghostInterface) {
      console.log('❌ GhostSearchBar: ゴーストインターフェースが存在しない');
      return;
    }

    // 選択範囲の正確な位置を取得
    const selection = window.getSelection();
    console.log('👻 GhostSearchBar: 選択範囲数:', selection.rangeCount);
    
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      console.log('👻 GhostSearchBar: 選択範囲の位置:', rect);
      
      // 選択範囲を記録
      this.lastSelectionRect = rect;
      
      // スクロール位置を考慮した絶対位置を計算
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      // ゴーストインターフェースを選択範囲に配置（絶対位置）
      this.ghostInterface.style.position = 'absolute';
      this.ghostInterface.style.left = (rect.left + scrollX) + 'px';
      this.ghostInterface.style.top = (rect.top + scrollY) + 'px';
      this.ghostInterface.style.width = rect.width + 'px';
      this.ghostInterface.style.height = rect.height + 'px';
      this.ghostInterface.style.display = 'block';
      this.ghostInterface.style.zIndex = '999998';
      // ホイールスクロールとマウスオーバーのみイベントを受け取る
      this.ghostInterface.style.pointerEvents = 'auto';
      
      console.log('👻 GhostSearchBar: ゴーストインターフェースのスタイル設定完了');
      console.log('👻 GhostSearchBar: 位置:', rect.left + scrollX, rect.top + scrollY, 'サイズ:', rect.width, rect.height);
      console.log('👻 GhostSearchBar: スクロール位置:', scrollX, scrollY);
      console.log('👻 GhostSearchBar: pointerEvents:', this.ghostInterface.style.pointerEvents);
      
      // 選択されたテキストを保存
      this.selectedText = selection.toString().trim();
      
      // 固定ゴーストインターフェースは表示を維持
      console.log('🔍 GhostSearchBar: 固定ゴーストインターフェースを維持');
    } else {
      console.log('❌ GhostSearchBar: 選択範囲が存在しない');
    }
  }

  hideGhostInterface() {
    if (this.ghostInterface) {
      this.ghostInterface.style.display = 'none';
    }
    if (this.ghostMark) {
      this.ghostMark.style.display = 'none';
    }
    if (this.ghostGuide) {
      this.ghostGuide.style.display = 'none';
    }
    
    // 複数のゴーストインターフェース要素もクリア（メソッドは削除済み）
    
    // 固定ゴーストインターフェースは常に表示を維持
    if (this.fixedGhostInterface) {
      this.fixedGhostInterface.style.display = 'block';
    }
  }


  showSearchBar(event) {
    // 検索ツールバーの存在確認
    if (!this.searchBar) {
      console.log('❌ GhostSearchBar: 検索ツールバーが存在しない - 再作成を試行');
      this.createSearchBar();
      
      // 再作成後も存在しない場合はエラー
      if (!this.searchBar) {
        console.log('❌ GhostSearchBar: 検索ツールバーの再作成に失敗');
        return;
      }
    }

    // 位置をゴーストエリアの下に設定
    this.positionSearchBar();
    
    this.searchBar.style.display = 'block';
    this.isSearchBarVisible = true; // 表示状態フラグを設定
    
    // タイトルを更新
    this.updateSearchBarTitle();
    
    console.log('✅ GhostSearchBar: 検索ツールバー表示完了');
  }

  hideSearchBar() {
    if (!this.searchBar) {
      console.log('❌ GhostSearchBar: 検索ツールバーが存在しない');
      return;
    }
    
    this.searchBar.style.display = 'none';
    this.isSearchBarVisible = false; // 表示状態フラグをクリア
    
    // 固定検索エンジンをリセット
    this.lockedSearchEngine = null;
    this.lockedZone = null;
    
    console.log('✅ GhostSearchBar: 検索ツールバー非表示完了');
  }
  
  // 設定画面を開く
  openSettingsPage() {
    console.log('⚙️ GhostSearchBar: 設定画面を開く');
    chrome.runtime.sendMessage({
      action: 'openSettings'
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('⚙️ GhostSearchBar: 設定画面を開くのに失敗:', chrome.runtime.lastError);
      } else {
        console.log('⚙️ GhostSearchBar: 設定画面を開きました');
      }
    });
  }

  handleWheelScroll(event) {
    console.log('🔄 GhostSearchBar: ホイールスクロールイベント発火', event.deltaY);
    event.preventDefault();
    
    // 現在の選択テキストを確認（保存された選択も含む）
    const selection = window.getSelection();
    let currentText = selection.toString().trim();
    
    // 保存された選択がある場合はそれを使用
    if (!currentText && this.savedSelection) {
      currentText = this.savedSelection.toString().trim();
      console.log('🔄 GhostSearchBar: 保存されたテキスト選択を使用:', currentText);
    }
    
    const hasSelectedText = currentText && currentText.length > 0;
    
    if (hasSelectedText) {
      // テキスト選択時
      this.selectedText = currentText;
      
      if (event.deltaY < 0) {
        // 上スクロール: 検索バー+予測変換を表示
        console.log('🔄 GhostSearchBar: 上スクロール（テキスト選択時） - 検索バー+予測変換表示');
        this.showSearchBarWithPredictions(currentText);
      } else if (event.deltaY > 0) {
        // 下スクロール: ブラウザ既定検索エンジンで即座検索
        console.log('🔄 GhostSearchBar: 下スクロール（テキスト選択時） - 既定検索エンジンで即座検索');
        this.performImmediateDefaultSearch(currentText);
      }
    } else {
      // テキスト未選択時
      if (event.deltaY < 0 || event.deltaY > 0) {
        // 上下どちらでも検索バー+履歴を表示
        console.log('🔄 GhostSearchBar: スクロール（テキスト未選択時） - 検索バー+履歴表示');
        this.showSearchBarWithHistory();
      }
    }
    
    this.hideGhostInterface();
  }
  
  // 検索バー+予測変換を表示（テキスト選択時・上スクロール）
  showSearchBarWithPredictions(selectedText) {
    if (!this.searchBar) {
      this.createSearchBar();
    }
    
    const searchInput = this.searchBar.querySelector('#ghost-search-input');
    if (searchInput) {
      searchInput.value = selectedText;
    }
    
    // 位置を設定して検索バーを表示
    this.positionSearchBar();
    this.searchBar.style.display = 'block';
    this.isSearchBarVisible = true;
    
    // ホイールスクロールで呼び出された場合は、設定された検索エンジンを使用
    const wheelScrollEngineId = this.settings.wheelScrollSearchEngine || 'google';
    const wheelScrollKey = this.getKeyByEngineId(wheelScrollEngineId) || 'g';
    this.currentSelectedEngine = wheelScrollKey;
    const wheelScrollShortcut = this.keyShortcuts[wheelScrollKey];
    if (wheelScrollShortcut) {
      const engines = Array.isArray(wheelScrollShortcut) ? wheelScrollShortcut : [wheelScrollShortcut];
      const engineNames = engines.map(e => e.name).join(', ');
      this.updateSearchBarTitle(engineNames);
      this.updateEngineSelectorName(engineNames);
      console.log('📋 GhostSearchBar: 検索エンジンを設定（予測変換）:', engineNames, 'キー:', wheelScrollKey);
    } else {
      this.updateSearchBarTitle();
      console.log('⚠️ GhostSearchBar: ホイールスクロール検索エンジンのキーショートカットが見つかりません');
    }
    
    // 予測変換を表示
    this.updateSuggestionsForInput(selectedText);
    
    // 履歴は非表示
    this.hideHistory();
  }
  
  // 検索バー+履歴を表示（テキスト未選択時）
  showSearchBarWithHistory(selectedKey = null) {
    console.log('📋 GhostSearchBar: 検索バー+履歴を表示', selectedKey ? `キー: ${selectedKey}` : '');
    
    if (!this.searchBar) {
      this.createSearchBar();
    }
    
    const searchInput = this.searchBar.querySelector('#ghost-search-input');
    if (searchInput) {
      searchInput.value = '';
    }
    
    // 位置を設定して検索バーを表示
    this.positionSearchBar();
    this.searchBar.style.display = 'block';
    this.isSearchBarVisible = true;
    
    // 検索エンジンの設定
    // キーが指定されている場合はそれを使用、既にcurrentSelectedEngineが設定されている場合もそれを使用
    // それ以外の場合はホイールスクロール用の検索エンジンを使用
    let engineKey = null;
    if (selectedKey && this.keyShortcuts[selectedKey]) {
      // キーが指定されている場合
      engineKey = selectedKey;
      this.currentSelectedEngine = engineKey;
      console.log('📋 GhostSearchBar: 指定されたキーで検索エンジンを設定:', selectedKey, this.keyShortcuts[selectedKey].name);
    } else if (this.currentSelectedEngine && this.keyShortcuts[this.currentSelectedEngine]) {
      // 既にcurrentSelectedEngineが設定されている場合
      engineKey = this.currentSelectedEngine;
      console.log('📋 GhostSearchBar: 既存の検索エンジンを使用:', engineKey, this.keyShortcuts[engineKey].name);
    } else {
      // ホイールスクロールで呼び出された場合は、設定された検索エンジンを使用
      const wheelScrollEngineId = this.settings.wheelScrollSearchEngine || 'google';
      engineKey = this.getKeyByEngineId(wheelScrollEngineId) || 'g';
      this.currentSelectedEngine = engineKey;
      console.log('📋 GhostSearchBar: ホイールスクロール用の検索エンジンを使用:', engineKey);
    }
    
    // 検索エンジンをUIに反映
    const shortcut = this.keyShortcuts[engineKey];
    if (shortcut) {
      const engines = Array.isArray(shortcut) ? shortcut : [shortcut];
      const engineNames = engines.map(e => e.name).join(', ');
      this.updateSearchBarTitle(engineNames);
      this.updateEngineSelectorName(engineNames);
      console.log('📋 GhostSearchBar: 検索エンジンを設定:', engineNames, 'キー:', engineKey);
    } else {
      this.updateSearchBarTitle();
      console.log('⚠️ GhostSearchBar: 検索エンジンのキーショートカットが見つかりません:', engineKey);
    }
    
    // 履歴を表示
    this.loadSearchHistory();
    
    // 予測変換は非表示
    this.hideSuggestions();
    
    console.log('📋 GhostSearchBar: 検索バー+履歴表示完了');
  }
  
  // ブラウザ既定検索エンジンで即座検索（テキスト選択時・下スクロール）
  performImmediateDefaultSearch(searchText) {
    if (!searchText || searchText.length === 0) {
      console.log('❌ GhostSearchBar: 即座検索用のテキストが存在しない');
      return;
    }
    
    // ホイールスクロール時の即時検索エンジンを使用
    const wheelScrollEngineId = this.settings.wheelScrollSearchEngine || this.settings.defaultSearchEngine || 'google';
    const wheelScrollKey = this.getKeyByEngineId(wheelScrollEngineId) || 'g';
    const shortcut = this.keyShortcuts[wheelScrollKey];
    
    if (shortcut) {
      // 複数エンジンの場合はすべてで検索、単一エンジンの場合は1つで検索
      const engines = Array.isArray(shortcut) ? shortcut : [shortcut];
      engines.forEach((engine, index) => {
        const url = engine.url.replace('{query}', encodeURIComponent(searchText));
        if (index === 0) {
          window.open(url, '_blank');
        } else {
          setTimeout(() => {
            window.open(url, '_blank');
          }, index * 100);
        }
      });
      this.saveSearchHistory(searchText, wheelScrollEngineId);
      const engineNames = engines.map(e => e.name).join(', ');
      console.log('🚀 GhostSearchBar: ホイールスクロール検索エンジンで即座検索実行:', searchText, 'エンジン:', engineNames, 'キー:', wheelScrollKey);
    } else {
      // フォールバック: Google検索
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchText)}`;
      window.open(searchUrl, '_blank');
      this.saveSearchHistory(searchText, 'google');
      console.log('🚀 GhostSearchBar: フォールバック - Googleで即座検索実行:', searchText);
    }
    
    // 統計を更新
    this.updateStats('immediate_search');
  }

  showSearchBarGhostMark() {
    console.log('🎯 GhostSearchBar: showSearchBarGhostMark 呼び出し');
    
    if (!this.ghostMark || !this.ghostInterface) {
      console.log('❌ GhostSearchBar: サーチバーゴーストマークまたはインターフェースが存在しない');
      return;
    }

    // サーチバーゴーストマークを選択範囲にぴったり合わせて表示
    const rect = this.ghostInterface.getBoundingClientRect();
    console.log('🎯 GhostSearchBar: サーチバーゴーストマーク位置計算:', rect);
    
    // スクロール位置を考慮した絶対位置を計算
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    this.ghostMark.style.position = 'absolute';
    this.ghostMark.style.left = (rect.left + scrollX) + 'px';
    this.ghostMark.style.top = (rect.top + scrollY) + 'px';
    this.ghostMark.style.width = rect.width + 'px';
    this.ghostMark.style.height = rect.height + 'px';
    this.ghostMark.style.display = 'block';
    this.ghostMark.style.zIndex = '999999';

    console.log('🎯 GhostSearchBar: サーチバーゴーストマーク表示完了');
    console.log('🎯 GhostSearchBar: マーク位置:', rect.left + scrollX, rect.top + scrollY);

    // サーチバーゴーストガイドは一時的に非表示（後で使用予定）
    // this.showSearchBarGhostGuide();
  }

  hideSearchBarGhostMark() {
    if (this.ghostMark) {
      this.ghostMark.style.display = 'none';
    }
    if (this.ghostGuide) {
      this.ghostGuide.style.display = 'none';
    }
  }

  showSearchBarGhostGuide() {
    if (!this.ghostGuide || !this.ghostInterface) return;

    // サーチバーゴーストガイドを選択範囲の上に表示
    const rect = this.ghostInterface.getBoundingClientRect();
    
    // スクロール位置を考慮した絶対位置を計算
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    this.ghostGuide.style.position = 'absolute';
    this.ghostGuide.style.left = (rect.left + scrollX) + 'px';
    this.ghostGuide.style.top = (rect.top + scrollY - 80) + 'px';
    this.ghostGuide.style.display = 'block';
    this.ghostGuide.style.zIndex = '999999';
    
    console.log('📚 GhostSearchBar: サーチバーゴーストガイド表示完了');
    console.log('📚 GhostSearchBar: ガイド位置:', rect.left + scrollX, rect.top + scrollY - 80);
  }

  // 選択された検索エンジンで検索
  performDefaultSearch() {
    const searchInput = this.searchBar.querySelector('#ghost-search-input');
    if (!searchInput) {
      console.log('❌ GhostSearchBar: 検索入力フィールドが見つからない');
      return;
    }
    
    const searchText = searchInput.value.trim();
    if (!searchText || searchText.length === 0) {
      console.log('❌ GhostSearchBar: 検索テキストが入力されていない');
      return;
    }
    
    // 現在選択されている検索エンジンを使用
    const selectedEngine = this.currentSelectedEngine || 'google';
    const shortcut = this.keyShortcuts[selectedEngine];
    
    if (shortcut) {
      // 複数エンジンの場合はすべてで検索、単一エンジンの場合は1つで検索
      const engines = Array.isArray(shortcut) ? shortcut : [shortcut];
      engines.forEach((engine, index) => {
        const url = engine.url.replace('{query}', encodeURIComponent(searchText));
        if (index === 0) {
          window.open(url, '_blank');
        } else {
          setTimeout(() => {
            window.open(url, '_blank');
          }, index * 100);
        }
      });
      
      const engineNames = engines.map(e => e.name).join(', ');
      console.log('🔍 GhostSearchBar: 検索実行:', searchText, 'エンジン:', engineNames);
      
      // 検索履歴に保存
      this.saveSearchHistory(searchText, selectedEngine);
    } else {
      // フォールバック: Google検索
      const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchText)}`;
      window.open(searchUrl, '_blank');
      this.saveSearchHistory(searchText, 'google');
    }
    
    // 統計を更新
    this.updateStats('search');
  }
  
  // 旧メソッド名との互換性
  performGoogleSearch() {
    this.performDefaultSearch();
  }

  // 統一状態管理システム - 検索実行前の状態整合性チェック
  validateSearchEngineState() {
    const lockedEngine = this.getLockedSearchEngine();
    const currentTitle = this.searchBar?.querySelector('.ghost-search-title')?.textContent;
    const currentZone = this.searchEngineZones.find(z => z.engine === lockedEngine);
    
    console.log('🔍 [DEBUG] validateSearchEngineState: 状態チェック開始', {
      lockedEngine,
      currentTitle,
      expectedTitle: currentZone?.name,
      isConsistent: currentTitle === currentZone?.name
    });
    
    // タイトルとロックされたエンジンが一致しない場合は同期
    if (currentZone && currentTitle !== currentZone.name) {
      console.log('🔄 [DEBUG] タイトルと検索エンジンが不一致 - 同期します');
      this.updateSearchBarTitleOnly();
    }
    
    // 状態の整合性を確保
    if (this.searchEngineState.lockedEngine !== lockedEngine) {
      console.log('🔄 [DEBUG] 状態管理システムとロックエンジンが不一致 - 同期します');
      this.updateSearchEngineState(lockedEngine, 'lock-only');
    }
  }

  // 統一状態管理システム - デバッグ用状態確認メソッド
  debugSearchEngineState() {
    const currentTitle = this.searchBar?.querySelector('.ghost-search-title')?.textContent;
    const lockedEngine = this.getLockedSearchEngine();
    
    console.log('🔍 [DEBUG] 統一状態管理システム - 現在の状態:', {
      searchEngineState: this.searchEngineState,
      currentTitle: currentTitle,
      lockedEngine: lockedEngine,
      isSearchBarVisible: this.isSearchBarVisible,
      lastUpdateType: this.searchEngineState.lastUpdateType,
      isTransitioning: this.searchEngineState.isTransitioning
    });
    
    return {
      searchEngineState: this.searchEngineState,
      currentTitle: currentTitle,
      lockedEngine: lockedEngine,
      isSearchBarVisible: this.isSearchBarVisible
    };
  }

  // 新しく選択されたテキストで即座検索を実行（検索ツールバーの内容は変更しない）
  performImmediateSearch(searchText) {
    if (!searchText || searchText.length === 0) {
      console.log('❌ GhostSearchBar: 即座検索用のテキストが存在しない');
      return;
    }
    
    const lockedEngine = this.getLockedSearchEngine();
    const searchUrl = this.getSearchUrl(searchText, lockedEngine);
    window.open(searchUrl, '_blank');
    
    console.log('🚀 GhostSearchBar: 新しく選択されたテキストで即座検索実行:', searchText, '固定エンジン:', lockedEngine);
    
    // 統計を更新
    this.updateStats('immediate_search');
  }

  // 検索エンジンに応じた検索URLを生成
  getSearchUrl(query, engine) {
    const encodedQuery = encodeURIComponent(query);
    console.log('🔍 [DEBUG] getSearchUrl呼び出し - クエリ:', query, 'エンジン:', engine);
    
    let url = '';
    
    // シフトキー時の検索エンジンをチェック
    if (this.shiftSearchEngines[engine]) {
      const shiftEngineInfo = this.shiftSearchEngines[engine];
      url = shiftEngineInfo.url + encodedQuery;
      console.log('🔀 [DEBUG] シフトキー時の検索エンジン使用:', engine, 'URL:', url);
    } else {
      // 通常の検索エンジン
      switch (engine) {
        case 'google':
          url = `https://www.google.com/search?q=${encodedQuery}`;
          break;
        case 'bing':
          url = `https://www.bing.com/search?q=${encodedQuery}`;
          break;
        case 'yahoo':
          url = `https://search.yahoo.com/search?p=${encodedQuery}`;
          break;
        case 'ecosia':
          url = `https://www.ecosia.org/search?q=${encodedQuery}`;
          break;
        default:
          url = `https://www.google.com/search?q=${encodedQuery}`;
          console.log('⚠️ [DEBUG] 未知の検索エンジン:', engine, 'デフォルトのGoogleを使用');
          break;
      }
    }
    
    console.log('🔍 [DEBUG] 生成されたURL:', url);
    return url;
  }

  // addToSearchBarメソッドは削除（上ドラッグ機能に置き換え）

  loadSettings() {
    // 設定の読み込み
    chrome.storage.sync.get(['ghostSearchSettings', 'ghostKeyShortcuts'], (result) => {
      if (result.ghostSearchSettings) {
        this.settings = result.ghostSearchSettings;
        console.log('設定を読み込みました:', this.settings);
        
        // デフォルト検索エンジンの設定
        if (!this.settings.defaultSearchEngine) {
          this.settings.defaultSearchEngine = 'google';
        }
        
        // ホイールスクロール時の検索エンジンの設定
        if (!this.settings.wheelScrollSearchEngine) {
          this.settings.wheelScrollSearchEngine = 'google';
        }
        
        // 設定に基づいて動作を調整
        if (this.settings.enabled === false) {
          this.disable();
        }
      } else {
        // デフォルト設定
        this.settings = {
          enabled: true,
          defaultSearchEngine: 'google',
          maxHistoryPerPage: 10
        };
      }
      
      // キーショートカット設定の読み込み
      if (result.ghostKeyShortcuts) {
        this.loadKeyShortcuts(result.ghostKeyShortcuts);
      }
    });
  }
  
  // キーショートカット設定の読み込み
  loadKeyShortcuts(shortcutsConfig) {
    console.log('🔄 GhostSearchBar: loadKeyShortcuts開始 - 受信した設定:', shortcutsConfig);
    
    // 利用可能な検索エンジン定義（言語/地域に応じて動的に生成）
    const engineDefinitions = this.generateEngineDefinitions();
    console.log('🔄 GhostSearchBar: エンジン定義:', Object.keys(engineDefinitions));
    console.log('🔄 GhostSearchBar: rakutenが含まれているか:', 'rakuten' in engineDefinitions);
    if ('rakuten' in engineDefinitions) {
      console.log('🔄 GhostSearchBar: rakutenの定義:', engineDefinitions['rakuten']);
    }
    
    // キーショートカット設定を保存（エンジンIDからキーを逆引きするため）
    this.keyShortcutsConfig = shortcutsConfig;
    
    // 設定されたキーショートカットを適用
    this.keyShortcuts = {};
    Object.entries(shortcutsConfig).forEach(([key, engineIdOrArray]) => {
      // 配列形式と文字列形式の両方をサポート（後方互換性）
      const engineIds = Array.isArray(engineIdOrArray) ? engineIdOrArray : [engineIdOrArray];
      const engines = engineIds
        .map(id => engineDefinitions[id])
        .filter(engine => engine !== undefined);
      
      if (engines.length > 0) {
        // 複数エンジンの場合は配列、単一エンジンの場合も配列で統一（互換性のため）
        this.keyShortcuts[key] = engines.length === 1 ? engines[0] : engines;
        const engineNames = engines.map(e => e.name).join(', ');
        console.log(`🔄 GhostSearchBar: キーショートカット設定 - ${key} → ${engineIds.join(', ')} (${engineNames})`);
      } else {
        console.log(`⚠️ GhostSearchBar: エンジン定義が見つかりません - ${key} → ${Array.isArray(engineIdOrArray) ? engineIdOrArray.join(', ') : engineIdOrArray}`);
      }
    });
    
    // 設定されていないキーはデフォルト設定を使用
    Object.entries(this.defaultKeyShortcuts).forEach(([key, engine]) => {
      if (!this.keyShortcuts[key]) {
        this.keyShortcuts[key] = engine;
        console.log(`🔄 GhostSearchBar: デフォルト設定を使用 - ${key} → ${engine.name}`);
      }
    });
    
    console.log('🔄 GhostSearchBar: キーショートカット設定を読み込みました:', this.keyShortcuts);
    console.log('🔄 GhostSearchBar: keyShortcutsのキー一覧:', Object.keys(this.keyShortcuts));
  }
  
  // エンジンIDからキーを取得
  getKeyByEngineId(engineId) {
    // 設定されたキーショートカットから検索
    if (this.keyShortcutsConfig) {
      for (const [key, id] of Object.entries(this.keyShortcutsConfig)) {
        if (id === engineId) {
          return key;
        }
      }
    }
    
    // デフォルトのマッピングから検索（設定が読み込まれていない場合）
    const defaultMapping = {
      'youtube': 'y',
      'wikipedia': 'w',
      'google': 'g',
      'bing': 'b',
      'amazon': 'a',
      'twitter': 't',
      'reddit': 'r',
      'note': 'n',
      'quora': 'q',
      'zenn': 'z',
      'pixiv': 'p',
      'chiebukuro': 'c',
      'googlemaps': 'm',
      'github': 'h',
      'stackoverflow': 's',
      'instagram': 'i',
      'facebook': 'f',
      'bluesky': 'u',
      'ecosia': 'e'
    };
    
    return defaultMapping[engineId] || null;
  }
  
  // 検索エンジン定義を生成（言語/地域対応）
  generateEngineDefinitions() {
    // 最新の言語・地域を再検出
    const lang = this.detectLanguage();
    const region = this.detectRegion();
    
    // Amazonの地域別URL
    const amazonDomains = {
      'JP': 'https://www.amazon.co.jp/s?k={query}',
      'US': 'https://www.amazon.com/s?k={query}',
      'UK': 'https://www.amazon.co.uk/s?k={query}',
      'DE': 'https://www.amazon.de/s?k={query}',
      'FR': 'https://www.amazon.fr/s?k={query}',
      'IT': 'https://www.amazon.it/s?k={query}',
      'ES': 'https://www.amazon.es/s?k={query}',
      'CA': 'https://www.amazon.ca/s?k={query}',
      'AU': 'https://www.amazon.com.au/s?k={query}',
      'CN': 'https://www.amazon.cn/s?k={query}'
    };
    
    // Wikipediaの言語別URL
    const wikipediaLanguages = {
      'ja': 'https://ja.wikipedia.org/wiki/Special:Search?search={query}',
      'en': 'https://en.wikipedia.org/wiki/Special:Search?search={query}',
      'zh': 'https://zh.wikipedia.org/wiki/Special:Search?search={query}',
      'ko': 'https://ko.wikipedia.org/wiki/Special:Search?search={query}',
      'fr': 'https://fr.wikipedia.org/wiki/Special:Search?search={query}',
      'de': 'https://de.wikipedia.org/wiki/Special:Search?search={query}',
      'es': 'https://es.wikipedia.org/wiki/Special:Search?search={query}',
      'it': 'https://it.wikipedia.org/wiki/Special:Search?search={query}',
      'pt': 'https://pt.wikipedia.org/wiki/Special:Search?search={query}',
      'ru': 'https://ru.wikipedia.org/wiki/Special:Search?search={query}',
      'ar': 'https://ar.wikipedia.org/wiki/Special:Search?search={query}'
    };
    
    // Yahoo!の地域別URL
    const yahooDomains = {
      'JP': 'https://search.yahoo.co.jp/search?p={query}',
      'US': 'https://search.yahoo.com/search?p={query}',
      'UK': 'https://uk.search.yahoo.com/search?p={query}',
      'AU': 'https://au.search.yahoo.com/search?p={query}',
      'CA': 'https://ca.search.yahoo.com/search?p={query}'
    };
    
    // Yahoo!知恵袋の地域別URL
    const chiebukuroDomains = {
      'JP': 'https://chiebukuro.yahoo.co.jp/search?p={query}',
      'US': 'https://answers.yahoo.com/search/search_result?p={query}',
      'UK': 'https://uk.answers.yahoo.com/search/search_result?p={query}'
    };
    
    return {
      'google': { name: 'Google', icon: '🔍', url: `https://www.google.com/search?q={query}&hl=${lang}` },
      'bing': { name: 'Bing', icon: '🔎', url: `https://www.bing.com/search?q={query}&setlang=${lang}` },
      'yahoo': { name: 'Yahoo!', icon: '🌐', url: yahooDomains[region] || yahooDomains['US'] },
      'ecosia': { name: 'Ecosia', icon: '🌳', url: 'https://www.ecosia.org/search?q={query}' },
      'duckduckgo': { name: 'DuckDuckGo', icon: '🦆', url: 'https://duckduckgo.com/?q={query}' },
      'youtube': { name: 'YouTube', icon: '🎥', url: `https://www.youtube.com/results?search_query={query}&gl=${region}` },
      'wikipedia': { name: 'Wikipedia', icon: '📚', url: wikipediaLanguages[lang] || wikipediaLanguages['en'] },
      'amazon': { name: 'Amazon', icon: '🛒', url: amazonDomains[region] || amazonDomains['US'] },
      'twitter': { name: 'Twitter', icon: '🐦', url: 'https://twitter.com/search?q={query}' },
      'reddit': { name: 'Reddit', icon: '🤖', url: 'https://www.reddit.com/search?q={query}' },
      'note': { name: 'note', icon: '📝', url: 'https://note.com/search?q={query}' },
      'quora': { name: 'Quora', icon: '💬', url: 'https://www.quora.com/search?q={query}' },
      'zenn': { name: 'Zenn', icon: '📖', url: 'https://zenn.dev/search?q={query}' },
      'pixiv': { name: 'Pixiv', icon: '🎨', url: 'https://www.pixiv.net/tags/{query}' },
      'chiebukuro': { name: 'Yahoo!知恵袋', icon: '💡', url: chiebukuroDomains[region] || chiebukuroDomains['JP'] },
      'googlemaps': { name: 'Google Maps', icon: '🗺️', url: `https://www.google.com/maps/search/{query}?hl=${lang}` },
      'github': { name: 'GitHub', icon: '💾', url: 'https://github.com/search?q={query}' },
      'stackoverflow': { name: 'Stack Overflow', icon: '💬', url: 'https://stackoverflow.com/search?q={query}' },
      'instagram': { name: 'Instagram', icon: '📷', url: 'https://www.instagram.com/explore/tags/{query}/' },
      'facebook': { name: 'Facebook', icon: '👤', url: 'https://www.facebook.com/search/top/?q={query}' },
      'bluesky': { name: 'Bluesky', icon: '☁️', url: 'https://bsky.app/search?q={query}' },
      'rakuten': { name: '楽天市場', icon: '🛒', url: 'https://search.rakuten.co.jp/search/mall/{query}/' },
      'mercari': { name: 'メルカリ', icon: '🛍️', url: 'https://www.mercari.com/jp/search/?keyword={query}' },
      'cookpad': { name: 'クックパッド', icon: '🍳', url: 'https://cookpad.com/search/{query}' },
      'tabelog': { name: '食べログ', icon: '🍽️', url: 'https://tabelog.com/tokyo/rstLst/?vs=1&sa=&tid=&kw={query}' },
      'nicovideo': { name: 'ニコニコ動画', icon: '📺', url: 'https://www.nicovideo.jp/search/{query}' },
      'baidu': { name: 'Baidu', icon: '🔍', url: 'https://www.baidu.com/s?wd={query}' },
      'yandex': { name: 'YANDEX', icon: '🔎', url: 'https://yandex.com/search/?text={query}' },
      'naver': { name: 'Naver', icon: '🌐', url: 'https://search.naver.com/search.naver?query={query}' },
      'linkedin': { name: 'LinkedIn', icon: '💼', url: 'https://www.linkedin.com/search/results/all/?keywords={query}' },
      'pinterest': { name: 'Pinterest', icon: '📌', url: 'https://www.pinterest.com/search/pins/?q={query}' },
      'tiktok': { name: 'TikTok', icon: '🎵', url: 'https://www.tiktok.com/search?q={query}' }
    };
  }

  updateStats(type) {
    // 統計情報を更新
    chrome.storage.sync.get(['ghostStats'], (result) => {
      const stats = result.ghostStats || {
        totalSearches: 0,
        totalImmediateSearches: 0,
        totalAdditions: 0
      };
      
      if (type === 'search') {
        stats.totalSearches++;
      } else if (type === 'immediate_search') {
        stats.totalImmediateSearches++;
      } else if (type === 'addition') {
        stats.totalAdditions++;
      }
      
      chrome.storage.sync.set({ ghostStats: stats });
    });
  }

  disable() {
    // 拡張機能を無効化
    this.isEnabled = false;
    if (this.searchBar && this.isVisible) {
      this.hideSearchBar();
    }
    this.hideGhostInterface();
  }

  enable() {
    // 拡張機能を有効化
    this.isEnabled = true;
  }

  // 上ドラッグで検索ワードを追加
  setupUpDrag(event) {
    let startY = event.clientY;
    let isUpDrag = false;
    
    console.log('⬆️ GhostSearchBar: 上ドラッグ開始 - 開始位置:', startY);
    
    const handleMouseMove = (e) => {
      const deltaY = startY - e.clientY;
      
      // 上方向に一定距離ドラッグした場合
      if (deltaY > 30 && !isUpDrag) {
        isUpDrag = true;
        console.log('⬆️ GhostSearchBar: 上ドラッグ検出 - 検索ワードを追加');
        
        // 現在の選択テキストを確認
        const selection = window.getSelection();
        const currentText = selection.toString().trim();
        console.log('⬆️ Ghostドラッグ時の選択テキスト:', currentText);
        
        if (currentText) {
          // 選択テキストを更新
          this.selectedText = currentText;
          
          if (this.isSearchBarVisible) {
            // 検索ツールバーが既に表示中の場合は、新しいワードを追加
            console.log('⬆️ GhostSearchBar: 検索ツールバーが既に表示中 - 新しいワードを追加');
            this.addSelectedTextToSearchBar();
          } else {
            // 検索ツールバーが表示されていない場合は表示
            console.log('⬆️ GhostSearchBar: 検索ツールバーを表示');
            this.showSearchBar(event);
          }
        } else {
          console.log('❌ GhostSearchBar: 上ドラッグ時に選択テキストが存在しない');
        }
      }
    };
    
    const handleMouseUp = () => {
      console.log('⬆️ GhostSearchBar: 上ドラッグ終了');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  // サーチバーを表示して自動フォーカス
  showSearchBarWithFocus() {
    console.log('🔍 GhostSearchBar: showSearchBarWithFocus 呼び出し');
    
    // 選択されたテキストを一時的にクリアして空のサーチバーを表示
    const originalSelectedText = this.selectedText;
    this.selectedText = '';
    
    // 通常のサーチバー表示処理を実行
    this.showSearchBar();
    
    // 選択されたテキストを復元
    this.selectedText = originalSelectedText;
    
    // サーチバーが表示されたら自動フォーカス
    if (this.isSearchBarVisible) {
      const searchInput = this.searchBar.querySelector('#ghost-search-input');
      if (searchInput) {
        // 入力フィールドを空にして、空の状態で予測検索を呼び出し
        searchInput.value = '';
        
        // 少し遅延させてからフォーカス（DOM更新を待つ）
        setTimeout(() => {
          searchInput.focus();
          console.log('🔍 GhostSearchBar: サーチバーにフォーカス完了');
          
          // 空の入力でも予測検索を呼び出し（初期候補表示のため）
          this.updateSuggestionsForInput('');
        }, 100);
      }
    }
  }

  // 選択されたテキストを検索バーに追加
  addSelectedTextToSearchBar() {
    console.log('🔍 [DEBUG] addSelectedTextToSearchBar: 開始');
    
    // 現在の選択テキストを再取得（最新の状態を確認）
    const selection = window.getSelection();
    const currentSelectedText = selection.toString().trim();
    
    if (!currentSelectedText || currentSelectedText.length === 0) {
      console.log('❌ GhostSearchBar: 現在選択されているテキストが存在しない');
      return;
    }
    
    const searchInput = this.searchBar.querySelector('#ghost-search-input');
    if (!searchInput) {
      console.log('❌ GhostSearchBar: 検索入力フィールドが見つからない');
      return;
    }
    
    const currentValue = searchInput.value.trim();
    let newValue = '';
    
    if (currentValue) {
      // 既存の値がある場合はスペースを追加
      newValue = currentValue + ' ' + currentSelectedText;
    } else {
      // 初回の場合はそのまま
      newValue = currentSelectedText;
    }
    
    console.log('🔍 [DEBUG] addSelectedTextToSearchBar: 現在の値:', currentValue);
    console.log('🔍 [DEBUG] addSelectedTextToSearchBar: 新しい値:', newValue);
    
    searchInput.value = newValue;
    console.log('✅ GhostSearchBar: 検索ワードを追加:', currentSelectedText, '→', newValue);
    
    // 予測検索ワードを更新
    console.log('🔍 [DEBUG] addSelectedTextToSearchBar: updateSuggestionsForInput呼び出し');
    this.updateSuggestionsForInput(newValue);
    
    // 統計を更新
    this.updateStats('addition');
    
    // ゴーストインターフェースを非表示
    this.hideGhostInterface();
    
    console.log('🔍 [DEBUG] addSelectedTextToSearchBar: 完了');
  }

  // 選択テキストをサーチバーに追加して表示
  addSelectedTextToSearchBarAndShow() {
    console.log('🔍 [DEBUG] addSelectedTextToSearchBarAndShow: 開始');
    
    // 現在の選択テキストを再取得
    const selection = window.getSelection();
    const currentSelectedText = selection.toString().trim();
    
    if (!currentSelectedText || currentSelectedText.length === 0) {
      console.log('❌ GhostSearchBar: 現在選択されているテキストが存在しない');
      return;
    }
    
    // サーチバーが表示されていない場合は表示
    if (!this.isSearchBarVisible) {
      console.log('🔍 [DEBUG] サーチバーを新規表示');
      this.showSearchBar();
    } else {
      console.log('🔍 [DEBUG] サーチバーは既に表示中 - テキストを追加');
    }
    
    const searchInput = this.searchBar.querySelector('#ghost-search-input');
    if (!searchInput) {
      console.log('❌ GhostSearchBar: 検索入力フィールドが見つからない');
      return;
    }
    
    const currentValue = searchInput.value.trim();
    let newValue = '';
    
    // 選択テキストが既にサーチバーに含まれているかチェック
    if (currentValue && currentValue.includes(currentSelectedText)) {
      // 既に含まれている場合は重複を避ける
      console.log('⚠️ GhostSearchBar: 選択テキストは既にサーチバーに含まれています');
      newValue = currentValue;
    } else if (currentValue) {
      // 既存の値がある場合はスペースを追加
      newValue = currentValue + ' ' + currentSelectedText;
    } else {
      // 初回の場合はそのまま
      newValue = currentSelectedText;
    }
    
    searchInput.value = newValue;
    console.log('✅ GhostSearchBar: 選択テキストをサーチバーに追加:', currentSelectedText, '→', newValue);
    
    // サーチバーにフォーカスを当ててキーボード入力待ちにする
    searchInput.focus();
    console.log('🎯 GhostSearchBar: サーチバーにフォーカス設定 - キーボード入力待ち');
    
    // 予測検索ワードを更新
    this.updateSuggestionsForInput(newValue);
    
    // 統計を更新
    this.updateStats('addition');
    
    console.log('🔍 [DEBUG] addSelectedTextToSearchBarAndShow: 完了');
  }

  // サーチバーの表示状態を確認
  isSearchBarDisplayed() {
    return this.isSearchBarVisible && this.searchBar && this.searchBar.style.display === 'block';
  }

  // 検索入力の処理
  handleSearchInput(event) {
    const query = event.target.value.trim();
    
    if (query.length > 0) {
      this.fetchSearchSuggestions(query);
    } else {
      // 空の場合は予測候補を非表示
      this.hideSuggestions();
    }
  }

  // キーボード入力の処理
  handleSearchKeydown(event) {
    const suggestions = this.searchBar.querySelector('#ghost-search-suggestions');
    const items = suggestions.querySelectorAll('.suggestion-item');
    
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.navigateSuggestions(1, items);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.navigateSuggestions(-1, items);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const activeItem = suggestions.querySelector('.suggestion-item.active');
      if (activeItem) {
        this.selectSuggestion(activeItem.textContent);
      } else {
        this.performGoogleSearch();
      }
    } else if (event.key === 'Escape') {
      this.hideSuggestions();
    }
  }

  // 予測検索候補の取得（Background Script経由）
  async fetchSearchSuggestions(query) {
    console.log('🔍 [DEBUG] fetchSearchSuggestions: 開始, query:', query);
    
    try {
      // Background Script経由で予測検索APIを呼び出し
      console.log('🔍 [DEBUG] fetchSearchSuggestions: Background Scriptにメッセージ送信');
      
      const response = await chrome.runtime.sendMessage({
        action: 'fetchSearchSuggestions',
        query: query
      });
      
      console.log('🔍 [DEBUG] fetchSearchSuggestions: Background Scriptからのレスポンス:', response);
      
      if (response.success && response.suggestions && response.suggestions.length > 0) {
        console.log('🔍 [DEBUG] fetchSearchSuggestions: 予測候補あり - displaySuggestions呼び出し, 候補数:', response.suggestions.length);
        this.displaySuggestions(response.suggestions);
      } else {
        console.log('🔍 [DEBUG] fetchSearchSuggestions: 予測候補なし - 非表示');
        this.hideSuggestions();
      }
    } catch (error) {
      console.log('🔍 [DEBUG] fetchSearchSuggestions: エラー発生:', error);
      console.log('予測検索の取得に失敗:', error);
      this.hideSuggestions();
    }
    
    console.log('🔍 [DEBUG] fetchSearchSuggestions: 完了');
  }

  // 入力値に基づいて予測検索ワードを更新
  updateSuggestionsForInput(inputValue) {
    console.log('🔍 [DEBUG] updateSuggestionsForInput: 開始, inputValue:', inputValue);
    
    if (inputValue && inputValue.trim().length > 0) {
      console.log('🔍 [DEBUG] updateSuggestionsForInput: 入力値あり - fetchSearchSuggestions呼び出し');
      // 入力値に基づいて予測検索を実行
      this.fetchSearchSuggestions(inputValue.trim());
    } else {
      console.log('🔍 [DEBUG] updateSuggestionsForInput: 入力値なし - 初期候補を表示');
      // 入力値が空の場合は初期候補を表示
      this.showInitialSuggestions();
    }
    
    console.log('🔍 [DEBUG] updateSuggestionsForInput: 完了');
  }

  // 初期候補の表示
  showInitialSuggestions() {
    console.log('🔍 [DEBUG] showInitialSuggestions: 開始');
    
    // 空の文字列で予測検索を実行（Googleが初期候補を返す場合がある）
    this.fetchSearchSuggestions('');
  }

  // 予測検索候補の表示
  displaySuggestions(suggestions) {
    console.log('🔍 [DEBUG] displaySuggestions: 開始, suggestions:', suggestions);
    
    const suggestionsContainer = this.searchBar.querySelector('#ghost-search-suggestions');
    console.log('🔍 [DEBUG] displaySuggestions: suggestionsContainer:', suggestionsContainer);
    
    if (!suggestions || suggestions.length === 0) {
      console.log('🔍 [DEBUG] displaySuggestions: 候補なし - 非表示');
      this.hideSuggestions();
      return;
    }

    console.log('🔍 [DEBUG] displaySuggestions: 候補数:', suggestions.length, '表示予定:', Math.min(suggestions.length, 10));
    
    suggestionsContainer.innerHTML = '';
    
    suggestions.slice(0, 10).forEach((suggestion, index) => {
      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.dataset.suggestion = suggestion;
      
      // 単語ごとに分割して表示
      const words = suggestion.split(' ');
      words.forEach((word, wordIndex) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'suggestion-word';
        wordSpan.textContent = word;
        wordSpan.dataset.word = word;
        wordSpan.dataset.fullSuggestion = suggestion;
        
        // 単語間のスペースを追加（最後の単語以外）
        if (wordIndex < words.length - 1) {
          wordSpan.textContent += ' ';
        }
        
        // クリックイベント（個別単語）
        wordSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          // 個別単語ではなく、文章全体で検索
          this.selectSuggestion(suggestion);
        });
        
        // マウスオーバーイベント（個別単語）
        wordSpan.addEventListener('mouseenter', (e) => {
          e.stopPropagation();
          this.highlightWord(wordSpan, word);
        });
        
        // マウスリーブイベント（個別単語）
        wordSpan.addEventListener('mouseleave', (e) => {
          e.stopPropagation();
          this.unhighlightWord(wordSpan);
        });
        
        // ホイールスクロールイベント（個別単語）
        wordSpan.addEventListener('wheel', (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.handleWordWheel(e, wordSpan, word);
        }, { passive: false });
        
        item.appendChild(wordSpan);
      });
      
      // 全体のクリックイベント（文章全体）
      item.addEventListener('click', () => {
        this.selectSuggestion(suggestion);
      });
      
      suggestionsContainer.appendChild(item);
    });

    console.log('🔍 [DEBUG] displaySuggestions: 候補作成完了 - showSuggestions呼び出し');
    this.showSuggestions();
    console.log('🔍 [DEBUG] displaySuggestions: 完了');
  }

  // 予測検索候補の表示
  showSuggestions() {
    console.log('🔍 [DEBUG] showSuggestions: 開始');
    const suggestionsContainer = this.searchBar.querySelector('#ghost-search-suggestions');
    console.log('🔍 [DEBUG] showSuggestions: suggestionsContainer:', suggestionsContainer);
    
    if (suggestionsContainer) {
      suggestionsContainer.style.display = 'block';
      console.log('🔍 [DEBUG] showSuggestions: 表示完了, display:', suggestionsContainer.style.display);
    } else {
      console.log('❌ [DEBUG] showSuggestions: suggestionsContainerが見つからない');
    }
    
    console.log('🔍 [DEBUG] showSuggestions: 完了');
  }

  // 予測検索候補の非表示
  hideSuggestions() {
    const suggestionsContainer = this.searchBar.querySelector('#ghost-search-suggestions');
    suggestionsContainer.style.display = 'none';
  }

  // 予測検索候補のナビゲーション
  navigateSuggestions(direction, items) {
    const activeItem = this.searchBar.querySelector('.suggestion-item.active');
    let currentIndex = -1;
    
    if (activeItem) {
      currentIndex = Array.from(items).indexOf(activeItem);
    }
    
    // アクティブクラスを削除
    items.forEach(item => item.classList.remove('active'));
    
    // 新しいインデックスを計算
    let newIndex = currentIndex + direction;
    
    if (newIndex < 0) {
      newIndex = items.length - 1;
    } else if (newIndex >= items.length) {
      newIndex = 0;
    }
    
    // 新しいアイテムをアクティブに
    if (items[newIndex]) {
      items[newIndex].classList.add('active');
    }
  }

  // 予測検索候補の選択
  selectSuggestion(suggestion) {
    const searchInput = this.searchBar.querySelector('#ghost-search-input');
    searchInput.value = suggestion;
    this.hideSuggestions();
    this.performGoogleSearch();
  }

  // デフォルトの予測候補を表示（無効化）
  showDefaultSuggestions() {
    // 固定の予測候補を表示しない
    this.hideSuggestions();
  }

  // 個別単語のハイライト（黄色い破線）
  highlightWord(wordSpan, word) {
    // 既存のハイライトをクリア
    this.clearAllHighlights();
    
    // 選択された単語を検索してハイライト
    this.highlightTextInPage(word);
    
    // 単語にアクティブクラスを追加
    wordSpan.classList.add('active');
  }

  // 個別単語のハイライト解除
  unhighlightWord(wordSpan) {
    wordSpan.classList.remove('active');
    this.clearAllHighlights();
  }

  // 個別単語でのホイールスクロール処理
  handleWordWheel(event, wordSpan, word) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    
    // 公式のGoogleサーチバーへの影響を防ぐ
    if (event.target.closest('input[type="search"]') || 
        event.target.closest('[role="searchbox"]') ||
        event.target.closest('.gLFyf') ||
        event.target.closest('#APjFqb')) {
      return;
    }
    
    if (event.deltaY < 0) {
      // 上スクロール: サーチバーに単語を挿入
      this.addWordToSearchBar(word);
    } else if (event.deltaY > 0) {
      // 下スクロール: サーチバーの文章+選択された単語で即座に検索
      this.performSearchWithWord(word);
    }
  }

  // ページ内のテキストをハイライト
  highlightTextInPage(text) {
    // 既存のハイライトをクリア
    this.clearAllHighlights();
    
    if (!text || text.length === 0) return;
    
    // より確実にテキストを検索してハイライト
    this.highlightTextInElement(document.body, text);
  }

  // 要素内のテキストをハイライト（再帰的）
  highlightTextInElement(element, text) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
    
    // 子要素を処理
    const children = Array.from(element.childNodes);
    children.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        // テキストノードの場合
        if (child.textContent.includes(text)) {
          const highlightedText = child.textContent.replace(
            new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
            `<span class="ghost-highlight-text">${text}</span>`
          );
          
          if (highlightedText !== child.textContent) {
            const wrapper = document.createElement('div');
            wrapper.innerHTML = highlightedText;
            
            while (wrapper.firstChild) {
              element.insertBefore(wrapper.firstChild, child);
            }
            element.removeChild(child);
          }
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        // 要素ノードの場合、再帰的に処理
        this.highlightTextInElement(child, text);
      }
    });
  }

  // すべてのハイライトをクリア
  clearAllHighlights() {
    const highlights = document.querySelectorAll('.ghost-highlight-text');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
      parent.normalize();
    });
  }

  // 予測候補でのホイールスクロール処理
  handleSuggestionWheel(event) {
    // 黄色い破線が表示されているかチェック
    const hasHighlight = document.querySelector('.ghost-highlight-text');
    
    if (hasHighlight) {
      // 黄色い破線がある場合は特別な処理
      event.preventDefault();
      event.stopPropagation();
      
      const suggestions = this.searchBar.querySelectorAll('.suggestion-item');
      const activeItem = this.searchBar.querySelector('.suggestion-item.active');
      
      if (activeItem) {
        const suggestion = activeItem.dataset.suggestion;
        
        if (event.deltaY < 0) {
          // 上スクロール: サーチバーに単語を挿入
          this.addSuggestionToSearchBar(suggestion);
        } else if (event.deltaY > 0) {
          // 下スクロール: サーチバーの文章+選択された単語で即座に検索
          this.performSearchWithSuggestion(suggestion);
        }
      }
    } else {
      // 黄色い破線がない場合は通常のスクロールを許可
      // イベントをそのまま通す（preventDefaultしない）
    }
  }

  // 個別単語をサーチバーに追加
  addWordToSearchBar(word) {
    const searchInput = this.searchBar.querySelector('#ghost-search-input');
    const currentValue = searchInput.value.trim();
    
    let newValue = '';
    if (currentValue) {
      newValue = currentValue + ' ' + word;
    } else {
      newValue = word;
    }
    
    searchInput.value = newValue;
    console.log('個別単語をサーチバーに追加:', word);
    
    // 予測検索ワードを更新
    this.updateSuggestionsForInput(newValue);
    
    // 統計を更新
    this.updateStats('addition');
  }

  // 個別単語で即座に検索実行
  performSearchWithWord(word) {
    const searchInput = this.searchBar.querySelector('#ghost-search-input');
    const currentValue = searchInput.value.trim();
    
    let searchQuery = '';
    if (currentValue) {
      searchQuery = currentValue + ' ' + word;
    } else {
      searchQuery = word;
    }
    
    const lockedEngine = this.getLockedSearchEngine();
    const searchUrl = this.getSearchUrl(searchQuery, lockedEngine);
    window.open(searchUrl, '_blank');
    
    console.log('個別単語で即座検索実行:', searchQuery, '固定エンジン:', lockedEngine);
    
    // 統計を更新
    this.updateStats('immediate_search');
  }

  // 予測候補をサーチバーに追加（全体用）
  addSuggestionToSearchBar(suggestion) {
    const searchInput = this.searchBar.querySelector('#ghost-search-input');
    const currentValue = searchInput.value.trim();
    
    let newValue = '';
    if (currentValue) {
      newValue = currentValue + ' ' + suggestion;
    } else {
      newValue = suggestion;
    }
    
    searchInput.value = newValue;
    console.log('予測候補をサーチバーに追加:', suggestion);
    
    // 予測検索ワードを更新
    this.updateSuggestionsForInput(newValue);
    
    // 統計を更新
    this.updateStats('addition');
  }

  // 予測候補で即座に検索実行（全体用）
  performSearchWithSuggestion(suggestion) {
    const searchInput = this.searchBar.querySelector('#ghost-search-input');
    const currentValue = searchInput.value.trim();
    
    let searchQuery = '';
    if (currentValue) {
      searchQuery = currentValue + ' ' + suggestion;
    } else {
      searchQuery = suggestion;
    }

    const lockedEngine = this.getLockedSearchEngine();
    const searchUrl = this.getSearchUrl(searchQuery, lockedEngine);
    window.open(searchUrl, '_blank');
    
    console.log('予測候補で即座検索実行:', searchQuery, '固定エンジン:', lockedEngine);
    
    // 統計を更新
    this.updateStats('immediate_search');
  }

  // デバッグ用: 手動でイベントをテスト
  testEvents() {
    console.log('🧪 GhostSearchBar: イベントテスト開始');
    
    if (this.ghostInterface) {
      console.log('🧪 GhostSearchBar: ゴーストインターフェース要素:', this.ghostInterface);
      console.log('🧪 GhostSearchBar: スタイル:', {
        display: this.ghostInterface.style.display,
        pointerEvents: this.ghostInterface.style.pointerEvents,
        position: this.ghostInterface.style.position,
        zIndex: this.ghostInterface.style.zIndex
      });
      
      // 手動でマウスオーバーイベントをシミュレート
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      
      console.log('🧪 GhostSearchBar: 手動マウスエンターイベント発火');
      this.ghostInterface.dispatchEvent(mouseEnterEvent);
    } else {
      console.log('❌ GhostSearchBar: ゴーストインターフェースが存在しない');
    }
  }

  // 検索エンジン選択エリアの設定
  setupEngineSelector(selectBtn, dropdown) {
    // 既定の検索エンジンIDからキーを取得
    const defaultEngineId = this.settings.defaultSearchEngine || 'google';
    const defaultKey = this.getKeyByEngineId(defaultEngineId);
    this.currentSelectedEngine = defaultKey || 'g'; // フォールバック: 'g' (Google)
    this.isEngineSelectorHovered = false;
    
    // 初期表示名を設定
    const initialEngine = this.keyShortcuts[this.currentSelectedEngine];
    if (initialEngine) {
      const engines = Array.isArray(initialEngine) ? initialEngine : [initialEngine];
      const engineNames = engines.map(e => e.name).join(', ');
      this.updateEngineSelectorName(engineNames);
    }
    
    // ドロップダウンの作成
    this.createEngineDropdown(dropdown);
    
    // 初期状態で非表示にする
    dropdown.style.display = 'none';
    
    // マウスオーバー時の処理
    let hideTimeout = null;
    
    const showDropdown = () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }
      
      // ドロップダウンを最新の設定で再作成（設定変更を反映）
      this.createEngineDropdown(dropdown);
      console.log('🔄 GhostSearchBar: ドロップダウン表示時に再作成 - 最新の設定を反映');
      
      this.isEngineSelectorHovered = true;
      dropdown.classList.add('show');
      
      // インプット欄からフォーカスを外す
      const searchInput = this.searchBar.querySelector('#ghost-search-input');
      if (searchInput && document.activeElement === searchInput) {
        searchInput.blur();
        console.log('🔧 GhostSearchBar: 検索エンジン選択エリアにマウスオーバー - インプット欄からフォーカスを外しました');
      }
      
      // ドロップダウンにtabindexを設定してフォーカス可能にする
      if (!dropdown.hasAttribute('tabindex')) {
        dropdown.setAttribute('tabindex', '0');
      }
      
      this.setupKeyIntercept();
    };
    
    const hideDropdown = () => {
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
      hideTimeout = setTimeout(() => {
        // ドロップダウンまたはボタンにマウスがある場合は非表示にしない
        if (!dropdown.matches(':hover') && !selectBtn.matches(':hover')) {
          this.isEngineSelectorHovered = false;
          dropdown.classList.remove('show');
          this.removeKeyIntercept();
        }
      }, 200);
    };
    
    selectBtn.addEventListener('mouseenter', () => {
      showDropdown();
    });
    
    selectBtn.addEventListener('mouseleave', (e) => {
      // マウスがドロップダウンに移動する可能性があるので、少し待つ
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && (dropdown.contains(relatedTarget) || dropdown === relatedTarget)) {
        // ドロップダウンに移動している場合は何もしない
        return;
      }
      hideDropdown();
    });
    
    dropdown.addEventListener('mouseenter', () => {
      showDropdown();
    });
    
    dropdown.addEventListener('mouseleave', (e) => {
      // マウスがボタンに戻る可能性があるので、少し待つ
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && (selectBtn.contains(relatedTarget) || selectBtn === relatedTarget)) {
        // ボタンに戻っている場合は何もしない
        return;
      }
      hideDropdown();
    });
    
    // フォーカス時の処理
    selectBtn.addEventListener('focus', () => {
      dropdown.classList.add('show');
      this.setupKeyIntercept();
    });
    
    selectBtn.addEventListener('blur', () => {
      if (!this.isEngineSelectorHovered) {
        dropdown.classList.remove('show');
        this.removeKeyIntercept();
      }
    });
    
    // キー入力処理
    this.searchButtonKeyHandler = (event) => {
      // 検索エンジン選択エリアにマウスオーバーしている場合は常に処理を続行
      if (!this.isEngineSelectorHovered && document.activeElement !== selectBtn) {
        return;
      }
      
      const key = event.key.toLowerCase();
      if (this.keyShortcuts[key]) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation(); // 他のイベントハンドラーより先に処理
        this.selectEngineByKey(key);
        console.log('🔧 GhostSearchBar: 検索エンジン選択エリアでキー入力インターセプト:', key);
      }
    };
  }
  
  // 検索エンジンドロップダウンの作成
  createEngineDropdown(dropdown) {
    console.log('🔄 GhostSearchBar: createEngineDropdown開始');
    console.log('🔄 GhostSearchBar: 現在のkeyShortcuts:', this.keyShortcuts);
    console.log('🔄 GhostSearchBar: keyShortcutsのキー数:', Object.keys(this.keyShortcuts).length);
    
    dropdown.innerHTML = '';
    
    // 検索エンジンのfavicon URLマッピング
    const faviconUrls = {
      'google': 'https://www.google.com/favicon.ico',
      'bing': 'https://www.bing.com/favicon.ico',
      'yahoo': 'https://search.yahoo.com/favicon.ico',
      'ecosia': 'https://www.ecosia.org/favicon.ico',
      'duckduckgo': 'https://duckduckgo.com/favicon.ico',
      'youtube': 'https://www.youtube.com/favicon.ico',
      'wikipedia': 'https://ja.wikipedia.org/favicon.ico',
      'amazon': 'https://www.amazon.co.jp/favicon.ico',
      'twitter': 'https://twitter.com/favicon.ico',
      'reddit': 'https://www.reddit.com/favicon.ico',
      'note': 'https://note.com/favicon.ico',
      'quora': 'https://www.quora.com/favicon.ico',
      'zenn': 'https://zenn.dev/favicon.ico',
      'pixiv': 'https://www.pixiv.net/favicon.ico',
      'chiebukuro': 'https://chiebukuro.yahoo.co.jp/favicon.ico',
      'googlemaps': 'https://www.google.com/favicon.ico',
      'github': 'https://github.com/favicon.ico',
      'stackoverflow': 'https://stackoverflow.com/favicon.ico',
      'instagram': 'https://www.instagram.com/favicon.ico',
      'facebook': 'https://www.facebook.com/favicon.ico',
      'bluesky': 'https://bsky.app/favicon.ico',
      'linkedin': 'https://www.linkedin.com/favicon.ico',
      'pinterest': 'https://www.pinterest.com/favicon.ico',
      'tiktok': 'https://www.tiktok.com/favicon.ico',
      'mercari': 'https://www.mercari.com/favicon.ico',
      'rakuten': 'https://search.rakuten.co.jp/favicon.ico',
      'cookpad': 'https://cookpad.com/favicon.ico',
      'tabelog': 'https://tabelog.com/favicon.ico',
      'nicovideo': 'https://www.nicovideo.jp/favicon.ico',
      'baidu': 'https://www.baidu.com/favicon.ico',
      'yandex': 'https://yandex.com/favicon.ico',
      'naver': 'https://search.naver.com/favicon.ico'
    };
    
    const shortcutsEntries = Object.entries(this.keyShortcuts);
    console.log('🔄 GhostSearchBar: ドロップダウンに追加するキーショートカット数:', shortcutsEntries.length);
    
    shortcutsEntries.forEach(([key, shortcut]) => {
      // 配列の場合は複数エンジン、単一の場合は1つ
      const engines = Array.isArray(shortcut) ? shortcut : [shortcut];
      const engineNames = engines.map(e => e.name).join(', ');
      console.log(`🔄 GhostSearchBar: ドロップダウン項目作成 - キー: ${key}, エンジン: ${engineNames}`);
      
      const item = document.createElement('div');
      item.className = 'engine-select-item';
      const currentEngineNames = this.getCurrentEngineName();
      if (engineNames === currentEngineNames) {
        item.classList.add('active');
      }
      
      // キー表示
      const keySpan = document.createElement('span');
      keySpan.className = 'engine-key';
      keySpan.textContent = key.toUpperCase();
      
      // 複数エンジンの場合は最初のエンジンのfaviconを使用
      const firstEngine = engines[0];
      const engineId = this.getEngineIdByName(firstEngine.name);
      const faviconUrl = faviconUrls[engineId] || '';
      
      // アイコン要素を作成
      const iconContainer = document.createElement('span');
      iconContainer.className = 'engine-icon-container';
      
      if (faviconUrl) {
        const faviconImg = document.createElement('img');
        faviconImg.src = faviconUrl;
        faviconImg.className = 'engine-favicon';
        faviconImg.alt = firstEngine.name;
        
        // エラー時のフォールバック（CSP対応）
        faviconImg.addEventListener('error', function() {
          this.style.display = 'none';
          const fallback = this.nextElementSibling;
          if (fallback) {
            fallback.style.display = 'inline';
          }
        });
        
        const fallbackSpan = document.createElement('span');
        fallbackSpan.className = 'engine-icon-fallback';
        fallbackSpan.style.display = 'none';
        fallbackSpan.textContent = firstEngine.icon;
        
        iconContainer.appendChild(faviconImg);
        iconContainer.appendChild(fallbackSpan);
      } else {
        const iconSpan = document.createElement('span');
        iconSpan.className = 'engine-icon';
        iconSpan.textContent = firstEngine.icon;
        iconContainer.appendChild(iconSpan);
      }
      
      // 名前表示（複数エンジンの場合はすべて表示）
      const nameSpan = document.createElement('span');
      nameSpan.className = 'engine-name';
      nameSpan.textContent = engineNames;
      
      // 要素を組み立て
      item.appendChild(keySpan);
      item.appendChild(iconContainer);
      item.appendChild(nameSpan);
      
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectEngineByKey(key);
        this.isEngineSelectorHovered = false;
        dropdown.classList.remove('show');
        this.removeKeyIntercept();
      });
      
      dropdown.appendChild(item);
    });
    
    console.log('🔄 GhostSearchBar: createEngineDropdown完了 - 追加された項目数:', dropdown.children.length);
  }
  
  // エンジン名からIDを取得
  getEngineIdByName(name) {
    const nameToId = {
      'Google': 'google',
      'Bing': 'bing',
      'Yahoo!': 'yahoo',
      'Ecosia': 'ecosia',
      'DuckDuckGo': 'duckduckgo',
      'YouTube': 'youtube',
      'Wikipedia': 'wikipedia',
      'Amazon': 'amazon',
      'Twitter': 'twitter',
      'Reddit': 'reddit',
      'note': 'note',
      'Quora': 'quora',
      'Zenn': 'zenn',
      'Pixiv': 'pixiv',
      'Yahoo!知恵袋': 'chiebukuro',
      'Google Maps': 'googlemaps',
      'GitHub': 'github',
      'Stack Overflow': 'stackoverflow',
      'Instagram': 'instagram',
      'Facebook': 'facebook',
      'Bluesky': 'bluesky',
      'LinkedIn': 'linkedin',
      'Pinterest': 'pinterest',
      'TikTok': 'tiktok',
      'メルカリ': 'mercari',
      '楽天市場': 'rakuten',
      'クックパッド': 'cookpad',
      '食べログ': 'tabelog',
      'ニコニコ動画': 'nicovideo',
      'Baidu': 'baidu',
      'YANDEX': 'yandex',
      'Naver': 'naver'
    };
    return nameToId[name] || '';
  }
  
  // キーで検索エンジンを選択
  selectEngineByKey(key) {
    const shortcut = this.keyShortcuts[key];
    if (!shortcut) return;
    
    this.currentSelectedEngine = key;
    const engines = Array.isArray(shortcut) ? shortcut : [shortcut];
    const engineNames = engines.map(e => e.name).join(', ');
    this.updateSearchBarTitle(engineNames);
    this.updateEngineSelectorName(engineNames);
    this.updateEngineDropdown();
    
    console.log('🔍 検索エンジン選択:', key, engineNames);
  }
  
  // 検索エンジン選択エリアの名前を更新
  updateEngineSelectorName(engineName) {
    const nameElement = this.searchBar.querySelector('#engine-select-name');
    if (nameElement) {
      nameElement.textContent = engineName || this.getCurrentEngineName();
    }
  }
  
  // 現在の検索エンジン名を取得
  getCurrentEngineName() {
    if (this.currentSelectedEngine && this.keyShortcuts[this.currentSelectedEngine]) {
      return this.keyShortcuts[this.currentSelectedEngine].name;
    }
    return 'Google';
  }
  
  // 検索バーのタイトルを更新
  updateSearchBarTitle(engineName) {
    const titleElement = this.searchBar.querySelector('#ghost-search-title');
    if (titleElement) {
      titleElement.textContent = engineName || this.getCurrentEngineName();
    }
    // 検索エンジン選択エリアの名前も更新
    this.updateEngineSelectorName(engineName);
  }
  
  // エンジンドロップダウンを更新
  updateEngineDropdown() {
    const dropdown = this.searchBar.querySelector('#ghost-engine-dropdown');
    if (dropdown) {
      const items = dropdown.querySelectorAll('.engine-select-item');
      items.forEach(item => {
        const engineName = item.querySelector('.engine-name').textContent;
        if (engineName === this.getCurrentEngineName()) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }
  }
  
  // 設定変更後にエンジンドロップダウンを更新
  updateEngineDropdownAfterSettingsChange() {
    console.log('🔄 GhostSearchBar: updateEngineDropdownAfterSettingsChange開始');
    console.log('🔄 GhostSearchBar: searchBarの存在:', !!this.searchBar);
    
    if (this.searchBar) {
      const dropdown = this.searchBar.querySelector('#ghost-engine-dropdown');
      console.log('🔄 GhostSearchBar: dropdownの存在:', !!dropdown);
      
      if (dropdown) {
        console.log('🔄 GhostSearchBar: 更新前のドロップダウン項目数:', dropdown.children.length);
        // ドロップダウンを再作成して最新のキーショートカット設定を反映
        this.createEngineDropdown(dropdown);
        console.log('🔄 GhostSearchBar: 更新後のドロップダウン項目数:', dropdown.children.length);
        console.log('🔄 GhostSearchBar: 設定変更後にエンジンドロップダウンを更新しました');
      } else {
        console.log('⚠️ GhostSearchBar: ドロップダウン要素が見つかりません');
      }
    } else {
      console.log('⚠️ GhostSearchBar: 検索バーが存在しません');
    }
  }
  
  // キー入力インターセプトの設定
  setupKeyIntercept() {
    document.addEventListener('keydown', this.searchButtonKeyHandler, true);
  }
  
  // キー入力インターセプトの削除
  removeKeyIntercept() {
    document.removeEventListener('keydown', this.searchButtonKeyHandler, true);
  }
  
  
  // ショートカット検索の実行（検索エンジン選択エリア用）
  performShortcutSearch(key) {
    // 検索エンジンを選択するだけ（検索は実行しない）
    this.selectEngineByKey(key);
  }
  
  // 検索履歴の保存
  saveSearchHistory(query, engine) {
    if (!query || query.length === 0) return;
    
    const currentUrl = window.location.href;
    
    // 既存の履歴を読み込み
    chrome.storage.local.get(['ghostSearchHistory'], (result) => {
      const history = result.ghostSearchHistory || {};
      
      if (!history[currentUrl]) {
        history[currentUrl] = [];
      }
      
      // 重複チェック（同じクエリが既にある場合は削除して最新に）
      history[currentUrl] = history[currentUrl].filter(item => item.query !== query);
      
      // 新しい履歴を追加
      history[currentUrl].push({
        query: query,
        engine: engine,
        timestamp: Date.now()
      });
      
      // 最大件数を超えた場合は古いものを削除
      if (history[currentUrl].length > this.maxHistoryPerPage) {
        history[currentUrl] = history[currentUrl].slice(-this.maxHistoryPerPage);
      }
      
      // 保存
      chrome.storage.local.set({ ghostSearchHistory: history }, () => {
        console.log('✅ 検索履歴を保存:', query, currentUrl);
      });
    });
  }
  
  // 検索履歴の読み込み
  loadSearchHistory() {
    const currentUrl = window.location.href;
    
    chrome.storage.local.get(['ghostSearchHistory'], (result) => {
      const history = result.ghostSearchHistory || {};
      const pageHistory = history[currentUrl] || [];
      
      console.log('📚 検索履歴読み込み:', { currentUrl, pageHistory });
      this.displayHistory(pageHistory);
    });
  }
  
  // 検索履歴の表示
  displayHistory(history) {
    const historyContainer = this.searchBar.querySelector('#ghost-search-history');
    if (!historyContainer) {
      console.log('❌ 検索履歴コンテナが見つかりません');
      return;
    }
    
    console.log('📚 検索履歴表示:', history);
    
    if (!history || history.length === 0) {
      historyContainer.style.display = 'none';
      console.log('📚 検索履歴が空です');
      return;
    }
    
    historyContainer.innerHTML = '';
    historyContainer.style.display = 'block';
    
    // 新しい順に表示
    const reversedHistory = history.slice().reverse();
    reversedHistory.forEach((item, index) => {
      const originalIndex = history.length - 1 - index;
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.innerHTML = `
        <span class="history-query">${this.escapeHtml(item.query)}</span>
        <button class="history-delete" data-index="${originalIndex}">×</button>
      `;
      
      // クリックで検索
      historyItem.addEventListener('click', (e) => {
        if (e.target.classList.contains('history-delete')) {
          e.stopPropagation();
          this.deleteHistoryItem(originalIndex);
          return;
        }
        
        const searchInput = this.searchBar.querySelector('#ghost-search-input');
        searchInput.value = item.query;
        this.performDefaultSearch();
      });
      
      // 削除ボタン
      const deleteBtn = historyItem.querySelector('.history-delete');
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteHistoryItem(originalIndex);
      });
      
      historyContainer.appendChild(historyItem);
    });
    
    console.log('✅ 検索履歴表示完了:', reversedHistory.length, '件');
  }
  
  // HTMLエスケープ
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // 履歴項目の削除
  deleteHistoryItem(index) {
    const currentUrl = window.location.href;
    
    chrome.storage.local.get(['ghostSearchHistory'], (result) => {
      const history = result.ghostSearchHistory || {};
      
      if (history[currentUrl] && history[currentUrl][index]) {
        history[currentUrl].splice(index, 1);
        
        chrome.storage.local.set({ ghostSearchHistory: history }, () => {
          this.loadSearchHistory();
        });
      }
    });
  }
  
  // 履歴の非表示
  hideHistory() {
    const historyContainer = this.searchBar.querySelector('#ghost-search-history');
    if (historyContainer) {
      historyContainer.style.display = 'none';
    }
  }
  
  // マウスオーバー+キー入力検索の設定
  setupKeyInputSearch() {
    // 既存のハンドラーを削除
    if (this.keyInputHandler) {
      this.removeKeyInputSearch();
    }
    
    // keydownイベントハンドラー（物理キー検出用）
    this.keyInputHandler = (event) => {
      // マウスオーバー状態を再確認
      if (!this.isMouseOverGhost) {
        return;
      }
      
      // Ctrl、Alt、Metaキーなどの修飾キーは無視
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      
      // 詳細ログ
      console.log('⌨️ GhostSearchBar: keydown検出:', {
        key: event.key,
        code: event.code,
        keyCode: event.keyCode,
        isMouseOverGhost: this.isMouseOverGhost,
        type: event.type
      });
      
      // IME入力中（'Process'）の場合はkeyupを待つ
      if (event.key === 'Process') {
        console.log('⌨️ GhostSearchBar: IME入力中 - keyupを待機');
        return;
      }
      
      // event.codeから物理キーを取得（例: 'KeyW' -> 'w'）
      let key = null;
      if (event.code && event.code.startsWith('Key')) {
        key = event.code.replace('Key', '').toLowerCase();
      } else if (event.key && event.key.length === 1) {
        key = event.key.toLowerCase();
      } else if (event.keyCode) {
        // フォールバック: keyCodeから文字を取得
        const char = String.fromCharCode(event.keyCode);
        if (char.match(/[a-z0-9]/i)) {
          key = char.toLowerCase();
        }
      }
      
      console.log('⌨️ GhostSearchBar: 抽出されたキー:', key);
      
      if (key && this.keyShortcuts[key]) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('⌨️ GhostSearchBar: キーショートカット検出:', key, this.keyShortcuts[key].name);
        
        // テキスト選択状態を確認（保存された選択を優先）
        let selectedText = '';
        let hasSelectedText = false;
        
        console.log('⌨️ GhostSearchBar: テキスト選択確認 - savedSelectionText:', this.savedSelectionText, 'savedSelection:', this.savedSelection);
        
        // 保存されたテキストを直接使用（Rangeが無効になっても動作する）
        if (this.savedSelectionText && this.savedSelectionText.length > 0) {
          selectedText = this.savedSelectionText;
          hasSelectedText = true;
          console.log('⌨️ GhostSearchBar: 保存されたテキスト選択を使用:', selectedText);
        } else if (this.savedSelection) {
          try {
            // Rangeが有効かどうかを確認
            const range = this.savedSelection.cloneRange();
            selectedText = range.toString().trim();
            hasSelectedText = selectedText.length > 0;
            console.log('⌨️ GhostSearchBar: 保存されたRangeからテキスト選択を取得:', selectedText);
          } catch (error) {
            console.log('⚠️ GhostSearchBar: 保存された選択の取得に失敗:', error);
          }
        }
        
        // 保存された選択がない場合は現在の選択を確認
        if (!hasSelectedText) {
          const selection = window.getSelection();
          selectedText = selection.toString().trim();
          hasSelectedText = selectedText.length > 0;
          if (hasSelectedText) {
            console.log('⌨️ GhostSearchBar: 現在のテキスト選択を使用:', selectedText);
          }
        }
        
        if (hasSelectedText) {
          // テキスト選択時: 即座にサイト内検索実行
          console.log('⌨️ GhostSearchBar: キー入力検索（テキスト選択時）:', key, selectedText);
          this.performShortcutSearchWithText(key, selectedText);
        } else {
          // テキスト未選択時: 検索バー+履歴を表示し、キーに対応する検索エンジンを選択
          console.log('⌨️ GhostSearchBar: キー入力検索（テキスト未選択時）:', key);
          
          // 検索バーが既に表示されているかどうかを確認
          const wasSearchBarVisible = this.isSearchBarVisible;
          
          // キーを指定して検索バーを表示（検索エンジンも同時に設定される）
          this.showSearchBarWithHistory(key);
          
          // 検索バーが新しく表示された場合のみ、検索入力フィールドにフォーカスを移す
          // 既に表示されている場合は、検索エンジンの切り替えのみで、フォーカスは移さない
          if (!wasSearchBarVisible) {
            setTimeout(() => {
              const searchInput = this.searchBar.querySelector('#ghost-search-input');
              if (searchInput) {
                searchInput.focus();
                console.log('⌨️ GhostSearchBar: 検索入力フィールドにフォーカスを移しました（新規表示）');
              }
            }, 100);
          } else {
            console.log('⌨️ GhostSearchBar: 検索バーは既に表示されているため、フォーカスを移しません');
          }
        }
      } else if (key) {
        console.log('⌨️ GhostSearchBar: キーショートカットが見つかりません:', key);
      }
    };
    
    // keyupイベントハンドラー（IME確定後の文字取得用）
    this.keyInputHandlerKeyup = (event) => {
      // マウスオーバー状態を再確認
      if (!this.isMouseOverGhost) {
        return;
      }
      
      // Ctrl、Alt、Metaキーなどの修飾キーは無視
      if (event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      
      // IME確定後の文字を取得
      const key = event.key.toLowerCase();
      console.log('⌨️ GhostSearchBar: keyup検出:', {
        key: key,
        code: event.code,
        isMouseOverGhost: this.isMouseOverGhost
      });
      
      if (key && key.length === 1 && this.keyShortcuts[key]) {
        event.preventDefault();
        event.stopPropagation();
        
        console.log('⌨️ GhostSearchBar: キーショートカット検出（keyup）:', key, this.keyShortcuts[key].name);
        
        // テキスト選択状態を確認（保存された選択を優先）
        let selectedText = '';
        let hasSelectedText = false;
        
        console.log('⌨️ GhostSearchBar: テキスト選択確認（keyup） - savedSelectionText:', this.savedSelectionText, 'savedSelection:', this.savedSelection);
        
        // 保存されたテキストを直接使用（Rangeが無効になっても動作する）
        if (this.savedSelectionText && this.savedSelectionText.length > 0) {
          selectedText = this.savedSelectionText;
          hasSelectedText = true;
          console.log('⌨️ GhostSearchBar: 保存されたテキスト選択を使用（keyup）:', selectedText);
        } else if (this.savedSelection) {
          try {
            // Rangeが有効かどうかを確認
            const range = this.savedSelection.cloneRange();
            selectedText = range.toString().trim();
            hasSelectedText = selectedText.length > 0;
            console.log('⌨️ GhostSearchBar: 保存されたRangeからテキスト選択を取得（keyup）:', selectedText);
          } catch (error) {
            console.log('⚠️ GhostSearchBar: 保存された選択の取得に失敗（keyup）:', error);
          }
        }
        
        // 保存された選択がない場合は現在の選択を確認
        if (!hasSelectedText) {
          const selection = window.getSelection();
          selectedText = selection.toString().trim();
          hasSelectedText = selectedText.length > 0;
          if (hasSelectedText) {
            console.log('⌨️ GhostSearchBar: 現在のテキスト選択を使用（keyup）:', selectedText);
          }
        }
        
        if (hasSelectedText) {
          // テキスト選択時: 即座にサイト内検索実行
          console.log('⌨️ GhostSearchBar: キー入力検索（テキスト選択時、keyup）:', key, selectedText);
          this.performShortcutSearchWithText(key, selectedText);
        } else {
          // テキスト未選択時: 検索バー+履歴を表示し、キーに対応する検索エンジンを選択
          console.log('⌨️ GhostSearchBar: キー入力検索（テキスト未選択時、keyup）:', key);
          // キーを指定して検索バーを表示（検索エンジンも同時に設定される）
          this.showSearchBarWithHistory(key);
        }
      }
    };
    
    // キャプチャフェーズで登録（他のイベントより先に処理）
    document.addEventListener('keydown', this.keyInputHandler, true);
    document.addEventListener('keyup', this.keyInputHandlerKeyup, true);
    console.log('⌨️ GhostSearchBar: キー入力ハンドラーを登録しました（keydown + keyup）');
  }
  
  // マウスオーバー+キー入力検索の削除
  removeKeyInputSearch() {
    if (this.keyInputHandler) {
      document.removeEventListener('keydown', this.keyInputHandler, true);
      this.keyInputHandler = null;
    }
    if (this.keyInputHandlerKeyup) {
      document.removeEventListener('keyup', this.keyInputHandlerKeyup, true);
      this.keyInputHandlerKeyup = null;
    }
    console.log('⌨️ GhostSearchBar: キー入力ハンドラーを削除しました');
  }
  
  // ショートカット検索をテキストで実行
  performShortcutSearchWithText(key, text) {
    const shortcut = this.keyShortcuts[key];
    if (!shortcut || !text) return;
    
    // 配列の場合は複数の検索エンジンで同時検索
    const engines = Array.isArray(shortcut) ? shortcut : [shortcut];
    
    engines.forEach((engine, index) => {
      const url = engine.url.replace('{query}', encodeURIComponent(text));
      // 最初のタブのみ通常、それ以降は少し遅延させてポップアップブロッカー対策
      if (index === 0) {
        window.open(url, '_blank');
      } else {
        setTimeout(() => {
          window.open(url, '_blank');
        }, index * 100);
      }
    });
    
    // 検索履歴に保存（最初のエンジンのみ）
    this.saveSearchHistory(text, key);
    
    const engineNames = engines.map(e => e.name).join(', ');
    console.log('🔍 ショートカット検索実行（テキスト指定）:', key, engineNames, text, `(${engines.length}エンジン)`);
  }
  
  // ブラウザの言語を検出
  detectLanguage() {
    const language = navigator.language || navigator.userLanguage || 'en';
    const primaryLanguage = language.split('-')[0];
    
    // 日本語の場合は'ja'、それ以外は'en'
    if (primaryLanguage === 'ja') {
      return 'ja';
    } else {
      return 'en';
    }
  }

  // ローカライズされたテキストを取得
  getLocalizedTexts() {
    try {
      // Chrome拡張機能のi18n APIを使用
      if (typeof chrome !== 'undefined' && chrome.i18n) {
        return {
          searchPlaceholder: chrome.i18n.getMessage('searchPlaceholder') || 'Enter search terms...',
          searchButton: chrome.i18n.getMessage('searchButton') || 'Search',
          closeButton: chrome.i18n.getMessage('closeButton') || 'Close',
          dragHandle: chrome.i18n.getMessage('dragHandle') || 'Drag to move',
          wheelUpHint: chrome.i18n.getMessage('wheelUpHint') || 'Scroll up to add to search bar',
          wheelDownHint: chrome.i18n.getMessage('wheelDownHint') || 'Scroll down to search immediately',
          upDragHint: chrome.i18n.getMessage('upDragHint') || 'Drag up to add to search bar',
          searchBarTitle: chrome.i18n.getMessage('searchBarTitle') || 'Ghost Search Bar',
          addToSearchBar: chrome.i18n.getMessage('addToSearchBar') || 'Add to search bar',
          searchImmediately: chrome.i18n.getMessage('searchImmediately') || 'Search immediately'
        };
      }
    } catch (error) {
      console.log('⚠️ GhostSearchBar: i18n APIエラー、デフォルトテキストを使用:', error);
    }
    
    // フォールバック: 言語に応じたデフォルトテキスト
    if (this.language === 'ja') {
      return {
        searchPlaceholder: 'Enter search terms...',
        searchButton: '検索',
        closeButton: '閉じる',
        dragHandle: 'ドラッグで移動',
        wheelUpHint: '上スクロールで検索バーに追加',
        wheelDownHint: '下スクロールで即座検索',
        upDragHint: '上ドラッグで検索バーに追加',
        searchBarTitle: 'ゴースト検索バー',
        addToSearchBar: '検索バーに追加',
        searchImmediately: '即座に検索'
      };
    } else {
      return {
        searchPlaceholder: 'Enter search terms...',
        searchButton: 'Search',
        closeButton: 'Close',
        dragHandle: 'Drag to move',
        wheelUpHint: 'Scroll up to add to search bar',
        wheelDownHint: 'Scroll down to search immediately',
        upDragHint: 'Drag up to add to search bar',
        searchBarTitle: 'Ghost Search Bar',
        addToSearchBar: 'Add to search bar',
        searchImmediately: 'Search immediately'
      };
    }
  }
}
console.log('📝 GhostSearchBar: クラス定義完了');

// 拡張機能の初期化
console.log('🚀 GhostSearchBar: 拡張機能初期化開始');
console.log('🚀 GhostSearchBar: document.readyState:', document.readyState);
console.log('🚀 GhostSearchBar: window.location.href:', window.location.href);
console.log('🚀 GhostSearchBar: document.domain:', document.domain);

// クラス定義の確認
console.log('🚀 GhostSearchBar: GhostSearchBarクラス確認:', typeof GhostSearchBar);
console.log('🚀 GhostSearchBar: GhostSearchBarクラス内容:', GhostSearchBar);

// グローバルインスタンス変数（重複作成を防ぐ）
let ghostSearchBarInstance = null;

// グローバルからテストできるようにする
window.testGhostSearchBar = () => {
  if (ghostSearchBarInstance) {
    ghostSearchBarInstance.testEvents();
  } else {
    console.log('❌ GhostSearchBar: インスタンスが存在しない');
  }
};

// 統一状態管理システムのデバッグ用関数
window.debugSearchEngineState = () => {
  if (ghostSearchBarInstance) {
    return ghostSearchBarInstance.debugSearchEngineState();
  } else {
    console.log('❌ GhostSearchBar: インスタンスが存在しない');
    return null;
  }
};

// 単一インスタンスの作成
function createGhostSearchBarInstance() {
  if (!ghostSearchBarInstance) {
    console.log('🚀 GhostSearchBar: 新規インスタンス作成');
    try {
      ghostSearchBarInstance = new GhostSearchBar();
      console.log('🚀 GhostSearchBar: インスタンス作成成功:', ghostSearchBarInstance);
    } catch (error) {
      console.error('🚀 GhostSearchBar: インスタンス作成エラー:', error);
      ghostSearchBarInstance = null;
    }
  } else {
    console.log('🚀 GhostSearchBar: 既存インスタンスが存在します');
  }
}

// ページ読み込み完了後に初期化
if (document.readyState === 'loading') {
  console.log('🚀 GhostSearchBar: ページ読み込み中 - DOMContentLoaded待機');
  document.addEventListener('DOMContentLoaded', createGhostSearchBarInstance);
} else {
  console.log('🚀 GhostSearchBar: ページ読み込み完了済み - 即座に初期化');
  createGhostSearchBarInstance();
}
