// The office is in Central Time, independent of the visitor's device timezone.
export function officeMessage(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const value = (key: string) => parts.find(part => part.type === key)?.value || '';
  const minutes = Number(value('hour')) * 60 + Number(value('minute'));
  const schedule: Record<string, [number, number]> = { Mon: [540, 960], Tue: [540, 960], Wed: [540, 1020], Thu: [540, 960] };
  const today = schedule[value('weekday')];
  const isThursdayLunch = value('weekday') === 'Thu' && minutes >= 780 && minutes < 840;
  return today && minutes >= today[0] && minutes < today[1] && !isThursdayLunch
    ? 'Within office hours · Call to plan your visit'
    : 'Outside office hours · Please call Mon–Thu during office hours';
}
const updateHours = () => document.querySelectorAll('[data-office-status]').forEach(el => { el.textContent = officeMessage(); });
updateHours();
setInterval(updateHours, 60000);

// An allowlist prevents arbitrary URL text from becoming page content.
const keyword = new URLSearchParams(location.search).get('kw');
const headlines: Record<string, string> = {
  cleaning: 'Dental cleanings in La Porte, IN. A fresh start for your smile.',
  general: 'Your general dentist in La Porte, IN. Care that feels personal.',
  appointment: 'Your dentist appointment in La Porte, IN starts with a call.',
};
const headline = document.getElementById('landing-headline');
if (keyword && headlines[keyword] && headline) headline.textContent = headlines[keyword];

// Keep campaign parameters in the URL, including when viewing the privacy notice.
// No copy of the visitor's attribution is persisted in local/session storage.
const attribution = new URLSearchParams();
for (const [key, value] of new URLSearchParams(location.search)) {
  if (/^utm_(source|medium|campaign|term|content|id)$/.test(key) || ['gclid', 'gbraid', 'wbraid', 'kw'].includes(key)) attribution.set(key, value);
}
for (const link of document.querySelectorAll<HTMLAnchorElement>('[data-privacy-link]')) {
  const target = new URL(link.href); target.search = attribution.toString(); link.href = target.href;
}

type Gtag = (...args: unknown[]) => void;
declare global { interface Window { dataLayer: unknown[]; gtag?: Gtag; } }
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
const gaId = import.meta.env.PUBLIC_LANDING_GA4_ID || '';
const adsId = import.meta.env.PUBLIC_LANDING_ADS_ID || '';
const clickLabel = import.meta.env.PUBLIC_LANDING_ADS_CLICK_LABEL || '';
const callLabel = import.meta.env.PUBLIC_LANDING_ADS_CALL_LABEL || '';
const validGa = /^G-[A-Z0-9]+$/.test(gaId);
const validAds = /^AW-\d+$/.test(adsId);
if (validGa || validAds) {
  window.gtag('js', new Date());
  if (validGa) window.gtag('config', gaId);
  if (validAds) window.gtag('config', adsId);
  if (validAds && callLabel) {
    window.gtag('config', `${adsId}/${callLabel}`, {
      phone_conversion_number: '(219) 362-3730',
      phone_conversion_callback: (formatted: string, mobile: string) => {
        // Update the visible number AND every dial target, including the sticky bar.
        const digits = mobile.replace(/\D/g, '');
        if (!/^\d{10,15}$/.test(digits)) return;
        document.querySelectorAll('[data-phone-number]').forEach(el => { el.textContent = formatted; });
        document.querySelectorAll<HTMLAnchorElement>('[data-call-cta]').forEach(el => { el.href = `tel:+${digits}`; });
      },
    });
  }
  const tag = document.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${validGa ? gaId : adsId}`;
  document.head.appendChild(tag);
}

document.addEventListener('click', event => {
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-call-cta]') : null;
  if (!link) return;
  const details = { cta_location: link.dataset.callCta, page_path: location.pathname, link_url: link.getAttribute('href'), transport_type: 'beacon' };
  window.dataLayer.push({ event: 'phone_call_click', ...details });
  if (validGa) window.gtag?.('event', 'phone_call_click', { ...details, send_to: gaId });
  if (validAds && clickLabel) window.gtag?.('event', 'conversion', { send_to: `${adsId}/${clickLabel}`, ...details });
  // Do not delay or prevent dialing, even when Google scripts are blocked.
});
