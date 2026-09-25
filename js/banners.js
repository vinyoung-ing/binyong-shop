import {
  db,
  storage,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "./firebase-init.js";

// Firestore: banners/{bannerId} { imageUrl, storagePath, linkUrl, order }
// Storage:   banners/{bannerId}/banner.jpg
// Firestore: settings/site { bannerIntervalSeconds }

const MAX_DIMENSION = 1600; // 배너는 이보다 큰 해상도가 필요 없어서 업로드 전에 줄인다.
const JPEG_QUALITY = 0.82;

export async function listBanners() {
  const q = query(collection(db, "banners"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

const DISPLAYABLE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// 큰 사진을 그대로 올리면 업로드가 오래 걸리므로, 캔버스로 리사이즈+압축한 뒤 올린다.
// (원본이 이미 작으면 그대로 둔다.)
async function compressImage(file) {
  if (file.type === "image/gif") {
    return file; // 움짤은 리사이즈하면 애니메이션이 깨지므로 그대로 둔다.
  }

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) {
    // 브라우저가 디코딩조차 못하는 형식(iPhone HEIC 등)이면 업로드는 되어도
    // 배너로는 안 뜨는 "올라갔는데 안 보이는" 상태가 되므로 여기서 바로 막는다.
    if (!DISPLAYABLE_TYPES.includes(file.type)) {
      throw new Error(
        `"${file.name}"은(는) 브라우저에서 표시할 수 없는 이미지 형식입니다(HEIC 등). JPG 또는 PNG로 저장한 뒤 다시 업로드해주세요.`
      );
    }
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  if (scale >= 1 && file.size <= 400 * 1024) {
    // 이미 충분히 작으면 리사이즈할 필요 없음
    return file;
  }

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY)
  );

  return blob && blob.size < file.size ? blob : file;
}

export async function uploadBanner(file, { linkUrl = "", order = 0, onProgress } = {}) {
  // id만 먼저 로컬에서 발급받고(문서는 아직 안 씀), 그 id로 스토리지 경로를 정해 업로드한다.
  // 업로드가 성공한 뒤에만 Firestore 문서를 한 번에 쓰기 때문에,
  // Storage 업로드가 실패해도 이미지 없는 "깨진" 배너 문서가 남지 않는다.
  const docRef = doc(collection(db, "banners"));

  const uploadFile = await compressImage(file);
  const ext = uploadFile.type === "image/jpeg" ? "jpg" : file.name.split(".").pop();
  const storagePath = `banners/${docRef.id}/banner.${ext}`;
  const fileRef = ref(storage, storagePath);

  await new Promise((resolve, reject) => {
    const task = uploadBytesResumable(fileRef, uploadFile);
    task.on(
      "state_changed",
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      resolve
    );
  });

  const imageUrl = await getDownloadURL(fileRef);
  await setDoc(docRef, { imageUrl, storagePath, linkUrl, order });
  return docRef.id;
}

export async function updateBanner(bannerId, data) {
  return updateDoc(doc(db, "banners", bannerId), data);
}

export async function deleteBanner(bannerId, storagePath) {
  if (storagePath) {
    try {
      await deleteObject(ref(storage, storagePath));
    } catch (e) {
      console.warn("배너 이미지 파일 삭제 실패(무시하고 계속):", e);
    }
  }
  return deleteDoc(doc(db, "banners", bannerId));
}

export async function getSiteSettings() {
  const snap = await getDoc(doc(db, "settings", "site"));
  return snap.exists() ? snap.data() : {};
}

export async function updateSiteSettings(data) {
  return setDoc(doc(db, "settings", "site"), data, { merge: true });
}
