import { requireAuth, renderAdminShell, escapeHtml, toast, withBusy } from "./admin-common.js";
import { formatPrice } from "../common.js";
import { db, collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "../firebase-init.js";

await requireAuth();
const content = renderAdminShell("orders", "주문 관리", "사이트에서 '카카오톡으로 주문하기'를 누른 기록이 쌓여요. 상담 진행에 맞춰 상태를 바꿔주세요.");

const STATUS_OPTIONS = ["신규", "확인중", "진행중", "완료", "취소"];

const state = { orders: [], filter: "전체", search: "" };

async function loadOrders() {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  state.orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const orderNo = (o) => o.id.slice(-6).toUpperCase();

function formatDate(ts) {
  if (!ts?.toDate) return "-";
  return ts.toDate().toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}

function orderText(o) {
  const lines = [`[주문번호 ${orderNo(o)}] ${formatDate(o.createdAt)}`];
  (o.items || []).forEach((it) => {
    lines.push(`- ${it.categoryName} / ${it.groupName} / ${it.itemName} x ${it.qty} = ${formatPrice(it.unitPrice * it.qty)}`);
  });
  lines.push(`합계: ${formatPrice(o.total)}`);
  if (o.memo) lines.push(`메모: ${o.memo}`);
  return lines.join("\n");
}

function visibleOrders() {
  const term = state.search.trim().toLowerCase();
  return state.orders.filter((o) => {
    if (state.filter !== "전체" && (o.status || "신규") !== state.filter) return false;
    if (!term) return true;
    const haystack = [orderNo(o), o.memo, ...(o.items || []).map((it) => `${it.categoryName} ${it.groupName} ${it.itemName}`)]
      .join(" ")
      .toLowerCase();
    return haystack.includes(term);
  });
}

function renderToolbar() {
  const counts = state.orders.reduce((acc, o) => {
    const s = o.status || "신규";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const chips = ["전체", ...STATUS_OPTIONS]
    .map((s) => {
      const n = s === "전체" ? state.orders.length : counts[s] || 0;
      return `<button type="button" class="filter-chip ${state.filter === s ? "is-on" : ""}" data-filter="${s}">${s} <b>${n}</b></button>`;
    })
    .join("");
  return `
    <div class="admin-toolbar">
      <div class="filter-chips">${chips}</div>
      <input type="search" class="search-input" data-search placeholder="주문번호, 항목명, 메모 검색" value="${escapeHtml(state.search)}" />
    </div>`;
}

function renderList() {
  const list = visibleOrders();
  if (!list.length) {
    return `<p class="empty-state">${state.orders.length ? "조건에 맞는 주문이 없어요." : "아직 접수된 주문이 없어요."}</p>`;
  }
  return list
    .map((o) => {
      const status = o.status || "신규";
      const items = (o.items || [])
        .map(
          (it) =>
            `<li><span>${escapeHtml(it.categoryName)} · ${escapeHtml(it.groupName)} · <b>${escapeHtml(it.itemName)}</b> × ${formatPrice(it.qty)}</span><span>${formatPrice(it.unitPrice * it.qty)}</span></li>`
        )
        .join("");
      return `
        <article class="admin-card order-card status-${STATUS_OPTIONS.indexOf(status)}" data-order-id="${o.id}">
          <header class="order-card-head">
            <div>
              <strong>#${orderNo(o)}</strong>
              <span class="muted">${formatDate(o.createdAt)}</span>
            </div>
            <select class="status-select" data-status aria-label="주문 상태">
              ${STATUS_OPTIONS.map((s) => `<option value="${s}" ${status === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </header>
          <ul class="order-items">${items || "<li class='muted'>항목 정보 없음</li>"}</ul>
          <div class="order-total"><span>합계</span><b>${formatPrice(o.total)}</b></div>
          <div class="order-memo">
            <input type="text" data-memo placeholder="상담 메모 (예: 닉네임, 입금 확인, 일정)" value="${escapeHtml(o.memo || "")}" />
            <button type="button" class="btn-sm primary" data-action="save-memo">메모 저장</button>
          </div>
          <footer class="order-card-actions">
            <button type="button" class="btn-sm" data-action="copy">주문 내용 복사</button>
            <button type="button" class="btn-sm danger" data-action="delete">삭제</button>
          </footer>
        </article>`;
    })
    .join("");
}

function render() {
  content.innerHTML = `${renderToolbar()}<div class="order-list" data-list>${renderList()}</div>`;
}

function refreshList() {
  content.querySelector("[data-list]").innerHTML = renderList();
}

content.addEventListener("click", async (e) => {
  const chip = e.target.closest("[data-filter]");
  if (chip) {
    state.filter = chip.dataset.filter;
    render();
    return;
  }

  const btn = e.target.closest("[data-action]");
  const card = e.target.closest("[data-order-id]");
  if (!btn || !card) return;
  const order = state.orders.find((o) => o.id === card.dataset.orderId);

  if (btn.dataset.action === "save-memo") {
    const memo = card.querySelector("[data-memo]").value.trim();
    const ok = await withBusy(btn, async () => {
      await updateDoc(doc(db, "orders", order.id), { memo });
      return true;
    }, { success: "메모를 저장했어요." });
    if (ok) order.memo = memo;
  }

  if (btn.dataset.action === "copy") {
    try {
      await navigator.clipboard.writeText(orderText(order));
      toast("주문 내용을 복사했어요.");
    } catch {
      toast("복사에 실패했어요. 브라우저 권한을 확인해주세요.", "error");
    }
  }

  if (btn.dataset.action === "delete") {
    if (!confirm(`주문 #${orderNo(order)}을(를) 삭제할까요? 되돌릴 수 없어요.`)) return;
    const ok = await withBusy(btn, async () => {
      await deleteDoc(doc(db, "orders", order.id));
      return true;
    }, { success: "주문을 삭제했어요." });
    if (!ok) return;
    state.orders = state.orders.filter((o) => o.id !== order.id);
    render();
  }
});

content.addEventListener("change", async (e) => {
  const select = e.target.closest("[data-status]");
  if (!select) return;
  const card = select.closest("[data-order-id]");
  const order = state.orders.find((o) => o.id === card.dataset.orderId);
  const prev = order.status || "신규";
  const ok = await withBusy(null, async () => {
    await updateDoc(doc(db, "orders", order.id), { status: select.value });
    return true;
  }, { success: `#${orderNo(order)} → ${select.value}` });
  if (ok) {
    order.status = select.value;
    render();
  } else {
    select.value = prev;
  }
});

content.addEventListener("input", (e) => {
  if (!e.target.matches("[data-search]")) return;
  state.search = e.target.value;
  refreshList();
});

content.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.matches("[data-memo]")) {
    e.target.closest("[data-order-id]").querySelector('[data-action="save-memo"]').click();
  }
});

async function init() {
  content.innerHTML = `<p class="muted">불러오는 중...</p>`;
  try {
    const params = new URLSearchParams(location.search);
    if (STATUS_OPTIONS.includes(params.get("status"))) state.filter = params.get("status");
    await loadOrders();
    render();
  } catch (e) {
    console.error(e);
    content.innerHTML = `<p class="muted">주문 목록을 불러오지 못했습니다. Firestore 규칙과 로그인 상태를 확인해주세요.</p>`;
  }
}

init();
