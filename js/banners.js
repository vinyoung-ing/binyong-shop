import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "./firebase-init.js";

// Firestore: banners/{bannerId} { imageData(data URL), linkUrl, order }
// Firestore: settings/site { bannerIntervalSeconds, heroTitle }
//
// 무료 요금제에서는 Firebase Storage를 쓸 수 없어서, 업로드 전에 이미지를 압축해
// 배너 문서 안에 바로 저장한다. 문서 하나는 최대 1MB라 여유를 두고 이 길이 이하로 줄인다.
const MAX_DATA_URL_LENGTH = 900_000;

// 큰 해상도·높은 화질부터 시도해서 크기 안에 들어오는 첫 결과를 쓴다.
const ENCODE_ATTEMPTS = [
  [1600, 0.82],
  [1600, 0.72],
  [1400, 0.66],
  [1200, 0.6],
  [1000, 0.55],
  [800, 0.5],
];

export async function listBanners() {
  const q = query(collection(db, "banners"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, ...data, imageUrl: data.imageData || data.imageUrl || "" };
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function encodeImage(file) {
  // 움짤은 다시 그리면 애니메이션이 사라지므로 그대로 넣되, 크기만 확인한다.
  if (file.type === "image/gif") {
    const url = await blobToDataUrl(file);
    if (url.length > MAX_DATA_URL_LENGTH) {
      throw new Error(`"${file.name}" GIF가 너무 커요. 650KB 이하로 줄여서 올려주세요.`);
    }
    return url;
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    throw new Error(
      `"${file.name}"은(는) 브라우저에서 열 수 없는 이미지 형식이에요(HEIC 등). JPG 또는 PNG로 저장한 뒤 다시 올려주세요.`
    );
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  for (const [maxDim, quality] of ENCODE_ATTEMPTS) {
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    ctx.fillStyle = "#fff"; // 투명 PNG를 JPEG로 바꿀 때 배경이 검게 되지 않도록
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= MAX_DATA_URL_LENGTH) return url;
  }
  throw new Error(`"${file.name}"을(를) 충분히 줄이지 못했어요. 더 작은 이미지로 올려주세요.`);
}

export async function uploadBanner(file, { linkUrl = "", order = 0 } = {}) {
  const imageData = await encodeImage(file);
  const ref = doc(collection(db, "banners"));
  await setDoc(ref, { imageData, linkUrl, order });
  return ref.id;
}

export async function updateBanner(bannerId, data) {
  return updateDoc(doc(db, "banners", bannerId), data);
}

export async function deleteBanner(bannerId) {
  return deleteDoc(doc(db, "banners", bannerId));
}

export async function getSiteSettings() {
  const snap = await getDoc(doc(db, "settings", "site"));
  return snap.exists() ? snap.data() : {};
}

export async function updateSiteSettings(data) {
  return setDoc(doc(db, "settings", "site"), data, { merge: true });
}
