// ========================================
// 画面モック用JS
// データモデルから描画し、カードのD&D移動・カードごとの詳細表示を行う
// （見た目と操作感の認識合わせ用。永続化はしない）
// ========================================

// ---- ラベルに使える色のパレット（新規ラベル作成時に選ぶ） ----
const LABEL_COLORS = ['#eb5a46', '#f2d600', '#61bd4f', '#0079bf', '#c377e0', '#ff9f1a', '#00c2e0', '#344563'];

// ---- ダミーデータ（データ設計書の項目に沿う） ----
// ラベルはボード単位で定義・共有（デフォルトは「重要」のみ。任意で追加できる）
let board = {
  name: '仕事ボード',
  labels: [
    { id: 'lb_red', name: '重要', color: '#eb5a46' },
  ],
  lists: [
    {
      id: 'l1', title: '未着手',
      cards: [
        { id: 'c1', title: '資料作成', desc: 'クライアント向けの提案資料をまとめる',
          due: '2026-11-12', labels: ['lb_red'], priority: 'high',
          checklist: [
            { t: '構成案を作る', done: true },
            { t: '素材を集める', done: true },
            { t: '本文を書く', done: false },
            { t: 'レビュー依頼', done: false },
            { t: '修正', done: false },
          ] },
        { id: 'c2', title: '見積依頼', desc: '取引先に見積を依頼する',
          due: '', labels: [], checklist: [] },
      ],
    },
    {
      id: 'l2', title: '作業中',
      cards: [
        { id: 'c3', title: '設計', desc: '画面とデータの設計を進める',
          due: '2026-11-07', labels: [], priority: 'medium',
          checklist: [
            { t: '要件整理', done: true },
            { t: '画面洗い出し', done: true },
            { t: 'ER図', done: false },
            { t: 'API設計', done: false },
            { t: 'レビュー', done: false },
          ] },
      ],
    },
    {
      id: 'l3', title: '完了',
      cards: [
        { id: 'c4', title: '環境構築', desc: '開発環境のセットアップ',
          due: '', labels: [], checklist: [] },
      ],
    },
  ],
};

let seq = 100; // 新規ID採番用
const uid = (p) => `${p}${++seq}`;

// ラベルIDから定義を取得
const getLabel = (id) => board.labels.find((l) => l.id === id);

// リスト内のカードを期限順に並べ替え（asc=近い順。期限なしは常に末尾）
function sortCardsByDue(list, asc) {
  list.cards.sort((a, b) => {
    if (!a.due && !b.due) return 0;
    if (!a.due) return 1;   // 期限なしは後ろ
    if (!b.due) return -1;
    return asc ? a.due.localeCompare(b.due) : b.due.localeCompare(a.due);
  });
}

// 優先度の表示設定（高→中→低→なし）
const PRIORITY = {
  high:   { label: '高', color: '#eb5a46', rank: 3 },
  medium: { label: '中', color: '#ff9f1a', rank: 2 },
  low:    { label: '低', color: '#0079bf', rank: 1 },
};
const priorityRank = (p) => (PRIORITY[p] ? PRIORITY[p].rank : 0);

// リスト内のカードを優先度順に並べ替え（desc=高い順。なしは常に末尾）
function sortCardsByPriority(list, desc) {
  list.cards.sort((a, b) => {
    const ra = priorityRank(a.priority), rb = priorityRank(b.priority);
    if (ra === 0 && rb === 0) return 0;
    if (ra === 0) return 1;   // 優先度なしは後ろ
    if (rb === 0) return -1;
    return desc ? rb - ra : ra - rb;
  });
}

// ---- 画面要素 ----
const screenBoards = document.getElementById('screen-boards');
const screenBoard  = document.getElementById('screen-board');
const cardModal    = document.getElementById('card-modal');
const boardName    = document.getElementById('board-name');
const listsEl      = document.getElementById('lists');

