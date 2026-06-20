/**
 * ==========================================================================
 * ShortLink Application Logic (app.js)
 * High-fidelity Frontend Prototype with Mock Functionality & LocalStorage Persistence
 * ==========================================================================
 */

// Global Application State
const AppState = {
  // Session details
  session: {
    isLoggedIn: false,
    user: {
      name: "John Smith",
      email: "john.smith@example.com",
      plan: "Free Plan"
    }
  },
  
  // List of links
  links: [],
  
  // Detailed click history log
  clicks: [],

  // Tracking currently inspected link (for Link Details page)
  selectedLinkId: null
};

// ==========================================================================
// 1. Initial State Seeding (Mock Data)
// ==========================================================================
function seedInitialData() {
  const seededLinks = [
    {
      id: "lnk-google",
      longUrl: "https://www.google.com/search?q=saas+startups+analytics",
      shortUrl: "shrt.lnk/googl",
      alias: "googl",
      clicks: 42,
      created: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      expiry: "",
      password: "",
      status: "active"
    },
    {
      id: "lnk-github",
      longUrl: "https://github.com/trending/javascript?since=weekly",
      shortUrl: "shrt.lnk/git-tr",
      alias: "git-tr",
      clicks: 156,
      created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      expiry: "",
      password: "",
      status: "active"
    },
    {
      id: "lnk-stitch",
      longUrl: "https://stitch.withgoogle.com/docs/learn/prompting-guide",
      shortUrl: "shrt.lnk/stitch",
      alias: "stitch",
      clicks: 238,
      created: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      expiry: "",
      password: "",
      status: "active"
    },
    {
      id: "lnk-portfolio",
      longUrl: "https://myportfolio.io/project-showcase?category=design",
      shortUrl: "shrt.lnk/portf",
      alias: "portf",
      clicks: 89,
      created: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
      expiry: "",
      password: "",
      status: "active"
    }
  ];

  // Seed clicks history for charts (past 7 days + random devices & browsers)
  const seededClicks = [];
  const browsers = ["Chrome", "Safari", "Firefox", "Edge", "Other"];
  const devices = ["Desktop", "Mobile", "Tablet"];
  const countries = ["United States", "United Kingdom", "Canada", "Germany", "Japan", "Australia", "India"];
  
  // Distribute click data realistically
  seededLinks.forEach(link => {
    for (let i = 0; i < link.clicks; i++) {
      // Pick random date within past 15 days
      const daysAgo = Math.floor(Math.random() * 15);
      const clickTime = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000 - Math.random() * 8 * 60 * 60 * 1000);
      
      // Determine device & browser distribution
      let device = devices[0]; // Desktop (default)
      let browser = browsers[0]; // Chrome
      
      const randDevice = Math.random();
      if (randDevice > 0.7) device = devices[1]; // Mobile
      else if (randDevice > 0.9) device = devices[2]; // Tablet
      
      const randBrowser = Math.random();
      if (randBrowser > 0.6) browser = browsers[1]; // Safari
      else if (randBrowser > 0.8) browser = browsers[2]; // Firefox
      else if (randBrowser > 0.9) browser = browsers[3]; // Edge
      
      seededClicks.push({
        id: `clk-${Math.random().toString(36).substr(2, 9)}`,
        linkId: link.id,
        timestamp: clickTime.toISOString(),
        device: device,
        browser: browser,
        country: countries[Math.floor(Math.random() * countries.length)],
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
      });
    }
  });

  AppState.links = seededLinks;
  AppState.clicks = seededClicks;
  
  saveStateToStorage();
}

// Load AppState from LocalStorage
function loadStateFromStorage() {
  const sessionData = localStorage.getItem("shortlink_session");
  const linksData = localStorage.getItem("shortlink_links");
  const clicksData = localStorage.getItem("shortlink_clicks");
  
  if (sessionData) AppState.session = JSON.parse(sessionData);
  
  if (linksData && clicksData) {
    AppState.links = JSON.parse(linksData);
    AppState.clicks = JSON.parse(clicksData);
  } else {
    // Seed initial mock data
    seedInitialData();
  }
}

// Save AppState to LocalStorage
function saveStateToStorage() {
  localStorage.setItem("shortlink_session", JSON.stringify(AppState.session));
  localStorage.setItem("shortlink_links", JSON.stringify(AppState.links));
  localStorage.setItem("shortlink_clicks", JSON.stringify(AppState.clicks));
}

// ==========================================================================
// 2. Toast Notification Engine
// ==========================================================================
function showToast(title, message, type = "success") {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let iconName = "check_circle";
  if (type === "error") iconName = "error";
  if (type === "warning") iconName = "warning";
  
  toast.innerHTML = `
    <span class="material-symbols-outlined toast-icon">${iconName}</span>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" aria-label="Close Notification">
      <span class="material-symbols-outlined" style="font-size: 1.15rem;">close</span>
    </button>
  `;
  
  container.appendChild(toast);
  
  // Slide in
  setTimeout(() => toast.classList.add("show"), 10);
  
  // Auto-remove close button event
  const closeBtn = toast.querySelector(".toast-close");
  closeBtn.addEventListener("click", () => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  });
  
  // Auto dismiss after 4 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

