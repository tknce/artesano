const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary URL에 자동 포맷(f_auto)·자동 화질(q_auto) 변환 삽입.
// /upload/ 직후에 transformation을 끼워 넣음. 이미 변환이 있으면 그대로 둠.
function optimize(url) {
  if (!url || typeof url !== 'string') return url;
  if (!url.includes('res.cloudinary.com')) return url;
  if (/\/upload\/[^/]*[fq]_[^/]+\//.test(url)) return url; // 이미 f_/q_ 변환 있음
  return url.replace('/upload/', '/upload/f_auto,q_auto/');
}

module.exports = cloudinary;
module.exports.optimize = optimize;
