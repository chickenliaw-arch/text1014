/**
 * 楊梅高中分機一覽表 - 主應用程式邏輯
 * 包含：搜尋過濾、分類檢索、字體縮放、虛擬撥號盤、收藏管理、Toast通知、音效整合
 */

class ExtensionDirectoryApp {
  constructor() {
    this.items = DIRECTORY_ITEMS;
    this.filteredItems = [...this.items];
    this.currentCategory = "all";
    this.searchKeyword = "";
    this.currentView = "grid"; // 'grid' | 'table'

    // 常用分機收藏集 (從 localStorage 讀取)
    this.favorites = new Set(JSON.parse(localStorage.getItem("ymhs_fav_extensions") || "[]"));

    // 字體大小設定 (1: 標準, 1.15: 大, 1.3: 特大)
    this.fontScale = parseFloat(localStorage.getItem("ymhs_font_scale") || "1");

    // 虛擬撥號盤當前輸入字串
    this.dialDigits = "";

    this.initDOM();
    this.applyFontScale(this.fontScale);
    this.renderCategoryPills();
    this.renderDirectory();
    this.bindEvents();
    this.updateSoundButtonUI();
  }

  initDOM() {
    this.dom = {
      searchInput: document.getElementById("searchInput"),
      searchClearBtn: document.getElementById("searchClearBtn"),
      categoryPillsWrap: document.getElementById("categoryPillsWrap"),
      statusCount: document.getElementById("statusCount"),
      directoryGrid: document.getElementById("directoryGrid"),
      directoryTableWrap: document.getElementById("directoryTableWrap"),
      directoryTableBody: document.getElementById("directoryTableBody"),
      emptyState: document.getElementById("emptyState"),
      resetSearchBtn: document.getElementById("resetSearchBtn"),
      toastContainer: document.getElementById("toastContainer"),
      backToTopBtn: document.getElementById("backToTopBtn"),
      controlPanel: document.getElementById("controlPanel"),

      // 工具列按鈕
      btnFontSize: document.getElementById("btnFontSize"),
      fontSizeLabel: document.getElementById("fontSizeLabel"),
      btnSoundToggle: document.getElementById("btnSoundToggle"),
      soundIcon: document.getElementById("soundIcon"),
      soundLabel: document.getElementById("soundLabel"),
      btnDialPad: document.getElementById("btnDialPad"),
      btnPrint: document.getElementById("btnPrint"),
      btnViewGrid: document.getElementById("btnViewGrid"),
      btnViewTable: document.getElementById("btnViewTable"),
      btnViewFavorites: document.getElementById("btnViewFavorites"),

      // 虛擬撥號盤 Modal
      dialModal: document.getElementById("dialModal"),
      dialCloseBtn: document.getElementById("dialCloseBtn"),
      dialScreenDigits: document.getElementById("dialScreenDigits"),
      dialMatchPreview: document.getElementById("dialMatchPreview"),
      dialKeys: document.querySelectorAll(".dial-key"),
      dialBackspaceBtn: document.getElementById("dialBackspaceBtn"),
      dialClearBtn: document.getElementById("dialClearBtn"),
      dialCallBtn: document.getElementById("dialCallBtn")
    };
  }

