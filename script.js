/* ============================================================
   CROCINI — 인터랙션 스크립트
   기능:
     1) 네비게이션 — 스크롤 시 배경 변화
     2) 모바일 햄버거 메뉴 토글
     3) 스크롤 리빌 애니메이션 (IntersectionObserver)
     4) 히어로 페이드업 — data-delay 적용
     5) 스탯 카운트업 — 숫자가 0에서 목표값까지 증가
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================
     1) 네비게이션 — 스크롤 시 .scrolled 추가
        + 모바일: 다운 스크롤 시 .nav-hidden 추가, 업 스크롤 시 제거
     ========================================================== */
  const navbar = document.getElementById('navbar');
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    const currentY = window.scrollY;

    if (currentY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');

    // 메뉴 열린 상태에서는 숨기지 않음
    const menuOpen = navbar.querySelector('.nav-menu')?.classList.contains('open');

    // 맨 위 부근(80px 이내)이면 항상 표시
    if (currentY < 80 || menuOpen) {
      navbar.classList.remove('nav-hidden');
    } else if (currentY > lastScrollY + 5) {
      // 다운 스크롤 (5px 이상) — 숨김
      navbar.classList.add('nav-hidden');
    } else if (currentY < lastScrollY - 5) {
      // 업 스크롤 — 표시
      navbar.classList.remove('nav-hidden');
    }

    lastScrollY = currentY;
  }, { passive: true });


  /* ==========================================================
     2) 모바일 햄버거 메뉴 토글
     ========================================================== */
  const hamburger = document.getElementById('hamburger');
  const navMenu   = document.getElementById('navMenu');

  hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('open');
  });

  /* 메뉴 항목 클릭 시 자동 닫기 */
  navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navMenu.classList.remove('open');
    });
  });


  /* ==========================================================
     3) 스크롤 리빌 — .reveal 요소가 화면에 들어오면 .visible 추가
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
    const filterBtns   = document.querySelectorAll('.filter-btn');

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
        <article class="product-card" data-category="${p.category}">
          <a href="${href}" class="product-link">
            <div class="product-image">
              <img src="${resolveImageUrl(p.image_url)}" alt="${p.name}" loading="lazy" />
              ${badgeHTML}
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
       필터 로직 (카드가 렌더링된 후 호출됨)
    -------------------------------------------------- */
    function initFilters() {
      filterBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const filter = btn.dataset.filter;

          filterBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');

          const cards = productGrid.querySelectorAll('.product-card');
          let visibleCount = 0;

          cards.forEach((card) => {
            const matches = filter === 'all' || card.dataset.category === filter;
            card.classList.toggle('hidden', !matches);
            if (matches) visibleCount++;
          });

          if (emptyMessage) emptyMessage.hidden = visibleCount > 0;
        });
      });
    }

    /* --------------------------------------------------
       API fetch — 상품 목록 불러오기
    -------------------------------------------------- */
    async function loadProducts() {
      try {
        /* fetch(): 브라우저 내장 HTTP 요청 함수 */
        const response = await fetch(API_URL);

        /* HTTP 오류 응답(404, 500 등) 처리 */
        if (!response.ok) {
          throw new Error(`서버 오류: ${response.status}`);
        }

        const products = await response.json();  // JSON → 배열로 변환

        /* 로딩 스피너 숨기기 */
        if (loadingState) loadingState.hidden = true;

        /* 카드 HTML 생성 후 그리드에 한번에 삽입 */
        productGrid.innerHTML = products.map(createCardHTML).join('');

        /* 카드가 다 그려진 후에 필터 이벤트 연결 */
        initFilters();

      } catch (err) {
        /* 네트워크 오류 or 서버 꺼져 있을 때 */
        console.error('[SHOP] 상품 로딩 실패:', err.message);
        if (loadingState) loadingState.hidden = true;
        if (errorState)   errorState.hidden   = false;
      }
    }

    /* 페이지 로드 시 즉시 실행 */
    loadProducts();
  }

});