// ===============================
// 期限の状態判定（近い=soon / 過ぎた=over）
// ===============================
function dueState(due) {
  if (!due) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(due + 'T00:00:00');
  const diff = Math.round((d - today) / 86400000);
  if (diff < 0) return 'over';   // 過ぎた
  if (diff <= 3) return 'soon';  // 近い（3日以内）
  return 'ok';
}
function formatMD(due) {
  const d = new Date(due + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ===============================
// S-2 ボード画面の描画
// ===============================
function renderBoard() {
  boardName.textContent = board.name;
  listsEl.innerHTML = '';

  board.lists.forEach((list) => {
    const col = document.createElement('div');
    col.className = 'list';
    col.dataset.listId = list.id;

    // 見出し（ここを掴んでリストごとD&Dで並び替え）
    const head = document.createElement('div');
    head.className = 'list-head';
    head.draggable = true;
    head.innerHTML =
      `<span class="list-title" title="ドラッグでリストを並び替え">${esc(list.title)}</span>` +
      `<span class="list-actions">` +
      `<button class="icon-btn" title="期限順に並べ替え">📅↕</button>` +
      `<button class="icon-btn" title="優先度順に並べ替え">⚑↕</button>` +
      `<button class="icon-btn" title="名前変更">✎</button>` +
      `<button class="icon-btn" title="削除">×</button>` +
      `</span>`;
    // 期限順に並べ替え（押すたびに 近い順 ⇄ 遠い順 を切替。期限なしは末尾）
    head.querySelector('[title="期限順に並べ替え"]').addEventListener('click', () => {
      list._dueAsc = !list._dueAsc;
      sortCardsByDue(list, list._dueAsc);
      renderBoard();
    });
    // 優先度順に並べ替え（押すたびに 高い順 ⇄ 低い順 を切替。なしは末尾）
    head.querySelector('[title="優先度順に並べ替え"]').addEventListener('click', () => {
      list._priDesc = list._priDesc === undefined ? true : !list._priDesc;
      sortCardsByPriority(list, list._priDesc);
      renderBoard();
    });
    // リスト名変更（見出しをその場で編集）
    const startRename = () => {
      const titleEl = head.querySelector('.list-title');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'list-title-input';
      input.value = list.title;
      titleEl.replaceWith(input);
      input.focus();
      input.select();
      let done = false;
      const commit = () => {
        if (done) return;
        done = true;
        const t = input.value.trim();
        if (t) list.title = t;
        renderBoard();
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { done = true; renderBoard(); }
      });
      input.addEventListener('blur', commit);
    };
    head.querySelector('[title="名前変更"]').addEventListener('click', startRename);
    // 見出しのダブルクリックでも編集開始
    head.querySelector('.list-title').addEventListener('dblclick', startRename);
    // リスト削除
    head.querySelector('[title="削除"]').addEventListener('click', () => {
      if (confirm(`リスト「${list.title}」を削除しますか？`)) {
        board.lists = board.lists.filter((l) => l.id !== list.id);
        renderBoard();
      }
    });
    // リストのドラッグ
    head.addEventListener('dragstart', (e) => {
      draggingType = 'list';
      draggingListEl = col;
      col.classList.add('dragging-list');
      e.dataTransfer.effectAllowed = 'move';
    });
    head.addEventListener('dragend', () => {
      col.classList.remove('dragging-list');
      draggingType = null;
      draggingListEl = null;
    });
    col.appendChild(head);

    // カード入れ（ドロップ先）
    const cardsEl = document.createElement('div');
    cardsEl.className = 'list-cards';
    cardsEl.dataset.listId = list.id;
    list.cards.forEach((card) => cardsEl.appendChild(renderCard(card)));
    enableDrop(cardsEl);
    col.appendChild(cardsEl);

    // カード追加（詳細モーダルを新規モードで開く）
    const addBtn = document.createElement('button');
    addBtn.className = 'add-card-btn';
    addBtn.textContent = '＋ カード追加';
    addBtn.addEventListener('click', () => openNewCard(list));
    col.appendChild(addBtn);

    listsEl.appendChild(col);
  });

  enableListDrop();

  // リスト追加（その場で入力）
  const addList = document.createElement('div');
  addList.className = 'add-list';

  const addListBtn = document.createElement('button');
  addListBtn.className = 'add-list-btn';
  addListBtn.textContent = '＋ リスト追加';

  const listForm = document.createElement('div');
  listForm.className = 'list-add-form';
  listForm.hidden = true;
  const listInput = document.createElement('input');
  listInput.type = 'text';
  listInput.className = 'list-add-input';
  listInput.placeholder = 'リスト名を入力...';
  const listActions = document.createElement('div');
  listActions.className = 'list-add-actions';
  const listOk = document.createElement('button');
  listOk.className = 'btn btn-primary';
  listOk.textContent = '追加';
  const listCancel = document.createElement('button');
  listCancel.className = 'icon-btn';
  listCancel.textContent = '✕';
  listActions.appendChild(listOk);
  listActions.appendChild(listCancel);
  listForm.appendChild(listInput);
  listForm.appendChild(listActions);

  const openListForm = () => { addListBtn.hidden = true; listForm.hidden = false; listInput.focus(); };
  const submitList = () => {
    const t = listInput.value.trim();
    if (!t) return;
    board.lists.push({ id: uid('l'), title: t, cards: [] });
    renderBoard();
  };
  addListBtn.addEventListener('click', openListForm);
  listOk.addEventListener('click', submitList);
  listCancel.addEventListener('click', () => { addListBtn.hidden = false; listForm.hidden = true; listInput.value = ''; });
  listInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submitList(); }
    if (e.key === 'Escape') { addListBtn.hidden = false; listForm.hidden = true; listInput.value = ''; }
  });

  addList.appendChild(addListBtn);
  addList.appendChild(listForm);
  listsEl.appendChild(addList);

  renderLabelFilter();
}

