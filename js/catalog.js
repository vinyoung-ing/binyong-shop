import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "./firebase-init.js";

// Firestore 구조:
// categories/{categoryId}                          { name, slug, status: 'active' | 'coming_soon', order }
// categories/{categoryId}/groups/{groupId}          { name, note, order }
// categories/{categoryId}/groups/{groupId}/items/{itemId}
//                                                    { name, unitPrice, unitLabel, conditionNote, order }

export async function listCategories() {
  const q = query(collection(db, "categories"), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listGroups(categoryId) {
  const q = query(
    collection(db, "categories", categoryId, "groups"),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listItems(categoryId, groupId) {
  const q = query(
    collection(db, "categories", categoryId, "groups", groupId, "items"),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// 카테고리 하나를 그룹+항목까지 한 번에 로드 (서비스 상세 페이지용)
export async function loadCategoryFull(categoryId) {
  const groups = await listGroups(categoryId);
  const withItems = await Promise.all(
    groups.map(async (g) => ({ ...g, items: await listItems(categoryId, g.id) }))
  );
  return withItems;
}

// ---------- 관리자용 CRUD ----------

export async function createCategory(data) {
  return addDoc(collection(db, "categories"), data);
}
export async function updateCategory(categoryId, data) {
  return updateDoc(doc(db, "categories", categoryId), data);
}
export async function deleteCategory(categoryId) {
  return deleteDoc(doc(db, "categories", categoryId));
}

export async function createGroup(categoryId, data) {
  return addDoc(collection(db, "categories", categoryId, "groups"), data);
}
export async function updateGroup(categoryId, groupId, data) {
  return updateDoc(doc(db, "categories", categoryId, "groups", groupId), data);
}
export async function deleteGroup(categoryId, groupId) {
  return deleteDoc(doc(db, "categories", categoryId, "groups", groupId));
}

export async function createItem(categoryId, groupId, data) {
  return addDoc(
    collection(db, "categories", categoryId, "groups", groupId, "items"),
    data
  );
}
export async function updateItem(categoryId, groupId, itemId, data) {
  return updateDoc(
    doc(db, "categories", categoryId, "groups", groupId, "items", itemId),
    data
  );
}
export async function deleteItem(categoryId, groupId, itemId) {
  return deleteDoc(
    doc(db, "categories", categoryId, "groups", groupId, "items", itemId)
  );
}
