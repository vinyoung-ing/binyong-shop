import { requireAuth, renderAdminShell, escapeHtml, toast, withBusy } from "./admin-common.js";
import { formatPrice } from "../common.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  loadCategoryFull,
  createGroup,
  updateGroup,
  deleteGroup,
  createItem,
  updateItem,
  deleteItem,
  parsePriceLines,
  parsePriceSheet,
} from "../catalog.js";

await requireAuth();
const content = renderAdminShell(
  "categories",
  "가격표 관리",
  "카테고리 → 그룹 → 항목 순서로 골라서 관리하세요. 가격표 텍스트를 통째로 붙여넣어 한 번에 등록할 수도 있어요."
);
content.closest(".admin-main").classList.add("admin-main--wide");

const state = {
  categories: [],
  groups: [], // 선택한 카테고리의 그룹 목록 (각 그룹에 items 포함)
  catId: null,
  groupId: null,
  dirty: new Map(), // itemId -> 수정 중인 필드들
  panel: null, // "sheet"(가격표 통째로) | "bulk"(항목 여러 줄) | null
  draft: "",
};

const selectedCategory = () => state.categories.find((c) => c.id === state.catId);
const selectedGroup = () => state.groups.find((g) => g.id === state.groupId);

async function loadCategories() {
  state.categories = await listCategories();
  if (state.catId && !selectedCategory()) {
    state.catId = null;
    state.groupId = null;
    state.groups = [];
  }
}

async function loadGroups() {
  state.groups = state.catId ? await loadCategoryFull(state.catId) : [];
  if (state.groupId && !selectedGroup()) state.groupId = null;
  state.dirty.clear();
}

function confirmDiscard() {
  return state.dirty.size === 0 || confirm("저장하지 않은 항목 변경사항이 있어요. 버리고 이동할까요?");
}

// ---------- 렌더링 ----------

function moveButtons(action, id, index, length) {
  return `
    <span class="move-btns">
      <button type="button" class="icon-btn" data-action="${action}" data-id="${id}" data-dir="-1" ${index === 0 ? "disabled" : ""} title="위로">▲</button>
      <button type="button" class="icon-btn" data-action="${action}" data-id="${id}" data-dir="1" ${index === length - 1 ? "disabled" : ""} title="아래로">▼</button>
    </span>`;
}

function renderCategoryCol() {
  const rows = state.categories
    .map(
      (c, i) => `
      <li class="pick-row ${c.id === state.catId ? "is-selected" : ""}" data-action="select-cat" data-id="${c.id}">
        <span class="pick-name">${escapeHtml(c.name)}</span>
        <span class="chip ${c.status === "active" ? "chip-on" : "chip-off"}">${c.status === "active" ? "운영중" : "오픈예정"}</span>
        ${moveButtons("move-cat", c.id, i, state.categories.length)}
      </li>`
    )
    .join("");

  return `
    <section class="admin-card catalog-col">
      <div class="col-head"><h2>카테고리</h2><span class="count">${state.categories.length}</span></div>
      ${
        rows
          ? `<ul class="pick-list">${rows}</ul>`
          : `<p class="empty-state">아직 카테고리가 없어요.<br />아래에서 첫 카테고리(예: 엘프)를 추가하세요.</p>`
      }
      <form class="add-row" data-form="add-cat">
        <input name="name" placeholder="새 카테고리 이름" required autocomplete="off" />
        <button class="btn-sm primary" type="submit">추가</button>
      </form>
    </section>`;
}