// S-2 ヘッダーのラベル絞り込み選択肢をボードのラベルから描画（見た目用）
function renderLabelFilter() {
  const sel = document.getElementById('label-filter');
  if (!sel) return;
  sel.innerHTML = '<option>ラベル ▼</option>';
  board.labels.forEach((l) => {
    const opt = document.createElement('option');
    opt.textContent = l.name;
    sel.appendChild(opt);
  });
}

// 1枚のカード要素を生成
function renderCard(card) {
  const el = document.createElement('div');
  el.className = 'card';
  el.draggable = true;
  el.dataset.cardId = card.id;

  let html = '';
  // ラベル色ドット
  const labs = card.labels.map(getLabel).filter(Boolean);
  if (labs.length) {
    html += '<div class="label-dots">';
    labs.forEach((l) => { html += `<span class="label-dot" style="background:${l.color}" title="${esc(l.name)}"></span>`; });
    html += '</div>';
  }
  html += `<div class="card-title">${esc(card.title)}</div>`;

  // メタ（優先度・期限・チェック進捗）
  const metas = [];
  if (card.priority && PRIORITY[card.priority]) {
    const p = PRIORITY[card.priority];
    metas.push(`<span class="priority-badge" style="background:${p.color}">優先度 ${p.label}</span>`);
  }
  if (card.due) {
    const st = dueState(card.due);
    metas.push(`<span class="due due-${st}">📅 ${formatMD(card.due)}</span>`);
  }
  if (card.checklist.length) {
    const done = card.checklist.filter((i) => i.done).length;
    metas.push(`<span class="check-progress">☑ ${done}/${card.checklist.length}</span>`);
  }
  if (metas.length) html += `<div class="card-meta">${metas.join('')}</div>`;

  el.innerHTML = html;

  // クリックで詳細（ドラッグ直後のクリックは無視）
  el.addEventListener('click', () => { if (!el.dataset.dragged) openCard(card.id); });

  // ドラッグ開始
  el.addEventListener('dragstart', (e) => {
    draggingType = 'card';
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    draggingType = null;
    // ドラッグ直後の誤クリック防止
    el.dataset.dragged = '1';
    setTimeout(() => { delete el.dataset.dragged; }, 50);
  });

  return el;
}

