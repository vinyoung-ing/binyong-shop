import { renderHeader, renderFooter, formatPrice, addToCart, getCart, removeFromCart, initScrollReveal, escapeHtml as esc } from "./common.js";
import { initSpotlight } from "./motion.js";
import { listCategories, loadCategoryFull } from "./catalog.js";

renderHeader("services");
renderFooter();

const tabsEl = document.getElementById("category-tabs");
const introEl = document.getElementById("category-intro");
const groupsEl = document.getElementById("price-groups");

let categories = [];
let currentCategory = null;

function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function setParam(categoryId) {
  const url = new URL(location.href);
  url.searchParams.set("cat", categoryId);
  history.replaceState(null, "", url);
}

async function init() {
  try {
    categories = await listCategories();
  } catch (e) {
    tabsEl.innerHTML = `<p class="muted">카테고리를 불러오지 못했습니다. Firebase 설정을 확인해주세요.</p>`;
    console.error(e);
    return;
  }

  if (categories.length === 0) {
    tabsEl.innerHTML = `<p class="muted">아직 등록된 카테고리가 없습니다.</p>`;
    groupsEl.innerHTML = "";
    return;
  }

  const paramCat = getParam("cat");
  const wanted = categories.find((c) => c.id === paramCat && c.status === "active");
  currentCategory = wanted || categories.find((c) => c.status === "active") || categories[0];

  renderTabs();
  await renderCategory(currentCategory);
  renderSelectedPanel();
}

function renderTabs() {
  tabsEl.innerHTML = categories
    .map((c) => {
      const isActive = c.status === "active";
      const isCurrent = currentCategory && c.id === currentCategory.id;
      return `<button
        data-cat="${c.id}"
        class="${isCurrent ? "active" : ""}"
        ${isActive ? "" : "disabled title=\"오픈예정\""}
      >${esc(c.name)}${isActive ? "" : " (오픈예정)"}</button>`;
    })
    .join("");

  tabsEl.querySelectorAll("button[data-cat]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const cat = categories.find((c) => c.id === btn.dataset.cat);
      if (!cat || cat.status !== "active") return;
      currentCategory = cat;
      setParam(cat.id);
      renderTabs();
      await renderCategory(cat);
    });
  });
}

async function renderCategory(category) {
  introEl.textContent = category.description || "";
  groupsEl.innerHTML = `<p class="muted">가격표를 불러오는 중...</p>`;

  if (category.status !== "active") {
    groupsEl.innerHTML = `<p class="muted">이 카테고리는 아직 오픈 전입니다. 곧 만나보실 수 있어요.</p>`;
    return;
  }

  let groups;
  try {
    groups = await loadCategoryFull(category.id);
  } catch (e) {
    groupsEl.innerHTML = `<p class="muted">가격표를 불러오지 못했습니다.</p>`;
    console.error(e);
    return;
  }

  if (groups.length === 0) {
    groupsEl.innerHTML = `<p class="muted">아직 등록된 가격표가 없습니다.</p>`;
    return;
  }

  groupsEl.innerHTML = groups
    .map(
      (g) => `
      <div class="price-group" data-reveal>
        <div class="price-group-header">
          <h3>${esc(g.name)}</h3>
          ${g.note ? `<div class="group-note">${esc(g.note)}</div>` : ""}
        </div>
        <div class="table-scroll">
          <table class="price-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>단가</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${(g.items || [])
                .map(
                  (item) => `
                  <tr>
                    <td>
                      ${esc(item.name)}
                      ${item.conditionNote ? `<span class="item-condition">${esc(item.conditionNote)}</span>` : ""}
                    </td>
                    <td class="price-cell">${formatPrice(item.unitPrice)}${item.unitLabel ? ` / ${esc(item.unitLabel)}` : ""}</td>
                    <td>
                      <div class="item-action-cell">
                        <input type="number" min="1" value="1" class="qty-input"
                          data-qty-for="${esc(`${category.id}::${g.name}::${item.name}`)}" />
                        <button class="btn-add"
                          data-add-category="${esc(category.id)}"
                          data-add-category-name="${esc(category.name)}"
                          data-add-group="${esc(g.name)}"
                          data-add-item="${esc(item.name)}"
                          data-add-price="${Number(item.unitPrice) || 0}"
                          data-add-unit="${esc(item.unitLabel || "")}"
                        >담기</button>
                      </div>
                    </td>
                  </tr>
                `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `
    )
    .join("");

  groupsEl.querySelectorAll("button[data-add-item]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = `${btn.dataset.addCategory}::${btn.dataset.addGroup}::${btn.dataset.addItem}`;
      const qtyInput = groupsEl.querySelector(`[data-qty-for="${CSS.escape(key)}"]`);
      const qty = Math.max(1, parseInt(qtyInput?.value || "1", 10) || 1);

      addToCart({
        categoryId: btn.dataset.addCategory,
        categoryName: btn.dataset.addCategoryName,
        groupName: btn.dataset.addGroup,
        itemName: btn.dataset.addItem,
        unitPrice: Number(btn.dataset.addPrice),
        unitLabel: btn.dataset.addUnit,
        qty,
      });

      renderSelectedPanel();
      btn.textContent = "담김 ✓";
      setTimeout(() => (btn.textContent = "담기"), 900);
    });
  });

  initScrollReveal();
  groupsEl.querySelectorAll(".price-group-header").forEach((el) => initSpotlight(el));
}

function renderSelectedPanel() {
  const listEl = document.getElementById("selected-list");
  const totalEl = document.getElementById("selected-total");
  const totalAmountEl = document.getElementById("selected-total-amount");

  const cart = getCart();
  if (cart.length === 0) {
    listEl.innerHTML = `<p class="empty">아직 담은 항목이 없습니다.</p>`;
    totalEl.hidden = true;
    return;
  }

  listEl.innerHTML = cart
    .map(
      (c, i) => `
      <div class="selected-item">
        <span>${esc(c.itemName)} × ${formatPrice(c.qty)}</span>
        <button class="remove-btn" data-remove="${i}">삭제</button>
      </div>
    `
    )
    .join("");

  listEl.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCart(Number(btn.dataset.remove));
      renderSelectedPanel();
    });
  });

  const total = cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);
  totalEl.hidden = false;
  totalAmountEl.textContent = formatPrice(total);
}

init();
