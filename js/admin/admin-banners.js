import { requireAuth, renderAdminShell, escapeHtml, toast, withBusy } from "./admin-common.js";
import {
  listBanners,
  uploadBanner,
  updateBanner,
  deleteBanner,
  getSiteSettings,
  updateSiteSettings,
} from "../banners.js";
import { siteConfig } from "../site-config.js";
import { HERO_TITLE_MAX, heroTitleError, normalizeHeroTitle } from "../common.js";

await requireAuth();
const content = renderAdminShell("banners", "홈 화면 관리", "홈 첫 화면의 메인 문구와 자동으로 넘어가는 배너를 관리해요.");

const state = { banners: [], settings: {} };

async function reload() {
  [state.banners, state.settings] = await Promise.all([listBanners(), getSiteSettings()]);
}

function bannerCard(b, i) {
  const last = state.banners.length - 1;
  return `
    <div class="banner-admin-card" data-id="${b.id}">
      <div class="banner-thumb">
        ${
          b.imageUrl
            ? `<img src="${b.imageUrl}" alt="배너 ${i + 1}" loading="lazy" />`
            : `<div class="banner-missing">이미지 없음<br />(삭제 후 다시 올려주세요)</div>`
        }
        <span class="banner-order">${i + 1}</span>
      </div>
      <div class="banner-admin-body">
        <input type="text" placeholder="클릭 시 이동할 링크 (선택)" value="${escapeHtml(b.linkUrl || "")}" data-link />
        <div class="banner-admin-actions">
          <button type="button" class="icon-btn" data-action="move" data-dir="-1" ${i === 0 ? "disabled" : ""} title="앞으로">◀</button>
          <button type="button" class="icon-btn" data-action="move" data-dir="1" ${i === last ? "disabled" : ""} title="뒤로">▶</button>
          <button type="button" class="btn-sm primary" data-action="save-link">링크 저장</button>
          <button type="button" class="btn-sm danger" data-action="delete">삭제</button>
        </div>
      </div>
    </div>`;
}

function render() {
  const interval = state.settings.bannerIntervalSeconds ?? 4;

  const heroTitle = normalizeHeroTitle(state.settings.heroTitle) || siteConfig.tagline;

  content.innerHTML = `
    <section class="admin-card">
      <div class="col-head"><h2>메인 문구</h2><span class="muted" style="font-size:12px;">홈 첫 화면의 큰 제목</span></div>
      <p class="help">
        화면이 깨지지 않도록 <b>최대 ${HERO_TITLE_MAX}자</b>(띄어쓰기 포함)까지 쓸 수 있고,
        띄어쓰기 없이 붙은 단어는 <b>8자</b>까지만 돼요. 아래 미리보기는 휴대폰 화면 폭 기준이에요.
      </p>
      <form class="stack-form" id="hero-form">
        <div class="counter-input">
          <input name="heroTitle" maxlength="${HERO_TITLE_MAX}" value="${escapeHtml(heroTitle)}" autocomplete="off" />
          <span data-hero-counter></span>
        </div>
        <p class="field-error" data-hero-error hidden></p>
        <div class="hero-preview"><div class="hero-preview-phone"><span data-hero-preview></span></div></div>
        <div class="form-actions">
          <button type="submit" class="btn-sm primary">문구 저장</button>
          <button type="button" class="btn-sm" data-hero-reset>기본 문구로 되돌리기</button>
        </div>
      </form>
    </section>

    <section class="admin-card">
      <div class="col-head"><h2>배너 올리기</h2></div>
      <form class="upload-drop" id="upload-banner-form">
        <label class="upload-drop-area">
          <input type="file" name="files" accept="image/jpeg,image/png,image/webp,image/gif" multiple required />
          <b>이미지 선택 (여러 장 가능)</b>
          <span class="muted">JPG · PNG · WEBP · GIF / 큰 사진은 자동으로 줄여서 올라가요</span>
        </label>
        <div class="add-row">
          <input type="text" name="linkUrl" placeholder="클릭 시 이동할 링크 (선택)" autocomplete="off" />
          <button type="submit" class="btn-sm primary" id="upload-btn">업로드</button>
        </div>
        <p class="help" id="upload-status"></p>
      </form>
    </section>

    <section class="admin-card">
      <div class="col-head"><h2>자동 전환 간격</h2></div>
      <form class="add-row" id="interval-form">
        <input type="number" min="1" step="0.5" name="interval" value="${interval}" style="max-width:100px;" />
        <span class="muted">초마다 다음 배너로</span>
        <button type="submit" class="btn-sm primary">저장</button>
      </form>
    </section>

    <section class="admin-card">
      <div class="col-head"><h2>등록된 배너</h2><span class="count">${state.banners.length}</span></div>
      ${
        state.banners.length
          ? `<div class="banner-admin-grid">${state.banners.map(bannerCard).join("")}</div>`
          : `<p class="empty-state">아직 배너가 없어요. 위에서 이미지를 올려보세요.</p>`
      }
    </section>`;

  refreshHeroForm();
}

