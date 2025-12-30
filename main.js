// ====== Helpers
const $ = (id) => document.getElementById(id);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const cToF = (c) => (c * 9/5) + 32;

// ====== YOUR CONTACTS
// WhatsApp: international format, no +, spaces, or dashes [web:21][web:23][web:153]
const WHATSAPP_NUMBER = "917988717234";
// Booking email inbox [web:155][web:161][web:162]
const BOOKING_EMAIL = "atithi.devo.bhavah.16@gmail.com";

// IP/location via ipapi.co JSON
const IP_API = "https://ipapi.co/json/";

// Weather via Open-Meteo
const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";

// Translation via LibreTranslate /translate
const TRANSLATE_ENDPOINT = "https://libretranslate.com/translate";

// Fixed coordinates
const DELHI = { name: "Delhi", lat: 28.6139, lon: 77.2090, tz: "Asia/Kolkata" };
const SONIPAT = { name: "Sonipat", lat: 28.9931, lon: 77.0151, tz: "Asia/Kolkata" };

// ====== Mobile nav
const navlinks = $("navlinks");
$("menuBtn").addEventListener("click", () => navlinks.classList.toggle("open"));
navlinks.querySelectorAll("a").forEach(a =>
  a.addEventListener("click", () => navlinks.classList.remove("open"))
);

// ====== Logo swap English/Hindi continuously
const brandSwap = $("brandSwap");
setInterval(() => brandSwap.classList.toggle("swap"), 2200);

// ====== Collapsible strip (time + weather)
const stripWrap = $("stripWrap");
const stripToggle = $("stripToggle");
if (stripWrap && stripToggle) {
  let collapsed = false;

  function setStripState(isCollapsed){
    collapsed = isCollapsed;
    stripWrap.classList.toggle("collapsed", collapsed);
    stripWrap.classList.toggle("expanded", !collapsed);
  }

  stripToggle.addEventListener("click", () => {
    setStripState(!collapsed);
  });

  // Auto collapse after 30 seconds
  setTimeout(() => setStripState(true), 30000);
}

// ====== Reveal on scroll
const revealEls = Array.from(document.querySelectorAll(".reveal"));
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting) e.target.classList.add("on");
  });
}, { threshold: 0.12 });
revealEls.forEach(el => io.observe(el));

// ====== Time zone utilities
function tzOffsetMinutes(timeZone, date = new Date()){
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", second:"2-digit",
    hour12:false
  });
  const parts = dtf.formatToParts(date).reduce((acc, p) => {
    if(p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUTC - date.getTime()) / 60000;
}

function startClock(el, timeZone, subEl){
  const tick = () => {
    const d = new Date();
    const str = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour:"2-digit", minute:"2-digit", second:"2-digit",
      hour12:true
    }).format(d);
    el.textContent = str;
    if(subEl) subEl.textContent = timeZone;
  };
  tick();
  return setInterval(tick, 1000);
}

function setTimeDiff(userTz){
  const d = new Date();
  const delhiOffset = tzOffsetMinutes(DELHI.tz, d);
  const userOffset = tzOffsetMinutes(userTz, d);
  const diff = delhiOffset - userOffset;

  const sign = diff === 0 ? "±" : (diff > 0 ? "+" : "−");
  const abs = Math.abs(diff);
  const hh = Math.floor(abs / 60);
  const mm = Math.round(abs % 60);

  $("timeDiff").textContent = `Δ ${sign}${hh}h ${String(mm).padStart(2,"0")}m`;
}

// ====== Weather via Open-Meteo
async function fetchTempC(lat, lon){
  const url = new URL(OPEN_METEO);
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lon);
  url.searchParams.set("current", "temperature_2m");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("temperature_unit", "celsius");

  const res = await fetch(url.toString());
  if(!res.ok) throw new Error("Weather fetch failed");
  const data = await res.json();
  const t = data?.current?.temperature_2m;
  if(typeof t !== "number") throw new Error("Weather unavailable");
  return t;
}

