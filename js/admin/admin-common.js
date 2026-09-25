import { auth, onAuthStateChanged, signOut } from "../firebase-init.js";

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
  { key: "dashboard", href: "dashboard.html", label: "대시보드" },
  { key: "categories", href: "categories.html", label: "카테고리/가격표 관리" },
  { key: "orders", href: "orders.html", label: "주문 관리" },
  { key: "notices", href: "notices.html", label: "공지사항 관리" },
];

export function renderAdminShell(activeKey, title) {
  const root = document.getElementById("admin-root");
  root.innerHTML = `
    <div class="admin-shell">
      <aside class="admin-sidebar">
        <div class="brand">비뇽 관리자</div>
        <nav>
          ${NAV_ITEMS.map(
            (n) =>
              `<a href="${n.href}" class="${n.key === activeKey ? "active" : ""}">${n.label}</a>`
          ).join("")}
        </nav>
      </aside>
      <div class="admin-main">
        <div class="admin-topbar">
          <h1>${title}</h1>
          <button class="btn-signout" id="admin-signout-btn">로그아웃</button>
        </div>
        <div id="admin-content"></div>
      </div>
    </div>
  `;

  document.getElementById("admin-signout-btn").addEventListener("click", async () => {
    await signOut(auth);
    location.href = "index.html";
  });

  return document.getElementById("admin-content");
}

export function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