function renderGroupCol() {
  const cat = selectedCategory();
  if (!cat) {
    return `
      <section class="admin-card catalog-col">
        <div class="col-head"><h2>그룹</h2></div>
        <p class="empty-state">왼쪽에서 카테고리를 선택하세요.</p>
      </section>`;
  }

  const rows = state.groups
    .map(
      (g, i) => `
      <li class="pick-row ${g.id === state.groupId ? "is-selected" : ""}" data-action="select-group" data-id="${g.id}">
        <span class="pick-name">${escapeHtml(g.name)}</span>
        <span class="count" title="항목 수">${g.items.length}</span>
        ${moveButtons("move-group", g.id, i, state.groups.length)}
      </li>`
    )
    .join("");

  return `
    <section class="admin-card catalog-col">
      <div class="col-head">
        <h2>카테고리 설정</h2>
        <a class="link-sm" href="../services.html?cat=${cat.id}" target="_blank" rel="noopener">사이트에서 보기 ↗</a>
      </div>
      <form class="stack-form" data-form="edit-cat">
        <label>이름<input name="name" value="${escapeHtml(cat.name)}" required autocomplete="off" /></label>
        <label>설명<input name="description" value="${escapeHtml(cat.description || "")}" placeholder="홈 카드에 보이는 한 줄 소개" autocomplete="off" /></label>
        <label>공개 상태
          <select name="status">
            <option value="active" ${cat.status === "active" ? "selected" : ""}>운영중 (사이트에 공개)</option>
            <option value="coming_soon" ${cat.status !== "active" ? "selected" : ""}>오픈예정 (목록에만 표시)</option>
          </select>
        </label>
        <div class="form-actions">
          <button class="btn-sm primary" type="submit">저장</button>
          <button class="btn-sm danger" type="button" data-action="delete-cat">카테고리 삭제</button>
        </div>
      </form>

      <div class="col-head mt-24"><h2>그룹</h2><span class="count">${state.groups.length}</span></div>
      ${rows ? `<ul class="pick-list">${rows}</ul>` : `<p class="empty-state">그룹이 없어요. 아래에서 추가하거나 가격표를 통째로 붙여넣으세요.</p>`}
      <form class="add-row" data-form="add-group">
        <input name="name" placeholder="새 그룹 이름 (예: 챕터1)" required autocomplete="off" />
        <button class="btn-sm primary" type="submit">추가</button>
      </form>
      <button type="button" class="btn-sm ghost btn-block-sm mt-12 ${state.panel === "sheet" ? "is-on" : ""}" data-action="open-sheet">
        가격표 통째로 붙여넣기
      </button>
    </section>`;
}

function itemValue(item, field) {
  const d = state.dirty.get(item.id);
  return d && field in d ? d[field] : item[field] ?? "";
}

function renderItemCol() {
  if (state.panel === "sheet" && selectedCategory()) return renderSheetPanel();

  const cat = selectedCategory();
  const g = selectedGroup();
  if (!cat || !g) {
    return `
      <section class="admin-card catalog-col">
        <div class="col-head"><h2>항목</h2></div>
        <p class="empty-state">${cat ? "가운데에서 그룹을 선택하세요." : "카테고리와 그룹을 차례로 선택하세요."}</p>
      </section>`;
  }

  const rows = g.items
    .map(
      (it, i) => `
      <tr data-item-id="${it.id}" class="${state.dirty.has(it.id) ? "is-dirty" : ""}">
        <td><input data-field="name" value="${escapeHtml(itemValue(it, "name"))}" autocomplete="off" /></td>
        <td class="col-price"><input data-field="unitPrice" type="number" step="any" value="${escapeHtml(itemValue(it, "unitPrice"))}" /></td>
        <td class="col-unit"><input data-field="unitLabel" value="${escapeHtml(itemValue(it, "unitLabel"))}" placeholder="-" autocomplete="off" /></td>
        <td><input data-field="conditionNote" value="${escapeHtml(itemValue(it, "conditionNote"))}" placeholder="-" autocomplete="off" /></td>
        <td class="row-actions">
          ${moveButtons("move-item", it.id, i, g.items.length)}
          <button type="button" class="icon-btn danger" data-action="delete-item" data-id="${it.id}" title="삭제">✕</button>
        </td>
      </tr>`
    )
    .join("");

  const dirtyCount = state.dirty.size;

  return `
    <section class="admin-card catalog-col">
      <div class="col-head">
        <h2>그룹 설정</h2>
        <span class="crumb">${escapeHtml(cat.name)} › ${escapeHtml(g.name)}</span>
      </div>
      <form class="stack-form" data-form="edit-group">
        <label>그룹 이름<input name="name" value="${escapeHtml(g.name)}" required autocomplete="off" /></label>
        <label>안내문<textarea name="note" rows="2" placeholder="가격표에서 이 그룹 위에 보이는 안내 (예: 화염, 번개는 따로 추가하셔야 합니다)">${escapeHtml(g.note || "")}</textarea></label>
        <div class="form-actions">
          <button class="btn-sm primary" type="submit">저장</button>
          <button class="btn-sm danger" type="button" data-action="delete-group">그룹 삭제</button>
        </div>
      </form>

      <div class="col-head mt-24">
        <h2>항목</h2><span class="count">${g.items.length}</span>
        <button type="button" class="btn-sm primary push-right" data-action="save-items" ${dirtyCount ? "" : "disabled"}>
          ${dirtyCount ? `변경사항 저장 (${dirtyCount})` : "변경사항 없음"}
        </button>
      </div>
      <p class="help">표에서 바로 고치고 <b>변경사항 저장</b>을 누르세요. 수정한 줄은 노랗게 표시돼요.</p>
      <div class="table-scroll">
        <table class="admin-table item-table">
          <thead><tr><th>항목명</th><th>단가</th><th>단위</th><th>비고</th><th></th></tr></thead>
          <tbody>${rows || `<tr><td colspan="5" class="muted">아직 항목이 없어요.</td></tr>`}</tbody>
          <tfoot>
            <tr class="add-item-row">
              <td><input name="name" form="add-item-form" placeholder="새 항목명" required autocomplete="off" /></td>
              <td class="col-price"><input name="unitPrice" form="add-item-form" type="number" step="any" placeholder="단가" required /></td>
              <td class="col-unit"><input name="unitLabel" form="add-item-form" placeholder="단위" autocomplete="off" /></td>
              <td><input name="conditionNote" form="add-item-form" placeholder="비고" autocomplete="off" /></td>
              <td class="row-actions"><button type="submit" form="add-item-form" class="btn-sm primary">추가</button></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <form id="add-item-form" data-form="add-item"></form>

      ${state.panel === "bulk" ? renderBulkPanel() : `<button type="button" class="btn-sm ghost btn-block-sm mt-12" data-action="open-bulk">여러 줄 한 번에 추가</button>`}
    </section>`;
}

