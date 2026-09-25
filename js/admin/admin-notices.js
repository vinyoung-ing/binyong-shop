import { requireAuth, renderAdminShell, escapeHtml, toast, withBusy } from "./admin-common.js";
import {
  db,
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "../firebase-init.js";

await requireAuth();
const content = renderAdminShell("notices", "공지사항", "고정한 공지는 사이트 공지사항 맨 위에 보여요.");

const state = { notices: [], editingId: null };

async function loadNotices() {
  const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  state.notices = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
}

function formatDate(ts) {
  if (!ts?.toDate) return "-";
  return ts.toDate().toLocaleDateString("ko-KR");
}

function noticeForm(n = {}) {
  const editing = !!n.id;
  return `
    <form class="stack-form" data-form="${editing ? "edit" : "create"}" ${editing ? `data-id="${n.id}"` : ""}>
      <label>제목<input name="title" required value="${escapeHtml(n.title || "")}" autocomplete="off" /></label>
      <label>내용<textarea name="body" rows="${editing ? 5 : 4}" required>${escapeHtml(n.body || "")}</textarea></label>
      <label class="check-row"><input type="checkbox" name="pinned" ${n.pinned ? "checked" : ""} /> 상단 고정</label>
      <div class="form-actions">
        <button type="submit" class="btn-sm primary">${editing ? "수정 저장" : "등록"}</button>
        ${editing ? `<button type="button" class="btn-sm" data-action="cancel">취소</button>` : ""}
      </div>
    </form>`;
}

function render() {
  const list = state.notices
    .map((n) =>
      state.editingId === n.id
        ? `<div class="notice-admin-item is-editing">${noticeForm(n)}</div>`
        : `
        <div class="notice-admin-item" data-id="${n.id}">
          <div class="notice-admin-head">
            <div>
              ${n.pinned ? `<span class="chip chip-on">고정</span>` : ""}
              <strong>${escapeHtml(n.title)}</strong>
              <span class="muted">${formatDate(n.createdAt)}</span>
            </div>
            <div class="form-actions">
              <button type="button" class="btn-sm" data-action="toggle-pin">${n.pinned ? "고정 해제" : "상단 고정"}</button>
              <button type="button" class="btn-sm" data-action="edit">수정</button>
              <button type="button" class="btn-sm danger" data-action="delete">삭제</button>
            </div>
          </div>
          <p class="notice-admin-body">${escapeHtml(n.body)}</p>
        </div>`
    )
    .join("");

  content.innerHTML = `
    <section class="admin-card">
      <div class="col-head"><h2>새 공지 작성</h2></div>
      ${noticeForm()}
    </section>
    <section class="admin-card">
      <div class="col-head"><h2>공지 목록</h2><span class="count">${state.notices.length}</span></div>
      ${list || `<p class="empty-state">등록된 공지사항이 없어요.</p>`}
    </section>`;
}

content.addEventListener("submit", async (e) => {
  const form = e.target;
  e.preventDefault();
  const fd = new FormData(form);
  const data = { title: fd.get("title").trim(), body: fd.get("body").trim(), pinned: fd.get("pinned") === "on" };
  const btn = form.querySelector('[type="submit"]');

  if (form.dataset.form === "create") {
    const ref = await withBusy(btn, () => addDoc(collection(db, "notices"), { ...data, createdAt: serverTimestamp() }), {
      success: "공지를 등록했어요.",
    });
    if (!ref) return;
  } else {
    const ok = await withBusy(btn, async () => {
      await updateDoc(doc(db, "notices", form.dataset.id), data);
      return true;
    }, { success: "공지를 수정했어요." });
    if (!ok) return;
    state.editingId = null;
  }
  await loadNotices();
  render();
});

content.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  if (btn.dataset.action === "cancel") {
    state.editingId = null;
    render();
    return;
  }

  const id = btn.closest("[data-id]")?.dataset.id;
  const notice = state.notices.find((n) => n.id === id);
  if (!notice) return;

  if (btn.dataset.action === "edit") {
    state.editingId = id;
    render();
    content.querySelector(".is-editing input[name=title]")?.focus();
  }

  if (btn.dataset.action === "toggle-pin") {
    const ok = await withBusy(btn, async () => {
      await updateDoc(doc(db, "notices", id), { pinned: !notice.pinned });
      return true;
    }, { success: notice.pinned ? "고정을 해제했어요." : "상단에 고정했어요." });
    if (!ok) return;
    await loadNotices();
    render();
  }

  if (btn.dataset.action === "delete") {
    if (!confirm(`"${notice.title}" 공지를 삭제할까요?`)) return;
    const ok = await withBusy(btn, async () => {
      await deleteDoc(doc(db, "notices", id));
      return true;
    }, { success: "공지를 삭제했어요." });
    if (!ok) return;
    state.notices = state.notices.filter((n) => n.id !== id);
    render();
  }
});

async function init() {
  content.innerHTML = `<p class="muted">불러오는 중...</p>`;
  try {
    await loadNotices();
    render();
  } catch (e) {
    console.error(e);
    content.innerHTML = `<p class="muted">공지사항을 불러오지 못했습니다. Firestore 규칙과 로그인 상태를 확인해주세요.</p>`;
  }
}

init();
