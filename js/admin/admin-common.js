import { auth, onAuthStateChanged, signOut } from "../firebase-init.js";

export { escapeHtml } from "../common.js";

// 로그인 안 된 상태로 admin 하위 페이지에 들어오면 로그인 페이지로 돌려보냄.
// 로그인 확인이 끝나면 resolve(user) 되는 Promise를 반환.
export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        location.href = "index.html";
        return;
      }
      resolve(user);
    });
  });
}

const NAV_ITEMS = [
  { key: "dashboard", href: "dashboard.html", label: "대시보드", icon: "◎" },
  { key: "orders", href: "orders.html", label: "주문 관리", icon: "✉" },
  { key: "categories", href: "categories.html", label: "가격표 관리", icon: "☰" },
  { key: "banners", href: "banners.html", label: "홈 화면", icon: "▣" },
  { key: "notices", href: "notices.html", label: "공지사항", icon: "✎" },
];

export function renderAdminShell(activeKey, title, subtitle = "") {
  const root = document.getElementById("admin-root");
  root.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="brand">비뇽 <span>ADMIN</span></div>
        <nav>
          ${NAV_ITEMS.map(
            (n) =>
              `<a href="${n.href}" class="${n.key === activeKey ? "active" : ""}"><i aria-hidden="true">${n.icon}</i>${n.label}</a>`
          ).join("")}
        </nav>
        <a class="admin-site-link" href="../index.html" target="_blank" rel="noopener">사이트 보기 ↗</a>
      </aside>
      <div class="admin-main">
        <div class="admin-topbar">
          <div>
            <h1>${title}</h1>
            ${subtitle ? `<p class="admin-subtitle">${subtitle}</p>` : ""}
          </div>
          <button class="btn-signout" id="admin-signout-btn">로그아웃</button>
        </div>
        <div id="admin-content"></div>
      </div>
    </div>
    <div class="toast-stack" id="toast-stack" aria-live="polite"></div>
  `;

  document.getElementById("admin-signout-btn").addEventListener("click", async () => {
    await signOut(auth);
    location.href = "index.html";
  });

  return document.getElementById("admin-content");
}

// 화면 우측 하단에 잠깐 떴다 사라지는 알림.
export function toast(message, type = "success") {
  const stack = document.getElementById("toast-stack");
  if (!stack) return;
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = message;
  stack.appendChild(el);
  while (stack.children.length > 3) stack.firstElementChild.remove();
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, type === "error" ? 5000 : 2200);
}

// 비동기 작업 중에는 버튼을 잠그고, 실패하면 에러를 토스트로 보여준다.
export async function withBusy(button, task, { success, error = "처리 중 오류가 발생했습니다." } = {}) {
  const original = button?.textContent;
  if (button) {
    button.disabled = true;
    button.textContent = "처리 중…";
  }
  try {
    const result = await task();
    if (success) toast(success);
    return result;
  } catch (e) {
    console.error(e);
    toast(`${error} (${e.code || e.message || e})`, "error");
    return undefined;
  } finally {
    if (button && button.isConnected) {
      button.disabled = false;
      button.textContent = original;
    }
  }
}