function bulkPreviewHtml() {
  if (!state.draft.trim()) return "";
  const { items, errors } = parsePriceLines(state.draft);
  return `
    ${items.length ? `<p class="preview-ok">추가될 항목 ${items.length}개: ${items.map((it) => `${escapeHtml(it.name)} ${formatPrice(it.unitPrice)}`).join(", ")}</p>` : ""}
    ${errors.length ? `<p class="preview-err">가격을 못 찾은 줄(무시됨): ${errors.map(escapeHtml).join(" / ")}</p>` : ""}`;
}

function renderBulkPanel() {
  const count = state.draft.trim() ? parsePriceLines(state.draft).items.length : 0;
  return `
    <div class="bulk-panel">
      <div class="col-head"><h3>여러 줄 한 번에 추가</h3><button type="button" class="link-sm" data-action="close-panel">닫기</button></div>
      <p class="help">한 줄에 <b>항목명 단가</b> 형식으로 적어주세요. 괄호는 비고로 들어가요. 예) <code>문평 0.14 (토끼 0.01)</code></p>
      <textarea class="bulk-input" data-draft rows="6" placeholder="샤면 0.05&#10;대사제 0.05&#10;문평 0.14 (토끼 0.01)">${escapeHtml(state.draft)}</textarea>
      <div class="preview" data-preview>${bulkPreviewHtml()}</div>
      <button type="button" class="btn-sm primary" data-action="import-bulk" ${count ? "" : "disabled"}>${count ? `${count}개 추가` : "추가"}</button>
    </div>`;
}

function sheetPreviewHtml() {
  if (!state.draft.trim()) return `<p class="muted">붙여넣으면 여기에 미리보기가 보여요.</p>`;
  const { groups, errors } = parsePriceSheet(state.draft);
  const existing = new Set(state.groups.map((g) => g.name));
  return `
    ${groups
      .map(
        (g) => `
        <div class="preview-group">
          <div class="preview-group-head">
            <b>${escapeHtml(g.name)}</b>
            <span class="chip ${existing.has(g.name) ? "chip-off" : "chip-on"}">${existing.has(g.name) ? "기존 그룹에 추가" : "새 그룹"}</span>
            <span class="muted">항목 ${g.items.length}개</span>
          </div>
          ${g.note ? `<p class="preview-note">안내문: ${escapeHtml(g.note)}</p>` : ""}
          <p class="preview-items">${g.items.map((it) => `${escapeHtml(it.name)} <b>${formatPrice(it.unitPrice)}</b>${it.conditionNote ? ` ${escapeHtml(it.conditionNote)}` : ""}`).join(" · ")}</p>
        </div>`
      )
      .join("")}
    ${errors.length ? `<p class="preview-err">그룹 제목 전에 나온 줄(무시됨): ${errors.map(escapeHtml).join(" / ")}</p>` : ""}`;
}

function sheetSummary() {
  if (!state.draft.trim()) return { groups: 0, items: 0 };
  const { groups } = parsePriceSheet(state.draft);
  return { groups: groups.length, items: groups.reduce((s, g) => s + g.items.length, 0) };
}

