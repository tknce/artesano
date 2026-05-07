// GA4 측정 ID — Google Analytics 콘솔에서 발급받은 값으로 교체.
// placeholder("G-XXXXXXXXXX") 그대로면 트래킹 비활성.
const GA4_ID = 'G-LBB6YHX2K3';

(function () {
  if (!GA4_ID || GA4_ID === 'G-XXXXXXXXXX') return;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  gtag('config', GA4_ID, { anonymize_ip: true });
})();
