// テキスト選択検出と検索ツールバー表示のメインロジック
console.log('📝 GhostSearchBar: クラス定義開始');
class GhostSearchBar {
  constructor() {
    console.log('📝 GhostSearchBar: コンストラクタ開始');
    this.searchBar = null;
    this.ghostInterface = null;
    this.ghostMark = null;
    this.ghostGuide = null;
    this.selectedText = '';
    this.isVisible = false;
    this.isEnabled = true;
    this.settings = {};
    this.isTextSelected = false; // テキスト選択状態を追跡
    this.isSearchBarVisible = false; // サーチバーの表示状態を追跡
    
    // 多言語対応の設定
    this.language = this.detectLanguage();
    this.texts = this.getLocalizedTexts();
    
    console.log('📝 GhostSearchBar: コンストラクタ完了、言語設定:', this.language, 'init()呼び出し');
    this.init();
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
    
    // 設定の読み込み
    this.loadSettings();
    
    // 設定変更のメッセージリスナー
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'settingsUpdated') {
        this.settings = request.settings;
        
        if (this.settings.enabled === false) {
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
      console.log('🔍 GhostSearchBar: テキスト選択状態を記録:', this.isTextSelected);
      console.log('🔍 GhostSearchBar: ゴーストインターフェースを表示');
      this.showGhostInterface(event);
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
        console.log('🔍 GhostSearchBar: 選択解除検出 - インターフェースを非表示');
        this.hideGhostInterface();
        // サーチバーは非表示にしない（×ボタンでのみ消える）
        // this.hideSearchBar();
        this.isTextSelected = false; // 選択状態をクリア
      } else {
        console.log('🔍 GhostSearchBar: 選択状態フラグがfalseのため処理をスキップ');
      }
    }
  }

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
        <div class="ghost-search-header" id="ghost-drag-handle">
          <span class="ghost-search-title">${this.texts.searchBarTitle}</span>
          <button class="ghost-search-close" id="ghost-close-btn">×</button>
        </div>
        <div class="ghost-search-content">
          <div class="ghost-search-input-container">
            <input type="text" class="ghost-search-input" id="ghost-search-input" placeholder="${this.texts.searchPlaceholder}">
            <button class="ghost-search-execute" id="ghost-execute-btn">🔍</button>
          </div>
        </div>
      </div>
    `;

    // イベントリスナーの設定
    this.searchBar.querySelector('#ghost-close-btn').addEventListener('click', () => {
      this.hideSearchBar();
    });

    this.searchBar.querySelector('#ghost-execute-btn').addEventListener('click', () => {
      this.performGoogleSearch();
    });

    // ドラッグ移動の設定
    this.setupDragAndDrop();

    // ページに追加
    document.body.appendChild(this.searchBar);
    
    // 初期位置を設定（画面中央）
    this.searchBar.style.left = '50%';
    this.searchBar.style.top = '50%';
    this.searchBar.style.transform = 'translate(-50%, -50%)';
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
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseInt(this.searchBar.style.left) || 0;
      startTop = parseInt(this.searchBar.style.top) || 0;
      
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
      startLeft = parseInt(this.searchBar.style.left) || 0;
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
        
        this.searchBar.style.left = (startLeft + deltaX) + 'px';
        this.searchBar.style.top = (startTop + deltaY) + 'px';
      } else if (isResizing) {
        const deltaX = e.clientX - startX;
        
        if (resizeDirection === 'left') {
          const newWidth = startWidth - deltaX;
          if (newWidth >= 300) { // 最小幅
            this.searchBar.style.width = newWidth + 'px';
            this.searchBar.style.left = (startLeft + deltaX) + 'px';
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

    if (this.isSearchBarVisible) {
      console.log('ℹ️ GhostSearchBar: 検索ツールバーは既に表示中 - 新しい選択テキストを追加');
      
      // 既に表示中の場合は、新しい選択テキストを追加
      if (this.selectedText) {
        this.addSelectedTextToSearchBar();
      }
      return;
    }

    // 選択されたテキストを検索入力フィールドに設定
    const searchInput = this.searchBar.querySelector('#ghost-search-input');
    if (searchInput && this.selectedText) {
      searchInput.value = this.selectedText;
    }
    
    // 位置の計算（マウス位置に基づく）
    const rect = this.searchBar.getBoundingClientRect();
    const x = Math.min(event.clientX, window.innerWidth - rect.width);
    const y = Math.max(event.clientY - rect.height - 10, 10);
    
    this.searchBar.style.left = x + 'px';
    this.searchBar.style.top = y + 'px';
    this.searchBar.style.display = 'block';
    this.isSearchBarVisible = true; // 表示状態フラグを設定
    
    console.log('✅ GhostSearchBar: 検索ツールバー表示完了');
  }

  hideSearchBar() {
    if (!this.searchBar) {
      console.log('❌ GhostSearchBar: 検索ツールバーが存在しない');
      return;
    }
    
    this.searchBar.style.display = 'none';
    this.isSearchBarVisible = false; // 表示状態フラグをクリア
    
    console.log('✅ GhostSearchBar: 検索ツールバー非表示完了');
  }

  handleWheelScroll(event) {
    console.log('🔄 GhostSearchBar: ホイールスクロールイベント発火', event.deltaY);
    event.preventDefault();
    
    if (event.deltaY < 0) {
      // 上向きスクロール: 検索ツールバー表示または検索ワード追加
      console.log('🔄 GhostSearchBar: 上向きスクロール - 検索ツールバー表示または検索ワード追加');
      
      // 現在の選択テキストを確認
      const selection = window.getSelection();
      const currentText = selection.toString().trim();
      console.log('🔄 GhostSearchBar: 上スクロール時の選択テキスト:', currentText);
      
      if (currentText) {
        // 選択テキストを更新
        this.selectedText = currentText;
        
        if (this.isSearchBarVisible) {
          // 検索ツールバーが既に表示中の場合は、新しいワードを追加
          console.log('🔄 GhostSearchBar: 検索ツールバーが既に表示中 - 新しいワードを追加');
          this.addSelectedTextToSearchBar();
        } else {
          // 検索ツールバーが表示されていない場合は表示
          console.log('🔄 GhostSearchBar: 検索ツールバーを表示');
          this.showSearchBar(event);
        }
      }
      
      this.hideGhostInterface();
    } else if (event.deltaY > 0) {
      // 下向きスクロール: 新しく選択されたテキストで即座検索実行
      console.log('🔄 GhostSearchBar: 下向きスクロール - 新しく選択されたテキストで即座検索実行');
      
      // 現在の選択テキストを確認
      const selection = window.getSelection();
      const currentText = selection.toString().trim();
      console.log('🔄 GhostSearchBar: 下スクロール時の選択テキスト:', currentText);
      
      if (currentText) {
        // 新しく選択されたテキストで即座検索（検索ツールバーの内容は変更しない）
        this.performImmediateSearch(currentText);
      } else {
        console.log('❌ GhostSearchBar: 下スクロール時に選択テキストが存在しない');
      }
      
      this.hideGhostInterface();
    }
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

  performGoogleSearch() {
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
    
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchText)}`;
    window.open(searchUrl, '_blank');
    
    console.log('🔍 GhostSearchBar: 検索ツールバーからGoogle検索実行:', searchText);
    
    // 統計を更新
    this.updateStats('search');
  }

  // 新しく選択されたテキストで即座検索を実行（検索ツールバーの内容は変更しない）
  performImmediateSearch(searchText) {
    if (!searchText || searchText.length === 0) {
      console.log('❌ GhostSearchBar: 即座検索用のテキストが存在しない');
      return;
    }
    
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchText)}`;
    window.open(searchUrl, '_blank');
    
    console.log('🚀 GhostSearchBar: 新しく選択されたテキストで即座検索実行:', searchText);
    
    // 統計を更新
    this.updateStats('immediate_search');
  }

  // addToSearchBarメソッドは削除（上ドラッグ機能に置き換え）

  loadSettings() {
    // 設定の読み込み
    chrome.storage.sync.get(['ghostSearchSettings'], (result) => {
      if (result.ghostSearchSettings) {
        this.settings = result.ghostSearchSettings;
        console.log('設定を読み込みました:', this.settings);
        
        // 設定に基づいて動作を調整
        if (this.settings.enabled === false) {
          this.disable();
        }
      }
    });
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

  // 選択されたテキストを検索バーに追加
  addSelectedTextToSearchBar() {
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
    
    searchInput.value = newValue;
    console.log('✅ GhostSearchBar: 検索ワードを追加:', currentSelectedText, '→', newValue);
    
    // 統計を更新
    this.updateStats('addition');
    
    // ゴーストインターフェースを非表示
    this.hideGhostInterface();
  }

  // サーチバーの表示状態を確認
  isSearchBarDisplayed() {
    return this.isSearchBarVisible && this.searchBar && this.searchBar.style.display === 'block';
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
        searchPlaceholder: '検索ワードを入力...',
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