// ===============================
// ドラッグ＆ドロップ
// ===============================
let draggingType = null;   // 'card' | 'list'
let draggingListEl = null;

// ---- カードのドロップ（リスト内の並び替え・リスト間移動） ----
function enableDrop(cardsEl) {
  cardsEl.addEventListener('dragover', (e) => {
    if (draggingType !== 'card') return;
    e.preventDefault();
    const dragging = document.querySelector('.card.dragging');
    if (!dragging) return;
    const after = getDragAfterElement(cardsEl, e.clientY);
    if (after == null) cardsEl.appendChild(dragging);
    else cardsEl.insertBefore(dragging, after);
  });
  cardsEl.addEventListener('drop', (e) => {
    if (draggingType !== 'card') return;
    e.preventDefault();
    commitMove();
  });
}

// Y座標から挿入位置（直後のカード）を求める
function getDragAfterElement(container, y) {
  const els = [...container.querySelectorAll('.card:not(.dragging)')];
  let closest = { offset: -Infinity, element: null };
  els.forEach((child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) closest = { offset, element: child };
  });
  return closest.element;
}

// ---- リストのドロップ（左右の並び替え） ----
function enableListDrop() {
  listsEl.ondragover = (e) => {
    if (draggingType !== 'list' || !draggingListEl) return;
    e.preventDefault();
    const after = getListAfterElement(e.clientX);
    const addList = listsEl.querySelector('.add-list');
    if (after == null) listsEl.insertBefore(draggingListEl, addList); // 末尾（追加ボタンの前）
    else listsEl.insertBefore(draggingListEl, after);
  };
  listsEl.ondrop = (e) => {
    if (draggingType !== 'list') return;
    e.preventDefault();
    commitListOrder();
  };
}

// X座標から挿入位置（直後のリスト）を求める
function getListAfterElement(x) {
  const els = [...listsEl.querySelectorAll('.list:not(.dragging-list)')];
  let closest = { offset: -Infinity, element: null };
  els.forEach((child) => {
    const box = child.getBoundingClientRect();
    const offset = x - box.left - box.width / 2;
    if (offset < 0 && offset > closest.offset) closest = { offset, element: child };
  });
  return closest.element;
}

// DOMのリスト順をデータモデルへ反映
function commitListOrder() {
  const idToList = {};
  board.lists.forEach((l) => { idToList[l.id] = l; });
  const ids = [...listsEl.querySelectorAll('.list')].map((el) => el.dataset.listId);
  board.lists = ids.map((id) => idToList[id]);
  renderBoard();
}

// DOM上の並びをデータモデルへ反映
function commitMove() {
  const idToCard = {};
  board.lists.forEach((l) => l.cards.forEach((c) => { idToCard[c.id] = c; }));
  board.lists.forEach((list) => {
    const cardsEl = listsEl.querySelector(`.list-cards[data-list-id="${list.id}"]`);
    const ids = [...cardsEl.querySelectorAll('.card')].map((el) => el.dataset.cardId);
    list.cards = ids.map((id) => idToCard[id]);
  });
  renderBoard();
}

// ===============================
// S-1 ⇄ S-2 遷移
// ===============================
function openBoard(name) {
  board.name = name;
  renderBoard();
  screenBoards.classList.remove('is-active');
  screenBoard.classList.add('is-active');
  window.scrollTo(0, 0);
}
function backToBoards() {
  screenBoard.classList.remove('is-active');
  screenBoards.classList.add('is-active');
  window.scrollTo(0, 0);
}

