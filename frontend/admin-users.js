// admin-users.js — 회원 관리 페이지
(async () => {
  // 인증 체크
  try {
    const check = await fetch('/api/admin/check', { credentials: 'include' });
    if (!check.ok) { location.href = '/admin-login'; return; }
  } catch (e) { location.href = '/admin-login'; return; }
  document.body.style.visibility = 'visible';

  const tbody = document.getElementById('usersTbody');
  const pager = document.getElementById('pager');
  const detailCard = document.getElementById('detailCard');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const logoutBtn = document.getElementById('btnLogout');

  let state = { page: 1, limit: 20, search: '', total: 0, selectedId: null };

  const fmt = n => (n || 0).toLocaleString('ko-KR');
  const fmtDate = s => s ? new Date(s).toLocaleDateString('ko-KR') : '-';
  const STATUS_LABEL = { pending:'결제대기', paid:'결제완료', preparing:'준비중', shipping:'배송중', delivered:'배송완료', failed:'실패', cancelled:'취소' };

  async function loadList() {
    const params = new URLSearchParams({ page: state.page, limit: state.limit, search: state.search });
    const res = await fetch(`/api/admin/users?${params}`, { credentials: 'include' });
    const data = await res.json();
    state.total = data.total;
    renderList(data.rows);
    renderPager();
  }

  function renderList(rows) {
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:40px 0;">회원이 없습니다.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => `
      <tr data-id="${r.id}" class="${r.id === state.selectedId ? 'selected' : ''}">
        <td>${r.id}</td>
        <td>${escape(r.email)}</td>
        <td>${escape(r.name)}</td>
        <td><span class="badge-type">${r.login_type}</span></td>
        <td>${fmtDate(r.created_at)}</td>
        <td>${r.order_count || 0}</td>
        <td>₩${fmt(r.total_spent)}</td>
        <td>${r.is_blocked ? '<span class="badge-blocked">차단</span>' : '정상'}</td>
      </tr>
    `).join('');
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.addEventListener('click', () => loadDetail(parseInt(tr.dataset.id, 10)));
    });
  }

  function renderPager() {
    const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
    const cur = state.page;
    const btns = [];
    btns.push(`<button ${cur===1?'disabled':''} data-p="${cur-1}">‹</button>`);
    const start = Math.max(1, cur - 2);
    const end = Math.min(totalPages, start + 4);
    for (let p = start; p <= end; p++) {
      btns.push(`<button class="${p===cur?'active':''}" data-p="${p}">${p}</button>`);
    }
    btns.push(`<button ${cur===totalPages?'disabled':''} data-p="${cur+1}">›</button>`);
    pager.innerHTML = btns.join('');
    pager.querySelectorAll('button[data-p]').forEach(b => {
      b.addEventListener('click', () => {
        const p = parseInt(b.dataset.p, 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) { state.page = p; loadList(); }
      });
    });
  }

  async function loadDetail(id) {
    state.selectedId = id;
    document.querySelectorAll('#usersTbody tr').forEach(tr => {
      tr.classList.toggle('selected', parseInt(tr.dataset.id, 10) === id);
    });
    detailCard.innerHTML = '<div class="detail-empty">불러오는 중…</div>';

    const res = await fetch(`/api/admin/users/${id}`, { credentials: 'include' });
    if (!res.ok) { detailCard.innerHTML = '<div class="detail-empty">불러오기 실패</div>'; return; }
    const { user, orders, totalSpent } = await res.json();

    detailCard.innerHTML = `
      <h3 style="margin-bottom:16px;">${escape(user.name)} <span style="color:var(--muted);font-weight:400;font-size:14px;">#${user.id}</span></h3>
      <div class="detail-row"><span>이메일</span><span>${escape(user.email)}</span></div>
      <div class="detail-row"><span>연락처</span><span>${escape(user.phone || '-')}</span></div>
      <div class="detail-row"><span>가입경로</span><span>${user.login_type}</span></div>
      <div class="detail-row"><span>가입일</span><span>${fmtDate(user.created_at)}</span></div>
      <div class="detail-row"><span>상태</span><span>${user.is_blocked ? '<span class="badge-blocked">차단됨</span>' : '정상'}</span></div>
      <div class="total-spent">누적 결제액 <strong>₩${fmt(totalSpent)}</strong> · 결제 완료 ${orders.filter(o => ['paid','preparing','shipping','delivered'].includes(o.status)).length}건</div>
      <div class="detail-actions">
        <button type="button" id="btnBlock" class="${user.is_blocked ? '' : 'danger'}">${user.is_blocked ? '차단 해제' : '차단'}</button>
        ${user.login_type === 'email' ? '<button type="button" id="btnResetPw">비밀번호 초기화</button>' : ''}
        <button type="button" id="btnDelete" class="danger">탈퇴 처리</button>
      </div>
      <div class="order-history">
        <h4>주문 이력 (${orders.length}건)</h4>
        ${orders.length ? `
        <table>
          <thead><tr><th>주문번호</th><th>상품</th><th>금액</th><th>상태</th><th>날짜</th></tr></thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td style="font-family:monospace;font-size:11px;">${o.order_id}</td>
                <td>${escape(o.product_name)}</td>
                <td>₩${fmt(o.amount)}</td>
                <td>${STATUS_LABEL[o.status] || o.status}</td>
                <td>${fmtDate(o.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>` : '<div style="color:var(--muted);padding:12px 0;">주문 내역 없음</div>'}
      </div>
    `;

    document.getElementById('btnBlock').addEventListener('click', async () => {
      const blocked = !user.is_blocked;
      const r = await fetch(`/api/admin/users/${id}/block`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocked }),
      });
      if (r.ok) { await loadList(); await loadDetail(id); }
      else alert('실패: ' + (await r.json()).error);
    });

    const resetBtn = document.getElementById('btnResetPw');
    if (resetBtn) resetBtn.addEventListener('click', async () => {
      if (!confirm(`${user.email}의 비밀번호를 초기화하시겠습니까?\n임시 비밀번호가 발급됩니다.`)) return;
      const r = await fetch(`/api/admin/users/${id}/reset-password`, { method: 'POST', credentials: 'include' });
      const data = await r.json();
      if (r.ok) prompt('임시 비밀번호 (복사해서 회원에게 전달하세요):', data.tempPassword);
      else alert('실패: ' + data.error);
    });

    document.getElementById('btnDelete').addEventListener('click', async () => {
      if (!confirm(`${user.email} 회원을 탈퇴 처리합니다.\n복구할 수 없습니다. 계속하시겠습니까?`)) return;
      const r = await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' });
      if (r.ok) {
        detailCard.innerHTML = '<div class="detail-empty">탈퇴 처리되었습니다.</div>';
        state.selectedId = null;
        await loadList();
      } else alert('실패: ' + (await r.json()).error);
    });
  }

  function escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  searchBtn.addEventListener('click', () => { state.search = searchInput.value; state.page = 1; loadList(); });
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchBtn.click(); });
  logoutBtn.addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    location.href = '/admin-login';
  });

  loadList();
})();
