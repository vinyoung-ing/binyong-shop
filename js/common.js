import { siteConfig } from "./site-config.js";

const CART_KEY = "binyong_cart";

// ---------- 장바구니(선택한 항목) ----------

export function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

export function addToCart(item) {
  const cart = getCart();
  // 같은 항목(카테고리+그룹+항목명+조건)이 이미 있으면 수량만 합산
  const existing = cart.find(
    (c) =>
      c.categoryId === item.categoryId &&
      c.groupName === item.groupName &&
      c.itemName === item.itemName
  );
  if (existing) {
    existing.qty += item.qty;
  } else {
    cart.push(item);
  }
  saveCart(cart);
}

export function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

export function updateCartQty(index, qty) {
  const cart = getCart();
  if (cart[index]) {
    cart[index].qty = Math.max(1, qty);
    saveCart(cart);
  }
}

export function clearCart() {
  saveCart([]);
}

export function cartCount() {
  return getCart().reduce((sum, c) => sum + c.qty, 0);
}

export function cartEstimate() {
  return getCart().reduce((sum, c) => sum + c.unitPrice * c.qty, 0);
}

function updateCartBadge() {
  const badge = document.querySelector("[data-cart-badge]");
  if (badge) {
    const count = cartCount();
    badge.textContent = count;
    badge.hidden = count === 0;
  }
}

// ---------- 헤더/푸터 ----------

export function renderHeader(activePage = "") {
  const el = document.getElementById("site-header");
  if (!el) return;

  const navItems = [
    { href: "index.html", label: "홈", key: "home" },
    { href: "services.html", label: "서비스", key: "services" },
    { href: "notice.html", label: "공지사항", key: "notice" },
    { href: "guide.html", label: "이용안내", key: "guide" },
  ];

  el.innerHTML = `
    <div class="header-inner">
      <a class="logo" href="index.html">
        <span class="logo-kr">${siteConfig.siteName}</span>
        <span class="logo-en">${siteConfig.siteNameEn}</span>
      </a>
      <nav class="main-nav">
        ${navItems
          .map(
            (n) =>
              `<a href="${n.href}" class="${n.key === activePage ? "active" : ""}">${n.label}</a>`
          )
          .join("")}
      </nav>
      <div class="header-actions">
        <a href="order.html" class="btn-cart">
          선택한 항목 <span data-cart-badge hidden>0</span>
        </a>
        <a href="${siteConfig.kakaoChannelUrl}" target="_blank" rel="noopener" class="btn-kakao">
          카카오톡 상담
        </a>
      </div>
    </div>
  `;

  updateCartBadge();
}

export function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;

  el.innerHTML = `
    <div class="footer-inner">
      <p class="footer-brand">${siteConfig.siteName} · ${siteConfig.siteNameEn}</p>
      <nav class="footer-nav">
        <a href="index.html">홈</a>
        <a href="services.html">서비스</a>
        <a href="notice.html">공지사항</a>
        <a href="guide.html">이용안내</a>
      </nav>
      <p class="footer-contact">
        문의: <a href="${siteConfig.kakaoChannelUrl}" target="_blank" rel="noopener">카카오톡 채널</a>
        ${siteConfig.discordUrl ? ` · <a href="${siteConfig.discordUrl}" target="_blank" rel="noopener">디스코드</a>` : ""}
      </p>
      <p class="footer-note">
        본 사이트는 게임 대리 서비스 주문을 접수·관리하는 커머스 사이트입니다.
        온라인 결제를 지원하지 않으며, 결제는 상담 채널을 통해 개별 안내됩니다.
      </p>
    </div>
  `;
}

// 공용 플로팅 카카오 상담 버튼(모바일 하단 고정)
export function renderFloatingKakao() {
  const el = document.createElement("a");
  el.href = siteConfig.kakaoChannelUrl;
  el.target = "_blank";
  el.rel = "noopener";
  el.className = "floating-kakao";
  el.textContent = "카카오톡 상담";
  document.body.appendChild(el);
}

export function formatPrice(num) {
  const n = Number(num);
  if (Number.isNaN(n)) return "-";
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}
