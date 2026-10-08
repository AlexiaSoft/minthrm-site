import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const html = read('../index.html');
const terms = read('../terms.html');
const privacy = read('../privacy.html');
const css = read('../assets/css/styles.css');
const js = read('../assets/js/main.js');
const sitemap = read('../sitemap.xml');
const robots = read('../robots.txt');
const pricing = html.match(/<section[^>]*id="pricing"[^>]*>[\s\S]*?<\/section>/)?.[0] ?? '';
const table = pricing.match(/<table class="hrm-comparison">[\s\S]*?<\/table>/)?.[0] ?? '';
const faq = html.match(/<section[^>]*id="faq"[^>]*>[\s\S]*?<\/section>/)?.[0] ?? '';
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
assert.equal(new Set(ids).size, ids.length, 'IDs are unique');
for (const [, target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target), `#${target} resolves`);
for (const [, asset] of html.matchAll(/(?:src|href)="(assets\/[^"?#]+)/g)) {
  assert.ok(existsSync(new URL(`../${asset}`, import.meta.url)), `${asset} exists`);
}
assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
assert.match(html, /rel="canonical"/);
assert.equal([...html.matchAll(/<link rel="canonical"/g)].length, 1, 'homepage has one canonical');
assert.match(html, /<title>[^<]*MintHRM[^<]*<\/title>/, 'homepage title includes MintHRM');
assert.match(html, /<meta name="description"\s+content="[^"]+"\s*\/>/, 'homepage description exists');
assert.match(html, /<meta property="og:title"\s+content="[^"]+"\s*\/>/);
assert.match(html, /<meta property="og:description"\s+content="[^"]+"\s*\/>/);
assert.match(html, /<meta property="og:type" content="website"\s*\/>/);
assert.match(html, /<meta property="og:locale" content="th_TH"\s*\/>/);
assert.match(html, /<meta property="og:url" content="https:\/\/minthrm\.alexiasoft\.co\/"\s*\/>/);
assert.match(html, /<meta name="twitter:card" content="summary"\s*\/>/);
assert.match(html, /<meta name="twitter:title" content="[^"]+"\s*\/>/);
assert.match(html, /<meta name="twitter:description"\s+content="[^"]+"\s*\/>/);
const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(([, block]) => JSON.parse(block));
assert.ok(jsonLdBlocks.length > 0, 'JSON-LD exists and parses');
const schemaTypes = jsonLdBlocks.flatMap((block) => block['@graph']?.map((entity) => entity['@type']) ?? [block['@type']]);
assert.ok(['Organization', 'WebSite', 'SoftwareApplication'].every((type) => schemaTypes.includes(type)));
assert.ok(schemaTypes.includes('FAQPage'), 'visible FAQ has structured data');
const faqSchema = jsonLdBlocks.find((block) => block['@type'] === 'FAQPage');
const visibleFaq = [...faq.matchAll(/<details>([\s\S]*?)<\/details>/g)].map(([, details]) => {
  const question = details.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? '';
  const answer = details.match(/<p>([\s\S]*?)<\/p>/)?.[1] ?? '';
  return [question.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().replace(/\+$/, '').trim(), answer.replace(/\s+/g, ' ').trim()];
});
const structuredFaq = faqSchema.mainEntity.map(({ name, acceptedAnswer }) => [name, acceptedAnswer.text]);
assert.deepEqual(structuredFaq, visibleFaq, 'FAQ structured data matches visible question and answer text');
assert.doesNotMatch(html, /AggregateRating|reviewCount|ratingValue|"@type"\s*:\s*"Review"/i, 'no fabricated ratings or reviews');
assert.equal([...html.matchAll(/<h1\b/g)].length, 1, 'exactly one homepage H1');
assert.doesNotMatch(html, /(?:hidden-seo|keyword-block|seo-keywords)/i, 'no hidden keyword block');
const images = [...html.matchAll(/<img\b[^>]*>/g)].map(([image]) => image);
assert.ok(images.length > 0 && images.every((image) => /\balt="[^"]+"/.test(image)), 'homepage images have useful alt text');
assert.match(robots, /^User-agent:\s*\*\s*\r?\nAllow:\s*\/\s*$/m, 'robots allows crawling');
assert.match(robots, /Sitemap:\s*https:\/\/minthrm\.alexiasoft\.co\/sitemap\.xml/);
assert.match(robots, /Allow:\s*\//);
assert.match(sitemap, /<loc>https:\/\/minthrm\.alexiasoft\.co\/<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/minthrm\.alexiasoft\.co\/privacy\.html<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/minthrm\.alexiasoft\.co\/terms\.html<\/loc>/);
assert.doesNotMatch(sitemap, /#/);
assert.match(privacy, /<title>[^<]+<\/title>/);
assert.match(privacy, /<meta name="description"\s+content="[^"]+"\s*\/>/);
assert.match(privacy, /<link rel="canonical" href="https:\/\/minthrm\.alexiasoft\.co\/privacy\.html"\s*\/>/);
assert.match(terms, /<title>[^<]+<\/title>/);
assert.match(terms, /<meta name="description"\s+content="[^"]+"\s*\/>/);
assert.match(html, /<footer class="site-footer">/);
assert.ok(existsSync(new URL('../privacy.html', import.meta.url)));
assert.ok(existsSync(new URL('../terms.html', import.meta.url)), 'terms page exists');
assert.match(html, /<a href="privacy\.html"[^>]*>[^<]*<\/a>/, 'Privacy link remains in main footer');
assert.match(html, /<a href="terms\.html"[^>]*>[^<]*<\/a>/, 'main footer links Terms');
const footerPages = [html, privacy, terms];
const footerMarkup = footerPages.map((page) => page.match(/<footer class="site-footer">([\s\S]*?)<\/footer>/)?.[1] ?? '');
assert.ok(footerMarkup.every(Boolean), 'all pages have a footer');
const footerLinks = footerMarkup.map((footer) => footer.match(/<div class="footer-links">([\s\S]*?)<\/div>/)?.[1] ?? '');
const footerContact = footerMarkup.map((footer) => footer.match(/<div class="footer-contact">([\s\S]*?)<\/div>/)?.[1] ?? '');
assert.ok(footerLinks.every((links) => links && !/AlexiaSoft ↗/.test(links)), 'AlexiaSoft site link is absent from middle navigation');
assert.ok(footerContact.every((contact) => [...contact.matchAll(/href="https:\/\/alexiasoft\.co\//g)].length === 1), 'AlexiaSoft site link appears once in each contact column');
assert.ok(footerPages.every((page) => [...page.matchAll(/เว็บไซต์ AlexiaSoft ↗/g)].length === 1));
assert.ok(footerLinks.every((links) => /href="privacy\.html"/.test(links) && /href="terms\.html"/.test(links)), 'Privacy and Terms remain in middle navigation');
const normalizedNavHrefs = footerLinks.map((links) => [...links.matchAll(/href="([^"]+)"/g)].map(([, href]) => href.replace(/^index\.html/, '')));
assert.deepEqual(normalizedNavHrefs[1], normalizedNavHrefs[0], 'Privacy footer navigation order matches index');
assert.deepEqual(normalizedNavHrefs[2], normalizedNavHrefs[0], 'Terms footer navigation order matches index');
const contactHrefs = footerContact.map((contact) => [...contact.matchAll(/href="([^"]+)"/g)].map(([, href]) => href));
assert.deepEqual(contactHrefs[0], ['mailto:sale@alexiasoft.co', 'tel:+66616975959', 'https://alexiasoft.co/']);
assert.deepEqual(contactHrefs[1], contactHrefs[0], 'Privacy footer contact order matches index');
assert.deepEqual(contactHrefs[2], contactHrefs[0], 'Terms footer contact order matches index');
for (const footer of footerMarkup) {
  for (const [, href] of footer.matchAll(/href="([^"]+)"/g)) {
    if (/^(?:https?:|mailto:|tel:)/.test(href)) continue;
    const [path, fragment] = href.split('#');
    const targetPath = path || 'index.html';
    assert.ok(existsSync(new URL(`../${targetPath}`, import.meta.url)), `footer target ${targetPath} exists`);
    if (fragment) assert.ok(ids.includes(fragment), `footer fragment #${fragment} resolves`);
  }
}
assert.match(css, /\.footer-links,\s*\.footer-contact\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column/);
assert.match(css, /@media \(max-width: 390px\)[\s\S]*?\.footer-main\s*\{\s*grid-template-columns:\s*1fr/);
assert.doesNotMatch(html, /<form\b|\/api\/contact\.php|data-sitekey/i);
assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|leadForm/);

assert.ok(pricing, '#pricing exists');
assert.match(pricing, /class="pricing-intro/);
assert.match(pricing, /class="pricing-mode-switch/);
assert.match(pricing, /data-pricing-mode="subscription"/);
assert.match(pricing, /data-pricing-mode="license"/);
assert.doesNotMatch(pricing, /Active Users/i, 'pricing copy uses employee terminology');
assert.match(pricing, /class="pricing-users-panel/);
assert.match(pricing, /data-pricing-step="decrease"/);
assert.match(pricing, /data-pricing-step="increase"/);
assert.match(pricing, /class="pricing-plan-grid/);
for (const plan of ['business', 'enterprise', 'custom']) {
  assert.match(pricing, new RegExp(`pricing-plan--${plan}`));
}
assert.equal([...pricing.matchAll(/<article class="pricing-plan\b/g)].length, 3, 'exactly three cards');
const customCard = pricing.match(/<article class="pricing-plan pricing-plan--custom[^"]*">[\s\S]*?<\/article>/)?.[0] ?? '';
assert.match(customCard, /<strong>ประเมินตามขอบเขต<\/strong>/, 'Custom remains scope-based');
assert.doesNotMatch(pricing, /Starter|starter/, 'Starter is absent from pricing');
assert.match(pricing, /class="pricing-plan pricing-plan--enterprise is-recommended/);
assert.equal([...pricing.matchAll(/class="pricing-plan__recommended"/g)].length, 1, 'exactly one Enterprise recommendation badge');
assert.match(pricing, /pricing-plan__recommend-icon[^>]*aria-hidden="true"/);
const businessCard = pricing.match(/<article class="pricing-plan pricing-plan--business[^"]*">[\s\S]*?<\/article>/)?.[0] ?? '';
assert.match(businessCard, /<p class="pricing-plan__summary">HR \+ Attendance \+ Payroll สำหรับงานประจำวัน<\/p>/);
assert.match(businessCard, /<li>Payroll รายรับ รายหัก และสวัสดิการ พร้อม OT \/ Incentive ตามการตั้งค่า<\/li>/);
assert.match(businessCard, /<li>รายงานพื้นฐาน HR \/ Payroll รวมรายงานเวลา สาย ขาดงาน และ OT<\/li>/);
assert.match(businessCard, /<li>ตารางงาน กะ เวลาพัก และลงเวลาผ่านเว็บ พร้อม GPS และภาพประกอบ<\/li>/);
assert.doesNotMatch(businessCard, /Payroll Add-on|optional Payroll|add-on Payroll/i);
const enterpriseCard = pricing.match(/<article class="pricing-plan pricing-plan--enterprise[^>]*>[\s\S]*?<\/article>/)?.[0] ?? '';
assert.match(enterpriseCard, /HR \+ Payroll พร้อมเครื่องมือบริหารเพิ่มเติม/);
const unconfirmedFeatureClaims = /วินัยพนักงาน|การเกษียณ|เกษียณ|discipline|retirement/i;
assert.doesNotMatch(enterpriseCard, unconfirmedFeatureClaims, 'Enterprise card excludes unconfirmed discipline and retirement features');
assert.doesNotMatch(table, unconfirmedFeatureClaims, 'comparison matrix excludes unconfirmed discipline and retirement features');
assert.doesNotMatch(faq, unconfirmedFeatureClaims, 'FAQ excludes unconfirmed discipline and retirement features');
assert.doesNotMatch(JSON.stringify(jsonLdBlocks), unconfirmedFeatureClaims, 'structured data excludes unconfirmed discipline and retirement features');
assert.doesNotMatch(html, unconfirmedFeatureClaims, 'public copy excludes unconfirmed discipline and retirement features');
const unconfirmedKpiClaim = /Incentive \/ KPI \/ คะแนนประเมิน/;
assert.doesNotMatch(enterpriseCard, unconfirmedKpiClaim, 'Enterprise card excludes unconfirmed KPI / Incentive claim');
assert.doesNotMatch(table, unconfirmedKpiClaim, 'comparison matrix excludes unconfirmed KPI / Incentive claim');
assert.doesNotMatch(faq, unconfirmedKpiClaim, 'FAQ excludes unconfirmed KPI / Incentive claim');
assert.doesNotMatch(JSON.stringify(jsonLdBlocks), unconfirmedKpiClaim, 'structured data excludes unconfirmed KPI / Incentive claim');
assert.doesNotMatch(html, unconfirmedKpiClaim, 'public copy excludes unconfirmed KPI / Incentive claim');
for (const item of ['Ledger และรายงานบัญชี', 'Dashboard สรุปข้อมูล HR', 'คำขอกำลังคน', 'E-Learning และแบบทดสอบ', 'รายงาน HR \/ Payroll เพิ่มเติมที่มีในระบบ']) {
  assert.ok(enterpriseCard.includes(item), `Enterprise includes ${item}`);
}
assert.match(customCard, /ต่อยอดจาก Enterprise ด้วยการปรับแต่งตามขอบเขตโครงการ/);
assert.match(customCard, /ประเมินเป็นรายโครงการ/);
assert.equal([...pricing.matchAll(/class="[^"]*pricing-plan__cta[^"]*" href="#contact"/g)].length, 3);
assert.match(pricing, /id="hrm-employee-range"[^>]*min="0"[^>]*max="9"[^>]*step="1"/);
assert.equal([...pricing.matchAll(/type="range"/g)].length, 1, 'both modes share one slider');
assert.match(pricing, /id="hrm-employee-range"[^>]*value="5"/);
assert.match(pricing, /<span>25<\/span><span>50<\/span><span>100<\/span><span>150<\/span><span>200<\/span><span>250<\/span><span>300<\/span><span>350<\/span><span>500<\/span><span>500\+<\/span>/);
assert.match(pricing, /class="pricing-comparison-intro/);
assert.equal([...pricing.matchAll(/<div class="pricing-model-note" data-pricing-model-note>/g)].length, 1, 'one pricing model note container');
const pricingNoteMarkup = pricing.match(/<div class="pricing-model-note" data-pricing-model-note><ul class="pricing-model-note__list">([\s\S]*?)<\/ul><\/div>/)?.[1] ?? '';
assert.equal([...pricingNoteMarkup.matchAll(/<li>/g)].length, 4, 'Subscription note has four bullets');
assert.ok(pricing.indexOf('class="pricing-plan-grid') < pricing.indexOf('class="pricing-model-note"'));
assert.ok(pricing.indexOf('class="pricing-model-note"') < pricing.indexOf('class="pricing-comparison-intro"'));
assert.ok(table, 'comparison matrix remains');
assert.equal([...table.matchAll(/<tr class="hrm-comparison-category">/g)].length, 5);
assert.equal([...table.matchAll(/<th scope="col" class="hrm-plan-(?:business|enterprise|custom)"/g)].length, 3);
for (const [, row] of table.matchAll(/<tr>\s*<th scope="row">[\s\S]*?<\/th>([\s\S]*?)<\/tr>/g)) {
  assert.equal([...row.matchAll(/<td\b/g)].length, 3, 'each comparison row has three package values');
}
const comparisonRows = new Map([...table.matchAll(/<tr>\s*<th scope="row">([^<]+)<\/th>([\s\S]*?)<\/tr>/g)].map(([, label, cells]) => [
  label.trim(), [...cells.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(([, cell]) => cell.replace(/<[^>]*>/g, '').trim()),
]));
assert.equal(comparisonRows.size, 33, 'matrix has 33 rows across the five package-scope categories');
for (const [label, customStatus] of [
  ['Payroll รายรับ รายหัก และสวัสดิการ', 'ปรับตามขอบเขต'],
  ['OT / Incentive / ค่าตอบแทนตามการตั้งค่า', 'ปรับตามขอบเขต'],
  ['Payslip และประวัติเงินเดือน', '✓'],
  ['ภาษี ประกันสังคม และกองทุนตามการตั้งค่า', 'ปรับตามขอบเขต'],
]) {
  assert.deepEqual(comparisonRows.get(label), ['✓', '✓', customStatus], `${label}: Business Payroll included; Enterprise and Custom preserved`);
}
assert.deepEqual(comparisonRows.get('Ledger และรายงานบัญชี'), ['–', '✓', 'ปรับตามขอบเขต'], 'Ledger remains Enterprise-only');
assert.deepEqual(comparisonRows.get('Dashboard สรุปข้อมูล HR'), ['–', '✓', 'ปรับตามขอบเขต'], 'Enterprise management feature remains exclusive');
assert.deepEqual(comparisonRows.get('ขั้นตอนอนุมัติของแต่ละโมดูล'), ['✓', '✓', 'ปรับตามขอบเขต']);
assert.deepEqual(comparisonRows.get('ลงเวลาผ่านเว็บ พร้อม GPS และภาพประกอบ'), ['✓', '✓', '✓']);
assert.deepEqual(comparisonRows.get('รายงานเวลา สาย ขาดงาน และ OT'), ['✓', '✓', '✓']);
assert.deepEqual(comparisonRows.get('คำขอกำลังคน'), ['–', '✓', 'ปรับตามขอบเขต']);
assert.deepEqual(comparisonRows.get('E-Learning และแบบทดสอบ'), ['Add-on', '✓', 'ปรับตามขอบเขต']);
assert.deepEqual(comparisonRows.get('รายงาน HR / Payroll เพิ่มเติม'), ['–', '✓', 'ปรับตามขอบเขต']);
for (const row of ['ปรับสูตร Payroll ตามขอบเขตโครงการ', 'ปรับขั้นตอนเพิ่มเติมตามขอบเขตโครงการ', 'รายงาน / Dashboard เพิ่มเติม']) {
  assert.deepEqual(comparisonRows.get(row), ['–', '–', '✓']);
}
for (const row of ['การเชื่อมต่อระบบเพิ่มเติม', 'ย้ายข้อมูลจากระบบเดิม', 'พัฒนาเพิ่มเติมตาม Requirement']) {
  assert.deepEqual(comparisonRows.get(row), ['–', '–', 'ประเมินตามขอบเขต']);
}
for (const unsupported of [/API มาตรฐาน/, /Single Sign-On/i, /\bSSO\b/i, /รองรับหลายบริษัทในเครือ/, /Dedicated Cloud/i, /\bSLA\b/i, /ครบวงจร/, /Workflow[^<\n]*หลายระดับ/, /Workflow[^<\n]*หลายเงื่อนไข/, /Advanced Reports/, /Real-time GPS Tracking/i, /Face Recognition/i]) {
  assert.doesNotMatch(pricing, unsupported, `unsupported comparison/pricing claim absent: ${unsupported}`);
}
assert.doesNotMatch(table, /Starter|starter/);
assert.match(css, /\.hrm-comparison-scroll\s*\{[^}]*overflow-x:\s*auto;/);
assert.match(css, /\.pricing-model-note\s*\{[^}]*border-top:\s*1px solid/);
assert.match(css, /\.pricing-model-note\s*\{[^}]*font-size:\s*12px/);
assert.match(css, /\.pricing-model-note__list li\s*\{[^}]*overflow-wrap:\s*anywhere/);
assert.match(css, /\.pricing-model-note__list\s*\{[^}]*grid-template-columns:\s*repeat\(2/);
assert.match(css, /max-width: 760px[\s\S]{0,500}pricing-model-note__list/);
assert.match(css, /\.pricing-plan__recommended\s*\{[^}]*max-width:\s*calc\(100% - 24px\)/);
assert.match(css, /max-width: 480px[\s\S]{0,700}\.pricing-plan__recommended/);
assert.match(css, /max-width: 480px[\s\S]{0,700}pricing-model-note__list\s*\{\s*grid-template-columns:\s*1fr/);
assert.doesNotMatch(css, /pricing[^\n{]*\{[^}]*position:\s*(?:fixed|sticky)/i, 'no sticky pricing summary');
assert.doesNotMatch(pricing, /pricing-summary-bar|pricing-footer-summary|pricing-sticky/);
assert.doesNotMatch(pricing, /฿(?:5,900|10,900|320,000|520,000)/);

const addons = html.match(/<section[^>]*id="addons"[^>]*>[\s\S]*?<\/section>/)?.[0] ?? '';
assert.ok(addons, 'Add-ons section exists');
assert.equal([...html.matchAll(/id="addons"/g)].length, 1, 'Add-ons section exists once');
assert.match(addons, /id="addons-subscription-title">Subscription<\/h3>/);
assert.match(addons, /id="addons-license-title">License<\/h3>/);
for (const price of ['฿590', '฿790', '฿15,000', '฿25,000']) {
  assert.ok(addons.includes(price), `Add-ons price ${price} exists`);
}
assert.equal([...addons.matchAll(/฿/g)].length, 4, 'branch and E-Learning prices appear in both models');
for (const card of addons.match(/<article class="addons-card[\s\S]*?<\/article>/g) ?? []) {
  assert.equal([...card.matchAll(/<li>/g)].length, 4, 'each Add-ons model contains four rows');
  assert.doesNotMatch(card, /อบรมผู้ใช้งานเพิ่มเติม|ตั้งค่าระบบเพิ่มเติม/);
  assert.match(card, /ย้ายข้อมูลจากระบบเดิม<\/span><strong>ประเมินตามขอบเขต/);
}
assert.match(addons, /class="addons-note"[^>]*>ราคาเบื้องต้น[\s\S]*?VAT/);
assert.doesNotMatch(addons, /Payroll Add-on|Advanced Payroll Add-on|employee-count add-on|extra-user add-on/i);
assert.ok(html.indexOf('</table>') < html.indexOf('id="addons"'));
assert.ok(html.indexOf('id="addons"') < html.indexOf('id="getting-started"'));
assert.match(addons, /<span>การเชื่อมต่อระบบ<\/span><strong>ประเมินตามขอบเขต<\/strong>/);
assert.doesNotMatch(addons, /นิติบุคคลเพิ่ม|Advanced Reports|API \/ Integration|Single Sign-On|\bSSO\b|Dedicated Cloud|\bSLA\b/i);
assert.match(addons, /<span>สาขาเพิ่ม<\/span><strong>฿590 <small>\/ สาขา \/ เดือน<\/small><\/strong>/);
assert.match(addons, /<span>E-Learning<\/span><strong>฿790 <small>\/ เดือน<\/small><\/strong>/);
assert.match(addons, /<span>สาขาเพิ่ม<\/span><strong>฿15,000<\/strong>/);
assert.match(addons, /<span>E-Learning<\/span><strong>฿25,000<\/strong>/);
assert.doesNotMatch(html, /นิติบุคคลเพิ่ม|API มาตรฐาน|Single Sign-On|\bSSO\b|รองรับหลายบริษัทในเครือ|Advanced Reports|Dedicated Cloud|\bSLA\b|ครบวงจร/i);
assert.match(html, /ลงเวลาผ่านเว็บ พร้อม GPS และภาพประกอบ/);
assert.match(html, /ประเมินตามขอบเขต/);

const makeElement = (dataset = {}) => ({
  dataset, textContent: '', attributes: {}, listeners: {},
  style: { properties: {}, setProperty(name, value) { this.properties[name] = value; } },
  classList: { values: new Set(), toggle(name, on) { if (on) this.values.add(name); else this.values.delete(name); } },
  addEventListener(type, fn) { this.listeners[type] = fn; },
  setAttribute(name, value) { this.attributes[name] = value; },
  closest(selector) { return selector === '.hrm-range-wrap' ? rangeWrap : null; },
});
const rangeWrap = makeElement();
const range = makeElement();
range.value = '5';
const output = makeElement();
const value = makeElement();
const current = makeElement();
const currentLabel = makeElement();
const pricingModelNote = makeElement();
pricingModelNote.innerHTML = '';
const recommendationText = makeElement();
const business = makeElement({ packagePrice: 'business' });
const enterprise = makeElement({ packagePrice: 'enterprise' });
const businessNote = makeElement({ packageNote: 'business' });
const enterpriseNote = makeElement({ packageNote: 'enterprise' });
const modes = ['subscription', 'license'].map((mode) => makeElement({ pricingMode: mode }));
const steps = ['decrease', 'increase'].map((step) => makeElement({ pricingStep: step }));
const single = new Map([
  ['#year', makeElement()], ['#hrm-employee-range', range],
  ['[data-active-user-output]', output], ['[data-active-users-value]', value],
  ['[data-current-users]', current], ['[data-current-users-label]', currentLabel],
  ['[data-pricing-model-note]', pricingModelNote],
  ['[data-pricing-recommendation]', recommendationText],
]);
const document = {
  querySelector(selector) { return single.get(selector) ?? null; },
  querySelectorAll(selector) {
    return ({ '[data-package-price]': [business, enterprise], '[data-package-note]': [businessNote, enterpriseNote],
      '[data-pricing-mode]': modes, '[data-pricing-step]': steps })[selector] ?? [];
  },
  addEventListener() {},
};
vm.runInNewContext(js, { document, Intl, Date });
assert.equal(pricingModelNote.innerHTML, `<ul class="pricing-model-note__list">${pricingNoteMarkup}</ul>`);
assert.equal(recommendationText.textContent, 'แนะนำสำหรับองค์กรที่ต้องการเครื่องมือบริหารเพิ่มขึ้น');
assert.equal(business.textContent, '7,490 บาท/เดือน');
assert.equal(enterprise.textContent, '10,990 บาท/เดือน');
assert.match(pricing, /data-package-price="business">7,490 บาท\/เดือน/);
assert.match(pricing, /data-package-price="enterprise">10,990 บาท\/เดือน/);
const expected = [
  ['25', '1,990', '2,990'], ['50', '2,990', '4,490'],
  ['100', '4,490', '6,490'], ['150', '5,490', '7,990'],
  ['200', '6,490', '9,490'], ['250', '7,490', '10,990'],
  ['300', '8,490', '12,490'], ['350', '9,490', '13,990'],
  ['500', '11,990', '16,990'],
];
for (const [index, [users, businessPrice, enterprisePrice]] of expected.entries()) {
  range.value = String(index);
  range.listeners.input();
  assert.equal(output.textContent, `${users} พนักงาน`);
  assert.equal(value.textContent, users);
  assert.equal(current.textContent, users);
  assert.equal(business.textContent, `${businessPrice} บาท/เดือน`);
  assert.equal(enterprise.textContent, `${enterprisePrice} บาท/เดือน`);
  assert.equal(rangeWrap.style.properties['--range-progress'], `${(index / 9) * 100}%`);
}
range.value = '9'; range.listeners.input();
assert.equal(output.textContent, '500+ พนักงาน');
assert.equal(business.textContent, 'ติดต่อฝ่ายขาย');
assert.equal(enterprise.textContent, 'ติดต่อฝ่ายขาย');
steps[0].listeners.click();
assert.equal(range.value, '8', 'decrease moves exactly one tier');
steps[1].listeners.click();
assert.equal(range.value, '9', 'increase moves exactly one tier');
steps[1].listeners.click();
assert.equal(range.value, '9', 'increase stops at final tier');
range.value = '0'; range.listeners.input();
steps[0].listeners.click();
assert.equal(range.value, '0', 'decrease stops at first tier');
range.value = '4'; range.listeners.input();
assert.equal(business.textContent, '6,490 บาท/เดือน');
modes[1].listeners.click();
assert.deepEqual([...pricingModelNote.innerHTML.matchAll(/<li>(.*?)<\/li>/g)].map(([, item]) => item), [
  'สิทธิ์ใช้งานระบบตามขอบเขต License',
  'รองรับการติดตั้งและปรับแต่งตามโครงการ',
  'MA ตั้งแต่ปีที่ 2: 18% ของค่า License ต่อปี',
  'Cloud Hosting / Customize / Integration และบริการนอกขอบเขตประเมินแยก',
]);
assert.equal(recommendationText.textContent, 'แนะนำสำหรับองค์กรที่ต้องการเครื่องมือบริหารเพิ่มขึ้น');
assert.equal(range.value, '4', 'Subscription to License preserves 200 users');
assert.equal(business.textContent, '฿400,000');
assert.equal(enterprise.textContent, '฿540,000');
assert.equal(modes[1].attributes['aria-pressed'], 'true');
assert.equal(modes[0].attributes['aria-pressed'], 'false');
assert.equal(currentLabel.textContent, 'ราคา License คำนวณสำหรับ');
const licenseExpected = [
  ['25', '220,000', '300,000'], ['50', '260,000', '350,000'],
  ['100', '320,000', '420,000'], ['150', '360,000', '480,000'],
  ['200', '400,000', '540,000'], ['250', '440,000', '590,000'],
  ['300', '480,000', '640,000'], ['350', '520,000', '690,000'],
  ['500', '600,000', '790,000'],
];
for (const [index, [users, businessPrice, enterprisePrice]] of licenseExpected.entries()) {
  range.value = String(index);
  range.listeners.input();
  assert.equal(output.textContent, `${users} พนักงาน`);
  assert.equal(business.textContent, `฿${businessPrice}`);
  assert.equal(enterprise.textContent, `฿${enterprisePrice}`);
  assert.doesNotMatch(business.textContent + enterprise.textContent + businessNote.textContent + enterpriseNote.textContent, /\/เดือน/);
  assert.equal(businessNote.textContent, 'License + Customize');
  assert.equal(enterpriseNote.textContent, 'License + Customize');
}
range.value = '9'; range.listeners.input();
assert.equal(output.textContent, '500+ พนักงาน');
assert.equal(business.textContent, 'ติดต่อฝ่ายขาย');
assert.equal(enterprise.textContent, 'ติดต่อฝ่ายขาย');
range.value = '5'; range.listeners.input();
modes[0].listeners.click();
assert.equal(pricingModelNote.innerHTML, `<ul class="pricing-model-note__list">${pricingNoteMarkup}</ul>`);
assert.equal(recommendationText.textContent, 'แนะนำสำหรับองค์กรที่ต้องการเครื่องมือบริหารเพิ่มขึ้น');
assert.equal(range.value, '5', 'License to Subscription preserves 250 users');
assert.equal(currentLabel.textContent, 'ราคาปัจจุบันคำนวณสำหรับ');
assert.equal(business.textContent, '7,490 บาท/เดือน');
assert.equal(enterprise.textContent, '10,990 บาท/เดือน');

assert.match(terms, /<title>ข้อตกลงและเงื่อนไขการใช้บริการ \| MintHRM<\/title>/);
assert.match(terms, /name="description"/);
assert.match(terms, /Subscription/);
assert.match(terms, /License \+ Customize/);
assert.match(terms, /มิใช่การโอนกรรมสิทธิ์ในลิขสิทธิ์หรือ Source Code/);
assert.match(terms, /href="privacy\.html"[^>]*>นโยบายความเป็นส่วนตัว<\/a>/);
assert.match(terms, /ตั้งแต่ปีที่ 2 การบำรุงรักษาและอัปเดตมาตรฐาน \(MA\) คิดในอัตรา 18% ของค่า License ต่อปี/);
assert.doesNotMatch(privacy, /แบบฟอร์มบนเว็บไซต์|แบบฟอร์มติดต่อบนเว็บไซต์|กรอกแบบฟอร์ม|ข้อมูลที่กรอกในแบบฟอร์ม|ผ่านแบบฟอร์ม/i, 'privacy does not describe a current website form flow');
assert.doesNotMatch(privacy, /จำหน่ายสิทธิการใช้งานระบบบริหารทรัพยากรบุคคลแบบ License<\/p>/, 'privacy does not describe a License-only public offering');
assert.match(privacy, /เว็บไซต์สาธารณะ/);
assert.match(privacy, /การติดต่อทางธุรกิจกับบริษัท/);
assert.match(privacy, /ข้อมูลในระบบ MintHRM/);
assert.doesNotMatch(privacy, /Cloudflare|Turnstile|Postmark|ป้องกันบอท|สแปม/i, 'privacy does not describe obsolete Cloudflare or form anti-bot processing');
assert.doesNotMatch(privacy, /คุกกี้ที่จำเป็น|IP Address เบราว์เซอร์ อุปกรณ์ ระบบปฏิบัติการ Log/i, 'privacy does not assert unverified static-site cookies or technical logs');
assert.doesNotMatch(privacy + terms, /Real-time GPS Tracking|ติดตามตำแหน่งแบบเรียลไทม์|ติดตามตำแหน่งอย่างต่อเนื่อง/i, 'legal pages do not claim continuous or real-time GPS tracking');
assert.doesNotMatch(terms, /API มาตรฐาน|Standard API|Public API|API สาธารณะ/i, 'Terms does not claim a standard or public API');
assert.doesNotMatch(terms, /\bSSO\b|Single Sign-On/i, 'Terms does not claim SSO');
assert.match(terms, /การเชื่อมต่อระบบหรือช่องทางข้อมูลตามขอบเขตโครงการ/);
assert.match(terms, /การปรับขั้นตอนการทำงานเพิ่มเติมตามขอบเขตโครงการ/);
assert.match(terms, /การอัปเดตมาตรฐานสำหรับ Subscription ให้เป็นไปตามขอบเขตบริการที่ระบุในแพ็กเกจ/);
assert.doesNotMatch(terms, /18%[^<\n]*(?:Add-on|ส่วนเสริม|ฐาน License|เฉพาะค่า License หลัก)/i, 'Terms does not define the unapproved MA calculation base');
assert.doesNotMatch(terms, /\bSLA\b|24\s*\/\s*7|Dedicated Cloud/i, 'Terms does not introduce unapproved service commitments');
for (const legalPage of [privacy, terms]) {
  assert.match(legalPage, /sale@alexiasoft\.co/);
  assert.match(legalPage, /061-697-5959/);
  assert.match(legalPage, /href="privacy\.html"|href="terms\.html"/);
}
assert.match(privacy, /href="terms\.html"/);
assert.match(terms, /href="privacy\.html"/);
assert.match(html, /href="privacy\.html"/);
assert.match(html, /href="terms\.html"/);
assert.doesNotMatch(terms, /refund|คืนเงิน|\bSLA\b|uptime|99\.\d+%|ชำระภายใน\s*\d+\s*วัน|แจ้งยกเลิกล่วงหน้า\s*\d+/i, 'no unsupported refund, SLA, uptime, or payment-period promises');
assert.match(sitemap, /<loc>https:\/\/minthrm\.alexiasoft\.co\/privacy\.html<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/minthrm\.alexiasoft\.co\/terms\.html<\/loc>/);
assert.match(terms, /href="index\.html(?:#[^"]*)?"/);
for (const [, path] of terms.matchAll(/(?:href|src)="((?:index\.html|privacy\.html|terms\.html|assets\/)[^"#?]*)/g)) {
  assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), `${path} resolves from Terms`);
}
assert.match(terms, /sale@alexiasoft\.co/);
assert.match(terms, /061-697-5959/);
console.log('MintHRM landing smoke checks passed');
