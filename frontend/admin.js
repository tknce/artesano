
/* ============================================================
   유틸
   ============================================================ */
function resolveImageUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return API + url;
  return url;
}

function formatPrice(p) {
  if (p === null || p === undefined) return '<span style="color:#888">주문제작</span>';
  return Number(p).toLocaleString('ko-KR') + '원';
}

function formatDate(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}


/* ============================================================
   카테고리 (다른 섹션이 의존하므로 가장 먼저)
   ============================================================ */
const filterCategory     = document.getElementById('filterCategory');
const categoryTableBody  = document.getElementById('categoryTableBody');
const categoryAddForm    = document.getElementById('categoryAddForm');
const categoryFormStatus = document.getElementById('categoryFormStatus');
const catSlug            = document.getElementById('catSlug');
const catName            = document.getElementById('catName');

let allCategories = [];
const PROTECTED_SLUGS = new Set(['python']);
let editingCatId = null;

function enterCatEditMode(cat) {
  editingCatId = cat.id;
  catSlug.hidden = true;
  catSlug.required = false;
  catName.value = cat.name;
  document.getElementById('catSubmitBtn').textContent = '수정';
  document.getElementById('catCancelEdit').hidden = false;
  categoryFormStatus.hidden = true;
  catName.focus();
  categoryAddForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function exitCatEditMode() {
  editingCatId = null;
  catSlug.hidden = false;
  catSlug.required = true;
  catSlug.value = '';
  catName.value = '';
  document.getElementById('catSubmitBtn').textContent = '+ 추가';
  document.getElementById('catCancelEdit').hidden = true;
  categoryFormStatus.hidden = true;
}

async function loadCategories() {
  try {
    const res = await fetch('/categories');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allCategories = await res.json();
  } catch (err) {
    console.error('카테고리 로딩 실패:', err);
    allCategories = [];
  }
  syncCategoryDropdowns();
  renderCategoryTable();
}

function syncCategoryDropdowns() {
  // 1) 필터 (전체 카테고리 옵션 유지)
  filterCategory.innerHTML =
    '<option value="">전체 카테고리</option>' +
    allCategories.map(c => `<option value="${c.slug}">${escapeHtml(c.name)}</option>`).join('');
  // 2) 상품 폼 카테고리 select (선택값 보존)
  const fCat = document.getElementById('fCategory');
  if (fCat) {
    const prev = fCat.value;
    fCat.innerHTML = allCategories.map(c =>
      `<option value="${c.slug}">${escapeHtml(c.name)}</option>`
    ).join('');
    if (prev && allCategories.some(c => c.slug === prev)) fCat.value = prev;
  }
  updateCatDelButton();
}

// 모달의 "삭제" 버튼 disabled 상태 — 보호되었거나 사용 중이면 막음
function updateCatDelButton() {
  const btn  = document.getElementById('btnCatDel');
  const fCat = document.getElementById('fCategory');
  if (!btn || !fCat) return;
  const slug = fCat.value;
  const cat  = allCategories.find(c => c.slug === slug);
  if (!cat) { btn.disabled = true; btn.title = ''; return; }
  if (PROTECTED_SLUGS.has(slug)) {
    btn.disabled = true;
    btn.title = '주문제작 기능에 사용 중이라 삭제할 수 없습니다.';
    return;
  }
  const usage = allProducts.filter(p => p.category === slug).length;
  if (usage > 0) {
    btn.disabled = true;
    btn.title = `이 카테고리에 상품이 ${usage}개 있어 삭제할 수 없습니다.`;
    return;
  }
  btn.disabled = false;
  btn.title = '';
}

function renderCategoryTable() {
  if (allCategories.length === 0) {
    categoryTableBody.innerHTML = '<tr><td colspan="5" class="admin-empty">카테고리가 없습니다.</td></tr>';
    return;
  }
  categoryTableBody.innerHTML = allCategories.map((c, idx) => {
    const usage = allProducts.filter(p => p.category === c.slug).length;
    const protectedNote = PROTECTED_SLUGS.has(c.slug)
      ? '<span style="color:#888;font-size:11px;margin-left:6px">(주문제작 의존)</span>'
      : '';
    const isFirst = idx === 0;
    const isLast  = idx === allCategories.length - 1;
    return `
      <tr data-id="${c.id}">
        <td>${idx + 1}</td>
        <td><code>${escapeHtml(c.slug)}</code>${protectedNote}</td>
        <td>${escapeHtml(c.name)}</td>
        <td>${usage}</td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn-edit"   data-action="cat-up"     data-id="${c.id}" ${isFirst ? 'disabled' : ''}>▲</button>
            <button type="button" class="btn-edit"   data-action="cat-down"   data-id="${c.id}" ${isLast  ? 'disabled' : ''}>▼</button>
            <button type="button" class="btn-edit"   data-action="cat-edit"   data-id="${c.id}">이름</button>
            <button type="button" class="btn-danger" data-action="cat-delete" data-id="${c.id}">삭제</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

document.getElementById('catCancelEdit').addEventListener('click', exitCatEditMode);

categoryAddForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  categoryFormStatus.hidden = true;

  // 수정 모드
  if (editingCatId) {
    const name = catName.value.trim();
    try {
      const res = await fetch(`/categories/${editingCatId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `서버 오류 (${res.status})`);
      exitCatEditMode();
      await loadCategories();
    } catch (err) {
      categoryFormStatus.textContent = err.message;
      categoryFormStatus.className = 'form-status error';
      categoryFormStatus.hidden = false;
    }
    return;
  }

  // 추가 모드
  const slug = catSlug.value.trim().toLowerCase();
  const name = catName.value.trim();
  const sort_order = allCategories.length > 0
    ? Math.max(...allCategories.map(c => c.sort_order)) + 1
    : 1;
  try {
    const res = await fetch('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, name, sort_order }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `서버 오류 (${res.status})`);
    catSlug.value = '';
    catName.value = '';
    await loadCategories();
  } catch (err) {
    categoryFormStatus.textContent = err.message;
    categoryFormStatus.className = 'form-status error';
    categoryFormStatus.hidden = false;
  }
});

categoryTableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id  = parseInt(btn.dataset.id, 10);
  const cat = allCategories.find(c => c.id === id);
  if (!cat) return;

  if (btn.dataset.action === 'cat-up' || btn.dataset.action === 'cat-down') {
    const idx = allCategories.findIndex(c => c.id === id);
    const isUp = btn.dataset.action === 'cat-up';
    const otherIdx = isUp ? idx - 1 : idx + 1;
    if (otherIdx < 0 || otherIdx >= allCategories.length) return;
    const curr  = allCategories[idx];
    const other = allCategories[otherIdx];
    try {
      await Promise.all([
        fetch(`/categories/${curr.id}`,  { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: other.sort_order }) }),
        fetch(`/categories/${other.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: curr.sort_order  }) }),
      ]);
      await loadCategories();
    } catch (err) {
      alert('순서 변경 실패: ' + err.message);
    }
    return;
  }

  if (btn.dataset.action === 'cat-edit') {
    enterCatEditMode(cat);
    return;
  }

  if (btn.dataset.action === 'cat-delete') {
    if (!confirm(`카테고리 '${cat.name}' (slug: ${cat.slug})를 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/categories/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await loadCategories();
    } catch (err) {
      alert('삭제 실패: ' + err.message);
    }
  }
});


