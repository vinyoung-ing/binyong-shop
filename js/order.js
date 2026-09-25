import {
  renderHeader,
  renderFooter,
  renderFloatingKakao,
  formatPrice,
  getCart,
  removeFromCart,
  updateCartQty,
  clearCart,
} from "./common.js";
import { db, collection, addDoc, serverTimestamp } from "./firebase-init.js";
import { siteConfig } from "./site-config.js";

renderHeader("services");
renderFooter();
renderFloatingKakao();

const cartListEl = document.getElementById("order-cart-list");
const resultEl = document.getElementById("result-box");
const submitBtn = document.getElementById("submit-btn");

function renderCartList() {
  const cart = getCart();
  if (cart.length === 0) {
    cartListEl.innerHTML = `
      <div class="order-cart-empty">
        담은 항목이 없습니다. <a href="services.html">서비스 페이지</a>에서 원하는 항목을 먼저 담아주세요.
      </div>
    `;
    submitBtn.disabled = true;
    return;
  }

  submitBtn.disabled = false;
  const total = cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);

  cartListEl.innerHTML = `
    <table class="admin-table">
      <thead>
        <tr><th>카테고리</th><th>항목</th><th>단가</th><th>수량</th><th>소계</th><th></th></tr>
      </thead>
      <tbody>
        ${cart
          .map(
            (c, i) => `
          <tr>
            <td>${c.categoryName}</td>
            <td>${c.groupName} · ${c.itemName}</td>
            <td>${formatPrice(c.unitPrice)}${c.unitLabel ? ` / ${c.unitLabel}` : ""}</td>
            <td><input type="number" min="1" class="qty-input" value="${c.qty}" data-qty-index="${i}" /></td>
            <td>${formatPrice(c.unitPrice * c.qty)}</td>
            <td><button class="remove-btn" data-remove-index="${i}">삭제</button></td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
    <div class="selected-total" style="margin-top:12px;">
      <span>예상 합계</span>
      <span>${formatPrice(total)}</span>
    </div>
  `;

  cartListEl.querySelectorAll("[data-qty-index]").forEach((input) => {
    input.addEventListener("change", () => {
      updateCartQty(Number(input.dataset.qtyIndex), Number(input.value));
      renderCartList();
    });
  });
  cartListEl.querySelectorAll("[data-remove-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCart(Number(btn.dataset.removeIndex));
      renderCartList();
    });
  });
}

function buildOrderText({ orderNo, cart, total }) {
  const lines = [];
  lines.push(`[${siteConfig.siteName} 주문서]`);
  if (orderNo) lines.push(`주문번호: ${orderNo}`);
  lines.push("");
  lines.push("[주문 항목]");
  cart.forEach((c) => {
    lines.push(
      `- ${c.categoryName} / ${c.groupName} / ${c.itemName} : ${formatPrice(c.unitPrice)}${c.unitLabel ? " " + c.unitLabel : ""} x ${c.qty} = ${formatPrice(c.unitPrice * c.qty)}`
    );
  });
  lines.push(`예상 합계: ${formatPrice(total)}`);
  return lines.join("\n");
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

submitBtn.addEventListener("click", async () => {
  const cart = getCart();
  if (cart.length === 0) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "처리 중...";

  const total = cart.reduce((sum, c) => sum + c.unitPrice * c.qty, 0);

  let orderNo = "";
  try {
    const docRef = await addDoc(collection(db, "orders"), {
      items: cart,
      total,
      status: "신규",
      createdAt: serverTimestamp(),
    });
    orderNo = docRef.id.slice(-6).toUpperCase();
  } catch (err) {
    console.error(err);
    // 주문 저장에 실패해도 카카오톡 문의 자체는 계속 진행합니다.
  }

  const orderText = buildOrderText({ orderNo, cart, total });
  const copied = await copyToClipboard(orderText);

  resultEl.className = "result-box";
  resultEl.innerHTML = `
    <p><strong>${copied ? "주문 내용이 클립보드에 복사되었습니다!" : "아래 내용을 직접 복사해주세요."}</strong></p>
    <p>카카오톡 채팅창에 붙여넣기(Ctrl+V) 하시면 상담이 빨라집니다.</p>
    <div class="order-summary-box">${orderText}</div>
    <div class="order-actions">
      <button type="button" class="btn-secondary" id="copy-again-btn">다시 복사하기</button>
      <a href="${siteConfig.kakaoChannelUrl}" target="_blank" rel="noopener" class="btn-primary">카카오톡 상담 열기</a>
    </div>
  `;

  document.getElementById("copy-again-btn").addEventListener("click", async () => {
    await copyToClipboard(orderText);
  });

  clearCart();
  cartListEl.innerHTML = "";
  submitBtn.hidden = true;

  window.open(siteConfig.kakaoChannelUrl, "_blank", "noopener");
});

renderCartList();
