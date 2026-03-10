const API_BASE = "http://clublywebsite.runasp.net";
function resolveUrl(url) {
  if (!url) return '';
  return url.startsWith('http') ? url : API_BASE + url;
}
