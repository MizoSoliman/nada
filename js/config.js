// =============================================
//  CONFIG — غيّر السطر ده بس لما ترفع الـ API
// =============================================
const API_BASE = "http://clublywebsite.runasp.net";

// Helper مركزي للصور
function resolveUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : API_BASE + url;
}