async function updateFixedWeathers(){
  try{
    const [dC, sC] = await Promise.all([
      fetchTempC(DELHI.lat, DELHI.lon),
      fetchTempC(SONIPAT.lat, SONIPAT.lon),
    ]);
    $("delhiC").textContent = `${Math.round(dC)}°C`;
    $("delhiF").textContent = `${Math.round(cToF(dC))}°F`;
    $("sonipatC").textContent = `${Math.round(sC)}°C`;
    $("sonipatF").textContent = `${Math.round(cToF(sC))}°F`;
  }catch(e){
    // keep UI graceful
  }
}

// ====== Translation (LibreTranslate)
function guessLanguageFromIp(ipInfo){
  const langs = (ipInfo.languages || "").split(",").map(s => s.trim()).filter(Boolean);
  const pick = langs[0] || "";
  const code = pick.split("-")[0].toLowerCase();

  if(code) return code;
  const country = (ipInfo.country || "").toUpperCase();
  const map = { IN:"hi", FR:"fr", ES:"es", DE:"de", RU:"ru", JP:"ja", KR:"ko", CN:"zh", BR:"pt", IT:"it" };
  return map[country] || "en";
}

async function translateText(q, target){
  const body = { q, source:"auto", target, format:"text" };
  const res = await fetch(TRANSLATE_ENDPOINT, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body)
  });
  if(!res.ok) throw new Error("Translate failed");
  const data = await res.json();
  return data.translatedText || q;
}

async function translatePage(target){
  if(!target || target === "en") {
    $("translateState").textContent = "Translation: English (default)";
    return;
  }

  $("translateState").textContent = `Translating to: ${target.toUpperCase()}…`;

  const nodes = Array.from(document.querySelectorAll("[data-t]"));

  nodes.forEach(n => {
    if(!n.dataset.original) n.dataset.original = n.textContent.trim();
  });

  for(let i = 0; i < nodes.length; i++){
    const n = nodes[i];
    const original = n.dataset.original || n.textContent.trim();
    try{
      const key = `tcache:${target}:${original}`;
      const cached = localStorage.getItem(key);
      if(cached){
        n.textContent = cached;
      }else{
        const translated = await translateText(original, target);
        n.textContent = translated;
        localStorage.setItem(key, translated);
      }
    }catch(e){
      // keep original text on error
    }
  }

  $("translateState").textContent = `Translated to: ${target.toUpperCase()} (auto)`;
}

// ====== Configuration ======
const BOOKED_XML_URL = 'booked-dates.xml'; // Update this path if your XML file is in a different location

let bookedDates = [];

// ====== Load Booked Dates from XML (with cache busting to always get latest) ======
async function loadBookedDates() {
  try {
    const response = await fetch(`${BOOKED_XML_URL}?t=${Date.now()}`);
    if (!response.ok) throw new Error('XML file not found or inaccessible');

    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const dateNodes = xmlDoc.querySelectorAll('date');
    bookedDates = Array.from(dateNodes)
      .map(node => node.textContent.trim())
      .filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)); // Strict YYYY-MM-DD validation

    console.log('✅ Successfully loaded booked dates:', bookedDates);
  } catch (error) {
    console.warn('⚠️ Failed to load booked-dates.xml. Using fallback dates.', error);
    // Fallback dates (safe for demo; you can remove or empty this array in production)
    bookedDates = ['2025-12-31', '2026-01-01'];
  }
}

// ====== Strict check if a date is booked ======
function isBooked(dateStr) {
  return bookedDates.includes(dateStr);
}

