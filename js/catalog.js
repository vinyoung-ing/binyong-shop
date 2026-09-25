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
// Firestore는 문서를 지워도 하위 컬렉션이 남으므로 그룹 → 항목까지 직접 지운다.
export async function deleteCategory(categoryId) {
  const groups = await listGroups(categoryId);
  await Promise.all(groups.map((g) => deleteGroup(categoryId, g.id)));
  return deleteDoc(doc(db, "categories", categoryId));
}

export async function createGroup(categoryId, data) {
  return addDoc(collection(db, "categories", categoryId, "groups"), data);
}
export async function updateGroup(categoryId, groupId, data) {
  return updateDoc(doc(db, "categories", categoryId, "groups", groupId), data);
}
export async function deleteGroup(categoryId, groupId) {
  const items = await listItems(categoryId, groupId);
  await Promise.all(items.map((it) => deleteItem(categoryId, groupId, it.id)));
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

// "샤면 0.05", "문평 0.14 (토끼 0.01)", "봄버드알 20개 0.75" 한 줄을 항목으로 바꾼다.
// 줄 끝(괄호 비고 앞)의 마지막 숫자를 단가로 본다. 가격이 없는 줄이면 null.
export function parsePriceLine(line) {
  const m = line.trim().match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*(?:\((.+)\))?\s*$/);
  if (!m) return null;
  return { name: m[1].trim(), unitPrice: Number(m[2]), conditionNote: m[3] ? `(${m[3].trim()})` : "" };
}

// 항목만 여러 줄 붙여넣을 때(한 그룹 안에 일괄 추가).
export function parsePriceLines(text) {
  const items = [];
  const errors = [];
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const item = parsePriceLine(line);
      if (item) items.push(item);
      else errors.push(line);
    });
  return { items, errors };
}

// 가격표 전체를 통째로 붙여넣을 때(그룹까지 자동 생성).
// - 가격이 있는 줄 → 항목
// - 가격 없이 띄어쓰기 없는 짧은 줄(예: "챕터1", "올클") → 새 그룹 제목
// - 그 밖의 가격 없는 줄(예: "* 화염, 번개는 따로 추가") → 현재 그룹의 안내문
export function parsePriceSheet(text) {
  const groups = [];
  const errors = [];
  let current = null;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;

    const item = parsePriceLine(line);
    if (item) {
      if (!current) {
        current = { name: "기본", note: "", items: [] };
        groups.push(current);
      }
      current.items.push(item);
    } else if (!/\s/.test(line) && line.length <= 12 && !/^[*※(]/.test(line)) {
      current = { name: line, note: "", items: [] };
      groups.push(current);
    } else if (current) {
      current.note = current.note ? `${current.note} ${line}` : line;
    } else {
      errors.push(line);
    }
  }

  return { groups: groups.filter((g) => g.items.length || g.note), errors };
}