/* ============================================================
   상품 목록
   ============================================================ */
const productTableBody = document.getElementById('productTableBody');
const productCount     = document.getElementById('productCount');

let allProducts = [];

async function loadProducts() {
  productTableBody.innerHTML = '<tr><td colspan="7" class="admin-loading">불러오는 중...</td></tr>';
  try {
    const res = await fetch(`/products`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allProducts = await res.json();
    renderProducts();
    renderCategoryTable();   // 상품 수 카운트 갱신
    syncPurchaseProductSelect(); // 구매 확인 폼 상품 목록 갱신
  } catch (err) {
    console.error('상품 로딩 실패:', err);
    productTableBody.innerHTML = `<tr><td colspan="7" class="admin-loading">불러오기 실패: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderProducts() {
  const cat = filterCategory.value;
  const list = cat ? allProducts.filter(p => p.category === cat) : allProducts;

  productCount.textContent = `${list.length} 개`;

  if (list.length === 0) {
    productTableBody.innerHTML = '<tr><td colspan="7" class="admin-empty">상품이 없습니다.</td></tr>';
    return;
  }

  productTableBody.innerHTML = list.map(p => {
    const goldBadges = ['SIGNATURE', 'MADE TO ORDER'];
    const isGold = p.badge && goldBadges.includes(p.badge);

    let priceHtml;
    if (p.price === null) {
      priceHtml = '<span style="color:#888">주문제작</span>';
    } else if (p.original_price) {
      priceHtml = `<span class="price-strike">${formatPrice(p.original_price)}</span><span class="price-main">${formatPrice(p.price)}</span>`;
    } else {
      priceHtml = `<span class="price-main">${formatPrice(p.price)}</span>`;
    }

    return `
      <tr data-id="${p.id}">
        <td>${p.id}</td>
        <td><img src="${escapeHtml(resolveImageUrl(p.image_url))}" alt="" /></td>
        <td>
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div style="font-size:12px;color:#888;margin-top:2px;">${escapeHtml(p.option_desc || '')}</div>
        </td>
        <td><span class="cat-pill ${p.category}">${p.category}</span></td>
        <td>${priceHtml}</td>
        <td>${p.badge ? `<span class="badge-pill ${isGold?'gold':''}">${escapeHtml(p.badge)}</span>` : '-'}</td>
        <td>
          <div class="row-actions">
            <button type="button" class="btn-edit"   data-action="edit"   data-id="${p.id}">수정</button>
            <button type="button" class="btn-danger" data-action="delete" data-id="${p.id}">삭제</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

filterCategory.addEventListener('change', renderProducts);

productTableBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const id     = parseInt(btn.dataset.id, 10);
  const action = btn.dataset.action;
  if (action === 'edit')   openProductModal(id);
  if (action === 'delete') deleteProduct(id);
});


/* ============================================================
   상품 모달 (등록 / 수정)
   ============================================================ */
const modal           = document.getElementById('productModal');
const modalTitle      = document.getElementById('modalTitle');
const modalClose      = document.getElementById('modalClose');
const btnNew          = document.getElementById('btnNewProduct');
const btnCancel       = document.getElementById('btnCancel');
const productForm     = document.getElementById('productForm');
const fId             = document.getElementById('productId');
const fName           = document.getElementById('fName');
const fCategory       = document.getElementById('fCategory');
const fOptionDesc     = document.getElementById('fOptionDesc');
const fDescription    = document.getElementById('fDescription');
const fMaterialInfo   = document.getElementById('fMaterialInfo');
const fPrice          = document.getElementById('fPrice');
const fOriginalPrice  = document.getElementById('fOriginalPrice');
const fBadge          = document.getElementById('fBadge');
const fCustomOrder    = document.getElementById('fCustomOrder');
const fImageFile      = document.getElementById('fImageFile');
const fImageUrl       = document.getElementById('fImageUrl');
const fImagePreview   = document.getElementById('fImagePreview');
const fImageClear     = document.getElementById('fImageClear');
const formStatus      = document.getElementById('formStatus');
const btnSubmit       = document.getElementById('btnSubmit');
const detailImagesField  = document.getElementById('detailImagesField');
const detailImgList      = document.getElementById('detailImgList');
const fDetailImage       = document.getElementById('fDetailImage');
const galleryImagesField = document.getElementById('galleryImagesField');
const galleryImgList     = document.getElementById('galleryImgList');
const fGalleryImage      = document.getElementById('fGalleryImage');

// 모달 카테고리 미니 컨트롤
const btnCatNew         = document.getElementById('btnCatNew');
const btnCatDel         = document.getElementById('btnCatDel');
const catNewInline      = document.getElementById('catNewInline');
const catNewSlug        = document.getElementById('catNewSlug');
const catNewName        = document.getElementById('catNewName');
const btnCatNewSubmit   = document.getElementById('btnCatNewSubmit');
const btnCatNewCancel   = document.getElementById('btnCatNewCancel');
const catInlineStatus   = document.getElementById('catInlineStatus');

fCategory.addEventListener('change', updateCatDelButton);

btnCatNew.addEventListener('click', () => {
  catNewInline.hidden = false;
  catInlineStatus.hidden = true;
  catNewSlug.focus();
});

btnCatNewCancel.addEventListener('click', () => {
  catNewInline.hidden = true;
  catNewSlug.value = '';
  catNewName.value = '';
  catInlineStatus.hidden = true;
});

btnCatNewSubmit.addEventListener('click', async () => {
  catInlineStatus.hidden = true;
  const slug = catNewSlug.value.trim().toLowerCase();
  const name = catNewName.value.trim();
  if (!slug || !name) {
    catInlineStatus.textContent = 'slug와 표시 이름을 모두 입력하세요.';
    catInlineStatus.className = 'form-status error';
    catInlineStatus.hidden = false;
    return;
  }
  try {
    const nextOrder = allCategories.length > 0
      ? Math.max(...allCategories.map(c => c.sort_order)) + 1
      : 1;
    const res = await fetch('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, name, sort_order: nextOrder }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    await loadCategories();
    fCategory.value = slug;
    updateCatDelButton();
    catNewSlug.value = '';
    catNewName.value = '';
    catNewInline.hidden = true;
  } catch (err) {
    catInlineStatus.textContent = err.message;
    catInlineStatus.className = 'form-status error';
    catInlineStatus.hidden = false;
  }
});

btnCatDel.addEventListener('click', async () => {
  const slug = fCategory.value;
  const cat  = allCategories.find(c => c.slug === slug);
  if (!cat) return;
  if (!confirm(`카테고리 '${cat.name}' (slug: ${cat.slug}) 을(를) 삭제하시겠습니까?`)) return;
  try {
    const res  = await fetch(`/categories/${cat.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    await loadCategories();
  } catch (err) {
    alert('삭제 실패: ' + err.message);
  }
});

// 이미지 목록 렌더 (공통)
function renderImageList(listEl, images) {
  listEl.innerHTML = images.map(img => `
    <div class="detail-img-item" data-img-id="${img.id}">
      <img src="${img.image_url}" alt="" />
      <button type="button" class="detail-img-del" data-img-id="${img.id}">×</button>
    </div>
  `).join('');
}

// 이미지 삭제 (두 리스트 공통)
function attachDeleteHandler(listEl) {
  listEl.addEventListener('click', async (e) => {
    const btn = e.target.closest('.detail-img-del');
    if (!btn) return;
    const imgId = btn.dataset.imgId;
    const productId = fId.value;
    if (!confirm('이 이미지를 삭제하시겠습니까?')) return;
    await fetch(`/products/${productId}/detail-images/${imgId}`, { method: 'DELETE' });
    btn.closest('.detail-img-item').remove();
  });
}
attachDeleteHandler(detailImgList);
attachDeleteHandler(galleryImgList);

// 이미지 업로드 (type별)
async function uploadImagesWithType(files, type, listEl) {
  const productId = fId.value;
  if (!productId) return;
  for (const file of files) {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('image_type', type);
    const res = await fetch(`/products/${productId}/detail-images`, { method: 'POST', body: fd });
    if (res.ok) {
      const img = await res.json();
      const item = document.createElement('div');
      item.className = 'detail-img-item';
      item.dataset.imgId = img.id;
      item.innerHTML = `<img src="${img.image_url}" alt="" /><button type="button" class="detail-img-del" data-img-id="${img.id}">×</button>`;
      listEl.appendChild(item);
    }
  }
}

fDetailImage.addEventListener('change', async () => {
  const files = Array.from(fDetailImage.files);
  if (files.length === 0) return;
  await uploadImagesWithType(files, 'detail', detailImgList);
  fDetailImage.value = '';
});

fGalleryImage.addEventListener('change', async () => {
  const files = Array.from(fGalleryImage.files);
  if (files.length === 0) return;
  await uploadImagesWithType(files, 'gallery', galleryImgList);
  fGalleryImage.value = '';
});

function updateImageClearBtn() {
  fImageClear.hidden = !fImagePreview.getAttribute('src');
}

function openProductModal(id) {
  productForm.reset();
  fImagePreview.removeAttribute('src');
  updateImageClearBtn();
  formStatus.hidden = true;

  // 카테고리 인라인 추가 폼은 항상 닫힌 상태로 시작
  catNewInline.hidden = true;
  catInlineStatus.hidden = true;
  catNewSlug.value = '';
  catNewName.value = '';

  detailImgList.innerHTML  = '';
  galleryImgList.innerHTML = '';
  detailImagesField.hidden  = true;
  galleryImagesField.hidden = true;

  if (id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    modalTitle.textContent = `상품 수정 — #${p.id}`;
    fId.value             = p.id;
    fName.value           = p.name;
    fCategory.value       = p.category;
    updateCatDelButton();
    fOptionDesc.value     = p.option_desc || '';
    fDescription.value    = p.description || '';
    fMaterialInfo.value   = p.material_info || '';
    fPrice.value          = p.price ?? '';
    fOriginalPrice.value  = p.original_price ?? '';
    fBadge.value          = p.badge || '';
    fCustomOrder.value    = p.is_custom_order ? '1' : '0';
    if (p.image_url) {
      fImagePreview.src = resolveImageUrl(p.image_url);
      if (p.image_url.startsWith('http')) fImageUrl.value = p.image_url;
    }
    updateImageClearBtn();
    // 이미지 로드 (갤러리 + 상세)
    galleryImagesField.hidden = false;
    detailImagesField.hidden  = false;
    fetch(`/products/${p.id}/detail-images?type=gallery`)
      .then(r => r.json())
      .then(imgs => renderImageList(galleryImgList, imgs))
      .catch(() => {});
    fetch(`/products/${p.id}/detail-images?type=detail`)
      .then(r => r.json())
      .then(imgs => renderImageList(detailImgList, imgs))
      .catch(() => {});
  } else {
    modalTitle.textContent = '새 상품 등록';
    fId.value = '';
    updateCatDelButton();
  }

  modal.hidden = false;
}

function closeProductModal() {
  modal.hidden = true;
}

btnNew.addEventListener('click', () => openProductModal(null));
modalClose.addEventListener('click', closeProductModal);
btnCancel.addEventListener('click', closeProductModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeProductModal(); });

// 파일 선택 시 미리보기
fImageFile.addEventListener('change', () => {
  const file = fImageFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => { fImagePreview.src = e.target.result; updateImageClearBtn(); };
  reader.readAsDataURL(file);
});

// 외부 URL 입력 시 미리보기
fImageUrl.addEventListener('input', () => {
  const url = fImageUrl.value.trim();
  if (url && !fImageFile.files[0] && /^https?:\/\//i.test(url)) {
    fImagePreview.src = url;
    updateImageClearBtn();
  }
});

// X 버튼 — 미리보기 제거 (저장 안 하면 기존 이미지 유지, 파일/URL 새로 넣으면 교체)
fImageClear.addEventListener('click', () => {
  fImagePreview.removeAttribute('src');
  fImageFile.value = '';
  fImageUrl.value  = '';
  updateImageClearBtn();
});

// 폼 제출 — 등록 or 수정
productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  formStatus.hidden = true;
  btnSubmit.disabled = true;
  const originalText = btnSubmit.textContent;
  btnSubmit.textContent = '저장 중...';

  try {
    const id = fId.value ? parseInt(fId.value, 10) : null;

    // FormData 사용 → 이미지 첨부와 일반 필드를 한 번에 보냄
    const fd = new FormData();
    fd.append('name',            fName.value.trim());
    fd.append('category',        fCategory.value);
    fd.append('option_desc',     fOptionDesc.value.trim());
    fd.append('description',     fDescription.value.trim());
    fd.append('material_info',   fMaterialInfo.value.trim());
    fd.append('price',           fPrice.value);
    fd.append('original_price',  fOriginalPrice.value);
    fd.append('badge',           fBadge.value.trim());
    fd.append('is_custom_order', fCustomOrder.value);

    if (fImageFile.files[0]) {
      fd.append('image', fImageFile.files[0]);
    } else if (fImageUrl.value.trim()) {
      fd.append('image_url', fImageUrl.value.trim());
    }

    const url    = id ? `/products/${id}` : `/products`;
    const method = id ? 'PUT' : 'POST';

    const res  = await fetch(url, { method, body: fd });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || `서버 오류 (${res.status})`);

    formStatus.textContent = id ? '수정되었습니다.' : '등록되었습니다.';
    formStatus.className = 'form-status success';
    formStatus.hidden = false;

    await loadProducts();
    setTimeout(closeProductModal, 600);
  } catch (err) {
    console.error('저장 실패:', err);
    formStatus.textContent = err.message || '저장에 실패했습니다.';
    formStatus.className = 'form-status error';
    formStatus.hidden = false;
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = originalText;
  }
});