function renderSheetPanel() {
  const cat = selectedCategory();
  const sum = sheetSummary();
  return `
    <section class="admin-card catalog-col">
      <div class="col-head"><h2>가격표 통째로 붙여넣기</h2><button type="button" class="link-sm" data-action="close-panel">닫기</button></div>
      <p class="help">
        <b>${escapeHtml(cat.name)}</b> 카테고리에 한 번에 등록합니다.<br />
        · 가격이 있는 줄 → 항목 (<code>샤면 0.05</code>, <code>문평 0.14 (토끼 0.01)</code>)<br />
        · 띄어쓰기 없는 짧은 줄 → 그룹 제목 (<code>챕터1</code>, <code>올클</code>)<br />
        · 그 밖의 설명 줄 → 해당 그룹의 안내문 (<code>* 화염, 번개는 따로 추가</code>)<br />
        이미 있는 그룹 이름이면 그 그룹 뒤에 항목이 추가돼요.
      </p>
      <textarea class="bulk-input" data-draft rows="14" placeholder="올클&#10;처음~마왕 1.2&#10;처음~퀸 1.5&#10;* 화염, 번개는 따로 추가하셔야 합니다&#10;&#10;챕터1&#10;샤면 0.05&#10;대사제 0.05">${escapeHtml(state.draft)}</textarea>
      <div class="preview" data-preview>${sheetPreviewHtml()}</div>
      <button type="button" class="btn-sm primary" data-action="import-sheet" ${sum.items ? "" : "disabled"}>
        ${sum.items ? `그룹 ${sum.groups}개 · 항목 ${sum.items}개 등록` : "등록"}
      </button>
    </section>`;
}

function render() {
  content.innerHTML = `
    <div class="catalog-layout">
      ${renderCategoryCol()}
      ${renderGroupCol()}
      ${renderItemCol()}
    </div>`;
}

// ---------- 동작 ----------

// 목록에서 한 칸 위/아래로 옮기고, 순서가 바뀐 것만 저장한다.
async function move(list, id, dir, save) {
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(
    list.map((x, idx) => {
      if (x.order === idx) return null;
      x.order = idx;
      return save(x.id, { order: idx });
    })
  );
}