// ===============================
// S-3 カード詳細モーダル
// ===============================
let currentCard = null;

function findCard(cardId) {
  for (const list of board.lists) {
    const c = list.cards.find((x) => x.id === cardId);
    if (c) return { card: c, list };
  }
  return null;
}

// 既存カードを開く（編集）
function openCard(cardId) {
  const found = findCard(cardId);
  if (!found) return;
  currentCard = { ...found, isNew: false };
  fillModal(currentCard.card);
}

// 新規カードを開く（まだリストには入れず、保存時に追加）
function openNewCard(list) {
  const temp = { id: uid('c'), title: '', desc: '', due: '', labels: [], checklist: [] };
  currentCard = { card: temp, list, isNew: true };
  fillModal(temp);
}

// モーダルにカード内容を反映して表示
function fillModal(card) {
  document.getElementById('modal-heading').textContent = currentCard.isNew ? 'カードを追加' : 'カード詳細';
  document.getElementById('m-delete').style.display = currentCard.isNew ? 'none' : '';
  document.getElementById('m-save').textContent = currentCard.isNew ? '追加' : '保存';

  document.getElementById('m-title').value = card.title;
  document.getElementById('m-desc').value = card.desc;
  document.getElementById('m-due').value = card.due || '';
  document.getElementById('m-priority').value = card.priority || '';
  renderListSelect();
  renderDueBadge(card.due);
  renderModalLabels(card);
  renderChecklist(card);

  cardModal.hidden = false;
  if (currentCard.isNew) document.getElementById('m-title').focus();
}

// リスト（状態）選択肢を描画。現在の所属リストを選択状態にする
function renderListSelect() {
  const sel = document.getElementById('m-list');
  sel.innerHTML = '';
  board.lists.forEach((list) => {
    const opt = document.createElement('option');
    opt.value = list.id;
    opt.textContent = list.title;
    if (currentCard.list && list.id === currentCard.list.id) opt.selected = true;
    sel.appendChild(opt);
  });
}

function renderDueBadge(due) {
  const badge = document.getElementById('m-due-badge');
  const st = dueState(due);
  badge.className = 'due-badge due-' + st;
  if (st === 'over') badge.textContent = '🔴 期限切れ';
  else if (st === 'soon') badge.textContent = '🟡 期限が近い';
  else badge.textContent = '';
}

