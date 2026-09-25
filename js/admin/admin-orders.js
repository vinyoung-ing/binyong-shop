import { requireAuth, renderAdminShell, escapeHtml } from "./admin-common.js";
import { db, collection, getDocs, doc, updateDoc, query, orderBy } from "../firebase-init.js";

await requireAuth();
const content = renderAdminShell("orders", "주문 관리");

const STATUS_OPTIONS = ["신규", "확인중", "진행중", "완료", "취소"];

async function loadOrders() {
  const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function formatDate(ts) {
  if (!ts?.toDate) return "-";
  return ts.toDate().toLocaleString("ko-KR");
}

function render(orders) {
  if (orders.length === 0) {
    content.innerHTML = `<p class="muted">접수된 주문이 없습니다.</p>`;
    return;
  }

  content.innerHTML = orders
    .map((o) => {
      const orderNo = o.id.slice(-6).toUpperCase();
      const itemsText = (o.items || [])
        .map((it) => `${it.categoryName} · ${it.groupName} · ${it.itemName} x${it.qty}`)
        .join("<br/>");
      return `
        <div class="admin-card">
          <div class="admin-topbar" style="margin-bottom:10px;">
            <strong>#${orderNo}</strong>
            <select class="status-select" data-status-for="${o.id}">
              ${STATUS_OPTIONS.map(
                (s) => `<option value="${s}" ${o.status === s ? "selected" : ""}>${s}</option>`
              ).join("")}
            </select>
          </div>
          <table class="admin-table">
            <tbody>
              <tr><th>접수일시</th><td>${formatDate(o.createdAt)}</td></tr>
              <tr><th>항목</th><td>${itemsText || "-"}</td></tr>
              <tr><th>합계</th><td>${o.total ?? "-"}</td></tr>
              <tr>
                <th>메모</th>
                <td>
                  <input type="text" class="qty-input" style="width:100%;" value="${escapeHtml(o.memo || "")}" data-memo-for="${o.id}" />
                </td>
              </tr>
            </tbody>
          </table>
          <button class="btn-sm primary mt-24" data-save-memo="${o.id}">메모 저장</button>
        </div>
      `;
    })
    .join("");

  content.querySelectorAll("[data-status-for]").forEach((sel) => {
    sel.addEventListener("change", async () => {
      await updateDoc(doc(db, "orders", sel.dataset.statusFor), { status: sel.value });
    });
  });

  content.querySelectorAll("[data-save-memo]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const input = content.querySelector(`[data-memo-for="${btn.dataset.saveMemo}"]`);
      await updateDoc(doc(db, "orders", btn.dataset.saveMemo), { memo: input.value });
      btn.textContent = "저장됨 ✓";
      setTimeout(() => (btn.textContent = "메모 저장"), 900);
    });
  });
}

async function init() {
  content.innerHTML = `<p class="muted">불러오는 중...</p>`;
  try {
    const orders = await loadOrders();
    render(orders);
  } catch (e) {
    console.error(e);
    content.innerHTML = `<p class="muted">주문 목록을 불러오지 못했습니다. Firestore 규칙과 로그인 상태를 확인해주세요.</p>`;
  }
}

init();