// ====== WhatsApp Send Details Button ======
document.getElementById('bookingBtn').addEventListener('click', () => {
  const name = document.getElementById('name').value.trim();
  const contact = document.getElementById('contactField').value.trim();
  const fromDate = document.getElementById('fromDate').value;
  const toDate = document.getElementById('toDate').value;
  const time = document.getElementById('time').value;
  const ratePlan = document.getElementById('ratePlan').value;
  const type = document.getElementById('type').value;
  const visitReason = document.getElementById('visitReason').value;
  const age = document.getElementById('age').value.trim();
  const country = document.getElementById('countryField').value.trim();
  const city = document.getElementById('cityField').value.trim();
  const msg = document.getElementById('msg').value.trim();

  // Basic validation
  if (!name || !contact || !fromDate) {
    alert('Please fill in Your Name, Contact, and Arrival / Start Date.');
    return;
  }

  // Safe date formatting (using noon to avoid timezone offset issues)
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not specified';
    const date = new Date(dateStr + 'T12:00:00'); // Forces consistent timezone handling
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const fromFormatted = formatDate(fromDate);
  const toFormatted = toDate ? formatDate(toDate) : '';

  const messageLines = [
    "ATITHI DEVO BHAVAH - Travel Guide Booking Request",
    "",
    "Guest Details",
    "----------------------",
    `Name: ${name}`,
    `Contact: ${contact}`,
    `Age: ${age || 'Not specified'}`,
    `Country: ${country || 'Not specified'}`,
    `City: ${city || 'Not specified'}`,
    "",
    "Trip Plan",
    "----------------------",
    `Arrival / Start Date: ${fromFormatted}`,
    toDate ? `Till Date: ${toFormatted}` : '',
    `Preferred Time: ${time || '--:--'}`,
    `Tour Duration / Rate Plan: ${ratePlan}`,
    `Travel Type / Group Size: ${type}`,
    `Visit Reason: ${visitReason}`,
    "",
    "Your Interests / Message:",
    msg || "(Not specified)",
    "",
    "I may share my Government ID / Passport copy separately on WhatsApp or email if needed.",
    "",
    "Please share available options, transparent total cost, and next steps."
  ].filter(line => line !== ""); // Remove empty lines

  const text = encodeURIComponent(messageLines.join("\n"));
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  window.open(url, '_blank');
});