function renderModalLabels(card, keepMenuOpen) {
  const box = document.getElementById('m-labels');
  box.innerHTML = '';

  // 付与済みラベル（クリックで外せる）
  card.labels.forEach((id) => {
    const l = getLabel(id);
    if (!l) return;
    const chip = document.createElement('span');
    chip.className = 'label-chip';
    chip.style.background = l.color;
    chip.style.color = '#fff';
    chip.title = 'クリックで外す';
    chip.textContent = `${l.name} ✕`;
    chip.addEventListener('click', () => {
      card.labels = card.labels.filter((x) => x !== id);
      renderModalLabels(card);
    });
    box.appendChild(chip);
  });

  // ＋ラベル（選択メニューを開く）
  const wrap = document.createElement('span');
  wrap.className = 'label-add-wrap';
  const add = document.createElement('button');
  add.className = 'btn btn-ghost';
  add.textContent = '＋ ラベル';
  const menu = document.createElement('div');
  menu.className = 'label-menu';
  menu.hidden = !keepMenuOpen;

  // 既存ラベルの付け外し
  board.labels.forEach((l) => {
    const row = document.createElement('label');
    row.className = 'label-menu-row';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = card.labels.includes(l.id);
    cb.addEventListener('change', () => {
      if (cb.checked) { if (!card.labels.includes(l.id)) card.labels.push(l.id); }
      else card.labels = card.labels.filter((x) => x !== l.id);
      renderModalLabels(card, true); // メニューは開いたまま
    });
    const sw = document.createElement('span');
    sw.className = 'label-swatch';
    sw.style.background = l.color;
    row.appendChild(cb);
    row.appendChild(sw);
    row.appendChild(document.createTextNode(l.name));
    menu.appendChild(row);
  });

  // 区切り＋新しいラベル作成フォーム
  const divider = document.createElement('div');
  divider.className = 'label-menu-divider';
  divider.textContent = '新しいラベルを作成';
  menu.appendChild(divider);

  const form = document.createElement('div');
  form.className = 'label-new-form';
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'label-new-name';
  nameInput.placeholder = 'ラベル名';
  const swatches = document.createElement('div');
  swatches.className = 'label-color-swatches';
  let picked = LABEL_COLORS[0];
  LABEL_COLORS.forEach((c, i) => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'color-swatch' + (i === 0 ? ' is-picked' : '');
    s.style.background = c;
    s.addEventListener('click', () => {
      picked = c;
      swatches.querySelectorAll('.color-swatch').forEach((x) => x.classList.remove('is-picked'));
      s.classList.add('is-picked');
    });
    swatches.appendChild(s);
  });
  const createBtn = document.createElement('button');
  createBtn.type = 'button';
  createBtn.className = 'btn btn-primary label-new-btn';
  createBtn.textContent = '作成して付与';
  const createLabel = () => {
    const name = nameInput.value.trim();
    if (!name) { nameInput.focus(); return; }
    const id = uid('lb');
    board.labels.push({ id, name, color: picked });
    card.labels.push(id);
    renderModalLabels(card, true);
  };
  createBtn.addEventListener('click', createLabel);
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); createLabel(); } });

  form.appendChild(nameInput);
  form.appendChild(swatches);
  form.appendChild(createBtn);
  menu.appendChild(form);

  add.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
  });
  wrap.appendChild(add);
  wrap.appendChild(menu);
  box.appendChild(wrap);
}

// 画面のどこかをクリックしたらラベルメニューを閉じる
document.addEventListener('click', (e) => {
  const menu = document.querySelector('.label-menu');
  if (menu && !menu.hidden && !e.target.closest('.label-add-wrap')) menu.hidden = true;
});

function renderChecklist(card) {
  const ul = document.getElementById('m-checklist');
  ul.innerHTML = '';
  card.checklist.forEach((item, idx) => {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = item.done;
    cb.addEventListener('change', () => { item.done = cb.checked; updateProgress(card); });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + item.t));
    const del = document.createElement('button');
    del.className = 'icon-btn';
    del.textContent = '×';
    del.addEventListener('click', () => { card.checklist.splice(idx, 1); renderChecklist(card); });
    li.appendChild(label);
    li.appendChild(del);
    ul.appendChild(li);
  });
  updateProgress(card);
}

