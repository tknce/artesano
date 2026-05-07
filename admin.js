
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
        <td>${c.id}</td>
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

categoryAddForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  categoryFormStatus.hidden = true;
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
    const newName = prompt(`카테고리 표시 이름:`, cat.name);
    if (newName === null || !newName.trim()) return;
    try {
      const res = await fetch(`/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      await loadCategories();
    } catch (err) {
      alert('수정 실패: ' + err.message);
    }
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
    renderCategoryTable(); // 상품 수 카운트 갱신
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
const fPrice          = document.getElementById('fPrice');
const fOriginalPrice  = document.getElementById('fOriginalPrice');
const fBadge          = document.getElementById('fBadge');
const fCustomOrder    = document.getElementById('fCustomOrder');
const fImageFile      = document.getElementById('fImageFile');
const fImageUrl       = document.getElementById('fImageUrl');
const fImagePreview   = document.getElementById('fImagePreview');
const formStatus      = document.getElementById('formStatus');
const btnSubmit       = document.getElementById('btnSubmit');
const detailImagesField = document.getElementById('detailImagesField');
const detailImgList     = document.getElementById('detailImgList');
const fDetailImage      = document.getElementById('fDetailImage');

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

// 상세 이미지 목록 렌더
function renderDetailImages(images) {
  detailImgList.innerHTML = images.map(img => `
    <div class="detail-img-item" data-img-id="${img.id}">
      <img src="${img.image_url}" alt="" />
      <button type="button" class="detail-img-del" data-img-id="${img.id}">×</button>
    </div>
  `).join('');
}

// 상세 이미지 삭제
detailImgList.addEventListener('click', async (e) => {
  const btn = e.target.closest('.detail-img-del');
  if (!btn) return;
  const imgId = btn.dataset.imgId;
  const productId = fId.value;
  if (!confirm('이 이미지를 삭제하시겠습니까?')) return;
  await fetch(`/products/${productId}/detail-images/${imgId}`, { method: 'DELETE' });
  btn.closest('.detail-img-item').remove();
});

// 상세 이미지 추가
fDetailImage.addEventListener('change', async () => {
  const file = fDetailImage.files[0];
  if (!file) return;
  const productId = fId.value;
  if (!productId) return;
  const fd = new FormData();
  fd.append('image', file);
  const res = await fetch(`/products/${productId}/detail-images`, { method: 'POST', body: fd });
  if (res.ok) {
    const img = await res.json();
    const item = document.createElement('div');
    item.className = 'detail-img-item';
    item.dataset.imgId = img.id;
    item.innerHTML = `<img src="${img.image_url}" alt="" /><button type="button" class="detail-img-del" data-img-id="${img.id}">×</button>`;
    detailImgList.appendChild(item);
  }
  fDetailImage.value = '';
});

function openProductModal(id) {
  productForm.reset();
  fImagePreview.removeAttribute('src');
  formStatus.hidden = true;

  // 카테고리 인라인 추가 폼은 항상 닫힌 상태로 시작
  catNewInline.hidden = true;
  catInlineStatus.hidden = true;
  catNewSlug.value = '';
  catNewName.value = '';

  detailImgList.innerHTML = '';
  detailImagesField.hidden = true;

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
    fPrice.value          = p.price ?? '';
    fOriginalPrice.value  = p.original_price ?? '';
    fBadge.value          = p.badge || '';
    fCustomOrder.value    = p.is_custom_order ? '1' : '0';
    if (p.image_url) {
      fImagePreview.src = resolveImageUrl(p.image_url);
      if (p.image_url.startsWith('http')) fImageUrl.value = p.image_url;
    }
    // 상세 이미지 로드
    detailImagesField.hidden = false;
    fetch(`/products/${p.id}/detail-images`)
      .then(r => r.json())
      .then(imgs => renderDetailImages(imgs))
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
  reader.onload = (e) => fImagePreview.src = e.target.result;
  reader.readAsDataURL(file);
});

// 외부 URL 입력 시 미리보기
fImageUrl.addEventListener('input', () => {
  const url = fImageUrl.value.trim();
  if (url && !fImageFile.files[0] && /^https?:\/\//i.test(url)) {
    fImagePreview.src = url;
  }
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
   주문제작 목록 (Python 전용)
   ============================================================ */
const customOrderTableBody  = document.getElementById('customOrderTableBody');
const btnRefreshCustomOrders = document.getElementById('btnRefreshCustomOrders');

const HARDWARE_LABEL = {
  gold:        'Gold',
  silver:      'Silver',
  matte_black: 'Matte Black',
};

async function loadCustomOrders() {
  customOrderTableBody.innerHTML = '<tr><td colspan="9" class="admin-loading">불러오는 중...</td></tr>';
  try {
    const res = await fetch(`/custom-orders`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();

    if (list.length === 0) {
      customOrderTableBody.innerHTML = '<tr><td colspan="9" class="admin-empty">접수된 주문제작이 없습니다.</td></tr>';
      return;
    }

    customOrderTableBody.innerHTML = list.map(o => {
      // 옵션 요약 (가죽/하드웨어/안감/이니셜/예산)
      const opts = [];
      if (o.leather_color) opts.push(`가죽: ${escapeHtml(o.leather_color)}`);
      if (o.hardware)      opts.push(`하드웨어: ${escapeHtml(HARDWARE_LABEL[o.hardware] || o.hardware)}`);
      if (o.lining_color)  opts.push(`안감: ${escapeHtml(o.lining_color)}`);
      if (o.initials)      opts.push(`이니셜: ${escapeHtml(o.initials)}`);
      if (o.budget_range)  opts.push(`예산: ${escapeHtml(o.budget_range)}`);
      if (o.desired_lead_time) opts.push(`납기: ${escapeHtml(o.desired_lead_time)}`);
      const optsHtml = opts.length > 0
        ? `<div style="font-size:12px;line-height:1.6;">${opts.join('<br />')}</div>`
        : '<span style="color:#aaa">-</span>';

      const modelHtml = o.product_code
        ? `<span class="badge-pill">${escapeHtml(o.product_code)}</span>`
        : '<span style="color:#aaa">-</span>';

      return `
        <tr>
          <td>${o.id}</td>
          <td><span class="status-pill ${o.status}">${o.status}</span></td>
          <td>${modelHtml}</td>
          <td>${escapeHtml(o.name)}</td>
          <td>${escapeHtml(o.phone)}<br /><span style="font-size:11px;color:#888">${escapeHtml(o.email || '')}</span></td>
          <td>${optsHtml}</td>
          <td class="inquiry-message">${escapeHtml(o.message || '-')}</td>
          <td style="font-size:12px;color:#666;">${formatDate(o.created_at)}</td>
          <td>
            <button type="button" class="btn-danger" data-action="delete-custom-order" data-id="${o.id}">삭제</button>
          </td>
        </tr>`;
    }).join('');
  } catch (err) {
    console.error('주문제작 로딩 실패:', err);
    customOrderTableBody.innerHTML = `<tr><td colspan="9" class="admin-loading">불러오기 실패: ${escapeHtml(err.message)}</td></tr>`;
  }
}

btnRefreshCustomOrders.addEventListener('click', loadCustomOrders);

customOrderTableBody.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-action="delete-custom-order"]');
  if (!btn) return;
  deleteCustomOrder(parseInt(btn.dataset.id, 10));
});

async function deleteCustomOrder(id) {
  if (!confirm(`주문제작 #${id}를 정말 삭제하시겠습니까?`)) return;
  try {
    const res = await fetch(`/custom-orders/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      throw new Error(d.error || `HTTP ${res.status}`);
    }
    await loadCustomOrders();
  } catch (err) {
    alert('삭제 실패: ' + err.message);
  }
}


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
  loadInquiries();
  loadCustomOrders();
})();