// ==========================================================================
// 3. UI Helpers & Formatting Utils
// ==========================================================================
function formatDateTime(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + " " +
         d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDateOnly(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function generateShortCode() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Simple text-to-SVG QR code mock (draws a realistic patterns QR code grid)
function drawMockQrSvg(text) {
  // Return a beautiful vector SVG that looks like a real QR code with shortlink color branding
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" shape-rendering="crispEdges">
      <rect width="100" height="100" fill="#ffffff"/>
      <!-- Quiet zone border -->
      <!-- Top Left Finder Pattern -->
      <rect x="8" y="8" width="28" height="28" fill="#0f172a"/>
      <rect x="12" y="12" width="20" height="20" fill="#ffffff"/>
      <rect x="16" y="16" width="12" height="12" fill="#6366f1"/>
      
      <!-- Top Right Finder Pattern -->
      <rect x="64" y="8" width="28" height="28" fill="#0f172a"/>
      <rect x="68" y="12" width="20" height="20" fill="#ffffff"/>
      <rect x="72" y="16" width="12" height="12" fill="#6366f1"/>
      
      <!-- Bottom Left Finder Pattern -->
      <rect x="8" y="64" width="28" height="28" fill="#0f172a"/>
      <rect x="12" y="68" width="20" height="20" fill="#ffffff"/>
      <rect x="16" y="72" width="12" height="12" fill="#6366f1"/>
      
      <!-- Random bits representing shortened link content (Mocked grid data) -->
      <!-- Row timings -->
      <rect x="40" y="8" width="4" height="4" fill="#0f172a"/><rect x="48" y="8" width="4" height="4" fill="#0f172a"/>
      <rect x="44" y="12" width="4" height="4" fill="#6366f1"/><rect x="52" y="12" width="4" height="4" fill="#0f172a"/>
      <rect x="40" y="16" width="4" height="4" fill="#0f172a"/><rect x="48" y="16" width="4" height="4" fill="#6366f1"/>
      <rect x="44" y="20" width="4" height="4" fill="#0f172a"/><rect x="56" y="20" width="4" height="4" fill="#6366f1"/>
      <!-- Timing belts -->
      <rect x="12" y="44" width="4" height="4" fill="#0f172a"/><rect x="20" y="44" width="4" height="4" fill="#0f172a"/>
      <rect x="28" y="44" width="4" height="4" fill="#0f172a"/><rect x="36" y="44" width="4" height="4" fill="#6366f1"/>
      <rect x="44" y="44" width="4" height="4" fill="#0f172a"/><rect x="52" y="44" width="4" height="4" fill="#0f172a"/>
      <rect x="60" y="44" width="4" height="4" fill="#6366f1"/><rect x="68" y="44" width="4" height="4" fill="#0f172a"/>
      <!-- Bottom right data matrix -->
      <rect x="44" y="56" width="4" height="4" fill="#6366f1"/><rect x="52" y="56" width="4" height="4" fill="#0f172a"/><rect x="68" y="56" width="4" height="4" fill="#0f172a"/><rect x="76" y="56" width="4" height="4" fill="#6366f1"/>
      <rect x="48" y="60" width="4" height="4" fill="#0f172a"/><rect x="56" y="60" width="4" height="4" fill="#0f172a"/><rect x="72" y="60" width="4" height="4" fill="#0f172a"/><rect x="84" y="60" width="4" height="4" fill="#0f172a"/>
      <rect x="40" y="64" width="4" height="4" fill="#0f172a"/><rect x="60" y="64" width="4" height="4" fill="#6366f1"/><rect x="68" y="64" width="4" height="4" fill="#6366f1"/><rect x="80" y="64" width="4" height="4" fill="#0f172a"/>
      <rect x="44" y="68" width="4" height="4" fill="#6366f1"/><rect x="48" y="68" width="4" height="4" fill="#0f172a"/><rect x="76" y="68" width="4" height="4" fill="#0f172a"/><rect x="84" y="68" width="4" height="4" fill="#6366f1"/>
      <rect x="52" y="72" width="4" height="4" fill="#0f172a"/><rect x="60" y="72" width="4" height="4" fill="#0f172a"/><rect x="68" y="72" width="4" height="4" fill="#6366f1"/><rect x="80" y="72" width="4" height="4" fill="#6366f1"/>
      <rect x="44" y="76" width="4" height="4" fill="#0f172a"/><rect x="56" y="76" width="4" height="4" fill="#0f172a"/><rect x="72" y="76" width="4" height="4" fill="#0f172a"/><rect x="84" y="76" width="4" height="4" fill="#0f172a"/>
      <rect x="48" y="80" width="4" height="4" fill="#6366f1"/><rect x="64" y="80" width="4" height="4" fill="#0f172a"/><rect x="76" y="80" width="4" height="4" fill="#6366f1"/><rect x="80" y="80" width="4" height="4" fill="#0f172a"/>
      <rect x="40" y="84" width="4" height="4" fill="#0f172a"/><rect x="52" y="84" width="4" height="4" fill="#6366f1"/><rect x="60" y="84" width="4" height="4" fill="#0f172a"/><rect x="72" y="84" width="4" height="4" fill="#0f172a"/>
    </svg>
  `;
}

// Copy helper function
function copyToClipboard(text, successMsg = "Copied to clipboard!") {
  navigator.clipboard.writeText(text).then(() => {
    showToast("Link Copied", successMsg, "success");
  }).catch(() => {
    showToast("Copy Failed", "Could not copy short link. Please select and copy manually.", "error");
  });
}

// ==========================================================================
// 4. Click Simulation / Mock Traffic Tool
// ==========================================================================
function simulateTraffic(linkId = null) {
  const browsers = ["Chrome", "Safari", "Firefox", "Edge", "Other"];
  const devices = ["Desktop", "Mobile", "Tablet"];
  const countries = ["United States", "United Kingdom", "Canada", "Germany", "Japan", "Australia", "India"];
  
  // Decide which links get clicks
  const targetLinks = linkId 
    ? AppState.links.filter(l => l.id === linkId)
    : AppState.links;
    
  if (targetLinks.length === 0) {
    showToast("Simulation Info", "Please create a link first to simulate visitor traffic.", "warning");
    return;
  }
  
  // Generate random quantity of clicks
  const count = linkId ? Math.floor(Math.random() * 5) + 3 : Math.floor(Math.random() * 12) + 5;
  
  for (let i = 0; i < count; i++) {
    // Pick random link
    const link = targetLinks[Math.floor(Math.random() * targetLinks.length)];
    
    // Pick random time (mostly today, some spread)
    const hoursAgo = Math.random() * 24;
    const timestamp = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
    
    let device = devices[0];
    let browser = browsers[0];
    
    const randDevice = Math.random();
    if (randDevice > 0.6) device = devices[1];
    else if (randDevice > 0.85) device = devices[2];
    
    const randBrowser = Math.random();
    if (randBrowser > 0.5) browser = browsers[1];
    else if (randBrowser > 0.75) browser = browsers[2];
    else if (randBrowser > 0.9) browser = browsers[3];
    
    // Register click log
    AppState.clicks.push({
      id: `clk-${Math.random().toString(36).substr(2, 9)}`,
      linkId: link.id,
      timestamp: timestamp,
      device: device,
      browser: browser,
      country: countries[Math.floor(Math.random() * countries.length)],
      ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    });
    
    // Increment link clicks count
    link.clicks++;
  }
  
  saveStateToStorage();
  
  // Re-render current active view to show updated stats immediately
  const activeHash = window.location.hash || "#/";
  activateRoute(activeHash, true); // bypass skeleton animation during hot update
  
  showToast("Traffic Simulated", `Successfully mocked ${count} visitor clicks across links.`, "success");
}

// ==========================================================================
// 5. Chart.js Graphs Setup
// ==========================================================================
let dailyClicksChart = null;
let deviceUsageChart = null;
let browserUsageChart = null;

function destroyCharts() {
  if (dailyClicksChart) { dailyClicksChart.destroy(); dailyClicksChart = null; }
  if (deviceUsageChart) { deviceUsageChart.destroy(); deviceUsageChart = null; }
  if (browserUsageChart) { browserUsageChart.destroy(); browserUsageChart = null; }
}

function renderAnalyticsCharts() {
  destroyCharts();
  
  const ctxDaily = document.getElementById("chartDailyClicks");
  const ctxDevice = document.getElementById("chartDeviceUsage");
  const ctxBrowser = document.getElementById("chartBrowserUsage");
  
  if (!ctxDaily || !ctxDevice || !ctxBrowser) return;

  // Process data for Daily click line chart (past 7 days)
  const days = [];
  const clickCounts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    days.push(d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
    
    // Count clicks on this date
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;
    
    const count = AppState.clicks.filter(c => {
      const clickTime = new Date(c.timestamp).getTime();
      return clickTime >= dayStart && clickTime < dayEnd;
    }).length;
    
    clickCounts.push(count);
  }

  // 1. Line Chart
  dailyClicksChart = new Chart(ctxDaily, {
    type: "line",
    data: {
      labels: days,
      datasets: [{
        label: "Clicks",
        data: clickCounts,
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.05)",
        fill: true,
        tension: 0.35,
        borderWidth: 3,
        pointBackgroundColor: "#6366f1",
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          grid: { color: "rgba(226, 232, 240, 0.6)" },
          ticks: { color: "#64748b", font: { family: "Inter" } }
        },
        x: {
          grid: { display: false },
          ticks: { color: "#64748b", font: { family: "Inter" } }
        }
      }
    }
  });

  // Process device click logs (Desktop vs Mobile vs Tablet)
  let desktop = 0, mobile = 0, tablet = 0;
  AppState.clicks.forEach(c => {
    if (c.device === "Desktop") desktop++;
    else if (c.device === "Mobile") mobile++;
    else if (c.device === "Tablet") tablet++;
  });
  
  // Fallbacks if 0
  if (desktop + mobile + tablet === 0) { desktop = 10; mobile = 5; tablet = 2; }

  // 2. Pie (Doughnut) Chart
  deviceUsageChart = new Chart(ctxDevice, {
    type: "doughnut",
    data: {
      labels: ["Desktop", "Mobile", "Tablet"],
      datasets: [{
        data: [desktop, mobile, tablet],
        backgroundColor: ["#6366f1", "#10b981", "#f59e0b"],
        borderWidth: 2,
        borderColor: "#ffffff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            font: { family: "Inter", size: 12 },
            color: "#64748b"
          }
        }
      },
      cutout: "70%"
    }
  });

  // Process Browser Distribution Click logs
  let chrome = 0, safari = 0, firefox = 0, edge = 0, other = 0;
  AppState.clicks.forEach(c => {
    if (c.browser === "Chrome") chrome++;
    else if (c.browser === "Safari") safari++;
    else if (c.browser === "Firefox") firefox++;
    else if (c.browser === "Edge") edge++;
    else other++;
  });

  if (chrome + safari + firefox + edge + other === 0) { chrome = 20; safari = 15; firefox = 5; edge = 3; }

  // 3. Bar Chart
  browserUsageChart = new Chart(ctxBrowser, {
    type: "bar",
    data: {
      labels: ["Chrome", "Safari", "Firefox", "Edge", "Other"],
      datasets: [{
        data: [chrome, safari, firefox, edge, other],
        backgroundColor: "rgba(99, 102, 241, 0.85)",
        hoverBackgroundColor: "#6366f1",
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          grid: { color: "rgba(226, 232, 240, 0.6)" },
          ticks: { color: "#64748b", font: { family: "Inter" } }
        },
        x: {
          grid: { display: false },
          ticks: { color: "#64748b", font: { family: "Inter" } }
        }
      }
    }
  });
}

// ==========================================================================
// 6. Router & Navigation Controller
// ==========================================================================
const routes = {
  "#/": renderLandingPage,
  "#/login": renderLoginPage,
  "#/register": renderRegisterPage,
  "#/dashboard": renderDashboard,
  "#/create": renderCreateLinkPage,
  "#/analytics": renderAnalyticsDashboard,
  "#/details": renderLinkDetailsPage,
  "#/settings": renderSettingsPage,
  "#/logout": handleLogout
};

function handleLogout() {
  AppState.session.isLoggedIn = false;
  saveStateToStorage();
  showToast("Logged Out", "You have successfully signed out.", "success");
  window.location.hash = "#/";
}

function activateRoute(hash, bypassAnimation = false) {
  // Route fallback
  const renderFn = routes[hash] || renderLandingPage;
  
  // 1. Session Auth Guards
  const isAuthRoute = hash === "#/login" || hash === "#/register" || hash === "#/";
  if (!AppState.session.isLoggedIn && !isAuthRoute) {
    showToast("Access Denied", "Please sign in to access your dashboard.", "error");
    window.location.hash = "#/login";
    return;
  }
  
  if (AppState.session.isLoggedIn && isAuthRoute) {
    window.location.hash = "#/dashboard";
    return;
  }

  // 2. Hide all view containers
  const viewContainers = document.querySelectorAll(".view-container");
  viewContainers.forEach(container => {
    container.classList.remove("active");
  });
  
  // 3. Layout layout toggles
  const loggedOutLayout = document.getElementById("loggedOutLayout");
  const loggedInLayout = document.getElementById("loggedInLayout");
  
  if (AppState.session.isLoggedIn) {
    loggedOutLayout.style.display = "none";
    loggedInLayout.style.display = "block";
    updateSidebarUser();
  } else {
    loggedOutLayout.style.display = "block";
    loggedInLayout.style.display = "none";
  }

  // Update active sidebar link styling
  const sidebarLinks = document.querySelectorAll(".sidebar-link");
  sidebarLinks.forEach(link => link.classList.remove("active"));
  
  let sbId = "";
  if (hash === "#/dashboard") sbId = "sb-dashboard";
  else if (hash === "#/create") sbId = "sb-create";
  else if (hash === "#/analytics") sbId = "sb-analytics";
  else if (hash === "#/settings") sbId = "sb-settings";
  
  if (sbId) {
    const el = document.getElementById(sbId);
    if (el) el.classList.add("active");
  }

  // Close mobile sidebar Drawer on navigate
  document.getElementById("dashboardSidebar").classList.remove("mobile-open");

  // 4. Loading Skeleton Transition (simulates fetching statistics from server)
  const loader = document.getElementById("skeletonLoader");
  
  if (AppState.session.isLoggedIn && !bypassAnimation) {
    loader.style.display = "flex";
    
    // Hide active container during load
    setTimeout(() => {
      loader.style.display = "none";
      renderFn();
    }, 450); // Small professional delay
  } else {
    loader.style.display = "none";
    renderFn();
  }
}

// Watch window hash changes
window.addEventListener("hashchange", () => {
  activateRoute(window.location.hash || "#/");
});

// Update Sidebar User panel details
function updateSidebarUser() {
  const avatar = document.getElementById("sidebarAvatar");
  const username = document.getElementById("sidebarUsername");
  
  if (username) username.innerText = AppState.session.user.name;
  if (avatar) {
    const initials = AppState.session.user.name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
    avatar.innerText = initials.substring(0, 2);
  }
}

// ==========================================================================
// 7. Page Render Functions
// ==========================================================================

// 1. Landing Page
function renderLandingPage() {
  document.title = "ShortLink | Shorten, Track and Analyze Your Links";
  const view = document.getElementById("viewLanding");
  view.classList.add("active");
}

// 2. Login Page
function renderLoginPage() {
  document.title = "Login | ShortLink";
  const view = document.getElementById("viewLogin");
  view.classList.add("active");
  
  // Clear fields
  document.getElementById("loginEmail").value = "";
  document.getElementById("loginPassword").value = "";
}

// 3. Register Page
function renderRegisterPage() {
  document.title = "Sign Up | ShortLink";
  const view = document.getElementById("viewRegister");
  view.classList.add("active");
  
  // Clear fields
  document.getElementById("registerName").value = "";
  document.getElementById("registerEmail").value = "";
  document.getElementById("registerPassword").value = "";
  document.getElementById("registerConfirmPassword").value = "";
}

// 4. User Dashboard
function renderDashboard() {
  document.title = "User Dashboard | ShortLink";
  document.getElementById("pageMainTitle").innerText = "Dashboard";
  const view = document.getElementById("viewDashboard");
  view.classList.add("active");
  
  // Calculate stats
  const totalLinks = AppState.links.length;
  const totalClicks = AppState.links.reduce((sum, link) => sum + link.clicks, 0);
  const activeLinks = AppState.links.filter(l => l.status === "active").length;
  const qrGenerated = totalLinks; // One for each link

  // Set card values
  document.getElementById("statTotalLinks").innerText = totalLinks;
  document.getElementById("statTotalClicks").innerText = totalClicks;
  document.getElementById("statActiveLinks").innerText = activeLinks;
  document.getElementById("statQrGenerated").innerText = qrGenerated;

  // Render recent links table
  const tableBody = document.getElementById("dashboardLinksTableBody");
  const emptyState = document.getElementById("dashboardEmptyState");
  tableBody.innerHTML = "";

  if (AppState.links.length === 0) {
    emptyState.style.display = "flex";
    document.querySelector(".custom-table").style.display = "none";
  } else {
    emptyState.style.display = "none";
    document.querySelector(".custom-table").style.display = "table";

    // Sort links by creation date desc
    const sortedLinks = [...AppState.links].sort((a, b) => new Date(b.created) - new Date(a.created));

    sortedLinks.forEach(link => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>
          <div class="original-url-cell" title="${link.longUrl}">${link.longUrl}</div>
        </td>
        <td>
          <div class="short-url-container">
            <a href="${link.shortUrl}" target="_blank" class="short-url-cell">${link.shortUrl}</a>
            <button class="copy-icon-btn btn-copy-link" data-url="${link.shortUrl}" title="Copy Link">
              <span class="material-symbols-outlined">content_copy</span>
            </button>
          </div>
        </td>
        <td>
          <span class="font-bold">${link.clicks}</span>
        </td>
        <td>
          <span class="status-chip ${link.status}">${link.status}</span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="action-btn btn-details" data-id="${link.id}" title="View Details">
              <span class="material-symbols-outlined">insights</span>
            </button>
            <button class="action-btn btn-edit" data-id="${link.id}" title="Edit Link">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="action-btn delete-btn btn-delete" data-id="${link.id}" title="Delete Link">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    });

    // Wire actions
    // Copy buttons
    tableBody.querySelectorAll(".btn-copy-link").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        copyToClipboard(btn.dataset.url, "Shortlink copied to clipboard.");
      });
    });

    // View Details buttons
    tableBody.querySelectorAll(".btn-details").forEach(btn => {
      btn.addEventListener("click", () => {
        AppState.selectedLinkId = btn.dataset.id;
        window.location.hash = "#/details";
      });
    });

    // Edit link buttons
    tableBody.querySelectorAll(".btn-edit").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const link = AppState.links.find(l => l.id === id);
        if (link) {
          const newAlias = prompt("Modify alias for link:", link.alias);
          if (newAlias !== null && newAlias.trim() !== "") {
            const aliasClean = newAlias.trim().replace(/\s+/g, '-');
            
            // Check alias uniqueness
            const dup = AppState.links.find(l => l.alias === aliasClean && l.id !== id);
            if (dup) {
              showToast("Validation Error", "This alias is already assigned to another link.", "error");
              return;
            }
            
            link.alias = aliasClean;
            link.shortUrl = `shrt.lnk/${aliasClean}`;
            saveStateToStorage();
            renderDashboard();
            showToast("Link Updated", "Your short URL has been modified.", "success");
          }
        }
      });
    });

    // Delete link buttons
    tableBody.querySelectorAll(".btn-delete").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const index = AppState.links.findIndex(l => l.id === id);
        if (index !== -1) {
          if (confirm("Are you sure you want to delete this shortened link? Clicks log history will be archived.")) {
            // Delete clicks associated with this link
            AppState.clicks = AppState.clicks.filter(c => c.linkId !== id);
            AppState.links.splice(index, 1);
            saveStateToStorage();
            renderDashboard();
            showToast("Link Deleted", "Shortlink was successfully removed.", "success");
          }
        }
      });
    });
  }
}

// 5. Create Link Page
function renderCreateLinkPage() {
  document.title = "Create Link | ShortLink";
  document.getElementById("pageMainTitle").innerText = "Create Link";
  const view = document.getElementById("viewCreateLink");
  view.classList.add("active");
  
  // Clear forms
  document.getElementById("createLongUrl").value = "";
  document.getElementById("createAlias").value = "";
  document.getElementById("createExpiry").value = "";
  document.getElementById("createPasswordToggle").checked = false;
  document.getElementById("createPassword").value = "";
  document.getElementById("createPasswordContainer").style.display = "none";
}

// 6. Analytics Dashboard Page
function renderAnalyticsDashboard() {
  document.title = "Analytics Dashboard | ShortLink";
  document.getElementById("pageMainTitle").innerText = "Analytics Dashboard";
  const view = document.getElementById("viewAnalytics");
  view.classList.add("active");

  // Calculate Metrics
  const totalClicks = AppState.clicks.length;
  
  // Unique visitors (mocked by distinct IPs in seed/simulation data)
  const uniqueIPs = new Set(AppState.clicks.map(c => c.ip));
  const uniqueVisitors = uniqueIPs.size;
  
  // Average Clicks per link
  const linkCount = AppState.links.length;
  const avgClicks = linkCount > 0 ? (totalClicks / linkCount).toFixed(1) : 0;
  
  // Most Popular Link
  let popularUrl = "shrt.lnk/none";
  let popularClicksCount = 0;
  if (linkCount > 0) {
    const popularLink = [...AppState.links].sort((a, b) => b.clicks - a.clicks)[0];
    popularUrl = popularLink.shortUrl;
    popularClicksCount = popularLink.clicks;
  }

  // Inject metrics values
  document.getElementById("analyticsTotalClicks").innerText = totalClicks;
  document.getElementById("analyticsUniqueVisitors").innerText = uniqueVisitors;
  document.getElementById("analyticsPopularLink").innerText = popularUrl;
  document.getElementById("analyticsPopularLink").title = popularUrl;
  document.getElementById("analyticsPopularClicks").innerText = `${popularClicksCount} clicks`;
  document.getElementById("analyticsAvgClicks").innerText = avgClicks;

  // Initialize and Render Chart.js
  setTimeout(renderAnalyticsCharts, 100);
}

// 7. Link Details Page
function renderLinkDetailsPage() {
  document.title = "Link Details | ShortLink";
  document.getElementById("pageMainTitle").innerText = "Link Details";
  const view = document.getElementById("viewLinkDetails");
  view.classList.add("active");

  // Load details of selected link or fallback to first
  let link = AppState.links.find(l => l.id === AppState.selectedLinkId);
  if (!link && AppState.links.length > 0) {
    link = AppState.links[0];
    AppState.selectedLinkId = link.id;
  }

  if (!link) {
    showToast("Error", "No links found. Please create a link first.", "error");
    window.location.hash = "#/dashboard";
    return;
  }

  // Populate data
  document.getElementById("detailLongUrl").innerText = link.longUrl;
  document.getElementById("detailShortUrl").innerText = link.shortUrl;
  document.getElementById("detailCreatedDate").innerText = formatDateOnly(link.created);
  document.getElementById("detailExpiryDate").innerText = link.expiry ? formatDateOnly(link.expiry) : "Never";
  document.getElementById("detailPasswordStatus").innerText = link.password ? "Yes (Protected)" : "No";
  document.getElementById("detailClicksValue").innerText = link.clicks;
  
  // Render QR code SVG
  const qrContainer = document.getElementById("detailQrContainer");
  qrContainer.innerHTML = drawMockQrSvg(link.shortUrl);

  // Render recent timeline activity
  const timeline = document.getElementById("detailActivityTimeline");
  const timelineEmpty = document.getElementById("detailTimelineEmpty");
  timeline.innerHTML = "";

  const linkClicks = AppState.clicks
    .filter(c => c.linkId === link.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10); // Show recent 10 hits

  if (linkClicks.length === 0) {
    timelineEmpty.style.display = "flex";
    timeline.style.display = "none";
  } else {
    timelineEmpty.style.display = "none";
    timeline.style.display = "flex";

    linkClicks.forEach(click => {
      const li = document.createElement("li");
      li.className = "timeline-item";
      li.innerHTML = `
        <div class="timeline-badge"></div>
        <div class="timeline-content">
          <div class="timeline-event">
            <span class="timeline-title">Visitor Redirected</span>
            <span class="timeline-desc">IP: ${click.ip} • Country: ${click.country}</span>
          </div>
          <div class="timeline-meta">
            <div>${formatDateTime(click.timestamp)}</div>
            <div style="font-size: 0.7rem; opacity: 0.85;">${click.device} • ${click.browser}</div>
          </div>
        </div>
      `;
      timeline.appendChild(li);
    });
  }
}

// 8. Settings Page
function renderSettingsPage() {
  document.title = "Settings | ShortLink";
  document.getElementById("pageMainTitle").innerText = "Settings";
  const view = document.getElementById("viewSettings");
  view.classList.add("active");

  // Load values
  document.getElementById("settingsName").value = AppState.session.user.name;
  document.getElementById("settingsEmail").value = AppState.session.user.email;
  
  // Password forms cleared
  document.getElementById("settingsOldPassword").value = "";
  document.getElementById("settingsNewPassword").value = "";
  document.getElementById("settingsConfirmPassword").value = "";
}

// ==========================================================================
// 8. Form Submissions and Interaction Handlers
// ==========================================================================
function setupInteractionHandlers() {
  // Mobile Sidebar Hamburger toggle
  const sidebarToggle = document.getElementById("sidebarToggleBtn");
  const sidebar = document.getElementById("dashboardSidebar");
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("mobile-open");
    });
  }
  
  // Close mobile sidebar clicking outside
  document.addEventListener("click", (e) => {
    if (sidebar && sidebar.classList.contains("mobile-open") && !sidebar.contains(e.target) && e.target !== sidebarToggle) {
      sidebar.classList.remove("mobile-open");
    }
  });

  // A. Quick Shortener Bar on Landing Page
  const quickShortenBtn = document.getElementById("quickShortenBtn");
  const quickUrlInput = document.getElementById("quickUrlInput");
  if (quickShortenBtn && quickUrlInput) {
    quickShortenBtn.addEventListener("click", () => {
      const urlVal = quickUrlInput.value.trim();
      if (!urlVal) {
        showToast("Error", "Please input a valid destination URL.", "error");
        return;
      }
      
      // Basic URL verification
      if (!urlVal.startsWith("http://") && !urlVal.startsWith("https://")) {
        showToast("Validation Warning", "Automatically prefixed with https://.", "warning");
      }

      quickShortenBtn.innerText = "Processing...";
      quickShortenBtn.disabled = true;

      // Simulate a small network delay
      setTimeout(() => {
        const alias = generateShortCode();
        const short = `shrt.lnk/${alias}`;
        
        // Save to state as a new link (even for guest, so if they sign up/log in, it will show up!)
        const newLnk = {
          id: `lnk-${Math.random().toString(36).substr(2, 9)}`,
          longUrl: urlVal.startsWith("http") ? urlVal : `https://${urlVal}`,
          shortUrl: short,
          alias: alias,
          clicks: 0,
          created: new Date().toISOString(),
          expiry: "",
          password: "",
          status: "active"
        };
        AppState.links.push(newLnk);
        saveStateToStorage();

        // Display shortened value and copy
        quickUrlInput.value = short;
        quickShortenBtn.innerText = "Copied!";
        quickShortenBtn.disabled = false;
        
        navigator.clipboard.writeText(short);
        showToast("Link Generated", "Shortlink copied! Log in to view detailed analytics graphs.", "success");

        setTimeout(() => {
          quickShortenBtn.innerText = "Shorten";
        }, 3000);
      }, 700);
    });
  }

  // B. Login Form Handler
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;

      if (!email || !password) {
        showToast("Auth Error", "Please fill in all required credentials.", "error");
        return;
      }

      // Successful simulated auth
      AppState.session.isLoggedIn = true;
      AppState.session.user.email = email;
      // Extract username from email as mock
      const namePart = email.split("@")[0].replace(/[._]/g, " ");
      AppState.session.user.name = namePart.charAt(0).toUpperCase() + namePart.slice(1);
      
      saveStateToStorage();
      showToast("Signed In", `Welcome back, ${AppState.session.user.name}!`, "success");
      
      window.location.hash = "#/dashboard";
    });
  }

  // C. Register Form Handler
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("registerName").value.trim();
      const email = document.getElementById("registerEmail").value.trim();
      const password = document.getElementById("registerPassword").value;
      const confirmPassword = document.getElementById("registerConfirmPassword").value;

      if (password !== confirmPassword) {
        showToast("Validation Error", "Passwords do not match.", "error");
        return;
      }

      // Successful simulated registration
      AppState.session.isLoggedIn = true;
      AppState.session.user.name = name;
      AppState.session.user.email = email;
      
      saveStateToStorage();
      showToast("Account Created", `Successfully registered! Welcome, ${name}.`, "success");
      
      window.location.hash = "#/dashboard";
    });
  }

  // D. Create Link Form Handler
  const createLinkForm = document.getElementById("createLinkForm");
  const createPasswordToggle = document.getElementById("createPasswordToggle");
  const createPasswordContainer = document.getElementById("createPasswordContainer");
  const createLinkResetBtn = document.getElementById("createLinkResetBtn");

  if (createPasswordToggle && createPasswordContainer) {
    createPasswordToggle.addEventListener("change", () => {
      createPasswordContainer.style.display = createPasswordToggle.checked ? "flex" : "none";
    });
  }

  if (createLinkResetBtn && createLinkForm) {
    createLinkResetBtn.addEventListener("click", () => {
      createLinkForm.reset();
      createPasswordContainer.style.display = "none";
    });
  }

  if (createLinkForm) {
    createLinkForm.addEventListener("submit", (e) => {
      e.preventDefault();
      let longUrl = document.getElementById("createLongUrl").value.trim();
      let alias = document.getElementById("createAlias").value.trim().replace(/\s+/g, '-');
      const expiry = document.getElementById("createExpiry").value;
      const enablePassword = document.getElementById("createPasswordToggle").checked;
      const password = enablePassword ? document.getElementById("createPassword").value : "";

      if (!longUrl) {
        showToast("Error", "Destination URL is required.", "error");
        return;
      }

      if (!longUrl.startsWith("http://") && !longUrl.startsWith("https://")) {
        longUrl = "https://" + longUrl;
      }

      // Generate alias if empty
      if (!alias) {
        alias = generateShortCode();
      }

      // Check unique alias duplication
      const duplicate = AppState.links.find(l => l.alias === alias);
      if (duplicate) {
        showToast("Duplicate Error", "Custom alias is already in use. Please select a unique path.", "error");
        return;
      }

      const shortUrl = `shrt.lnk/${alias}`;
      const newLink = {
        id: `lnk-${Math.random().toString(36).substr(2, 9)}`,
        longUrl,
        shortUrl,
        alias,
        clicks: 0,
        created: new Date().toISOString(),
        expiry,
        password,
        status: "active"
      };

      AppState.links.push(newLink);
      saveStateToStorage();
      
      showToast("Link Shortened", `Successfully created short URL shrt.lnk/${alias}.`, "success");
      
      // Reset form
      createLinkForm.reset();
      createPasswordContainer.style.display = "none";
      
      // Redirect to Dashboard
      window.location.hash = "#/dashboard";
    });
  }

  // E. Profile Settings Form Handler
  const profileForm = document.getElementById("settingsProfileForm");
  if (profileForm) {
    profileForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("settingsName").value.trim();
      const email = document.getElementById("settingsEmail").value.trim();

      AppState.session.user.name = name;
      AppState.session.user.email = email;
      saveStateToStorage();
      updateSidebarUser();
      
      showToast("Settings Updated", "Profile details updated successfully.", "success");
    });
  }

  // F. Change Password Form Handler
  const passwordForm = document.getElementById("settingsPasswordForm");
  if (passwordForm) {
    passwordForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const oldPass = document.getElementById("settingsOldPassword").value;
      const newPass = document.getElementById("settingsNewPassword").value;
      const confPass = document.getElementById("settingsConfirmPassword").value;

      if (newPass !== confPass) {
        showToast("Validation Error", "New passwords do not match.", "error");
        return;
      }

      // Simulated success
      passwordForm.reset();
      showToast("Password Updated", "Your account security credentials have been modified.", "success");
    });
  }

  // G. Traffic Simulation Buttons
  const btnSimulateGlobal = document.getElementById("btnSimulateTraffic");
  if (btnSimulateGlobal) {
    btnSimulateGlobal.addEventListener("click", () => {
      simulateTraffic();
    });
  }

  const btnSimulateTrafficDetail = document.getElementById("btnSimulateTrafficDetail");
  if (btnSimulateTrafficDetail) {
    btnSimulateTrafficDetail.addEventListener("click", () => {
      const linkId = AppState.selectedLinkId;
      if (linkId) {
        simulateTraffic(linkId);
      }
    });
  }

  // H. QR Image Mock download
  const btnDownloadQr = document.getElementById("btnDownloadQr");
  if (btnDownloadQr) {
    btnDownloadQr.addEventListener("click", () => {
      showToast("Downloading QR", "Rendering vector file bundle. Look for download file in browser taskbar.", "success");
    });
  }

  // I. Link Details Page Copy
  const btnDetailCopy = document.getElementById("btnDetailCopy");
  if (btnDetailCopy) {
    btnDetailCopy.addEventListener("click", () => {
      const urlText = document.getElementById("detailShortUrl").innerText;
      copyToClipboard(urlText);
    });
  }
}

// ==========================================================================
// 9. Startup Initialization
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  // Load states from storage
  loadStateFromStorage();
  
  // Setup all event listeners
  setupInteractionHandlers();
  
  // Process direct loading of hash or redirect to landing page
  const initialHash = window.location.hash || "#/";
  activateRoute(initialHash);
});
