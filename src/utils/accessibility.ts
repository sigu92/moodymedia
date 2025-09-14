export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  try {
    const region = document.createElement('div');
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.style.position = 'absolute';
    region.style.left = '-10000px';
    region.style.width = '1px';
    region.style.height = '1px';
    region.style.overflow = 'hidden';
    region.textContent = message;
    document.body.appendChild(region);
    window.setTimeout(() => {
      if (document.body.contains(region)) {
        document.body.removeChild(region);
      }
    }, 1000);
  } catch (_) {
    // no-op
  }
}