// ====== Email Send Details Button ======
document.getElementById('emailBtn').addEventListener('click', () => {
  const name = document.getElementById('name').value.trim();
  const contact = document.getElementById('contactField').value.trim();
  const fromDate = document.getElementById('fromDate').value;

  if (!name || !contact || !fromDate) {
    alert('Please fill Name, Contact, and Arrival / Start Date before sending email.');
    return;
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not specified';
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const fromFormatted = formatDate(fromDate);
  const toFormatted = document.getElementById('toDate').value ? formatDate(document.getElementById('toDate').value) : '';
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const subject = encodeURIComponent(`Travel Guide Inquiry - ${name} - ${today}`);

  const bodyLines = [
    "Namaste,",
    "",
    "I would like to inquire about a personal travel guide with ATITHI DEVO BHAVAH.",
    "",
    "Guest Details",
    "----------------------",
    `Name: ${name}`,
    `Contact (WhatsApp / Email): ${contact}`,
    `Age: ${document.getElementById('age').value.trim() || 'Not specified'}`,
    `Country: ${document.getElementById('countryField').value.trim() || 'Not specified'}`,
    `City: ${document.getElementById('cityField').value.trim() || 'Not specified'}`,
    "",
    "Trip Plan",
    "----------------------",
    `Arrival / Start Date: ${fromFormatted}`,
    toFormatted ? `Till Date: ${toFormatted}` : '',
    `Preferred Time: ${document.getElementById('time').value || '--:--'}`,
    `Tour Duration / Rate Plan: ${document.getElementById('ratePlan').value}`,
    `Travel Type / Group Size: ${document.getElementById('type').value}`,
    `Visit Reason: ${document.getElementById('visitReason').value}`,
    "",
    "Your Interests / Message:",
    document.getElementById('msg').value.trim() || "(Not specified)",
    "",
    "I can share my Government ID / Passport copy as an attachment in reply to your email if required.",
    "",
    "Please reply with available options, a transparent total cost, and the next steps.",
    "",
    "Thank you."
  ].filter(line => line !== "");

  const body = encodeURIComponent(bodyLines.join("\n"));
  window.location.href = `mailto:${BOOKING_EMAIL}?subject=${subject}&body=${body}`;
});

// ====== Manual translate button
$("translateBtn").addEventListener("click", async () => {
  const target = window._ipInfo ? guessLanguageFromIp(window._ipInfo) : "hi";
  await translatePage(target);
});


// ====== Enhanced Responsive Date Picker with Real-Time XML Availability ======
document.addEventListener('DOMContentLoaded', async () => {
  await loadBookedDates(); // Pre-load on page start

  function createCalendar(containerId, displayId, hiddenId) {
    const container = document.getElementById(containerId);
    const displayInput = document.getElementById(displayId);
    const hiddenInput = document.getElementById(hiddenId);

    let currentMonth = new Date();
    currentMonth.setDate(1); // Start at first day of month

    async function renderCalendar() {
      await loadBookedDates(); // Always fetch latest booked dates

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Clear and rebuild calendar HTML
      container.innerHTML = `
        <div class="cal-header">
          <button class="cal-nav-btn" id="prev${containerId}">‹</button>
          <h4>${currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4>
          <button class="cal-nav-btn" id="next${containerId}">›</button>
        </div>
        <div class="cal-grid">
          ${['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<div class="cal-day-header">${d}</div>`).join('')}
        </div>
        <div class="legend">
          <div class="legend-item"><div class="legend-color avail"></div><span>Available</span></div>
          <div class="legend-item"><div class="legend-color booked"></div><span>Booked</span></div>
        </div>
      `;

      const grid = container.querySelector('.cal-grid');
      const firstDayWeekday = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Add empty cells for days before month starts
      for (let i = 0; i < firstDayWeekday; i++) {
        grid.insertAdjacentHTML('beforeend', '<div class="cal-day"></div>');
      }

      // Render each day of the month
      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(year, month, day);
        const dateStr = dateObj.toISOString().split('T')[0]; // Safe YYYY-MM-DD format
        const isToday = dateObj.getTime() === today.getTime();
        const isPast = dateObj < today;
        const booked = isBooked(dateStr);

        const dayEl = document.createElement('div');
        dayEl.className = 'cal-day';
        dayEl.textContent = day;

        if (isPast) {
          dayEl.classList.add('past');
        } else if (booked) {
          dayEl.classList.add('booked');
          dayEl.title = 'This date is already booked';
        } else {
          dayEl.classList.add('available');
        }

        if (isToday) {
          dayEl.classList.add('today');
        }

        // Make clickable only if available and not past
        if (!isPast && !booked) {
          dayEl.style.cursor = 'pointer';
          dayEl.addEventListener('click', () => {
            hiddenInput.value = dateStr;
            displayInput.value = dateObj.toLocaleDateString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            });
            container.classList.remove('show');

            // Remove previous selection highlight
            container.querySelectorAll('.cal-day.selected').forEach(el => el.classList.remove('selected'));
            dayEl.classList.add('selected');
          });
        }

        grid.appendChild(dayEl);
      }

      // Navigation buttons
      document.getElementById(`prev${containerId}`).onclick = (e) => {
        e.stopPropagation();
        currentMonth.setMonth(currentMonth.getMonth() - 1);
        renderCalendar();
      };

      document.getElementById(`next${containerId}`).onclick = (e) => {
        e.stopPropagation();
        currentMonth.setMonth(currentMonth.getMonth() + 1);
        renderCalendar();
      };
    }

    // Open calendar: refresh data and show
    displayInput.addEventListener('click', async (e) => {
      e.stopPropagation();
      // Close any other open calendars
      document.querySelectorAll('.date-calendar').forEach(c => c.classList.remove('show'));
      await renderCalendar(); // Fresh data every time
      container.classList.add('show');
    });

    // Prevent calendar from closing when clicking inside
    container.addEventListener('click', e => e.stopPropagation());

    // Initial hidden render
    renderCalendar();
  }

  // Initialize both calendars
  createCalendar('fromCalendar', 'fromDateDisplay', 'fromDate');
  createCalendar('toCalendar', 'toDateDisplay', 'toDate');

  // Close all calendars when clicking outside
  document.addEventListener('click', () => {
    document.querySelectorAll('.date-calendar').forEach(c => c.classList.remove('show'));
  });

  // Multi-day range validation: prevent selecting range with booked dates
  document.getElementById('toDate').addEventListener('change', async () => {
    const fromStr = document.getElementById('fromDate').value;
    const toStr = document.getElementById('toDate').value;

    if (!fromStr || !toStr) return;

    const from = new Date(fromStr);
    const to = new Date(toStr);

    if (to < from) {
      alert('End date cannot be before the start date.');
      document.getElementById('toDate').value = '';
      document.getElementById('toDateDisplay').value = '';
      return;
    }

    await loadBookedDates(); // Ensure latest data

    let current = new Date(from);
    while (current <= to) {
      const checkStr = current.toISOString().split('T')[0];
      if (isBooked(checkStr)) {
        alert(`Sorry, ${checkStr} within your selected range is already booked. Please choose different dates.`);
        document.getElementById('toDate').value = '';
        document.getElementById('toDateDisplay').value = '';
        return;
      }
      current.setDate(current.getDate() + 1);
    }
  });
});

// ====== Boot
(async function init(){
  $("year").textContent = new Date().getFullYear();
  startClock($("delhiTime"), DELHI.tz);

  let ipInfo = null;
  try{
    const res = await fetch(IP_API);
    ipInfo = await res.json();
    window._ipInfo = ipInfo;

    $("ip").textContent = ipInfo.ip || "—";
    $("country").textContent = ipInfo.country_name || ipInfo.country || "—";
    $("city").textContent = ipInfo.city || "—";

    const userTz = ipInfo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    startClock($("userTime"), userTz, $("userTz"));
    setTimeDiff(userTz);

    $("geoNote").textContent = (ipInfo.latitude && ipInfo.longitude)
      ? `Approx location: ${Number(ipInfo.latitude).toFixed(3)}, ${Number(ipInfo.longitude).toFixed(3)}`
      : "Location: —";

    if(ipInfo.latitude && ipInfo.longitude){
      try{
        const uC = await fetchTempC(ipInfo.latitude, ipInfo.longitude);
        $("uWeatherC").textContent = `${Math.round(uC)}°C`;
        $("uWeatherF").textContent = `${Math.round(cToF(uC))}°F`;
      }catch(e){}
    }

    const target = guessLanguageFromIp(ipInfo);
    await translatePage(target);
  }catch(e){
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    startClock($("userTime"), tz, $("userTz"));
    setTimeDiff(tz);
  }

  await updateFixedWeathers();
  setInterval(updateFixedWeathers, 10 * 60 * 1000);

  setInterval(() => {
    const tz = (window._ipInfo && window._ipInfo.timezone)
      ? window._ipInfo.timezone
      : (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    setTimeDiff(tz);
  }, 60 * 1000);
})();

// ================================================================
// ====== ROBOTIC SIDE MENUBAR MODULE (New Lift Style) ============
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  
  // 1. SELECTORS & SAFETY CHECKS
  // We check if elements exist to prevent errors if HTML is missing
  const roboDock = document.getElementById('roboDock');
  if (!roboDock) return; // Exit if the robotic menu HTML isn't found

  const topProgress = document.getElementById('roboTopProgress');
  const ringCircle = document.querySelector('.progress-ring__circle');
  const roboLinks = document.querySelectorAll('.robo-link');
  const sections = document.querySelectorAll('section');
  const mobileToggle = document.getElementById('roboToggle');
  const homeSection = document.getElementById('home');

  // 2. SETUP CIRCULAR PROGRESS RING
  let circumference = 0;
  if (ringCircle) {
    const radius = ringCircle.r.baseVal.value;
    circumference = radius * 2 * Math.PI;
    ringCircle.style.strokeDasharray = `${circumference} ${circumference}`;
    ringCircle.style.strokeDashoffset = circumference;
  }

  // 3. HELPER: DETECT MOBILE
  const isMobile = () => window.innerWidth <= 768;

  // 4. MAIN SCROLL LOGIC
  function handleRoboticScroll() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (docHeight > 0) ? (scrollTop / docHeight) : 0;

    // --- A. VISIBILITY TOGGLE (Hide on Home, Show after) ---
    if (homeSection) {
      const heroHeight = homeSection.offsetHeight;
      // Show dock only if user has scrolled past 30% of the Hero section
      if (scrollTop > (heroHeight * 0.3)) {
        roboDock.classList.add('visible');
      } else {
        roboDock.classList.remove('visible');
        // Automatically close mobile menu if user scrolls back to very top
        if (roboDock.classList.contains('mobile-open')) {
          toggleMobileMenu(false);
        }
      }
    }

    // --- B. TOP NEON PROGRESS BAR ---
    if (topProgress) {
      topProgress.style.width = `${scrollPercent * 100}%`;
    }

    // --- C. BACK-TO-TOP RING PROGRESS ---
    if (ringCircle) {
      const offset = circumference - (scrollPercent * circumference);
      ringCircle.style.strokeDashoffset = offset;
    }

    // --- D. ACTIVE SECTION HIGHLIGHTING (The "Laser Beacon" Effect) ---
    let currentSectionId = '';

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      // We add a -150px offset so the highlight triggers slightly before the section hits the very top
      if (scrollTop >= (sectionTop - 150)) {
        currentSectionId = section.getAttribute('id');
      }
    });

    roboLinks.forEach(link => {
      link.classList.remove('active');
      // If the link matches the current section, make it "Active"
      // CSS handles the transformation to diamond shape + laser beam
      if (link.getAttribute('data-section') === currentSectionId) {
        link.classList.add('active');
      }
    });
  }

  // 5. MOBILE TOGGLE FUNCTIONALITY
  function toggleMobileMenu(forceState) {
    if (typeof forceState === 'boolean') {
      roboDock.classList.toggle('mobile-open', forceState);
    } else {
      roboDock.classList.toggle('mobile-open');
    }

    // Toggle the Icon between "Bars" and "X"
    if (mobileToggle) {
      const icon = mobileToggle.querySelector('i');
      if (icon) {
        if (roboDock.classList.contains('mobile-open')) {
          icon.classList.remove('fa-bars-staggered');
          icon.classList.add('fa-xmark');
        } else {
          icon.classList.remove('fa-xmark');
          icon.classList.add('fa-bars-staggered');
        }
      }
    }
  }

  // Event Listener for the Mobile Toggle Button
  if (mobileToggle) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent document click from immediately closing it
      toggleMobileMenu();
    });
  }

  // 6. LINK CLICK BEHAVIOR
  roboLinks.forEach(link => {
    link.addEventListener('click', () => {
      // On mobile, clicking a link should close the menu
      if (isMobile()) {
        toggleMobileMenu(false);
      }
    });
  });

  // 7. INITIALIZE
  window.addEventListener('scroll', handleRoboticScroll);
  // Run once on load in case page is refreshed halfway down
  handleRoboticScroll();

  // Close mobile menu if clicking outside
  document.addEventListener('click', (e) => {
    if (roboDock.classList.contains('mobile-open') && !roboDock.contains(e.target)) {
      toggleMobileMenu(false);
    }
  });

});

// ================================================================
// ====== INTELLIGENT CALCULATOR & VALIDATION LOGIC ===============
// ================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Selectors
    const rateSelect = document.getElementById('ratePlan');
    const fromInput = document.getElementById('fromDate');
    const toInput = document.getElementById('toDate');
    const toWrapper = document.getElementById('toDateWrapper');
    const toDisplay = document.getElementById('toDateDisplay');
    
    // Calculator UI Selectors
    const uiRate = document.getElementById('calcRate');
    const uiDuration = document.getElementById('calcDuration');
    const uiTotal = document.getElementById('calcTotal');
    const uiNote = document.getElementById('calcNote');

    // 1. STATE MANAGEMENT
    function updateFormState() {
        const selectedOption = rateSelect.value;
        const isMultiDay = selectedOption.includes('Multi‑Day');

        // Toggle Till Date Field
        if (isMultiDay) {
            toWrapper.classList.remove('disabled');
            toDisplay.removeAttribute('disabled');
            if(toDisplay.placeholder.includes('Select Start')) {
               toDisplay.placeholder = "Select End Date";
            }
        } else {
            toWrapper.classList.add('disabled');
            toDisplay.setAttribute('disabled', 'true');
            // Clear To Date if switching away from multi-day
            toInput.value = ''; 
            toDisplay.value = '';
            toDisplay.placeholder = "Multi-day plan required";
        }

        calculateTotal();
    }

    // 2. PARSE PRICE HELPER
    function getPriceFromOption(optionValue) {
        if (!optionValue) return 0;
        if (optionValue.includes('by discussion')) return -1; // Special flag for custom

        // Regex to extract number after ₹ (e.g., "Item • ₹1,200" -> 1200)
        const match = optionValue.match(/₹([\d,]+)/);
        if (match && match[1]) {
            return parseInt(match[1].replace(/,/g, ''), 10);
        }
        return 0;
    }

    // 3. CALCULATION ENGINE
    function calculateTotal() {
        const planValue = rateSelect.value;
        const pricePerUnit = getPriceFromOption(planValue);
        const startStr = fromInput.value;
        const endStr = toInput.value;
        const isMultiDay = planValue.includes('Multi‑Day');

        let totalCost = 0;
        let durationText = "--";
        let noteText = "";

        // Case A: No Plan Selected
        if (!planValue) {
            uiRate.textContent = "₹0";
            uiDuration.textContent = "--";
            uiTotal.textContent = "0";
            uiNote.textContent = "Please select a plan first";
            return;
        }

        // Case B: Custom Plan
        if (pricePerUnit === -1) {
            uiRate.textContent = "Custom";
            uiDuration.textContent = "Flexible";
            uiTotal.textContent = "---";
            uiNote.textContent = "Price decided via discussion based on requirements";
            document.querySelector('.currency').style.display = 'none'; // Hide ₹
            return;
        } else {
            document.querySelector('.currency').style.display = 'inline'; // Show ₹
            uiRate.textContent = `₹${pricePerUnit.toLocaleString('en-IN')}`;
        }

        // Case C: Standard Single Day (Half/Full/Evening/Transfer)
        if (!isMultiDay) {
            durationText = "1 Day / Trip";
            totalCost = pricePerUnit;
            noteText = "Fixed price for the selected service";
            
            // Render
            uiDuration.textContent = durationText;
            updateTotalUI(totalCost);
            uiNote.textContent = noteText;
        } 
        
        // Case D: Multi-Day Logic
        else {
            if (!startStr) {
                uiDuration.textContent = "--";
                uiTotal.textContent = "0";
                uiNote.textContent = "Select Start Date";
                return;
            }

            if (!endStr) {
                uiDuration.textContent = "Pending End Date";
                uiTotal.textContent = "0";
                uiNote.textContent = "Select End Date to see total";
                return;
            }

            // Calculate Date Difference
            const d1 = new Date(startStr);
            const d2 = new Date(endStr);
            
            // Time difference in milliseconds
            const timeDiff = d2.getTime() - d1.getTime();
            // Days difference (Add 1 to include the start day)
            const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

            if (daysDiff <= 0) {
                uiDuration.textContent = "Invalid Dates";
                uiTotal.textContent = "0";
                uiNote.textContent = "End date cannot be before start date";
                return;
            }

            durationText = `${daysDiff} Days`;
            totalCost = pricePerUnit * daysDiff;
            noteText = `${daysDiff} days × ₹${pricePerUnit}`;

            uiDuration.textContent = durationText;
            updateTotalUI(totalCost);
            uiNote.textContent = noteText;
        }
    }

    // 4. UI ANIMATION HELPER
    function updateTotalUI(amount) {
        const currentVal = parseInt(uiTotal.innerText.replace(/,/g,'')) || 0;
        uiTotal.textContent = amount.toLocaleString('en-IN');
        
        // Trigger Pop Animation if value changed
        if (currentVal !== amount) {
            uiTotal.classList.remove('pop-anim');
            void uiTotal.offsetWidth; // Trigger Reflow
            uiTotal.classList.add('pop-anim');
        }
    }

    // 5. LISTENERS
    
    // Watch for Plan Changes
    rateSelect.addEventListener('change', updateFormState);

    // Watch for Date Changes (MutationObserver is needed because your calendar sets the hidden input value programmatically, not via user typing)
    const dateObserver = new MutationObserver(() => {
        calculateTotal();
    });

    dateObserver.observe(fromInput, { attributes: true, attributeFilter: ['value'] });
    dateObserver.observe(toInput, { attributes: true, attributeFilter: ['value'] });

    // Initialize
    updateFormState();
});

