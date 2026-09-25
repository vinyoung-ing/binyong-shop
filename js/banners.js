import {
  db,
  storage,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
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
  // 1) 문서를 먼저 만들어서 id를 받고, 2) 그 id로 스토리지 경로를 정한다.
  const docRef = await addDoc(collection(db, "banners"), {
    imageUrl: "",
    storagePath: "",
    linkUrl,
    order,
  });

  const storagePath = `banners/${docRef.id}/${file.name}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file);
  const imageUrl = await getDownloadURL(fileRef);

  await updateDoc(docRef, { imageUrl, storagePath });
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
