/* ============================================================
   CROCINI — 인터랙션 스크립트
   기능:
     1) 네비게이션 — 스크롤 시 배경 변화
     2) 모바일 햄버거 메뉴 토글
     3) 스크롤 리빌 애니메이션 (IntersectionObserver)
     4) 히어로 페이드업 — data-delay 적용
     5) 스탯 카운트업 — 숫자가 0에서 목표값까지 증가
     6) 토스트 알림 시스템
   ============================================================ */

/* ==========================================================
   토스트 알림 시스템 (전역)
   ========================================================== */
const Toast = (() => {
  let container;
  function getContainer() {
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('role', 'status');
      document.body.appendChild(container);
    }
    return container;
  }
  function show(message, type = 'info', duration = 2500) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    getContainer().appendChild(el);
    setTimeout(() => {
      el.classList.add('toast-out');
      el.addEventListener('animationend', () => el.remove());
    }, duration);
  }
  return {
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info'),
  };
})();

/* 페이지 페이드인 (visibility:hidden 대체) */
document.body.classList.add('page-fade-in');

document.addEventListener('DOMContentLoaded', () => {

  /* nav 토글 / 스크롤 / 인증 표시는 partials/nav.html의 inline script가 처리 */

  /* ==========================================================
     스크롤 리빌 — .reveal 요소가 화면에 들어오면 .visible 추가
     ========================================================== */
  const revealEls = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);  // 한 번만 트리거
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px',
  });

  revealEls.forEach((el) => revealObserver.observe(el));


  /* ==========================================================
     4) 히어로 페이드업 — data-delay 값을 animation-delay로
     ========================================================== */
  document.querySelectorAll('.fade-up').forEach((el) => {
    const delay = el.dataset.delay || 0;
    el.style.animationDelay = `${delay}ms`;
  });


  /* ==========================================================
     5) 스탯 카운트업
     - .stat-num 요소에 data-target="40", data-suffix="%" 등을 두면
       화면에 들어왔을 때 0 → 40 으로 부드럽게 증가
     ========================================================== */
  const statNums = document.querySelectorAll('.stat-num');

  /* 카운트업 함수 — 일정 시간 동안 0에서 target까지 숫자를 올림 */
  function animateCount(el) {
    const target   = parseInt(el.dataset.target, 10) || 0;
    const suffix   = el.dataset.suffix || '';
    const duration = 1800;          // 1.8초 동안 카운트업
    let startTime  = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      /* easeOutCubic 이징: 처음엔 빠르고 끝에서 부드럽게 멈춤 */
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);

      el.textContent = current + suffix;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target + suffix;   // 마지막에 정확한 값으로 고정
      }
    }
    requestAnimationFrame(step);
  }

  /* 스탯이 화면에 들어오면 카운트업 시작 */
  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCount(entry.target);
        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  statNums.forEach((el) => statObserver.observe(el));


  /* ==========================================================
     6) 문의 폼 — POST /inquiries 로 전송
     ========================================================== */
  const inquiryForm = document.getElementById('inquiryForm');
  if (inquiryForm) {
    const INQUIRY_API = '/inquiries';
    const submitBtn   = document.getElementById('inquirySubmit');
    const statusEl    = document.getElementById('inquiryStatus');

    function showStatus(msg, kind) {
      statusEl.textContent = msg;
      statusEl.classList.remove('success', 'error');
      if (kind) statusEl.classList.add(kind);
      statusEl.hidden = false;
    }

    // 로그인한 경우 이름·연락처·이메일 자동 입력
    fetch('/api/auth/me').then(async r => {
      if (!r.ok) return;
      const me = await r.json();
      if (me.name)  inquiryForm.querySelector('[name="name"]').value  = me.name;
      if (me.phone) inquiryForm.querySelector('[name="phone"]').value = me.phone;
      if (me.email) inquiryForm.querySelector('[name="email"]').value = me.email;
    }).catch(() => {});

    inquiryForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fd = new FormData(inquiryForm);
      const payload = {
        name:    (fd.get('name')    || '').trim(),
        phone:   (fd.get('phone')   || '').trim(),
        email:   (fd.get('email')   || '').trim() || null,
        message: (fd.get('message') || '').trim(),
      };

      if (!payload.name || !payload.phone || !payload.message) {
        showStatus('이름, 연락처, 문의 내용은 필수입니다.', 'error');
        return;
      }

      submitBtn.disabled = true;
      const originalText = submitBtn.textContent;
      submitBtn.textContent = '전송 중...';
      showStatus('', null);
      statusEl.hidden = true;

      try {
        const res = await fetch(INQUIRY_API, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || `서버 오류 (${res.status})`);
        }

        showStatus('문의가 정상 접수되었습니다. 곧 연락드리겠습니다.', 'success');
        Toast.success('문의가 접수되었습니다');
        inquiryForm.reset();
      } catch (err) {
        console.error('[INQUIRY] 전송 실패:', err.message);
        showStatus(err.message || '전송에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  }


  /* ==========================================================
     7) SHOP 페이지 — API 연동 + 카드 렌더링 + 필터
     ========================================================== */
  const productGrid = document.getElementById('productGrid');

  /* productGrid가 없으면 index.html — 아래 코드 전체 무시 */
  if (productGrid) {

    /* 백엔드 API 주소 (서버 주소가 바뀌면 여기만 수정) */
    const API_URL    = '/products';
    const SERVER_URL = '';

    /* image_url 이 /uploads/... 로 시작하면 절대 URL로 변환,
       이미 http로 시작하면(외부 이미지) 그대로 사용 */
    function resolveImageUrl(url) {
      if (!url) return '';
      if (url.startsWith('http://') || url.startsWith('https://')) return url;
      if (url.startsWith('/')) return SERVER_URL + url;
      return url;
    }

    const loadingState = document.getElementById('loadingState');
    const errorState   = document.getElementById('errorState');
    const emptyMessage = document.getElementById('emptyMessage');
    const filterTabs   = document.getElementById('filterTabs');
    const shopSearch   = document.getElementById('shopSearch');
    const shopSort     = document.getElementById('shopSort');

    // 원본 상품 + 현재 필터/검색/정렬 상태
    let productsData  = [];
    let currentFilter = 'all';
    let currentSearch = '';
    let currentSort   = 'latest';
    let currentPriceRanges = [];

    // 위시리스트 상태
    let isLoggedIn  = false;
    let wishlistIds = new Set();

    /* --------------------------------------------------
       가격을 "1,440,000원" 형태로 포맷하는 함수
       toLocaleString('ko-KR') 이 천 단위 콤마를 자동으로 찍어줌
    -------------------------------------------------- */
    function formatPrice(price) {
      if (price === null || price === undefined) return null;
      return Number(price).toLocaleString('ko-KR') + '원';
    }

    /* --------------------------------------------------
       상품 하나를 HTML 카드 문자열로 변환하는 함수
       - API에서 받은 상품 객체(p)를 인자로 받음
    -------------------------------------------------- */
    function createCardHTML(p) {
      /* 뱃지 HTML: null이면 빈 문자열, gold 뱃지 대상 구분 */
      const goldBadges = ['SIGNATURE', 'MADE TO ORDER'];
      const badgeHTML  = p.badge
        ? `<span class="product-badge ${goldBadges.includes(p.badge) ? 'gold' : ''}">${p.badge}</span>`
        : '';

      /* 하트 버튼 */
      const heartClass = wishlistIds.has(p.id) ? ' wishlisted' : '';
      const heartHTML  = `<button class="wishlist-btn${heartClass}" data-id="${p.id}" aria-label="찜하기">♥</button>`;

      /* 장바구니 버튼 (가격이 있는 상품만) */
      const cartBtnHTML = p.price !== null
        ? `<button class="cart-btn" data-id="${p.id}" aria-label="장바구니 담기">🛒</button>`
        : '';

      /* 가격 HTML: python처럼 price가 null이면 "주문제작 문의" 표시 */
      let priceHTML;
      if (p.price === null) {
        priceHTML = `<span class="price-inquiry">주문제작 문의</span>`;
      } else if (p.original_price) {
        priceHTML = `
          <span class="price-original">${formatPrice(p.original_price)}</span>
          <span class="price-sale">${formatPrice(p.price)}</span>`;
      } else {
        priceHTML = `<span class="price-sale">${formatPrice(p.price)}</span>`;
      }

      /* 카테고리 라벨 대문자 변환 */
      const categoryLabel = p.category.toUpperCase();

      /* 모든 상품은 상세 페이지로 이동 (product.html?id=숫자) */
      const href = `product.html?id=${p.id}`;

      return `
        <article class="product-card" data-category="${p.category}" role="article" aria-label="${p.name}">
          <a href="${href}" class="product-link">
            <div class="product-image">
              <img src="${resolveImageUrl(p.image_url)}" alt="${p.name} — ${categoryLabel} 가죽 핸드백" loading="lazy" />
              ${badgeHTML}
              ${heartHTML}
              ${cartBtnHTML}
            </div>
            <div class="product-info">
              <span class="product-category">${categoryLabel}</span>
              <h3 class="product-name">${p.name}</h3>
              <p class="product-tagline">정제된 형태의 레더 미니 백</p>
              <p class="product-option">${p.option_desc || ''}</p>
              <div class="product-price">${priceHTML}</div>
            </div>
          </a>
        </article>`;
    }

    /* --------------------------------------------------
       카테고리 + 검색 + 정렬을 모두 적용해서 그리드를 다시 그림
       (DOM 토글 대신 매번 새로 렌더 — 정렬 순서까지 깔끔하게 반영)
    -------------------------------------------------- */
    function applyFilters() {
      let list = productsData;

      if (currentFilter !== 'all') {
        list = list.filter(p => p.category === currentFilter);
      }
      if (currentSearch) {
        const q = currentSearch.toLowerCase();
        list = list.filter(p => {
          const haystack = [p.name, p.option_desc, p.description]
            .filter(Boolean).join(' ').toLowerCase();
          return haystack.includes(q);
        });
      }
      // 가격대 필터
      if (currentPriceRanges.length > 0) {
        list = list.filter(p => {
          if (p.price === null) return false;
          return currentPriceRanges.some(range => {
            const [min, max] = range.split('-').map(Number);
            if (!max && max !== 0) return p.price >= min; // "3000000-" 형태
            return p.price >= min && p.price < max;
          });
        });
      }
      // 정렬: 가격 NULL(주문제작)은 항상 뒤로 보냄
      if (currentSort === 'price-asc') {
        list = [...list].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      } else if (currentSort === 'price-desc') {
        list = [...list].sort((a, b) => (b.price ?? -Infinity) - (a.price ?? -Infinity));
      } else if (currentSort === 'name') {
        list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
      }
      // 'latest'는 API 기본 순서 그대로

      productGrid.innerHTML = list.map(createCardHTML).join('');
      if (emptyMessage) emptyMessage.hidden = list.length > 0;
    }

    // 필터 탭: event delegation (카테고리는 동적 추가되므로)
    filterTabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterTabs.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      applyFilters();
    });

    if (shopSearch) {
      shopSearch.addEventListener('input', () => {
        currentSearch = shopSearch.value.trim();
        applyFilters();
      });
    }
    if (shopSort) {
      shopSort.addEventListener('change', () => {
        currentSort = shopSort.value;
        applyFilters();
      });
    }

    // 가격대 필터
    const priceFilter = document.getElementById('priceFilter');
    if (priceFilter) {
      priceFilter.addEventListener('change', () => {
        currentPriceRanges = Array.from(priceFilter.querySelectorAll('input:checked')).map(cb => cb.value);
        applyFilters();
      });
    }

    /* --------------------------------------------------
       하트 버튼 클릭 — event delegation
    -------------------------------------------------- */
    productGrid.addEventListener('click', async (e) => {
      const btn = e.target.closest('.wishlist-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      if (!isLoggedIn) { location.href = '/login'; return; }

      const id = parseInt(btn.dataset.id, 10);
      const wishlisted = wishlistIds.has(id);

      try {
        btn.disabled = true;
        const res = await fetch(`/api/wishlist/${id}`, {
          method: wishlisted ? 'DELETE' : 'POST',
        });
        if (!res.ok) throw new Error();
        if (wishlisted) wishlistIds.delete(id);
        else            wishlistIds.add(id);
        btn.classList.toggle('wishlisted', wishlistIds.has(id));
        Toast.success(wishlisted ? '찜 목록에서 제거했습니다' : '찜 목록에 추가했습니다');
      } catch (_) {
        Toast.error('처리에 실패했습니다');
      } finally {
        btn.disabled = false;
      }
    });

    /* --------------------------------------------------
       장바구니 버튼 클릭 — event delegation
    -------------------------------------------------- */
    productGrid.addEventListener('click', async (e) => {
      const btn = e.target.closest('.cart-btn');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();

      if (!isLoggedIn) { location.href = '/login'; return; }

      const id = parseInt(btn.dataset.id, 10);
      try {
        btn.disabled = true;
        const res = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: id, quantity: 1 }),
        });
        if (!res.ok) throw new Error();
        Toast.success('장바구니에 담았습니다');
      } catch (_) {
        Toast.error('장바구니 추가에 실패했습니다');
      } finally {
        btn.disabled = false;
      }
    });

    /* --------------------------------------------------
       위시리스트 상태 초기화 — 로그인 확인 후 찜 ID 로드
    -------------------------------------------------- */
    async function loadWishlistState() {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) return;
      isLoggedIn = true;
      const idsRes = await fetch('/api/wishlist/ids');
      if (!idsRes.ok) return;
      wishlistIds = new Set(await idsRes.json());
      if (wishlistIds.size > 0) applyFilters();
    }

    /* --------------------------------------------------
       카테고리 fetch — DB에서 받아서 필터 버튼 동적 생성
       (실패 시 ALL만 남고 조용히 넘어감 — 상품은 정상 로드)
    -------------------------------------------------- */
    async function loadCategories() {
      try {
        const res = await fetch('/categories');
        if (!res.ok) return;
        const cats = await res.json();
        const html = cats.map(c =>
          `<button class="filter-btn" data-filter="${c.slug}">${c.name}</button>`
        ).join('');
        filterTabs.insertAdjacentHTML('beforeend', html);
      } catch (err) {
        console.error('[SHOP] 카테고리 로딩 실패:', err.message);
      }
    }

    /* --------------------------------------------------
       API fetch — 상품 목록 불러오기
    -------------------------------------------------- */
    async function loadProducts() {
      try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error(`서버 오류: ${response.status}`);
        productsData = await response.json();
        if (loadingState) loadingState.hidden = true;
        applyFilters();
      } catch (err) {
        console.error('[SHOP] 상품 로딩 실패:', err.message);
        if (loadingState) loadingState.hidden = true;
        if (errorState)   errorState.hidden   = false;
      }
    }

    /* 페이지 로드 시 즉시 실행 */
    loadCategories().then(loadProducts);
    loadWishlistState(); // 위시리스트 상태를 상품 로딩과 병행
  }

  /* ==========================================================
     이미지 Lazy Loading — loading="lazy" 미지원 브라우저 대응
     data-src 속성이 있는 img를 뷰포트 진입 시 로드
     ========================================================== */
  const lazyImages = document.querySelectorAll('img[data-src]');
  if (lazyImages.length > 0) {
    const lazyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
          lazyObserver.unobserve(img);
        }
      });
    }, { rootMargin: '200px' });
    lazyImages.forEach(img => lazyObserver.observe(img));
  }

});