/* ============================================================
   상품 삭제
   ============================================================ */
async function deleteProduct(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`'${p.name}' 상품을 정말 삭제하시겠습니까?\n(이미지 파일도 같이 삭제됩니다)`)) return;

  try {
    const res = await fetch(`/products/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || `HTTP ${res.status}`);
    }
    await loadProducts();
  } catch (err) {
    alert('삭제 실패: ' + err.message);
  }
}


/* ============================================================
   문의 목록
   ============================================================ */
const inquiryTableBody    = document.getElementById('inquiryTableBody');
const btnRefreshInquiries = document.getElementById('btnRefreshInquiries');

async function loadInquiries() {
  inquiryTableBody.innerHTML = '<tr><td colspan="8" class="admin-loading">불러오는 중...</td></tr>';
  try {
    const res = await fetch(`/inquiries`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();

    if (list.length === 0) {
      inquiryTableBody.innerHTML = '<tr><td colspan="8" class="admin-empty">접수된 문의가 없습니다.</td></tr>';
      return;
    }

    inquiryTableBody.innerHTML = list.map(q => `
      <tr>
        <td>${q.id}</td>
        <td><span class="status-pill ${q.status}">${q.status}</span></td>
        <td>${escapeHtml(q.name)}</td>
        <td>${escapeHtml(q.phone)}</td>
        <td>${escapeHtml(q.email || '-')}</td>
        <td class="inquiry-message">${escapeHtml(q.message)}</td>
        <td style="font-size:12px;color:#666;">${formatDate(q.created_at)}</td>
        <td>
          <button type="button" class="btn-danger" data-action="delete-inquiry" data-id="${q.id}">삭제</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('문의 로딩 실패:', err);
    inquiryTableBody.innerHTML = `<tr><td colspan="8" class="admin-loading">불러오기 실패: ${escapeHtml(err.message)}</td></tr>`;
  }
}

