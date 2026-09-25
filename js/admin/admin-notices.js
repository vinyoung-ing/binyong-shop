import { requireAuth, renderAdminShell, escapeHtml } from "./admin-common.js";
import {
  db,
  collection,
  getDocs,
  addDoc,
  doc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "../firebase-init.js";

await requireAuth();
const content = renderAdminShell("notices", "공지사항 관리");

async function loadNotices() {
  const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function formatDate(ts) {
  if (!ts?.toDate) return "-";
  return ts.toDate().toLocaleDateString("ko-KR");
}

function render(notices) {
  content.innerHTML = `
    <div class="admin-card">
      <h2>새 공지 작성</h2>
      <form id="add-notice-form">
        <label style="display:block; font-size:13px; font-weight:600; margin-bottom:6px;">제목</label>
        <input type="text" name="title" required style="width:100%; padding:8px; border:1px solid var(--border); border-radius:6px; margin-bottom:10px;" />
        <label style="display:block; font-size:13px; font-weight:600; margin-bottom:6px;">내용</label>
        <textarea name="body" rows="4" required style="width:100%; padding:8px; border:1px solid var(--border); border-radius:6px;"></textarea>
        <button type="submit" class="btn-sm primary mt-24">등록</button>
      </form>
    </div>

    <div class="admin-card">
      <h2>공지 목록</h2>
      ${
        notices.length
          ? notices
              .map(
                (n) => `
          <div class="notice-item">
            <h3>${escapeHtml(n.title)}</h3>
            <time>${formatDate(n.createdAt)}</time>
            <p>${escapeHtml(n.body)}</p>
            <button class="btn-sm danger" data-delete-notice="${n.id}">삭제</button>
          </div>
        `
              )
              .join("")
          : `<p class="muted">등록된 공지사항이 없습니다.</p>`
      }
    </div>
  `;

  const addForm = document.getElementById("add-notice-form");
  addForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(addForm);
    await addDoc(collection(db, "notices"), {
      title: fd.get("title"),
      body: fd.get("body"),
      createdAt: serverTimestamp(),
    });
    const notices = await loadNotices();
    render(notices);
  });

  content.querySelectorAll("[data-delete-notice]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("이 공지사항을 삭제할까요?")) return;
      await deleteDoc(doc(db, "notices", btn.dataset.deleteNotice));
      const notices = await loadNotices();
      render(notices);
    });
  });
}

async function init() {
  content.innerHTML = `<p class="muted">불러오는 중...</p>`;
  try {
    const notices = await loadNotices();
    render(notices);
  } catch (e) {
    console.error(e);
    content.innerHTML = `<p class="muted">공지사항을 불러오지 못했습니다. Firestore 규칙과 로그인 상태를 확인해주세요.</p>`;
  }
}

init();
