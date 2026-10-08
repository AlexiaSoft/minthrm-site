const menuButton = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('#main-nav');

function closeMenu() {
  mainNav?.classList.remove('is-open');
  menuButton?.setAttribute('aria-expanded', 'false');
  menuButton?.setAttribute('aria-label', 'เปิดเมนู');
}

menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  mainNav?.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'ปิดเมนู' : 'เปิดเมนู');
});

mainNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});
document.querySelector('#year').textContent = new Date().getFullYear();
const hrmPricing = {
  tiers: [
    { label: '25', business: 1990, enterprise: 2990, businessLicense: 220000, enterpriseLicense: 300000 },
    { label: '50', business: 2990, enterprise: 4490, businessLicense: 260000, enterpriseLicense: 350000 },
    { label: '100', business: 4490, enterprise: 6490, businessLicense: 320000, enterpriseLicense: 420000 },
    { label: '150', business: 5490, enterprise: 7990, businessLicense: 360000, enterpriseLicense: 480000 },
    { label: '200', business: 6490, enterprise: 9490, businessLicense: 400000, enterpriseLicense: 540000 },
    { label: '250', business: 7490, enterprise: 10990, businessLicense: 440000, enterpriseLicense: 590000 },
    { label: '300', business: 8490, enterprise: 12490, businessLicense: 480000, enterpriseLicense: 640000 },
    { label: '350', business: 9490, enterprise: 13990, businessLicense: 520000, enterpriseLicense: 690000 },
    { label: '500', business: 11990, enterprise: 16990, businessLicense: 600000, enterpriseLicense: 790000 },
    { label: '500+', business: null, enterprise: null, businessLicense: null, enterpriseLicense: null },
  ],
};

const hrmEmployeeRange = document.querySelector('#hrm-employee-range');
if (hrmEmployeeRange) {
  const activeUserOutput = document.querySelector('[data-active-user-output]');
  const rangeWrap = hrmEmployeeRange.closest('.hrm-range-wrap');
  const packagePrices = document.querySelectorAll('[data-package-price]');
  const packageNotes = document.querySelectorAll('[data-package-note]');
  const modeButtons = document.querySelectorAll('[data-pricing-mode]');
  const pricingModelNote = document.querySelector('[data-pricing-model-note]');
  const pricingRecommendation = document.querySelector('[data-pricing-recommendation]');
  const stepButtons = document.querySelectorAll('[data-pricing-step]');
  const activeUsersValue = document.querySelector('[data-active-users-value]');
  const currentUsers = document.querySelector('[data-current-users]');
  const currentUsersLabel = document.querySelector('[data-current-users-label]');
  const formatHrmPrice = new Intl.NumberFormat('th-TH');
  let pricingMode = 'subscription';

  function updateHrmPricing(index) {
    const tier = hrmPricing.tiers[index];
    if (!tier) return;

    if (pricingRecommendation) pricingRecommendation.textContent = 'แนะนำสำหรับองค์กรที่ต้องการเครื่องมือบริหารเพิ่มขึ้น';

    if (pricingModelNote) {
      const modelNoteItems = pricingMode === 'license'
        ? [
          'สิทธิ์ใช้งานระบบตามขอบเขต License',
          'รองรับการติดตั้งและปรับแต่งตามโครงการ',
          'MA ตั้งแต่ปีที่ 2: 18% ของค่า License ต่อปี',
          'Cloud Hosting / Customize / Integration และบริการนอกขอบเขตประเมินแยก',
        ]
        : [
          'ชำระรายเดือนตามจำนวนพนักงาน',
          'รวม Cloud Hosting, Backup และ Standard Updates',
          'รวม Remote Support ในวัน/เวลาทำการ',
          'Customize / Integration / Migration ประเมินแยกตามขอบเขต',
        ];
      pricingModelNote.innerHTML = `<ul class="pricing-model-note__list">${modelNoteItems.map((item) => `<li>${item}</li>`).join('')}</ul>`;
    }

    const activeUsers = `${tier.label} พนักงาน`;
    const maxIndex = hrmPricing.tiers.length - 1;
    const progress = maxIndex ? (index / maxIndex) * 100 : 0;

    rangeWrap?.style.setProperty('--range-progress', `${progress}%`);
    hrmEmployeeRange.setAttribute('aria-valuetext', activeUsers);
    activeUserOutput.textContent = activeUsers;
    if (activeUsersValue) activeUsersValue.textContent = tier.label;
    if (currentUsers) currentUsers.textContent = tier.label;
    if (currentUsersLabel) currentUsersLabel.textContent =
      pricingMode === 'license' ? 'ราคา License คำนวณสำหรับ' : 'ราคาปัจจุบันคำนวณสำหรับ';

    packagePrices.forEach((element) => {
      const packageKey = element.dataset.packagePrice;
      const price = tier[pricingMode === 'license' ? `${packageKey}License` : packageKey];
      element.textContent =
        price === null || price === undefined
          ? 'ติดต่อฝ่ายขาย'
          : pricingMode === 'license' ? `฿${formatHrmPrice.format(price)}` : `${formatHrmPrice.format(price)} บาท/เดือน`;
    });

    packageNotes.forEach((element) => {
      element.textContent =
        pricingMode === 'license'
          ? tier.label === '500+' ? 'ติดต่อฝ่ายขายเพื่อรับใบเสนอราคา' : 'License + Customize'
          : tier.label === '500+' ? 'โปรดติดต่อฝ่ายขายเพื่อประเมินราคา' : `สำหรับ ${activeUsers}`;
    });
  }

  hrmEmployeeRange.addEventListener('input', () =>
    updateHrmPricing(Number(hrmEmployeeRange.value)),
  );
  hrmEmployeeRange.addEventListener('change', () =>
    updateHrmPricing(Number(hrmEmployeeRange.value)),
  );
  stepButtons.forEach((button) => button.addEventListener('click', () => {
    const direction = button.dataset.pricingStep === 'increase' ? 1 : -1;
    const next = Math.max(0, Math.min(hrmPricing.tiers.length - 1, Number(hrmEmployeeRange.value) + direction));
    hrmEmployeeRange.value = String(next);
    updateHrmPricing(next);
  }));
  modeButtons.forEach((button) => button.addEventListener('click', () => {
    pricingMode = button.dataset.pricingMode;
    modeButtons.forEach((modeButton) => {
      const active = modeButton === button;
      modeButton.classList.toggle('is-active', active);
      modeButton.setAttribute('aria-pressed', String(active));
    });
    updateHrmPricing(Number(hrmEmployeeRange.value));
  }));
  updateHrmPricing(Number(hrmEmployeeRange.value));
}
