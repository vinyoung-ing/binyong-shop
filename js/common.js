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
      <div class="header-top-row">
        <a class="logo" href="index.html">
          <span class="logo-kr">${siteConfig.siteName}</span>
          <span class="logo-en">${siteConfig.siteNameEn}</span>
        </a>
        <div class="header-actions">
          <a href="order.html" class="btn-cart">
            선택항목 <span data-cart-badge hidden>0</span>
          </a>
          <a href="${siteConfig.kakaoChannelUrl}" target="_blank" rel="noopener" class="btn-kakao">
            카카오톡 상담
          </a>
        </div>
      </div>
      <nav class="main-nav">
        ${navItems
          .map(
            (n) =>
              `<a href="${n.href}" class="${n.key === activePage ? "active" : ""}">${n.label}</a>`
          )
          .join("")}
      </nav>
    </div>
  `;

  updateCartBadge();
}

export function renderFooter() {
  const el = document.getElementById("site-footer");
  if (!el) return;

  el.innerHTML = `
    <div class="footer-inner">
      <div class="footer-top">
        <div>
          <p class="footer-brand">${siteConfig.siteName} · ${siteConfig.siteNameEn}</p>
          <p class="footer-tagline">${siteConfig.tagline}</p>
        </div>
        <nav class="footer-nav">
          <a href="index.html">홈</a>
          <a href="services.html">서비스</a>
          <a href="notice.html">공지사항</a>
          <a href="guide.html">이용안내</a>
        </nav>
      </div>
      <p class="footer-wordmark" aria-hidden="true">${siteConfig.siteNameEn}</p>
      <div class="footer-bottom">
        <p class="footer-contact">
          문의 <a href="${siteConfig.kakaoChannelUrl}" target="_blank" rel="noopener">카카오톡 채널</a>
          ${siteConfig.discordUrl ? ` · <a href="${siteConfig.discordUrl}" target="_blank" rel="noopener">디스코드</a>` : ""}
        </p>
        <p class="footer-note">
          본 사이트는 게임 대리 서비스 주문을 접수하는 사이트로, 온라인 결제는 지원하지 않습니다.
          결제는 상담 채널을 통해 개별 안내됩니다.
        </p>
      </div>
    </div>
  `;
}

// 홈 메인 문구 제한. 제목은 단어 단위로 줄바꿈되므로(단어 중간에서 안 끊김)
// 모바일 폭(한 줄 약 9자)을 넘는 긴 단어가 있으면 화면 밖으로 삐져나간다.
export const HERO_TITLE_MAX = 22;
export const HERO_WORD_MAX = 8;

export function normalizeHeroTitle(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

// 문제가 없으면 null, 있으면 사용자에게 보여줄 메시지를 돌려준다.
export function heroTitleError(text) {
  const t = normalizeHeroTitle(text);
  if (!t) return "문구를 입력해주세요.";
  if ([...t].length > HERO_TITLE_MAX) return `최대 ${HERO_TITLE_MAX}자까지 입력할 수 있어요.`;
  const longWord = t.split(" ").find((w) => [...w].length > HERO_WORD_MAX);
  if (longWord) {
    return `"${longWord}"처럼 띄어쓰기 없이 ${HERO_WORD_MAX}자를 넘는 단어는 모바일에서 화면을 벗어나요. 중간에 띄어쓰기를 넣어주세요.`;
  }
  return null;
}

// href/src 에 넣을 주소를 허용된 형식만 통과시킨다(javascript: 같은 주소 차단).
export function safeLinkUrl(url) {
  const u = String(url ?? "").trim();
  return /^https?:\/\//i.test(u) ? u : "";
}
export function safeImageUrl(url) {
  const u = String(url ?? "").trim();
  return /^(https:\/\/|data:image\/(jpeg|png|webp|gif);base64,)/i.test(u) ? u : "";
}

export function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function formatPrice(num) {
  const n = Number(num);
  if (Number.isNaN(n)) return "-";
  return n.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

// [data-reveal] 요소가 화면에 들어오면 살짝 떠오르며 나타나는 스크롤 모션.
// 동적으로 새로 그려진 화면에서도 다시 불러 쓸 수 있도록 매번 관측 대상을 새로 찾는다.
export function initScrollReveal(root = document) {
  const items = root.querySelectorAll("[data-reveal]:not(.is-visible)");
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );

  items.forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i, 6) * 60}ms`;
    io.observe(el);
  });
}