  bindEvents() {
    // 搜尋輸入 (即時搜尋防抖)
    let searchTimer = null;
    this.dom.searchInput.addEventListener("input", (e) => {
      this.searchKeyword = e.target.value.trim();
      this.dom.searchClearBtn.classList.toggle("visible", this.searchKeyword.length > 0);

      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        this.filterAndRender();
      }, 100);
    });

    // 清除搜尋按鈕
    this.dom.searchClearBtn.addEventListener("click", () => {
      soundEngine.playClick();
      this.dom.searchInput.value = "";
      this.searchKeyword = "";
      this.dom.searchClearBtn.classList.remove("visible");
      this.dom.searchInput.focus();
      this.filterAndRender();
    });

    // 重設搜尋按鈕
    if (this.dom.resetSearchBtn) {
      this.dom.resetSearchBtn.addEventListener("click", () => {
        soundEngine.playClick();
        this.dom.searchInput.value = "";
        this.searchKeyword = "";
        this.currentCategory = "all";
        this.updateActivePill();
        this.filterAndRender();
      });
    }

    // 檢視模式切換 (網格 / 表格)
    this.dom.btnViewGrid.addEventListener("click", () => {
      soundEngine.playClick();
      this.setViewMode("grid");
    });
    this.dom.btnViewTable.addEventListener("click", () => {
      soundEngine.playClick();
      this.setViewMode("table");
    });

    // 快速查看「常用收藏」
    this.dom.btnViewFavorites.addEventListener("click", () => {
      soundEngine.playClick();
      this.currentCategory = "favorites";
      this.updateActivePill();
      this.filterAndRender();
    });

    // 字體大小循環調整 (標準 -> 大 -> 特大 -> 標準)
    this.dom.btnFontSize.addEventListener("click", () => {
      soundEngine.playClick();
      if (this.fontScale === 1) {
        this.applyFontScale(1.15);
      } else if (this.fontScale === 1.15) {
        this.applyFontScale(1.3);
      } else {
        this.applyFontScale(1);
      }
      this.showToast(`已切換字體：${this.getFontSizeName()}`, "text");
    });

    // 音效開關切換
    this.dom.btnSoundToggle.addEventListener("click", () => {
      const isEnabled = soundEngine.toggleSound();
      this.updateSoundButtonUI(isEnabled);
      this.showToast(isEnabled ? "🔊 音效已開啟" : "🔇 音效已靜音", isEnabled ? "sound-on" : "sound-off");
    });

    // 開啟虛擬撥號盤
    this.dom.btnDialPad.addEventListener("click", () => {
      soundEngine.playClick();
      this.openDialPad();
    });

    // 友善列印
    this.dom.btnPrint.addEventListener("click", () => {
      soundEngine.playClick();
      window.print();
    });

    // 回頂端按鈕
    window.addEventListener("scroll", () => {
      const scrolled = window.scrollY > 300;
      this.dom.backToTopBtn.classList.toggle("visible", scrolled);
      this.dom.controlPanel.classList.toggle("is-scrolled", window.scrollY > 150);
    }, { passive: true });

    this.dom.backToTopBtn.addEventListener("click", () => {
      soundEngine.playClick();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    // 撥號盤相關事件綁定
    this.bindDialPadEvents();
  }

  // 綁定虛擬撥號盤
  bindDialPadEvents() {
    this.dom.dialCloseBtn.addEventListener("click", () => {
      soundEngine.playClick();
      this.closeDialPad();
    });

    this.dom.dialModal.addEventListener("click", (e) => {
      if (e.target === this.dom.dialModal) {
        this.closeDialPad();
      }
    });

    // 實體按鍵 1-9, 0, *, # 點擊
    this.dom.dialKeys.forEach(btn => {
      btn.addEventListener("click", () => {
        const val = btn.getAttribute("data-dial-val");
        this.pressDialKey(val);
      });
    });

    // 退格鍵
    this.dom.dialBackspaceBtn.addEventListener("click", () => {
      soundEngine.playClick();
      if (this.dialDigits.length > 0) {
        this.dialDigits = this.dialDigits.slice(0, -1);
        this.updateDialDisplay();
      }
    });

    // 清空鍵
    this.dom.dialClearBtn.addEventListener("click", () => {
      soundEngine.playClick();
      this.dialDigits = "";
      this.updateDialDisplay();
    });

    // 撥打按鈕 (綠色通話鍵)
    this.dom.dialCallBtn.addEventListener("click", () => {
      if (!this.dialDigits) {
        this.showToast("請先輸入分機號碼", "info");
        soundEngine.playClick();
        return;
      }
      this.executeDialCall(this.dialDigits);
    });

    // 支援鍵盤直接打字 (當撥號盤開啟時)
    window.addEventListener("keydown", (e) => {
      if (!this.dom.dialModal.classList.contains("active")) return;
      if (e.key >= "0" && e.key <= "9" || e.key === "*" || e.key === "#") {
        e.preventDefault();
        this.pressDialKey(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        this.dialDigits = this.dialDigits.slice(0, -1);
        this.updateDialDisplay();
      } else if (e.key === "Escape") {
        this.closeDialPad();
      } else if (e.key === "Enter") {
        e.preventDefault();
        this.executeDialCall(this.dialDigits);
      }
    });
  }

  openDialPad(initialExt = "") {
    this.dialDigits = initialExt;
    this.updateDialDisplay();
    this.dom.dialModal.classList.add("active");
  }

  closeDialPad() {
    this.dom.dialModal.classList.remove("active");
  }

  pressDialKey(char) {
    if (this.dialDigits.length >= 10) return;
    this.dialDigits += char;
    soundEngine.playDTMF(char);
    this.updateDialDisplay();
  }

  updateDialDisplay() {
    this.dom.dialScreenDigits.textContent = this.dialDigits || "—";

    // 比對是否有相符的楊梅高中分機
    if (this.dialDigits.length >= 2) {
      const match = this.items.find(item => {
        if (item.extension.includes(this.dialDigits)) return true;
        if (item.extensionList && item.extensionList.includes(this.dialDigits)) return true;
        return false;
      });

      if (match) {
        this.dom.dialMatchPreview.innerHTML = `🔔 楊梅高中：${match.dept} · <strong>${match.title} ${match.name}</strong>`;
        this.dom.dialMatchPreview.style.color = "#059669";
      } else {
        this.dom.dialMatchPreview.textContent = "輸入 4 碼分機自動比對處室人員";
        this.dom.dialMatchPreview.style.color = "#64748b";
      }
    } else {
      this.dom.dialMatchPreview.textContent = "請輸入楊梅高中分機號碼";
      this.dom.dialMatchPreview.style.color = "#64748b";
    }
  }

  executeDialCall(extNumber) {
    soundEngine.playCallRing(() => {
      // 呼叫撥號協定：03-4789618 代表號轉分機
      const telUrl = `tel:${SCHOOL_CONFIG.mainNumberRaw},${extNumber}`;
      this.showToast(`正在撥號：總機 ${SCHOOL_CONFIG.mainNumber} 轉分機 ${extNumber}`, "phone");
      window.location.href = telUrl;
    });
  }

  // 字體大小控制
  applyFontScale(scale) {
    this.fontScale = scale;
    localStorage.setItem("ymhs_font_scale", scale.toString());
    document.documentElement.style.setProperty("--font-scale", scale.toString());
    if (this.dom.fontSizeLabel) {
      this.dom.fontSizeLabel.textContent = this.getFontSizeName();
    }
  }

  getFontSizeName() {
    if (this.fontScale === 1) return "字體: 正常";
    if (this.fontScale === 1.15) return "字體: 大字";
    if (this.fontScale === 1.3) return "字體: 特大";
    return "字體: 正常";
  }

  // 更新音效按鈕狀態
  updateSoundButtonUI(isEnabled = soundEngine.soundEnabled) {
    if (!this.dom.soundLabel) return;
    if (isEnabled) {
      this.dom.soundLabel.textContent = "音效: 開啟";
      this.dom.btnSoundToggle.classList.add("active");
    } else {
      this.dom.soundLabel.textContent = "音效: 靜音";
      this.dom.btnSoundToggle.classList.remove("active");
    }
  }

  // 檢視模式切換
  setViewMode(mode) {
    this.currentView = mode;
    this.dom.btnViewGrid.classList.toggle("active", mode === "grid");
    this.dom.btnViewTable.classList.toggle("active", mode === "table");

    if (mode === "grid") {
      this.dom.directoryGrid.style.display = "grid";
      this.dom.directoryTableWrap.style.display = "none";
    } else {
      this.dom.directoryGrid.style.display = "none";
      this.dom.directoryTableWrap.style.display = "block";
    }
  }

  // 渲染處室分類膠囊按鈕列
  renderCategoryPills() {
    const pillsHTML = CATEGORIES.map(cat => {
      let count = 0;
      if (cat.id === "all") {
        count = this.items.length;
      } else {
        count = this.items.filter(item => item.category === cat.id).length;
      }
      return `
        <button class="pill-btn ${cat.id === this.currentCategory ? 'active' : ''}" data-cat-id="${cat.id}">
          <span>${cat.name}</span>
          <span class="pill-count">${count}</span>
        </button>
      `;
    }).join("");

    this.dom.categoryPillsWrap.innerHTML = pillsHTML;

    // 綁定點擊事件
    this.dom.categoryPillsWrap.querySelectorAll(".pill-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        soundEngine.playClick();
        const catId = btn.getAttribute("data-cat-id");
        this.currentCategory = catId;
        this.updateActivePill();
        this.filterAndRender();
      });
    });
  }

  updateActivePill() {
    this.dom.categoryPillsWrap.querySelectorAll(".pill-btn").forEach(btn => {
      const catId = btn.getAttribute("data-cat-id");
      btn.classList.toggle("active", catId === this.currentCategory);
    });
    this.dom.btnViewFavorites.classList.toggle("active", this.currentCategory === "favorites");
  }

  // 核心過濾器
  filterAndRender() {
    const keyword = this.searchKeyword.toLowerCase();

    this.filteredItems = this.items.filter(item => {
      // 1. 分類過濾
      if (this.currentCategory === "favorites") {
        if (!this.favorites.has(item.id)) return false;
      } else if (this.currentCategory !== "all") {
        if (item.category !== this.currentCategory) return false;
      }

      // 2. 關鍵字模糊搜尋 (姓名、職稱、分機、處室、位置、電話、傳真、備註)
      if (keyword) {
        const matchDept = item.dept.toLowerCase().includes(keyword);
        const matchTitle = item.title.toLowerCase().includes(keyword);
        const matchName = item.name.toLowerCase().includes(keyword);
        const matchExt = item.extension.toLowerCase().includes(keyword);
        const matchPhone = (item.directPhone || "").toLowerCase().includes(keyword);
        const matchFax = (item.fax || "").toLowerCase().includes(keyword);
        const matchLocation = (item.location || "").toLowerCase().includes(keyword);
        const matchNote = (item.note || "").toLowerCase().includes(keyword);

        return matchDept || matchTitle || matchName || matchExt || matchPhone || matchFax || matchLocation || matchNote;
      }

      return true;
    });

    this.renderDirectory();
  }

  // 渲染分機卡片與表格
  renderDirectory() {
    const count = this.filteredItems.length;
    this.dom.statusCount.innerHTML = `共找到 <span class="status-highlight">${count}</span> 筆分機資料`;

    if (count === 0) {
      this.dom.directoryGrid.style.display = "none";
      this.dom.directoryTableWrap.style.display = "none";
      this.dom.emptyState.style.display = "flex";
      return;
    }

    this.dom.emptyState.style.display = "none";
    if (this.currentView === "grid") {
      this.dom.directoryGrid.style.display = "grid";
      this.dom.directoryTableWrap.style.display = "none";
    } else {
      this.dom.directoryGrid.style.display = "none";
      this.dom.directoryTableWrap.style.display = "block";
    }

    // 渲染卡片網格視圖
    this.dom.directoryGrid.innerHTML = this.filteredItems.map(item => this.createCardHTML(item)).join("");

    // 渲染表格視圖
    this.dom.directoryTableBody.innerHTML = this.filteredItems.map(item => this.createTableRowHTML(item)).join("");

    // 綁定卡片與表格上的互動按鈕 (複製、撥打、收藏、朗讀)
    this.bindItemActions();
  }

  // 高亮搜尋關鍵字
  highlightText(text) {
    if (!this.searchKeyword || !text) return text;
    const regex = new RegExp(`(${this.escapeRegExp(this.searchKeyword)})`, "gi");
    return text.replace(regex, `<mark class="search-highlight">$1</mark>`);
  }

  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // 依據處室分類返回對應的精美 SVG 圖示
  getCategoryIcon(catId) {
    switch (catId) {
      case "principal":
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      case "academic":
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
      case "student":
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
      case "general":
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`;
      case "counseling":
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
      case "library":
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;
      case "internship":
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>`;
      case "admin_other":
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
      case "teachers":
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>`;
      case "classrooms":
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 2v7.31L4.14 20.3a2 2 0 0 0 1.72 2.7h12.28a2 2 0 0 0 1.72-2.7L14 9.31V2"/><line x1="8.5" y1="2" x2="15.5" y2="2"/><line x1="7" y1="16" x2="17" y2="16"/></svg>`;
      case "buildings":
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="9" y1="22" x2="9" y2="18"/><line x1="15" y1="22" x2="15" y2="18"/><line x1="8" y1="6" x2="8.01" y2="6"/><line x1="16" y1="6" x2="16.01" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/></svg>`;
      default:
        return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 21h18M3 7v14M21 7v14M9 3h6v4H9zM9 11h2M13 11h2M9 15h2M13 15h2"/></svg>`;
    }
  }

  // 產生分機卡片 HTML
  createCardHTML(item) {
    const isFav = this.favorites.has(item.id);
    const highlightedDept = this.highlightText(item.dept);
    const highlightedTitle = this.highlightText(item.title);
    const highlightedName = this.highlightText(item.name);
    const highlightedExt = this.highlightText(item.extension);
    const highlightedLocation = this.highlightText(item.location);
    const catIcon = this.getCategoryIcon(item.category);

    // 判斷第一組主分機號
    const primaryExt = item.extensionList ? item.extensionList[0] : item.extension.split(/[\s,/]+/)[0];

    return `
      <div class="ext-card" data-dept-cat="${item.category}" data-id="${item.id}">
        <div>
          <!-- 頂部資訊列：處室標籤與功能鍵 -->
          <div class="card-header-line">
            <span class="dept-badge">
              ${catIcon}
              ${highlightedDept}
            </span>
            <div class="card-quick-actions">
              <!-- 語音朗讀分機 -->
              <button class="icon-btn tts-btn" title="語音朗讀分機" data-speak-text="${item.dept} ${item.title} ${item.name} 分機 ${item.extension}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              </button>
              <!-- 收藏按鈕 -->
              <button class="icon-btn favorite-btn ${isFav ? 'is-favorite' : ''}" title="${isFav ? '取消常用收藏' : '加入常用收藏'}" data-id="${item.id}">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="${isFav ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </button>
            </div>
          </div>

          <!-- 職稱與姓名 (大字清晰) -->
          <div class="card-identity">
            <div class="card-title-text">${highlightedTitle}</div>
            <div class="card-name-text">${highlightedName}</div>
          </div>

          <!-- 分機號碼醒目區 (大字+點擊複製/撥打) -->
          <div class="card-ext-box" title="點擊一鍵複製分機號碼" data-copy-val="${primaryExt}" data-name="${item.name}">
            <div class="ext-num-wrap">
              <span class="ext-label">分機 EXT</span>
              <span class="ext-digits">${highlightedExt}</span>
            </div>
            <div class="ext-actions-right">
              <button class="ext-copy-chip" data-copy-val="${primaryExt}" data-name="${item.name}" title="複製分機">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                複製
              </button>
              <button class="ext-call-chip card-dial-btn" data-ext="${primaryExt}" title="撥號模擬 / 手機直撥">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                撥打
              </button>
            </div>
          </div>
        </div>

        <!-- 底部輔助資訊 (專線/傳真/地點) -->
        <div class="card-meta-list">
          ${item.location ? `
            <div class="meta-item">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <span>${highlightedLocation}</span>
            </div>
          ` : ''}

          ${item.directPhone ? `
            <div class="meta-item">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span>專線：<a class="meta-link" href="tel:${item.directPhone.replace(/-/g, '')}">${item.directPhone}</a></span>
            </div>
          ` : ''}

          ${item.fax ? `
            <div class="meta-item">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              <span>傳真：${item.fax}</span>
            </div>
          ` : ''}

          ${item.note ? `
            <div class="meta-item">
              <svg class="meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              <span>${this.highlightText(item.note)}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // 產生表格列 HTML
  createTableRowHTML(item) {
    const isFav = this.favorites.has(item.id);
    const primaryExt = item.extensionList ? item.extensionList[0] : item.extension.split(/[\s,/]+/)[0];

    return `
      <tr>
        <td style="width: 40px; text-align: center;">
          <button class="icon-btn favorite-btn ${isFav ? 'is-favorite' : ''}" style="width: 28px; height: 28px;" data-id="${item.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? '#f59e0b' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
        </td>
        <td><span class="dept-badge">${this.highlightText(item.dept)}</span></td>
        <td><strong>${this.highlightText(item.title)}</strong></td>
        <td>${this.highlightText(item.name)}</td>
        <td class="table-ext-cell">${this.highlightText(item.extension)}</td>
        <td>${item.location ? this.highlightText(item.location) : '—'}</td>
        <td>${item.directPhone ? `<a class="meta-link" href="tel:${item.directPhone.replace(/-/g, '')}">${item.directPhone}</a>` : '—'}</td>
        <td style="white-space: nowrap;">
          <button class="ext-copy-chip" data-copy-val="${primaryExt}" data-name="${item.name}" style="margin-right: 4px;">複製</button>
          <button class="ext-call-chip card-dial-btn" data-ext="${primaryExt}">撥號</button>
        </td>
      </tr>
    `;
  }

  // 綁定項目互動按鈕
  bindItemActions() {
    // 1. 複製按鈕 (以及點擊分機大框一鍵複製)
    document.querySelectorAll("[data-copy-val]").forEach(el => {
      el.addEventListener("click", (e) => {
        // 防止重複觸發
        e.stopPropagation();
        const copyVal = el.getAttribute("data-copy-val");
        const name = el.getAttribute("data-name") || "";
        this.copyToClipboard(copyVal, name);
      });
    });

    // 2. 撥號按鈕 (開啟撥號盤並填入號碼)
    document.querySelectorAll(".card-dial-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        soundEngine.playClick();
        const ext = btn.getAttribute("data-ext") || "";
        this.openDialPad(ext);
      });
    });

    // 3. 語音朗讀按鈕
    document.querySelectorAll(".tts-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        soundEngine.playClick();
        const text = btn.getAttribute("data-speak-text");
        soundEngine.speak(text);
      });
    });

    // 4. 常用收藏星號按鈕
    document.querySelectorAll(".favorite-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-id");
        this.toggleFavorite(id);
      });
    });
  }

  // 複製至剪貼簿
  copyToClipboard(text, name = "") {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      soundEngine.playCopySuccess();
      const label = name ? `已複製 ${name} 分機：${text}` : `已複製分機號碼：${text}`;
      this.showToast(label, "clipboard");
    }).catch(() => {
      // 舊瀏覽器 fallback
      const tempInput = document.createElement("input");
      tempInput.value = text;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
      soundEngine.playCopySuccess();
      this.showToast(`已複製分機：${text}`, "clipboard");
    });
  }

  // 切換常用收藏
  toggleFavorite(id) {
    const isAdding = !this.favorites.has(id);
    if (isAdding) {
      this.favorites.add(id);
    } else {
      this.favorites.delete(id);
    }
    localStorage.setItem("ymhs_fav_extensions", JSON.stringify([...this.favorites]));
    soundEngine.playFavorite(isAdding);

    const targetItem = this.items.find(i => i.id === id);
    const itemName = targetItem ? `${targetItem.dept} ${targetItem.title}` : "此項目";

    this.showToast(isAdding ? `⭐ 已加入常用收藏：${itemName}` : `已移除常用收藏：${itemName}`, isAdding ? "star-fill" : "star-empty");

    // 重新過濾渲染以保持狀態同步
    this.renderCategoryPills();
    this.filterAndRender();
  }

  // 顯示 Toast 浮動提示
  showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = "toast-msg";

    let iconSVG = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    if (type.includes("sound")) {
      iconSVG = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>`;
    } else if (type.includes("star")) {
      iconSVG = `<svg class="toast-icon" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
    } else if (type === "phone") {
      iconSVG = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
    }

    toast.innerHTML = `${iconSVG}<span>${message}</span>`;
    this.dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("toast-fadeout");
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 250);
    }, 2400);
  }
}

// 頁面加載完成後啟動
document.addEventListener("DOMContentLoaded", () => {
  window.app = new ExtensionDirectoryApp();
});