// 메인 문구 입력칸: 글자 수, 규칙 위반 여부, 미리보기를 입력할 때마다 갱신한다.
function refreshHeroForm() {
  const input = content.querySelector('#hero-form input[name="heroTitle"]');
  if (!input) return;
  const value = normalizeHeroTitle(input.value);
  const error = heroTitleError(value);
  const length = [...value].length;

  const counter = content.querySelector("[data-hero-counter]");
  counter.textContent = `${length} / ${HERO_TITLE_MAX}`;
  counter.classList.toggle("is-full", length >= HERO_TITLE_MAX);

  const errorEl = content.querySelector("[data-hero-error]");
  errorEl.textContent = error || "";
  errorEl.hidden = !error;
  input.classList.toggle("is-invalid", !!error);

  content.querySelector("[data-hero-preview]").innerHTML = (value || " ")
    .split(" ")
    .map((w) => `<span class="pw">${escapeHtml(w)}</span>`)
    .join(" ");
  content.querySelector('#hero-form [type="submit"]').disabled =
    !!error || value === (normalizeHeroTitle(state.settings.heroTitle) || siteConfig.tagline);
}

content.addEventListener("input", (e) => {
  if (e.target.closest("#hero-form")) refreshHeroForm();
});

content.addEventListener("click", (e) => {
  if (!e.target.closest("[data-hero-reset]")) return;
  content.querySelector('#hero-form input[name="heroTitle"]').value = siteConfig.tagline;
  refreshHeroForm();
});

// 업로드: 여러 장을 동시에 올리고, 실패하면 실제 원인을 그대로 보여준다.
content.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;

  if (form.id === "hero-form") {
    const value = normalizeHeroTitle(form.heroTitle.value);
    const error = heroTitleError(value);
    if (error) {
      toast(error, "error");
      return;
    }
    // 기본 문구와 같으면 저장값을 비워서, 나중에 기본 문구가 바뀌어도 따라가게 한다.
    const saved = value === siteConfig.tagline ? "" : value;
    const ok = await withBusy(form.querySelector('[type="submit"]'), async () => {
      await updateSiteSettings({ heroTitle: saved });
      return true;
    }, { success: "메인 문구를 저장했어요. 홈에 바로 반영돼요." });
    if (ok) {
      state.settings.heroTitle = saved;
      refreshHeroForm();
    }
    return;
  }

  if (form.id === "interval-form") {
    const seconds = Number(form.interval.value) || 4;
    const ok = await withBusy(form.querySelector("button"), async () => {
      await updateSiteSettings({ bannerIntervalSeconds: seconds });
      return true;
    }, { success: `${seconds}초 간격으로 저장했어요.` });
    if (ok) state.settings.bannerIntervalSeconds = seconds;
    return;
  }

  if (form.id !== "upload-banner-form") return;
  const files = Array.from(form.files.files || []);
  if (!files.length) return;
  const linkUrl = form.linkUrl.value.trim();
  const uploadBtn = form.querySelector("#upload-btn");
  const statusEl = form.querySelector("#upload-status");

  uploadBtn.disabled = true;
  const baseOrder = state.banners.length;
  let done = 0;
  const updateStatus = () => {
    statusEl.textContent = `이미지 줄이는 중 · 저장 중… (${done}/${files.length})`;
  };
  updateStatus();

  const results = await Promise.allSettled(
    files.map((file, i) =>
      uploadBanner(file, { linkUrl, order: baseOrder + i }).finally(() => {
        done++;
        updateStatus();
      })
    )
  );
  statusEl.textContent = "";

  uploadBtn.disabled = false;
  const failed = results.filter((r) => r.status === "rejected");
  failed.forEach((r) => console.error(r.reason));
  if (failed.length) {
    const reason = failed[0].reason;
    toast(`${failed.length}개 업로드 실패: ${reason?.code || reason?.message || reason}`, "error");
  }
  if (failed.length < files.length) toast(`${files.length - failed.length}개 업로드 완료`);

  await reload();
  render();
});

content.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  const card = e.target.closest("[data-id]");
  if (!btn || !card) return;
  const banner = state.banners.find((b) => b.id === card.dataset.id);

  if (btn.dataset.action === "save-link") {
    const linkUrl = card.querySelector("[data-link]").value.trim();
    const ok = await withBusy(btn, async () => {
      await updateBanner(banner.id, { linkUrl });
      return true;
    }, { success: "링크를 저장했어요." });
    if (ok) banner.linkUrl = linkUrl;
  }

  if (btn.dataset.action === "move") {
    const i = state.banners.indexOf(banner);
    const j = i + Number(btn.dataset.dir);
    if (j < 0 || j >= state.banners.length) return;
    [state.banners[i], state.banners[j]] = [state.banners[j], state.banners[i]];
    await withBusy(null, () =>
      Promise.all(
        state.banners.map((b, idx) => {
          if (b.order === idx) return null;
          b.order = idx;
          return updateBanner(b.id, { order: idx });
        })
      )
    );
    render();
  }

  if (btn.dataset.action === "delete") {
    if (!confirm("이 배너를 삭제할까요?")) return;
    const ok = await withBusy(btn, async () => {
      await deleteBanner(banner.id);
      return true;
    }, { success: "배너를 삭제했어요." });
    if (!ok) return;
    state.banners = state.banners.filter((b) => b.id !== banner.id);
    render();
  }
});

async function init() {
  content.innerHTML = `<p class="muted">불러오는 중...</p>`;
  try {
    await reload();
    render();
  } catch (e) {
    console.error(e);
    content.innerHTML = `
      <div class="admin-card">
        <p class="muted">배너 정보를 불러오지 못했습니다. Firestore 규칙에 banners/settings가 허용되어 있는지, 로그인이 되어 있는지 확인해주세요.</p>
        <p class="help">${escapeHtml(e.code || e.message || String(e))}</p>
      </div>`;
  }
}

init();