const actions = {
  async "select-cat"(el) {
    if (el.dataset.id === state.catId || !confirmDiscard()) return;
    state.catId = el.dataset.id;
    state.groupId = null;
    state.panel = null;
    await loadGroups();
    state.groupId = state.groups[0]?.id ?? null;
    render();
  },

  async "select-group"(el) {
    if (el.dataset.id === state.groupId || !confirmDiscard()) return;
    state.groupId = el.dataset.id;
    state.panel = null;
    state.dirty.clear();
    render();
  },

  async "move-cat"(el) {
    await withBusy(null, () => move(state.categories, el.dataset.id, Number(el.dataset.dir), updateCategory));
    render();
  },

  async "move-group"(el) {
    await withBusy(null, () =>
      move(state.groups, el.dataset.id, Number(el.dataset.dir), (id, d) => updateGroup(state.catId, id, d))
    );
    render();
  },

  async "move-item"(el) {
    const g = selectedGroup();
    await withBusy(null, () =>
      move(g.items, el.dataset.id, Number(el.dataset.dir), (id, d) => updateItem(state.catId, g.id, id, d))
    );
    render();
  },

  async "delete-cat"(el) {
    const cat = selectedCategory();
    const itemCount = state.groups.reduce((s, g) => s + g.items.length, 0);
    const detail = state.groups.length ? `\n그룹 ${state.groups.length}개와 항목 ${itemCount}개도 함께 삭제됩니다.` : "";
    if (!confirm(`"${cat.name}" 카테고리를 삭제할까요?${detail}\n되돌릴 수 없어요.`)) return;
    const ok = await withBusy(el, async () => {
      await deleteCategory(cat.id);
      return true;
    }, { success: "카테고리를 삭제했어요." });
    if (!ok) return;
    state.catId = null;
    state.groupId = null;
    state.groups = [];
    state.dirty.clear();
    await loadCategories();
    render();
  },

  async "delete-group"(el) {
    const g = selectedGroup();
    const detail = g.items.length ? `\n항목 ${g.items.length}개도 함께 삭제됩니다.` : "";
    if (!confirm(`"${g.name}" 그룹을 삭제할까요?${detail}`)) return;
    const ok = await withBusy(el, async () => {
      await deleteGroup(state.catId, g.id);
      return true;
    }, { success: "그룹을 삭제했어요." });
    if (!ok) return;
    state.groupId = null;
    await loadGroups();
    render();
  },

  async "delete-item"(el) {
    const g = selectedGroup();
    const item = g.items.find((it) => it.id === el.dataset.id);
    if (!confirm(`"${item.name}" 항목을 삭제할까요?`)) return;
    const ok = await withBusy(el, async () => {
      await deleteItem(state.catId, g.id, item.id);
      return true;
    });
    if (!ok) return;
    g.items = g.items.filter((it) => it.id !== item.id);
    state.dirty.delete(item.id);
    toast("항목을 삭제했어요.");
    render();
  },

  async "save-items"(el) {
    const g = selectedGroup();
    const entries = [...state.dirty.entries()];
    const ok = await withBusy(el, async () => {
      await Promise.all(
        entries.map(([id, fields]) => {
          const data = { ...fields };
          if ("unitPrice" in data) data.unitPrice = Number(data.unitPrice) || 0;
          return updateItem(state.catId, g.id, id, data).then(() => {
            Object.assign(g.items.find((it) => it.id === id), data);
          });
        })
      );
      return true;
    }, { success: `${entries.length}개 항목을 저장했어요.` });
    if (!ok) return;
    state.dirty.clear();
    render();
  },

  "open-sheet"() {
    if (!confirmDiscard()) return;
    state.dirty.clear();
    state.panel = state.panel === "sheet" ? null : "sheet";
    state.draft = "";
    render();
  },

  "open-bulk"() {
    state.panel = "bulk";
    state.draft = "";
    render();
    content.querySelector("[data-draft]")?.focus();
  },

  "close-panel"() {
    state.panel = null;
    state.draft = "";
    render();
  },

  async "import-bulk"(el) {
    if (state.dirty.size) {
      toast("먼저 표의 변경사항을 저장해주세요.", "error");
      return;
    }
    const g = selectedGroup();
    const { items } = parsePriceLines(state.draft);
    const ok = await withBusy(el, async () => {
      await Promise.all(
        items.map((it, idx) =>
          createItem(state.catId, g.id, { ...it, unitLabel: "", order: g.items.length + idx })
        )
      );
      return true;
    }, { success: `${items.length}개 항목을 추가했어요.` });
    if (!ok) return;
    state.panel = null;
    state.draft = "";
    await loadGroups();
    render();
  },

  async "import-sheet"(el) {
    const { groups } = parsePriceSheet(state.draft);
    const itemTotal = groups.reduce((s, g) => s + g.items.length, 0);
    const ok = await withBusy(el, async () => {
      let nextGroupOrder = state.groups.length;
      for (const parsed of groups) {
        const existing = state.groups.find((g) => g.name === parsed.name);
        let groupId;
        let startOrder = 0;
        if (existing) {
          groupId = existing.id;
          startOrder = existing.items.length;
          if (parsed.note && !existing.note) await updateGroup(state.catId, groupId, { note: parsed.note });
        } else {
          const ref = await createGroup(state.catId, { name: parsed.name, note: parsed.note, order: nextGroupOrder++ });
          groupId = ref.id;
        }
        await Promise.all(
          parsed.items.map((it, idx) =>
            createItem(state.catId, groupId, { ...it, unitLabel: "", order: startOrder + idx })
          )
        );
      }
      return true;
    }, { success: `그룹 ${groups.length}개, 항목 ${itemTotal}개를 등록했어요.` });
    if (!ok) return;
    state.panel = null;
    state.draft = "";
    await loadGroups();
    if (!state.groupId && state.groups.length) state.groupId = state.groups[0].id;
    render();
  },
};

