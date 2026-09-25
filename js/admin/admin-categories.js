import { requireAuth, renderAdminShell, escapeHtml } from "./admin-common.js";
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  listItems,
  createItem,
  updateItem,
  deleteItem,
} from "../catalog.js";

await requireAuth();
const content = renderAdminShell("categories", "카테고리 / 가격표 관리");

let categories = [];
let groups = [];
let items = [];
let selectedCategoryId = null;
let selectedGroupId = null;

async function reloadCategories() {
  categories = await listCategories();
  if (selectedCategoryId && !categories.find((c) => c.id === selectedCategoryId)) {
    selectedCategoryId = null;
    selectedGroupId = null;
  }
}

async function reloadGroups() {
  if (!selectedCategoryId) {
    groups = [];
    return;
  }
  groups = await listGroups(selectedCategoryId);
  if (selectedGroupId && !groups.find((g) => g.id === selectedGroupId)) {
    selectedGroupId = null;
  }
}

async function reloadItems() {
  if (!selectedCategoryId || !selectedGroupId) {
    items = [];
    return;
  }
  items = await listItems(selectedCategoryId, selectedGroupId);
}

function render() {
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  content.innerHTML = `
    <div class="admin-card">
      <h2>1. 카테고리 (엘프 / 리부트 / 미네랄 등)</h2>
      <p class="muted" style="margin:-6px 0 12px; font-size:13px;">이름을 눌러 아래에서 그룹을 관리하세요.</p>
      <div class="table-scroll">
        <table class="admin-table admin-table--wide">
          <thead><tr><th>이름</th><th>설명</th><th>상태</th><th>순서</th><th></th></tr></thead>
          <tbody>
            ${categories
              .map(
                (c) => `
              <tr class="${c.id === selectedCategoryId ? "row-selected" : ""}">
                <td><a href="#" class="row-select-link" data-select-cat="${c.id}">${c.id === selectedCategoryId ? "▸ " : ""}${escapeHtml(c.name)}</a></td>
                <td>${escapeHtml(c.description || "")}</td>
                <td>
                  <select class="status-select" data-cat-status="${c.id}">
                    <option value="active" ${c.status === "active" ? "selected" : ""}>운영중</option>
                    <option value="coming_soon" ${c.status === "coming_soon" ? "selected" : ""}>오픈예정</option>
                  </select>
                </td>
                <td><input type="number" class="qty-input" style="width:56px;" value="${c.order ?? 0}" data-cat-order="${c.id}" /></td>
                <td>
                  <button class="btn-sm danger" data-delete-cat="${c.id}">삭제</button>
                </td>
              </tr>
            `
              )
              .join("") || `<tr><td colspan="5" class="muted">등록된 카테고리가 없습니다.</td></tr>`}
          </tbody>
        </table>
      </div>

      <form class="inline-form" id="add-category-form">
        <input type="text" name="name" placeholder="카테고리 이름 (예: 엘프)" required />
        <input type="text" name="description" placeholder="설명 (선택)" />
        <select name="status">
          <option value="active">운영중</option>
          <option value="coming_soon">오픈예정</option>
        </select>
        <input type="number" name="order" placeholder="순서" value="${categories.length}" style="width:70px;" />
        <button type="submit" class="btn-sm primary">카테고리 추가</button>
      </form>
    </div>

    ${
      selectedCategory
        ? `
      <div class="admin-card">
        <h2>2. 그룹 (챕터/섹션)</h2>
        <p class="admin-breadcrumb">선택된 카테고리: <strong>${escapeHtml(selectedCategory.name)}</strong> · 그룹 이름을 눌러 아래에서 항목을 관리하세요.</p>
        <div class="table-scroll">
          <table class="admin-table admin-table--wide">
            <thead><tr><th>그룹명</th><th>안내문</th><th>순서</th><th></th></tr></thead>
            <tbody>
              ${
                groups
                  .map(
                    (g) => `
                <tr class="${g.id === selectedGroupId ? "row-selected" : ""}">
                  <td><a href="#" class="row-select-link" data-select-group="${g.id}">${g.id === selectedGroupId ? "▸ " : ""}${escapeHtml(g.name)}</a></td>
                  <td>${escapeHtml(g.note || "")}</td>
                  <td><input type="number" class="qty-input" style="width:56px;" value="${g.order ?? 0}" data-group-order="${g.id}" /></td>
                  <td><button class="btn-sm danger" data-delete-group="${g.id}">삭제</button></td>
                </tr>
              `
                  )
                  .join("") || `<tr><td colspan="4" class="muted">등록된 그룹이 없습니다.</td></tr>`
              }
            </tbody>
          </table>
        </div>
        <form class="inline-form" id="add-group-form">
          <input type="text" name="name" placeholder="그룹명 (예: 챕터1)" required />
          <input type="text" name="note" placeholder="공통 안내문 (선택)" style="min-width:200px;" />
          <input type="number" name="order" placeholder="순서" value="${groups.length}" style="width:70px;" />
          <button type="submit" class="btn-sm primary">그룹 추가</button>
        </form>
      </div>
      `
        : ""
    }

    ${
      selectedGroup
        ? `
      <div class="admin-card">
        <h2>3. 항목 (실제 가격 줄)</h2>
        <p class="admin-breadcrumb">${escapeHtml(selectedCategory.name)} <strong>&rsaquo;</strong> ${escapeHtml(selectedGroup.name)}</p>
        <div class="table-scroll">
          <table class="admin-table admin-table--wide">
            <thead><tr><th>항목명</th><th>단가</th><th>단위</th><th>비고</th><th>순서</th><th></th></tr></thead>
            <tbody>
              ${
                items
                  .map(
                    (it) => `
                <tr data-item-row="${it.id}">
                  <td><input type="text" class="qty-input" style="width:120px;" value="${escapeHtml(it.name)}" data-item-field="name" data-item-id="${it.id}" /></td>
                  <td><input type="number" step="any" class="qty-input" style="width:80px;" value="${it.unitPrice ?? 0}" data-item-field="unitPrice" data-item-id="${it.id}" /></td>
                  <td><input type="text" class="qty-input" style="width:70px;" value="${escapeHtml(it.unitLabel || "")}" data-item-field="unitLabel" data-item-id="${it.id}" /></td>
                  <td><input type="text" class="qty-input" style="width:140px;" value="${escapeHtml(it.conditionNote || "")}" data-item-field="conditionNote" data-item-id="${it.id}" /></td>
                  <td><input type="number" class="qty-input" style="width:56px;" value="${it.order ?? 0}" data-item-field="order" data-item-id="${it.id}" /></td>
                  <td style="white-space:nowrap;">
                    <button class="btn-sm primary" data-save-item="${it.id}">저장</button>
                    <button class="btn-sm danger" data-delete-item="${it.id}">삭제</button>
                  </td>
                </tr>
              `
                  )
                  .join("") || `<tr><td colspan="6" class="muted">등록된 항목이 없습니다.</td></tr>`
              }
            </tbody>
          </table>
        </div>
        <form class="inline-form" id="add-item-form">
          <input type="text" name="name" placeholder="항목명 (예: 문평)" required />
          <input type="number" step="any" name="unitPrice" placeholder="단가" required style="width:90px;" />
          <input type="text" name="unitLabel" placeholder="단위(레벨/개 등)" style="width:100px;" />
          <input type="text" name="conditionNote" placeholder="비고(선택)" style="min-width:160px;" />
          <input type="number" name="order" placeholder="순서" value="${items.length}" style="width:70px;" />
          <button type="submit" class="btn-sm primary">항목 추가</button>
        </form>
      </div>
      `
        : ""
    }
  `;

  attachHandlers();
}

