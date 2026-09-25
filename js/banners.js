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
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "./firebase-init.js";

// Firestore: banners/{bannerId} { imageUrl, storagePath, linkUrl, order }
// Storage:   banners/{bannerId}/{fileName}
// Firestore: settings/site { bannerIntervalSeconds }

export async function listBanners() {
  const q = query(collection(db, "banners"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function uploadBanner(file, { linkUrl = "", order = 0 } = {}) {
  // id만 먼저 로컬에서 발급받고(문서는 아직 안 씀), 그 id로 스토리지 경로를 정해 업로드한다.
  // 업로드가 성공한 뒤에만 Firestore 문서를 한 번에 쓰기 때문에,
  // Storage 업로드가 실패해도 이미지 없는 "깨진" 배너 문서가 남지 않는다.
  const docRef = doc(collection(db, "banners"));

  const storagePath = `banners/${docRef.id}/${file.name}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file);
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