const forms = {
  async "add-cat"(form, fd) {
    const name = fd.get("name").trim();
    const ref = await withBusy(form.querySelector("button"), () =>
      createCategory({ name, description: "", status: "coming_soon", order: state.categories.length })
    );
    if (!ref) return;
    toast("오픈예정 상태로 추가했어요. 가격표를 채운 뒤 '운영중'으로 바꿔주세요.");
    await loadCategories();
    state.catId = ref.id;
    state.groupId = null;
    await loadGroups();
    render();
  },

  async "edit-cat"(form, fd) {
    const data = {
      name: fd.get("name").trim(),
      description: fd.get("description").trim(),
      status: fd.get("status"),
    };
    const ok = await withBusy(form.querySelector('[type="submit"]'), async () => {
      await updateCategory(state.catId, data);
      return true;
    }, { success: "카테고리를 저장했어요." });
    if (!ok) return;
    Object.assign(selectedCategory(), data);
    render();
  },

  async "add-group"(form, fd) {
    const ref = await withBusy(form.querySelector("button"), () =>
      createGroup(state.catId, { name: fd.get("name").trim(), note: "", order: state.groups.length })
    );
    if (!ref) return;
    await loadGroups();
    state.groupId = ref.id;
    render();
    content.querySelector('[form="add-item-form"][name="name"]')?.focus();
  },

  async "edit-group"(form, fd) {
    const data = { name: fd.get("name").trim(), note: fd.get("note").trim() };
    const ok = await withBusy(form.querySelector('[type="submit"]'), async () => {
      await updateGroup(state.catId, state.groupId, data);
      return true;
    }, { success: "그룹을 저장했어요." });
    if (!ok) return;
    Object.assign(selectedGroup(), data);
    render();
  },

  async "add-item"(form, fd) {
    const g = selectedGroup();
    const data = {
      name: fd.get("name").trim(),
      unitPrice: Number(fd.get("unitPrice")) || 0,
      unitLabel: fd.get("unitLabel").trim(),
      conditionNote: fd.get("conditionNote").trim(),
      order: g.items.length,
    };
    const ref = await withBusy(content.querySelector('[form="add-item-form"][type="submit"]'), () =>
      createItem(state.catId, g.id, data)
    );
    if (!ref) return;
    g.items.push({ id: ref.id, ...data });
    toast(`"${data.name}" 추가`);
    render();
    content.querySelector('[form="add-item-form"][name="name"]')?.focus();
  },
};

content.addEventListener("click", (e) => {
  const el = e.target.closest("[data-action]");
  if (!el || !content.contains(el) || el.disabled) return;
  const handler = actions[el.dataset.action];
  if (handler) {
    e.preventDefault();
    handler(el);
  }
});

content.addEventListener("submit", (e) => {
  const form = e.target;
  const handler = forms[form.dataset.form];
  if (!handler) return;
  e.preventDefault();
  handler(form, new FormData(form));
});

content.addEventListener("input", (e) => {
  const el = e.target;

  // 항목 표 인라인 수정 → 바로 저장하지 않고 변경 목록에 모아둔다.
  const row = el.closest("tr[data-item-id]");
  if (row && el.dataset.field) {
    const id = row.dataset.itemId;
    const original = selectedGroup().items.find((it) => it.id === id);
    const fields = { ...(state.dirty.get(id) || {}), [el.dataset.field]: el.value };
    const changed = Object.entries(fields).some(([k, v]) => String(original[k] ?? "") !== String(v));
    if (changed) state.dirty.set(id, fields);
    else state.dirty.delete(id);
    row.classList.toggle("is-dirty", changed);

    const saveBtn = content.querySelector('[data-action="save-items"]');
    saveBtn.disabled = state.dirty.size === 0;
    saveBtn.textContent = state.dirty.size ? `변경사항 저장 (${state.dirty.size})` : "변경사항 없음";
    return;
  }

  // 붙여넣기 텍스트 → 실시간 미리보기
  if (el.matches("[data-draft]")) {
    state.draft = el.value;
    const preview = content.querySelector("[data-preview]");
    if (state.panel === "sheet") {
      preview.innerHTML = sheetPreviewHtml();
      const sum = sheetSummary();
      const btn = content.querySelector('[data-action="import-sheet"]');
      btn.disabled = !sum.items;
      btn.textContent = sum.items ? `그룹 ${sum.groups}개 · 항목 ${sum.items}개 등록` : "등록";
    } else {
      preview.innerHTML = bulkPreviewHtml();
      const count = parsePriceLines(state.draft).items.length;
      const btn = content.querySelector('[data-action="import-bulk"]');
      btn.disabled = !count;
      btn.textContent = count ? `${count}개 추가` : "추가";
    }
  }
});

window.addEventListener("beforeunload", (e) => {
  if (state.dirty.size) {
    e.preventDefault();
    e.returnValue = "";
  }
});

async function init() {
  content.innerHTML = `<p class="muted">불러오는 중...</p>`;
  try {
    await loadCategories();
    if (state.categories.length) {
      state.catId = state.categories[0].id;
      await loadGroups();
      if (state.groups.length) state.groupId = state.groups[0].id;
    }
    render();
  } catch (e) {
    console.error(e);
    content.innerHTML = `<p class="muted">카테고리를 불러오지 못했습니다. Firestore 규칙과 로그인 상태를 확인해주세요.</p>`;
  }
}

init();
