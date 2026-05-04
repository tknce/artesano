// 우클릭 방지
document.addEventListener('contextmenu', e => e.preventDefault());

// 이미지 드래그 방지
document.addEventListener('dragstart', e => {
  if (e.target.tagName === 'IMG') e.preventDefault();
});

// 키보드 단축키 방지 (저장, 소스보기, 복사, 개발자도구)
document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (e.ctrlKey && ['s', 'u', 'c', 'x', 'a'].includes(k)) e.preventDefault();
  if (e.key === 'F12') e.preventDefault();
  if (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(k)) e.preventDefault();
});