btnRefreshInquiries.addEventListener('click', loadInquiries);

inquiryTableBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action="delete-inquiry"]');
  if (!btn) return;
  deleteInquiry(parseInt(btn.dataset.id, 10));
});

async function deleteInquiry(id) {
  if (!confirm(`문의 #${id}를 정말 삭제하시겠습니까?`)) return;
  try {
    const res = await fetch(`/inquiries/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || `HTTP ${res.status}`);
    }
    await loadInquiries();
  } catch (err) {
    alert('삭제 실패: ' + err.message);
  }
}


/* ============================================================
   구매 확인 관리
   ============================================================ */
const purchaseTableBody  = document.getElementById('purchaseTableBody');
const purchaseAddForm    = document.getElementById('purchaseAddForm');
const purchaseFormStatus = document.getElementById('purchaseFormStatus');
const purchaseProductSel = document.getElementById('purchaseProductId');

function syncPurchaseProductSelect() {
  const prev = purchaseProductSel.value;
  purchaseProductSel.innerHTML =
    '<option value="">상품 선택</option>' +
    allProducts.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  if (prev) purchaseProductSel.value = prev;
}

async function loadPurchases() {
  purchaseTableBody.innerHTML = '<tr><td colspan="6" class="admin-loading">불러오는 중...</td></tr>';
  try {
    const res = await fetch('/purchases');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();
    if (list.length === 0) {
      purchaseTableBody.innerHTML = '<tr><td colspan="6" class="admin-empty">구매 확인 내역이 없습니다.</td></tr>';
      return;
    }
    purchaseTableBody.innerHTML = list.map(r => `
      <tr>
        <td>${r.id}</td>
        <td>${escapeHtml(r.user_email)}<br /><span style="font-size:11px;color:#888">${escapeHtml(r.user_name)}</span></td>
        <td>#${r.product_id} ${escapeHtml(r.product_name)}</td>
        <td>${escapeHtml(r.note || '—')}</td>
        <td style="font-size:12px;color:#666;">${formatDate(r.created_at)}</td>
        <td>
          <button type="button" class="btn-danger" data-action="delete-purchase" data-id="${r.id}">삭제</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    purchaseTableBody.innerHTML = `<tr><td colspan="6" class="admin-loading">불러오기 실패: ${escapeHtml(err.message)}</td></tr>`;
  }
}

purchaseAddForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  purchaseFormStatus.hidden = true;
  try {
    const res = await fetch('/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:     document.getElementById('purchaseEmail').value.trim(),
        productId: purchaseProductSel.value,
        note:      document.getElementById('purchaseNote').value.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `서버 오류 (${res.status})`);
    purchaseAddForm.reset();
    await loadPurchases();
  } catch (err) {
    purchaseFormStatus.textContent = err.message;
    purchaseFormStatus.className = 'form-status error';
    purchaseFormStatus.hidden = false;
  }
});

purchaseTableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action="delete-purchase"]');
  if (!btn) return;
  if (!confirm('구매 확인 내역을 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`/purchases/${btn.dataset.id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    await loadPurchases();
  } catch {
    alert('삭제 실패');
  }
});

document.getElementById('btnRefreshPurchases').addEventListener('click', loadPurchases);


/* ============================================================
   주문 관리 (결제 주문)
   ============================================================ */
const orderTableBody     = document.getElementById('orderTableBody');
const orderCount         = document.getElementById('orderCount');
const filterOrderStatus  = document.getElementById('filterOrderStatus');
const orderModal         = document.getElementById('orderModal');
const orderModalBody     = document.getElementById('orderModalBody');
const orderModalId       = document.getElementById('orderModalId');

const STATUS_LABEL_KR = {
  pending: '결제대기', paid: '결제완료', preparing: '배송준비',
  shipping: '배송중', delivered: '배송완료',
  failed: '실패', cancelled: '취소',
};

const CARRIERS = {
  cj:     'CJ대한통운',
  hanjin: '한진택배',
  lotte:  '롯데택배',
  epost:  '우체국택배',
  logen:  '로젠택배',
};

let allOrders = [];

async function loadOrders() {
  orderTableBody.innerHTML = '<tr><td colspan="8" class="admin-loading">불러오는 중...</td></tr>';
  try {
    const res = await fetch('/api/orders');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allOrders = await res.json();
    renderOrders();
  } catch (err) {
    orderTableBody.innerHTML = `<tr><td colspan="8" class="admin-loading">불러오기 실패: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function renderOrders() {
  const filter = filterOrderStatus.value;
  const list = filter ? allOrders.filter(o => o.status === filter) : allOrders;
  orderCount.textContent = `${list.length} 건`;

  if (list.length === 0) {
    orderTableBody.innerHTML = '<tr><td colspan="8" class="admin-empty">주문이 없습니다.</td></tr>';
    return;
  }

  orderTableBody.innerHTML = list.map(o => {
    const dateStr = o.paid_at ? formatDate(o.paid_at) : `<span style="color:#aaa">${formatDate(o.created_at)}</span>`;
    return `
      <tr data-id="${o.id}">
        <td>${o.id}</td>
        <td><span class="status-pill ${o.status}">${STATUS_LABEL_KR[o.status] || o.status}</span></td>
        <td><code style="font-size:11px;color:#666">${escapeHtml(o.order_id)}</code></td>
        <td>${escapeHtml(o.customer_name)}<br /><span style="font-size:11px;color:#888">${escapeHtml(o.customer_phone || '')}</span></td>
        <td>${escapeHtml(o.product_name)}</td>
        <td>${formatPrice(o.amount)}</td>
        <td style="font-size:12px;">${dateStr}</td>
        <td>
          <button type="button" class="btn-edit" data-action="order-detail" data-id="${o.id}">상세</button>
        </td>
      </tr>`;
  }).join('');
}

filterOrderStatus.addEventListener('change', renderOrders);
document.getElementById('btnRefreshOrders').addEventListener('click', loadOrders);

orderTableBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action="order-detail"]');
  if (!btn) return;
  openOrderModal(parseInt(btn.dataset.id, 10));
});

function openOrderModal(id) {
  const o = allOrders.find(x => x.id === id);
  if (!o) return;

  orderModalId.textContent = `#${o.id}`;
  const addr = [o.shipping_postal, o.shipping_address1, o.shipping_address2].filter(Boolean).join(' ');

  orderModalBody.innerHTML = `
    <div style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:13px;line-height:1.7;">
      <div style="color:#888">주문번호</div><div><code>${escapeHtml(o.order_id)}</code></div>
      <div style="color:#888">상태</div><div><span class="status-pill ${o.status}">${STATUS_LABEL_KR[o.status]}</span></div>
      <div style="color:#888">상품</div><div>${escapeHtml(o.product_name)}</div>
      <div style="color:#888">금액</div><div>${formatPrice(o.amount)}</div>
      <div style="color:#888">결제일</div><div>${o.paid_at ? formatDate(o.paid_at) : '—'}</div>
      <div style="color:#888">결제키</div><div style="font-size:11px;word-break:break-all;">${escapeHtml(o.payment_key || '—')}</div>
      <div style="color:#888;border-top:1px solid #eee;padding-top:12px;">고객</div><div style="border-top:1px solid #eee;padding-top:12px;">${escapeHtml(o.customer_name)}</div>
      <div style="color:#888">연락처</div><div>${escapeHtml(o.customer_phone)}</div>
      <div style="color:#888">이메일</div><div>${escapeHtml(o.customer_email || '—')} ${o.user_email ? `<span style="color:#aaa">(가입: ${escapeHtml(o.user_email)})</span>` : ''}</div>
      <div style="color:#888">배송지</div><div>${escapeHtml(addr || '—')}</div>
      <div style="color:#888">요청사항</div><div>${escapeHtml(o.shipping_request || '—')}</div>
    </div>

    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #eee;">
      <p style="font-size:12px;color:#888;margin-bottom:10px;">상태 변경 / 배송 정보</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
        <select id="omStatus" style="padding:8px 10px;font-size:13px;">
          ${Object.entries(STATUS_LABEL_KR).map(([k,v]) =>
            `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
        <select id="omCarrier" style="padding:8px 10px;font-size:13px;">
          <option value="">택배사 선택</option>
          ${Object.entries(CARRIERS).map(([k,v]) =>
            `<option value="${k}" ${o.shipping_carrier === k ? 'selected' : ''}>${v}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <input type="text" id="omTracking" placeholder="송장번호" maxlength="100"
               value="${escapeHtml(o.tracking_number || '')}" style="flex:1;padding:8px 10px;font-size:13px;" />
        <button type="button" class="btn-primary" id="omSaveBtn">저장</button>
      </div>
      <p class="form-status" id="omStatusMsg" hidden style="margin-top:8px;"></p>
    </div>

    ${o.status === 'paid' || o.status === 'preparing' || o.status === 'shipping' ? `
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid #eee;">
        <p style="font-size:12px;color:#888;margin-bottom:10px;">결제 취소 / 환불</p>
        <button type="button" class="btn-danger" id="omCancelBtn">결제 취소 + 환불 처리</button>
        <p style="font-size:11px;color:#aaa;margin-top:8px;">토스페이먼츠 환불 + 후기 권한 회수가 함께 처리됩니다.</p>
      </div>
    ` : ''}
  `;

  document.getElementById('omSaveBtn').addEventListener('click', async () => {
    const status   = document.getElementById('omStatus').value;
    const tracking = document.getElementById('omTracking').value.trim();
    const carrier  = document.getElementById('omCarrier').value;
    const msg      = document.getElementById('omStatusMsg');
    msg.hidden = true;
    try {
      const res = await fetch(`/api/orders/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, tracking_number: tracking, shipping_carrier: carrier }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '저장 실패');
      msg.textContent = '저장되었습니다.';
      msg.className = 'form-status success';
      msg.hidden = false;
      await loadOrders();
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'form-status error';
      msg.hidden = false;
    }
  });

  const cancelBtn = document.getElementById('omCancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', async () => {
      const reason = prompt('취소 사유를 입력해주세요 (선택):', '');
      if (reason === null) return;
      if (!confirm('정말 결제를 취소하고 환불 처리하시겠습니까?\n토스에서 실제 환불이 진행됩니다.')) return;
      cancelBtn.disabled = true;
      try {
        const res = await fetch(`/api/orders/${id}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || '취소 실패');
        alert('결제가 취소되었습니다.');
        closeOrderModal();
        await loadOrders();
      } catch (err) {
        alert('취소 실패: ' + err.message);
        cancelBtn.disabled = false;
      }
    });
  }

  orderModal.hidden = false;
}

function closeOrderModal() { orderModal.hidden = true; }

document.getElementById('orderModalClose').addEventListener('click', closeOrderModal);
orderModal.addEventListener('click', (e) => { if (e.target === orderModal) closeOrderModal(); });


/* ============================================================
   후기 관리
   ============================================================ */
const reviewTableBody    = document.getElementById('reviewTableBody');
const btnRefreshReviews  = document.getElementById('btnRefreshReviews');

async function loadReviews() {
  reviewTableBody.innerHTML = '<tr><td colspan="7" class="admin-loading">불러오는 중...</td></tr>';
  try {
    const res = await fetch('/reviews');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();

    if (list.length === 0) {
      reviewTableBody.innerHTML = '<tr><td colspan="7" class="admin-empty">작성된 후기가 없습니다.</td></tr>';
      return;
    }

    reviewTableBody.innerHTML = list.map(r => {
      const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
      return `
        <tr>
          <td>${r.id}</td>
          <td style="color:var(--accent);letter-spacing:1px;">${stars}</td>
          <td>#${r.product_id} ${escapeHtml(r.product_name)}</td>
          <td>${escapeHtml(r.user_name)}<br /><span style="font-size:11px;color:#888">${escapeHtml(r.user_email)}</span></td>
          <td class="inquiry-message">${escapeHtml(r.comment || '—')}</td>
          <td style="font-size:12px;color:#666;">${formatDate(r.created_at)}</td>
          <td>
            <button type="button" class="btn-danger" data-action="delete-review" data-id="${r.id}">삭제</button>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    reviewTableBody.innerHTML = `<tr><td colspan="7" class="admin-loading">불러오기 실패: ${escapeHtml(err.message)}</td></tr>`;
  }
}

btnRefreshReviews.addEventListener('click', loadReviews);

reviewTableBody.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-action="delete-review"]');
  if (!btn) return;
  if (!confirm('후기를 삭제하시겠습니까?')) return;
  try {
    const res = await fetch(`/reviews/${btn.dataset.id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    await loadReviews();
  } catch {
    alert('삭제 실패');
  }
});


/* ============================================================
   사이트 콘텐츠 (소재정보 / 케어가이드 / 교환환불)
   ============================================================ */
const CONTENT_FIELD_MAP = {
  material_info: 'contentMaterial',
  care_guide:    'contentCare',
  refund_policy: 'contentRefund',
};

async function loadSiteContent() {
  try {
    const res = await fetch('/api/content');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    Object.entries(CONTENT_FIELD_MAP).forEach(([key, elId]) => {
      const el = document.getElementById(elId);
      if (el) el.value = data[key] || '';
    });
  } catch (err) {
    console.error('사이트 콘텐츠 로드 실패:', err);
  }
}

document.querySelectorAll('button[data-content-key]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const key   = btn.dataset.contentKey;
    const elId  = CONTENT_FIELD_MAP[key];
    const value = document.getElementById(elId).value;
    const msg   = document.querySelector(`[data-content-status="${key}"]`);
    msg.hidden = true;
    btn.disabled = true;
    try {
      const res = await fetch(`/api/content/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      msg.textContent = '저장되었습니다.';
      msg.className = 'form-status success';
      msg.hidden = false;
      setTimeout(() => { msg.hidden = true; }, 2000);
    } catch (err) {
      msg.textContent = err.message;
      msg.className = 'form-status error';
      msg.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
});


/* ============================================================
   로그아웃
   ============================================================ */
document.getElementById('btnLogout').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  location.replace('/admin-login');
});

/* ============================================================
   초기 로드 (세션 확인 후)
   ============================================================ */
(async function init() {
  try {
    const r = await fetch('/api/admin/check');
    if (!r.ok) { location.replace('/admin-login.html'); return; }
  } catch {
    location.replace('/admin-login');
    return;
  }
  document.body.style.visibility = 'visible';
  await loadCategories(); // 상품 폼 select가 비어있으면 안되므로 먼저
  loadProducts();
  loadOrders();
  loadPurchases();
  loadReviews();
  loadInquiries();
  loadSiteContent();
  loadCoupons();
})();

/* ============================================================
   쿠폰 관리
   ============================================================ */
async function loadCoupons() {
  const tbody = document.getElementById('couponsTbody');
  try {
    const res = await fetch('/api/coupons');
    if (!res.ok) { tbody.innerHTML = '<tr><td colspan="7">로딩 실패</td></tr>'; return; }
    const coupons = await res.json();
    if (coupons.length === 0) { tbody.innerHTML = '<tr><td colspan="7">등록된 쿠폰이 없습니다.</td></tr>'; return; }
    const fmt = n => Number(n).toLocaleString('ko-KR');
    tbody.innerHTML = coupons.map(c => {
      const val = c.discount_type === 'percent' ? `${c.discount_value}%` : `${fmt(c.discount_value)}원`;
      const expires = c.expires_at ? new Date(c.expires_at).toLocaleDateString('ko-KR') : '없음';
      const uses = `${c.used_count}${c.max_uses ? '/' + c.max_uses : ''}`;
      const active = c.is_active ? '<span style="color:#2d7a4f">활성</span>' : '<span style="color:#c0392b">비활성</span>';
      return `<tr><td><code>${c.code}</code></td><td>${c.discount_type}</td><td>${val}</td><td>${fmt(c.min_order_amount)}원</td><td>${uses}</td><td>${expires}</td><td>${active}</td></tr>`;
    }).join('');
  } catch { tbody.innerHTML = '<tr><td colspan="7">오류 발생</td></tr>'; }
}

document.getElementById('cpCreateBtn').addEventListener('click', async () => {
  const statusEl = document.getElementById('cpStatus');
  const code = document.getElementById('cpCode').value.trim().toUpperCase();
  const discount_type = document.getElementById('cpType').value;
  const discount_value = parseInt(document.getElementById('cpValue').value, 10);
  if (!code || !discount_value) { statusEl.textContent = '코드와 할인 값을 입력해주세요'; statusEl.className = 'form-status error'; statusEl.hidden = false; return; }

  const body = {
    code, discount_type, discount_value,
    min_order_amount: parseInt(document.getElementById('cpMinOrder').value, 10) || 0,
    max_discount: parseInt(document.getElementById('cpMaxDiscount').value, 10) || null,
    expires_at: document.getElementById('cpExpires').value || null,
    max_uses: parseInt(document.getElementById('cpMaxUses').value, 10) || null,
  };

  const res = await fetch('/api/coupons', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (res.ok) {
    statusEl.textContent = `쿠폰 "${code}" 생성 완료`;
    statusEl.className = 'form-status success';
    statusEl.hidden = false;
    document.getElementById('cpCode').value = '';
    document.getElementById('cpValue').value = '';
    loadCoupons();
  } else {
    statusEl.textContent = data.error || '생성 실패';
    statusEl.className = 'form-status error';
    statusEl.hidden = false;
  }
});

// ============================================================
// 고객 운영 서브탭 (구매확인 / 쿠폰 / 후기 / 문의)
// ============================================================
(function initSubTabs() {
  const subTabs = document.querySelectorAll('.sub-tab');
  const subSections = document.querySelectorAll('.customer-ops .sub-section');
  if (!subTabs.length) return;

  const SUB_IDS = ['purchases', 'coupons', 'reviews', 'inquiries'];

  function activate(targetId) {
    subTabs.forEach(t => t.classList.toggle('active', t.dataset.target === targetId));
    subSections.forEach(s => s.classList.toggle('active', s.id === targetId));
  }

  subTabs.forEach(t => {
    t.addEventListener('click', () => {
      const id = t.dataset.target;
      activate(id);
      history.replaceState(null, '', '#' + id);
    });
  });

  // URL 해시가 서브탭이면 해당 탭 활성화 + 부모 #customer-ops로 스크롤
  function applyHash() {
    const hash = location.hash.replace('#', '');
    if (SUB_IDS.includes(hash)) {
      activate(hash);
      document.getElementById('customer-ops')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  applyHash();
  window.addEventListener('hashchange', applyHash);
})();