function updateProgress(card) {
  const total = card.checklist.length;
  const done = card.checklist.filter((i) => i.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('m-progress-text').textContent =
    total ? `進捗 ☑ ${done}/${total} (${pct}%)` : 'チェック項目なし';
  document.getElementById('m-progress-fill').style.width = pct + '%';
}

function closeCard() {
  cardModal.hidden = true;
  currentCard = null;
}

function saveCard() {
  if (currentCard) {
    const { card, list, isNew } = currentCard;
    const title = document.getElementById('m-title').value.trim();
    if (isNew && !title) { // 新規でタイトル未入力なら追加しない
      alert('タイトルを入力してください');
      return;
    }
    card.title = title || card.title;
    card.desc = document.getElementById('m-desc').value;
    card.due = document.getElementById('m-due').value;
    card.priority = document.getElementById('m-priority').value;

    const targetListId = document.getElementById('m-list').value;
    const targetList = board.lists.find((l) => l.id === targetListId) || list;

    if (isNew) {
      targetList.cards.push(card); // 保存時に初めて選択リストへ追加
    } else if (targetList !== list) {
      // 既存カードの所属リストを変更（移動）
      list.cards = list.cards.filter((c) => c.id !== card.id);
      targetList.cards.push(card);
    }
  }
  closeCard();
  renderBoard();
}

function deleteCard() {
  if (currentCard && confirm('このカードを削除しますか？')) {
    const { card, list } = currentCard;
    list.cards = list.cards.filter((c) => c.id !== card.id);
    closeCard();
    renderBoard();
  }
}

function onOverlayClick(event) {
  if (event.target === cardModal) closeCard();
}

// ===============================
// S-1 ボード一覧の操作
// ===============================
function deleteBoard(event, el) {
  event.stopPropagation();
  const card = el.closest('.board-card');
  const title = card.querySelector('.board-card-title').textContent;
  if (confirm(`ボード「${title}」を削除しますか？`)) {
    card.remove();
    toggleBoardsEmpty();
  }
}
function toggleBoardsEmpty() {
  const grid = document.getElementById('board-grid');
  document.getElementById('boards-empty').hidden = grid.children.length > 0;
}

// ===============================
// 初期化・イベント登録
// ===============================
function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

// ボード追加（モーダル）
const boardModal = document.getElementById('board-modal');
const boardAddInput = document.getElementById('board-add-input');

function openBoardModal() {
  boardAddInput.value = '';
  boardModal.hidden = false;
  boardAddInput.focus();
}
function closeBoardModal() {
  boardModal.hidden = true;
}
function onBoardOverlayClick(event) {
  if (event.target === boardModal) closeBoardModal();
}
function submitBoardAdd() {
  const name = boardAddInput.value.trim();
  if (!name) { boardAddInput.focus(); return; }
  const grid = document.getElementById('board-grid');
  const btn = document.createElement('button');
  btn.className = 'board-card';
  btn.addEventListener('click', () => openBoard(name + 'ボード'));
  btn.innerHTML =
    `<span class="board-card-title">${esc(name)}</span>` +
    `<span class="board-card-del" title="削除" onclick="deleteBoard(event, this)">×</span>`;
  grid.appendChild(btn);
  toggleBoardsEmpty();
  closeBoardModal();
}

document.getElementById('btn-add-board').addEventListener('click', openBoardModal);
document.getElementById('board-add-ok').addEventListener('click', submitBoardAdd);
document.getElementById('board-add-cancel').addEventListener('click', closeBoardModal);
document.getElementById('board-modal-close').addEventListener('click', closeBoardModal);
boardAddInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); submitBoardAdd(); }
  if (e.key === 'Escape') closeBoardModal();
});

document.getElementById('m-save').addEventListener('click', saveCard);
document.getElementById('m-delete').addEventListener('click', deleteCard);
document.getElementById('m-add-item').addEventListener('click', () => {
  if (!currentCard) return;
  showChecklistInput(currentCard.card);
});

// チェック項目の空欄を出してその場で入力させる
function showChecklistInput(card) {
  const ul = document.getElementById('m-checklist');
  // 既に入力欄が出ていれば二重に出さない
  if (ul.querySelector('.checklist-input-row')) {
    ul.querySelector('.checklist-input').focus();
    return;
  }
  const li = document.createElement('li');
  li.className = 'checklist-input-row';
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'checklist-input';
  input.placeholder = '項目を入力して Enter';
  let done = false; // 二重確定を防ぐフラグ
  const commit = (keepOpen) => {
    if (done) return;
    done = true;
    const t = input.value.trim();
    if (t) { card.checklist.push({ t, done: false }); }
    renderChecklist(card);
    if (t && keepOpen) showChecklistInput(card); // 続けて入力できる
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(true); }
    if (e.key === 'Escape') { done = true; renderChecklist(card); }
  });
  input.addEventListener('blur', () => commit(false));
  li.appendChild(input);
  ul.appendChild(li);
  input.focus();
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCard(); });

// 初期描画
renderBoard();
