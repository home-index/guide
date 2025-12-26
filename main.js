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

// ====== Booking button -> WhatsApp click-to-chat
$("bookingBtn").addEventListener("click", () => {
  const name = $("name").value.trim();
  const contact = $("contactField").value.trim();
  const fromDate = $("fromDate").value;
  const toDate = $("toDate").value;
  const time = $("time").value;
  const ratePlan = $("ratePlan").value;
  const type = $("type").value;
  const visitReason = $("visitReason").value;
  const age = $("age").value.trim();
  const country = $("countryField").value.trim();
  const city = $("cityField").value.trim();
  const msg = $("msg").value.trim();

  // Validation
  if(!name || !contact || !fromDate){
    alert("Please fill Name, Contact, and Arrival / Start Date.");
    return;
  }

  // Format dates for readable message
  const formatDate = (dateStr) => {
    if (!dateStr) return "Not specified";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const fromDateFormatted = formatDate(fromDate);
  const toDateFormatted = formatDate(toDate);
  
  const lines = [
    "ATITHI DEVO BHAVAH - Travel Guide Booking Request",
    "",
    "Guest Details",
    "----------------------",
    "Name: " + name,
    "Contact: " + contact,
    "Age: " + (age || "Not specified"),
    "Country: " + (country || "Not specified"),
    "City: " + (city || "Not specified"),
    "",
    "Trip Plan",
    "----------------------",
    "Arrival / Start Date: " + fromDateFormatted,
    (toDate ? "Till Date: " + toDateFormatted : ""),
    "Preferred Time: " + (time || "--:--"),
    "Tour Duration / Rate Plan: " + ratePlan,
    "Travel Type / Group Size: " + type,
    "Visit Reason: " + visitReason,
    "",
    "Your Interests / Message:",
    msg || "(Not specified)",
    "",
    "I may share my Government ID / Passport copy separately on WhatsApp or email if needed.",
    "",
    "Please share available options, transparent total cost, and next steps."
  ].filter(line => line !== ""); // Remove empty lines (like when no till date)

  const text = encodeURIComponent(lines.join("\n"));
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${text}`;
  window.open(url, "_blank");
});

// ====== Booking button -> Email (mailto)
$("emailBtn").addEventListener("click", () => {
  const name = $("name").value.trim();
  const contact = $("contactField").value.trim();
  const fromDate = $("fromDate").value;
  const toDate = $("toDate").value;
  const time = $("time").value;
  const ratePlan = $("ratePlan").value;
  const type = $("type").value;
  const visitReason = $("visitReason").value;
  const age = $("age").value.trim();
  const country = $("countryField").value.trim();
  const city = $("cityField").value.trim();
  const msg = $("msg").value.trim();

  // Validation
  if(!name || !contact || !fromDate){
    alert("Please fill Name, Contact, and Arrival / Start Date before sending email.");
    return;
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return "Not specified";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  };

  const fromDateFormatted = formatDate(fromDate);
  const toDateFormatted = formatDate(toDate);

  const subject = encodeURIComponent(`Travel Guide Inquiry - ${name} - ${date}`);
  const bodyLines = [
    "Namaste,",
    "",
    "I would like to inquire about a personal travel guide with ATITHI DEVO BHAVAH.",
    "",
    "Guest Details",
    "----------------------",
    "Name: " + name,
    "Contact (WhatsApp / Email): " + contact,
    "Age: " + (age || "Not specified"),
    "Country: " + (country || "Not specified"),
    "City: " + (city || "Not specified"),
    "",
    "Trip Plan",
    "----------------------",
    "Arrival / Start Date: " + fromDateFormatted,
    (toDate ? "Till Date: " + toDateFormatted : ""),
    "Preferred Time: " + (time || "--:--"),
    "Tour Duration / Rate Plan: " + ratePlan,
    "Travel Type / Group Size: " + type,
    "Visit Reason: " + visitReason,
    "",
    "Your Interests / Message:",
    msg || "(Not specified)",
    "",
    "I can share my Government ID / Passport copy as an attachment in reply to your email if required.",
    "",
    "Please reply with available options, a transparent total cost, and the next steps.",
    "",
    "Thank you."
  ].filter(line => line !== ""); // Remove empty lines

  const body = encodeURIComponent(bodyLines.join("\n"));
  const mailto = `mailto:${BOOKING_EMAIL}?subject=${subject}&body=${body}`;
  window.location.href = mailto;
});

// ====== Manual translate button
$("translateBtn").addEventListener("click", async () => {
  const target = window._ipInfo ? guessLanguageFromIp(window._ipInfo) : "hi";
  await translatePage(target);
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