function attachHandlers() {
  // 카테고리 선택
  content.querySelectorAll("[data-select-cat]").forEach((a) => {
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      selectedCategoryId = a.dataset.selectCat;
      selectedGroupId = null;
      await reloadGroups();
      await reloadItems();
      render();
    });
  });

  // 카테고리 상태/순서 변경
  content.querySelectorAll("[data-cat-status]").forEach((sel) => {
    sel.addEventListener("change", async () => {
      await updateCategory(sel.dataset.catStatus, { status: sel.value });
      await reloadCategories();
      render();
    });
  });
  content.querySelectorAll("[data-cat-order]").forEach((input) => {
    input.addEventListener("change", async () => {
      await updateCategory(input.dataset.catOrder, { order: Number(input.value) });
      await reloadCategories();
      render();
    });
  });
  content.querySelectorAll("[data-delete-cat]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("이 카테고리와 하위 그룹/항목은 별도로 삭제해야 합니다. 카테고리를 삭제할까요?")) return;
      await deleteCategory(btn.dataset.deleteCat);
      await reloadCategories();
      await reloadGroups();
      await reloadItems();
      render();
    });
  });

  const addCategoryForm = document.getElementById("add-category-form");
  addCategoryForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(addCategoryForm);
    await createCategory({
      name: fd.get("name"),
      description: fd.get("description") || "",
      status: fd.get("status"),
      order: Number(fd.get("order")) || 0,
    });
    await reloadCategories();
    render();
  });

  // 그룹 선택
  content.querySelectorAll("[data-select-group]").forEach((a) => {
    a.addEventListener("click", async (e) => {
      e.preventDefault();
      selectedGroupId = a.dataset.selectGroup;
      await reloadItems();
      render();
    });
  });
  content.querySelectorAll("[data-group-order]").forEach((input) => {
    input.addEventListener("change", async () => {
      await updateGroup(selectedCategoryId, input.dataset.groupOrder, { order: Number(input.value) });
      await reloadGroups();
      render();
    });
  });
  content.querySelectorAll("[data-delete-group]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("이 그룹과 하위 항목은 별도로 삭제해야 합니다. 그룹을 삭제할까요?")) return;
      await deleteGroup(selectedCategoryId, btn.dataset.deleteGroup);
      await reloadGroups();
      await reloadItems();
      render();
    });
  });

  const addGroupForm = document.getElementById("add-group-form");
  addGroupForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(addGroupForm);
    await createGroup(selectedCategoryId, {
      name: fd.get("name"),
      note: fd.get("note") || "",
      order: Number(fd.get("order")) || 0,
    });
    await reloadGroups();
    render();
  });

  // 항목 저장/삭제
  content.querySelectorAll("[data-save-item]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const itemId = btn.dataset.saveItem;
      const row = content.querySelector(`tr[data-item-row="${itemId}"]`);
      const fields = row.querySelectorAll("[data-item-field]");
      const data = {};
      fields.forEach((f) => {
        const key = f.dataset.itemField;
        data[key] = key === "unitPrice" || key === "order" ? Number(f.value) : f.value;
      });
      await updateItem(selectedCategoryId, selectedGroupId, itemId, data);
      await reloadItems();
      render();
    });
  });
  content.querySelectorAll("[data-delete-item]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("이 항목을 삭제할까요?")) return;
      await deleteItem(selectedCategoryId, selectedGroupId, btn.dataset.deleteItem);
      await reloadItems();
      render();
    });
  });

  const addItemForm = document.getElementById("add-item-form");
  addItemForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(addItemForm);
    await createItem(selectedCategoryId, selectedGroupId, {
      name: fd.get("name"),
      unitPrice: Number(fd.get("unitPrice")) || 0,
      unitLabel: fd.get("unitLabel") || "",
      conditionNote: fd.get("conditionNote") || "",
      order: Number(fd.get("order")) || 0,
    });
    await reloadItems();
    render();
  });
}

async function init() {
  content.innerHTML = `<p class="muted">불러오는 중...</p>`;
  await reloadCategories();
  render();
}

init();
