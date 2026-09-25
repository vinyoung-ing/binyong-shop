import { requireAuth, renderAdminShell, escapeHtml } from "./admin-common.js";
import {
  listBanners,
  uploadBanner,
  updateBanner,
  deleteBanner,
  getSiteSettings,
  updateSiteSettings,
} from "../banners.js";

await requireAuth();
const content = renderAdminShell("banners", "배너 관리");

let banners = [];
let settings = {};

async function reload() {
  [banners, settings] = await Promise.all([listBanners(), getSiteSettings()]);
}

function render() {
  const interval = settings.bannerIntervalSeconds ?? 4;

  content.innerHTML = `
    <div class="admin-card">
      <h2>배너 이미지 업로드</h2>
      <p class="muted">한 장 또는 여러 장을 한 번에 선택할 수 있습니다. 업로드 순서대로 뒤에 추가됩니다.</p>
      <form class="inline-form" id="upload-banner-form">
        <input type="file" name="files" accept="image/*" multiple required />
        <input type="text" name="linkUrl" placeholder="클릭 시 이동할 링크(선택)" style="min-width:220px;" />
        <button type="submit" class="btn-sm primary" id="upload-btn">업로드</button>
      </form>
      <p class="muted" id="upload-status" style="margin-top:8px;"></p>
    </div>

    <div class="admin-card">
      <h2>자동 전환 간격</h2>
      <form class="inline-form" id="interval-form">
        <input type="number" min="1" step="0.5" name="interval" value="${interval}" style="width:80px;" />
        <span class="muted">초마다 다음 배너로 자동 전환</span>
        <button type="submit" class="btn-sm primary">저장</button>
      </form>
    </div>

    <div class="admin-card">
      <h2>등록된 배너 (${banners.length}개)</h2>
      ${
        banners.length
          ? `<div class="banner-admin-grid">
              ${banners
                .map(
                  (b) => `
                <div class="banner-admin-card" data-banner-card="${b.id}">
                  ${
                    b.imageUrl
                      ? `<img src="${b.imageUrl}" alt="배너 이미지" />`
                      : `<div style="aspect-ratio:16/9; display:flex; align-items:center; justify-content:center; background:#fdecea; color:#c0392b; font-size:12px; text-align:center; padding:8px;">이미지 없음<br/>(삭제 후 다시 업로드해주세요)</div>`
                  }
                  <div class="banner-admin-body">
                    <input type="text" placeholder="링크(선택)" value="${escapeHtml(b.linkUrl || "")}" data-banner-link="${b.id}" />
                    <input type="number" placeholder="순서" value="${b.order ?? 0}" data-banner-order="${b.id}" />
                    <div class="banner-admin-actions">
                      <button class="btn-sm primary" data-save-banner="${b.id}">저장</button>
                      <button class="btn-sm danger" data-delete-banner="${b.id}" data-storage-path="${b.storagePath || ""}">삭제</button>
                    </div>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>`
          : `<p class="muted">아직 등록된 배너가 없습니다.</p>`
      }
    </div>
  `;

  attachHandlers();
}

function attachHandlers() {
  const uploadForm = document.getElementById("upload-banner-form");
  const uploadBtn = document.getElementById("upload-btn");
  const statusEl = document.getElementById("upload-status");

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const files = Array.from(uploadForm.files.files || []);
    if (files.length === 0) return;
    const linkUrl = uploadForm.linkUrl.value.trim();

    uploadBtn.disabled = true;
    const baseOrder = banners.length;

    // 여러 장을 동시에 업로드하고(순차 대기 X), 업로드 전 이미지를 리사이즈/압축해서 속도를 높인다.
    const progress = new Array(files.length).fill(0);
    const updateStatus = () => {
      const avg = Math.round(progress.reduce((a, b) => a + b, 0) / files.length);
      statusEl.textContent = `업로드 중... (${files.length}개, 평균 ${avg}%)`;
    };
    updateStatus();

    const results = await Promise.allSettled(
      files.map((file, i) =>
        uploadBanner(file, {
          linkUrl,
          order: baseOrder + i,
          onProgress: (pct) => {
            progress[i] = pct;
            updateStatus();
          },
        })
      )
    );

    const failedCount = results.filter((r) => r.status === "rejected").length;
    if (failedCount > 0) {
      results.forEach((r) => r.status === "rejected" && console.error(r.reason));
      statusEl.textContent = `${files.length - failedCount}개 업로드 성공, ${failedCount}개 실패. Storage 설정을 확인해주세요.`;
    } else {
      statusEl.textContent = "업로드 완료!";
    }

    uploadBtn.disabled = false;
    uploadForm.reset();
    await reload();
    render();
  });

  const intervalForm = document.getElementById("interval-form");
  intervalForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const seconds = Number(intervalForm.interval.value) || 4;
    await updateSiteSettings({ bannerIntervalSeconds: seconds });
    settings.bannerIntervalSeconds = seconds;
  });

  content.querySelectorAll("[data-save-banner]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.saveBanner;
      const linkInput = content.querySelector(`[data-banner-link="${id}"]`);
      const orderInput = content.querySelector(`[data-banner-order="${id}"]`);
      await updateBanner(id, {
        linkUrl: linkInput.value.trim(),
        order: Number(orderInput.value) || 0,
      });
      btn.textContent = "저장됨 ✓";
      setTimeout(() => (btn.textContent = "저장"), 900);
    });
  });

  content.querySelectorAll("[data-delete-banner]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("이 배너를 삭제할까요?")) return;
      await deleteBanner(btn.dataset.deleteBanner, btn.dataset.storagePath);
      await reload();
      render();
    });
  });
}

async function init() {
  content.innerHTML = `<p class="muted">불러오는 중...</p>`;
  try {
    await reload();
    render();
  } catch (e) {
    console.error(e);
    content.innerHTML = `
      <div class="admin-card">
        <p class="muted">배너 정보를 불러오지 못했습니다. Firestore 규칙에 banners/settings 컬렉션이
        허용되어 있는지, 로그인이 되어 있는지 확인해주세요.</p>
        <p class="muted" style="margin-top:8px; font-family: ui-monospace, Consolas, monospace; font-size:12px;">${escapeHtml(e.message || String(e))}</p>
      </div>
    `;
  }
}

init();
