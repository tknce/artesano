(async () => {
  const navMenu = document.getElementById('navMenu');
  if (!navMenu) return;

  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const { name } = await res.json();
      const mypage = document.createElement('a');
      mypage.href = '/mypage';
      mypage.textContent = name;
      mypage.className = 'nav-auth-link';
      navMenu.appendChild(mypage);
    } else {
      const login = document.createElement('a');
      login.href = '/login';
      login.textContent = '로그인';
      login.className = 'nav-auth-link';
      navMenu.appendChild(login);
    }
  } catch {
    // 네트워크 오류 시 조용히 실패
  }
})();
