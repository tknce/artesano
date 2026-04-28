/* ============================================================
   admin.js — CROCINI 관리자 페이지
   기능:
     1) 상품 목록 조회 + 카테고리 필터
     2) 상품 등록 (이미지 업로드 또는 외부 URL)
     3) 상품 수정 (이미지 교체 가능)
     4) 상품 삭제
     5) 문의 목록 조회
   ============================================================ */

const API = 'http://localhost:3000';

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
   상품 목록
   ============================================================ */
const productTableBody = document.getElementById('productTableBody');
const productCount     = document.getElementById('productCount');
const filterCategory   = document.getElementById('filterCategory');

let allProducts = [];

async function loadProducts() {
  productTableBody.innerHTML = '<tr><td colspan="7" class="admin-loading">불러오는 중...</td></tr>';
  try {
    const res = await fetch(`${API}/products`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allProducts = await res.json();
    renderProducts();
  } catch (err) {
    console.error('상품 로딩 실패:', err);
    productTableBody.innerHTML = `<tr><td colspan="7" class="admin-loading">불러오기 실패: ${err.message}</td></tr>`;
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
const fPrice          = document.getElementById('fPrice');
const fOriginalPrice  = document.getElementById('fOriginalPrice');
const fBadge          = document.getElementById('fBadge');
const fCustomOrder    = document.getElementById('fCustomOrder');
const fImageFile      = document.getElementById('fImageFile');
const fImageUrl       = document.getElementById('fImageUrl');
const fImagePreview   = document.getElementById('fImagePreview');
const formStatus      = document.getElementById('formStatus');
const btnSubmit       = document.getElementById('btnSubmit');

function openProductModal(id) {
  productForm.reset();
  fImagePreview.removeAttribute('src');
  formStatus.hidden = true;

  if (id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    modalTitle.textContent = `상품 수정 — #${p.id}`;
    fId.value             = p.id;
    fName.value           = p.name;
    fCategory.value       = p.category;
    fOptionDesc.value     = p.option_desc || '';
    fPrice.value          = p.price ?? '';
    fOriginalPrice.value  = p.original_price ?? '';
    fBadge.value          = p.badge || '';
    fCustomOrder.value    = p.is_custom_order ? '1' : '0';
    if (p.image_url) {
      fImagePreview.src = resolveImageUrl(p.image_url);
      // 외부 URL 이면 details 영역에도 채워둠
      if (p.image_url.startsWith('http')) fImageUrl.value = p.image_url;
    }
  } else {
    modalTitle.textContent = '새 상품 등록';
    fId.value = '';
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
  if (fImageUrl.value && !fImageFile.files[0]) {
    fImagePreview.src = fImageUrl.value;
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
    fd.append('price',           fPrice.value);
    fd.append('original_price',  fOriginalPrice.value);
    fd.append('badge',           fBadge.value.trim());
    fd.append('is_custom_order', fCustomOrder.value);

    if (fImageFile.files[0]) {
      fd.append('image', fImageFile.files[0]);
    } else if (fImageUrl.value.trim()) {
      fd.append('image_url', fImageUrl.value.trim());
    }

    const url    = id ? `${API}/products/${id}` : `${API}/products`;
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
    const res = await fetch(`${API}/products/${id}`, { method: 'DELETE' });
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
  inquiryTableBody.innerHTML = '<tr><td colspan="7" class="admin-loading">불러오는 중...</td></tr>';
  try {
    const res = await fetch(`${API}/inquiries`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();

    if (list.length === 0) {
      inquiryTableBody.innerHTML = '<tr><td colspan="7" class="admin-empty">접수된 문의가 없습니다.</td></tr>';
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
      </tr>
    `).join('');
  } catch (err) {
    console.error('문의 로딩 실패:', err);
    inquiryTableBody.innerHTML = `<tr><td colspan="7" class="admin-loading">불러오기 실패: ${err.message}</td></tr>`;
  }
}

btnRefreshInquiries.addEventListener('click', loadInquiries);


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
  customOrderTableBody.innerHTML = '<tr><td colspan="8" class="admin-loading">불러오는 중...</td></tr>';
  try {
    const res = await fetch(`${API}/custom-orders`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const list = await res.json();

    if (list.length === 0) {
      customOrderTableBody.innerHTML = '<tr><td colspan="8" class="admin-empty">접수된 주문제작이 없습니다.</td></tr>';
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
        </tr>`;
    }).join('');
  } catch (err) {
    console.error('주문제작 로딩 실패:', err);
    customOrderTableBody.innerHTML = `<tr><td colspan="8" class="admin-loading">불러오기 실패: ${err.message}</td></tr>`;
  }
}

btnRefreshCustomOrders.addEventListener('click', loadCustomOrders);


/* ============================================================
   초기 로드
   ============================================================ */
loadProducts();
loadInquiries();
loadCustomOrders();
