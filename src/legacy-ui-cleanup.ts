function hideLegacyLinks() {
  document.querySelectorAll<HTMLAnchorElement>('a[href="/"]').forEach((link) => {
    const text = (link.textContent ?? '').trim().toLowerCase();
    if (text.includes('2d')) link.style.display = 'none';
  });
}

hideLegacyLinks();
window.setInterval(hideLegacyLinks, 500);
