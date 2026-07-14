// ===============================
// PRIME AUTHORITY SCRIPT V2
// ===============================

import { auth, database } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  ref,
  push,
  set,
  onValue,
  update,
  remove,
  get,
  off,
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

const API_BASE_URL = "https://prime-authority-backend.onrender.com";

const state = {
  user: null,
  notifications: [],
  authMode: "login",
  formSettings: {
    tournament: true,
    scrims: true,
    join: true,
    tournamentBanner: false,
    scrimBanner: false,
    joinBanner: false,
    upcomingTournamentBanner: false,
    tournamentBannerImage: "",
    scrimBannerImage: "",
    joinBannerImage: "",
    upcomingTournamentBannerImage: "",
  },
  rosterSize: 5,
  hero: {
    title: "PRIME AUTHORITY",
    subtitle: "Where Champions Are Made.",
    description: "India's Professional Free Fire Esports Organization",
    buttonText: "Join Organization",
    buttonLink: "join.html",
  },
  lineup: [],
  roomSettings: {},
  roomMapping: {},
};

const FORGOT_PASSWORD_COOLDOWN_MS = 5 * 60 * 1000;
let forgotPasswordCooldownTimer = null;
let notificationListeners = [];
let notificationSectionData = {};

function init() {
  injectAuthUI();
  injectAuthTrigger();
  attachFormHandlers();
  attachGlobalEvents();
  initLoader();
  initRevealAnimations();
  initButtonAnimations();
  watchAuth();
  listenToFormSettings();
  listenToHeroContent();
  listenToLineup();
  renderNotificationsPage();

  const params = new URLSearchParams(window.location.search);
  if (params.get('auth') === 'login') {
    openAuthModal('login');
  }
}

function initLoader() {
  window.addEventListener("load", function () {
    const loader = document.getElementById("loader");
    if (loader) {
      loader.style.opacity = "0";
      setTimeout(() => {
        loader.style.display = "none";
      }, 500);
    }
  });
}

function initButtonAnimations() {
  const buttons = document.querySelectorAll(".btn,.btn2,.big-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("mouseenter", () => {
      btn.style.transform = "scale(1.05)";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.transform = "scale(1)";
    });
  });
}

function initRevealAnimations() {
  const revealElements = document.querySelectorAll(
    ".card,.team-card,.achievement-card,.t-card,.about,.recruitment"
  );
  const reveal = () => {
    const trigger = window.innerHeight - 100;
    revealElements.forEach((el) => {
      const top = el.getBoundingClientRect().top;
      if (top < trigger) {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      }
    });
  };
  reveal();
  window.addEventListener("scroll", reveal);
}

function injectAuthTrigger() {
  const menus = document.querySelectorAll(".menu");
  menus.forEach((menu) => {
    if (menu.querySelector("[data-auth-trigger]")) return;
    const item = document.createElement("li");
    item.innerHTML = '<a href="#" class="auth-trigger" data-auth-trigger>Login</a>';
    menu.appendChild(item);
  });
}

function injectAuthUI() {
  if (document.getElementById("authModal")) return;

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div id="authModal" class="auth-modal">
      <div class="auth-card">
        <button class="auth-close" id="authCloseBtn" type="button">×</button>
        <div class="auth-form-panel" id="loginPanel">
          <h2>Player Login</h2>
          <p class="auth-subtitle">Access your Prime Authority profile</p>
          <form id="loginForm" class="auth-form">
            <label>Email</label>
            <div class="input-wrap">
              <input type="email" id="loginEmail" placeholder="Enter your gmail" required>
            </div>
            <label>Password</label>
            <div class="input-wrap password-wrap">
              <input type="password" id="loginPassword" placeholder="Enter your password" required>
              <button type="button" class="toggle-pass" data-target="loginPassword">👁</button>
            </div>
            <button type="button" class="small-link" id="forgotPasswordLink">Forget password?</button>
            <button type="submit" class="btn auth-submit">Login</button>
            <p class="switch-text">New player? <a href="#" id="showSignupLink">Create New Profile</a></p>
          </form>
        </div>
        <div class="auth-form-panel hidden" id="forgotPanel">
          <h2>Reset Password</h2>
          <p class="auth-subtitle">Enter your email and we’ll send a reset link.</p>
          <form id="forgotPasswordForm" class="auth-form">
            <label>Email</label>
            <div class="input-wrap">
              <input type="email" id="forgotEmail" placeholder="Enter your registered email" required>
            </div>
            <div id="forgotPasswordMessage" class="auth-status-message" style="display:none;"></div>
            <div id="forgotCountdownTimer" class="auth-status-message" style="display:none;"></div>
            <button type="submit" class="btn auth-submit" id="forgotPasswordSubmitBtn">Send Reset Link</button>
            <button type="button" class="small-link" id="backToLoginLink">Back to Login</button>
          </form>
        </div>
        <div class="auth-form-panel hidden" id="signupPanel">
          <h2>Player Sign Up</h2>
          <p class="auth-subtitle">Create your player profile</p>
          <form id="signupForm" class="auth-form">
            <label>Full Name</label>
            <div class="input-wrap">
              <input type="text" id="signupName" placeholder="Enter your full name" required>
            </div>
            <label>Email</label>
            <div class="input-wrap">
              <input type="email" id="signupEmail" placeholder="Enter your gmail" required>
            </div>
            <label>Password</label>
            <div class="input-wrap password-wrap">
              <input type="password" id="signupPassword" placeholder="Enter your password" required>
              <button type="button" class="toggle-pass" data-target="signupPassword">👁</button>
            </div>
            <div class="password-hint">Password must be at least 7 characters long and include at least one digit.</div>
            <label>Confirm Password</label>
            <div class="input-wrap password-wrap">
              <input type="password" id="signupConfirmPassword" placeholder="Confirm your password" required>
              <button type="button" class="toggle-pass" data-target="signupConfirmPassword">👁</button>
            </div>
            <button type="submit" class="btn auth-submit">Sign Up</button>
            <p class="switch-text">Already have an account? <a href="#" id="showLoginLink">Login Here</a></p>
          </form>
        </div>
      </div>
    </div>

    <div id="profileDrawer" class="profile-drawer">
      <div class="profile-drawer-content">
        <div class="profile-drawer-head">
          <div class="profile-avatar-large" id="profileAvatarLarge">U</div>
          <div>
            <h3 id="profileNameLarge">User Name</h3>
            <button class="edit-name-btn" id="editNameBtn" type="button">Edit</button>
          </div>
          <button class="drawer-close" id="drawerCloseBtn" type="button">×</button>
        </div>
        <div class="profile-info-block">
          <p class="profile-label">Email Address</p>
          <p class="profile-value" id="profileEmail">user@example.com</p>
        </div>
        <div class="profile-nav-list">
          <a href="index.html">Home</a>
          <a href="join.html">Join</a>
          <a href="tournament.html">Tournament</a>
          <a href="scrims.html">Scrims</a>
          <a href="contact.html">Contact</a>
        </div>
        <button class="btn auth-submit" id="logoutBtn" type="button">Logout</button>
      </div>
    </div>
    `
  );
}

function getApiBaseUrl() {
  return API_BASE_URL;
}

function getForgotCooldownStorageKey(email) {
  return `prime_authority_forgot_cooldown_${(email || "").trim().toLowerCase()}`;
}

function formatForgotCooldownTime(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function clearForgotCooldown(email) {
  if (!email) return;
  localStorage.removeItem(getForgotCooldownStorageKey(email));
}

function getForgotCooldownExpiry(email) {
  const value = localStorage.getItem(getForgotCooldownStorageKey(email));
  if (!value) return null;
  const expiry = Number(value);
  return Number.isFinite(expiry) ? expiry : null;
}

function stopForgotCooldownTimer() {
  if (forgotPasswordCooldownTimer) {
    window.clearInterval(forgotPasswordCooldownTimer);
    forgotPasswordCooldownTimer = null;
  }
}

function showForgotStatus(message, isSuccess = true) {
  const statusBox = document.getElementById("forgotPasswordMessage");
  if (!statusBox) return;
  statusBox.textContent = message;
  statusBox.className = `auth-status-message ${isSuccess ? "success" : "error"}`;
  statusBox.style.display = "block";
}

function updateForgotCooldownUI() {
  const emailInput = document.getElementById("forgotEmail");
  const email = emailInput?.value?.trim().toLowerCase() || "";
  const button = document.getElementById("forgotPasswordSubmitBtn");
  const timerBox = document.getElementById("forgotCountdownTimer");

  stopForgotCooldownTimer();

  if (!button || !timerBox) return;

  const expiry = getForgotCooldownExpiry(email);
  if (!expiry || expiry <= Date.now()) {
    clearForgotCooldown(email);
    button.disabled = false;
    button.textContent = "Resend Reset Link";
    timerBox.textContent = "";
    timerBox.style.display = "none";
    return;
  }

  const tick = () => {
    const remainingMs = expiry - Date.now();
    if (remainingMs <= 0) {
      clearForgotCooldown(email);
      stopForgotCooldownTimer();
      updateForgotCooldownUI();
      return;
    }

    const remainingText = formatForgotCooldownTime(remainingMs);
    button.disabled = true;
    button.textContent = `Resend available in ${remainingText}`;
    timerBox.textContent = `Resend available in ${remainingText}`;
    timerBox.className = "auth-status-message";
    timerBox.style.display = "block";
  };

  tick();
  forgotPasswordCooldownTimer = window.setInterval(tick, 1000);
}

function startForgotCooldown(email) {
  if (!email) return;
  const expiry = Date.now() + FORGOT_PASSWORD_COOLDOWN_MS;
  localStorage.setItem(getForgotCooldownStorageKey(email), String(expiry));
  updateForgotCooldownUI();
}

async function handleForgotPasswordRequest() {
  const email = document.getElementById("forgotEmail")?.value?.trim() || "";
  const button = document.getElementById("forgotPasswordSubmitBtn");
  const normalizedEmail = email.toLowerCase();

  if (!email) {
    showForgotStatus("Please enter your email address.", false);
    return;
  }

  if (getForgotCooldownExpiry(normalizedEmail) && getForgotCooldownExpiry(normalizedEmail) > Date.now()) {
    showForgotStatus("Please wait 5 minutes before requesting another reset link.", false);
    updateForgotCooldownUI();
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Please wait";
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    let message = "Password reset link sent successfully. Please check your email. and check spam folder.";
    let success = false;
    try {
      const data = await response.json();
      message = data.message || message;
      success = Boolean(data.success);
    } catch {
      message = response.statusText || message;
    }

    if (response.ok && success) {
      startForgotCooldown(normalizedEmail);
      showForgotStatus("Password reset link sent successfully. Please check your email. and check spam folder.", true);
    } else {
      showForgotStatus(message, false);
    }
  } catch (error) {
    console.error("Forgot password request failed:", error);
    showForgotStatus("Unable to reach the server. Please try again later.", false);
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Send Reset Link";
    }
  }
}

function attachGlobalEvents() {
  let lastScrollY = window.scrollY;
  let header = document.querySelector('header');

  const updateHeaderVisibility = () => {
    const currentScroll = window.scrollY;
    if (!header) {
      header = document.querySelector('header');
      if (!header) return;
    }

    if (currentScroll > 100 && currentScroll > lastScrollY) {
      header.classList.add('hidden');
    } else {
      header.classList.remove('hidden');
    }

    lastScrollY = currentScroll;
  };

  window.addEventListener('scroll', updateHeaderVisibility, { passive: true });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-auth-trigger]");
    if (trigger) {
      event.preventDefault();
      if (state.user) {
        openProfileDrawer();
      } else {
        openAuthModal("login");
      }
    }

    if (event.target.id === "authCloseBtn" || event.target.id === "profileDrawer") {
      closeAuthModal();
      closeProfileDrawer();
    }

    if (event.target.id === "drawerCloseBtn") {
      closeProfileDrawer();
    }

    if (event.target.id === "showSignupLink") {
      event.preventDefault();
      showAuthPanel("signup");
    }

    if (event.target.id === "showLoginLink") {
      event.preventDefault();
      showAuthPanel("login");
    }

    if (event.target.id === "forgotPasswordLink") {
      event.preventDefault();
      showAuthPanel("forgot");
    }

    if (event.target.id === "backToLoginLink") {
      event.preventDefault();
      showAuthPanel("login");
    }

    if (event.target.id === "forgotEmail") {
      updateForgotCooldownUI();
    }

    if (event.target.classList.contains("toggle-pass")) {
      event.preventDefault();
      const target = document.getElementById(event.target.dataset.target);
      if (target) {
        target.type = target.type === "password" ? "text" : "password";
      }
    }

    if (event.target.id === "editNameBtn") {
      event.preventDefault();
      toggleEditNameMode();
    }
  });

  document.addEventListener("submit", async (event) => {
    if (event.target.id === "loginForm") {
      event.preventDefault();
      await handleLogin();
    }

    if (event.target.id === "signupForm") {
      event.preventDefault();
      await handleSignup();
    }

    if (event.target.id === "forgotPasswordForm") {
      event.preventDefault();
      await handleForgotPasswordRequest();
    }

    if (event.target.id === "footerContactForm") {
      event.preventDefault();
      await handleFooterContactSubmit();
    }
  });

  document.getElementById("logoutBtn")?.addEventListener("click", async () => {
    await signOut(auth);
    closeProfileDrawer();
  });

  window.addEventListener("open-auth-modal", (event) => {
    openAuthModal(event.detail?.mode || "login");
  });
}

async function handleFooterContactSubmit() {
  const form = document.getElementById("footerContactForm");
  const submitButton = document.getElementById("footerContactSubmit");
  const name = document.getElementById("footerName")?.value?.trim() || "";
  const email = document.getElementById("footerEmail")?.value?.trim() || "";
  const message = document.getElementById("footerMessage")?.value?.trim() || "";

  if (!name || !email || !message) {
    window.alert("Please fill in your name, email, and message.");
    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/contact-form`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: name,
        emailAddress: email,
        mobileNumber: "",
        subject: "Footer Contact",
        category: "Other",
        message,
        userId: auth.currentUser?.uid || "",
        userEmail: auth.currentUser?.email || "",
        status: "Pending",
        createdAt: new Date().toISOString(),
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to send your message right now.");
    }

    if (form) form.reset();
    window.alert(result.message || "Your message was sent successfully.");
  } catch (error) {
    console.error("Footer contact failed:", error);
    window.alert(error.message || "Unable to send your message right now.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Send Message";
    }
  }
}

function showAuthPanel(mode) {
  document.getElementById("loginPanel")?.classList.toggle("hidden", mode !== "login");
  document.getElementById("signupPanel")?.classList.toggle("hidden", mode !== "signup");
  document.getElementById("forgotPanel")?.classList.toggle("hidden", mode !== "forgot");
  state.authMode = mode;

  if (mode === "forgot") {
    updateForgotCooldownUI();
  }
}

function openAuthModal(mode = "login") {
  const modal = document.getElementById("authModal");
  if (!modal) return;
  showAuthPanel(mode);
  modal.classList.add("open");
}

function closeAuthModal() {
  document.getElementById("authModal")?.classList.remove("open");
}

function openProfileDrawer() {
  const drawer = document.getElementById("profileDrawer");
  if (drawer) {
    drawer.classList.add("open");
  }
}

function closeProfileDrawer() {
  const drawer = document.getElementById("profileDrawer");
  if (drawer) {
    drawer.classList.remove("open");
  }
}

async function handleLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const loginButton = document.querySelector('#loginForm .auth-submit');
  setButtonLoading(loginButton, true, 'Logging in...');
  try {
    await signInWithEmailAndPassword(auth, email, password);
    closeAuthModal();
  } catch (error) {
    const rawMessage = String(error?.message || "").toLowerCase();
    const errorMessage = error?.code === "auth/wrong-password" || rawMessage.includes("wrong-password") || rawMessage.includes("invalid-credential")
      ? "Incorrect password"
      : error?.code === "auth/user-not-found" || rawMessage.includes("user-not-found")
      ? "User not found"
      : error?.message || "Login failed";
    await showErrorModal('Login Failed', errorMessage);
  } finally {
    setButtonLoading(loginButton, false, 'Login');
  }
}

async function handleSignup() {
  const fullName = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirmPassword = document.getElementById("signupConfirmPassword").value;

  if (password !== confirmPassword) {
    await showErrorModal('Error', 'Passwords do not match.');
    return;
  }

  if (!isPasswordValid(password)) {
    await showErrorModal('Error', 'Password must be at least 7 characters long and include at least one digit.');
    return;
  }

  const signupButton = document.querySelector('#signupForm .auth-submit');
  setButtonLoading(signupButton, true, 'Signing up...');

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: fullName });
    await set(ref(database, `users/${credential.user.uid}`), {
      fullName,
      email,
      createdAt: new Date().toISOString(),
    });
    closeAuthModal();
  } catch (error) {
    await showErrorModal('Signup Failed', error.message);
  } finally {
    setButtonLoading(signupButton, false, 'Sign Up');
  }
}

function setButtonLoading(button, loading, label) {
  if (!button) return;
  if (loading) {
    if (!button.dataset.originalHtml) {
      button.dataset.originalHtml = button.innerHTML;
    }
    button.disabled = true;
    button.classList.add('loading');
    button.innerHTML = `<span class="button-spinner"></span> ${label}`;
  } else {
    button.disabled = false;
    button.classList.remove('loading');
    button.innerHTML = button.dataset.originalHtml || label;
    delete button.dataset.originalHtml;
  }
}

function isPasswordValid(password) {
  return typeof password === 'string' && password.length >= 7 && /\d/.test(password);
}

function normalizeIndiaMobile(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return '+91' + digits;
  if (digits.length === 12 && digits.startsWith('91')) return '+' + digits;
  if (/^\+91\d{10}$/.test(value)) return value;
  return null;
}

function validateIndiaMobile(value) {
  return /^\+91\d{10}$/.test(String(value || ''));
}

function watchAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userRef = ref(database, `users/${user.uid}`);
      onValue(userRef, (snapshot) => {
        const data = snapshot.val() || {};
        state.user = {
          uid: user.uid,
          email: user.email || data.email || "",
          fullName: data.fullName || user.displayName || "Player",
          forms: data.forms || {},
        };
        renderAuthButton();
        renderProfileDrawer();
        loadNotifications();
        updateFormAvailability();
      });
    } else {
      state.user = null;
      renderAuthButton();
      renderProfileDrawer();
      loadNotifications();
    }
  });
}

function renderAuthButton() {
  const trigger = document.querySelector("[data-auth-trigger]");
  if (!trigger) return;
  if (state.user) {
    const initial = (state.user.fullName || state.user.email || "U")
      .trim()
      .split(/\s+/)[0]
      .charAt(0)
      .toUpperCase();
    trigger.textContent = initial;
    trigger.classList.add("profile-pill");
  } else {
    trigger.textContent = "Login";
    trigger.classList.remove("profile-pill");
  }
}

function renderProfileDrawer() {
  const profileName = document.getElementById("profileNameLarge");
  const profileEmail = document.getElementById("profileEmail");
  const avatar = document.getElementById("profileAvatarLarge");

  if (!state.user) {
    if (profileName) profileName.textContent = "User Name";
    if (profileEmail) profileEmail.textContent = "user@example.com";
    if (avatar) avatar.textContent = "U";
    return;
  }

  if (profileName) profileName.textContent = state.user.fullName || "Player";
  if (profileEmail) profileEmail.textContent = state.user.email || "";
  if (avatar) avatar.textContent = (state.user.fullName || state.user.email || "U").trim().charAt(0).toUpperCase();
}

function toggleEditNameMode() {
  const container = document.getElementById("profileNameLarge");
  if (!container || !state.user) return;

  const currentName = state.user.fullName || "";
  container.innerHTML = `
    <div class="edit-name-wrap">
      <input type="text" id="editNameInput" value="${currentName}" class="edit-name-input">
      <button type="button" id="saveNameBtn" class="edit-save-btn">Save</button>
    </div>
  `;

  document.getElementById("saveNameBtn")?.addEventListener("click", async () => {
    const newName = document.getElementById("editNameInput")?.value.trim();
    if (!newName) return;
    await updateUserName(newName);
  });
}

async function updateUserName(newName) {
  if (!state.user) return;
  try {
    await updateProfile(auth.currentUser, { displayName: newName });
    await update(ref(database, `users/${state.user.uid}`), { fullName: newName });
    state.user.fullName = newName;
    renderProfileDrawer();
    renderAuthButton();
    await showSuccessModal('Success', 'Profile updated successfully.');
  } catch (error) {
    await showErrorModal('Error', error.message);
  }
}

function getFieldValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function getCheckboxValue(id) {
  const element = document.getElementById(id);
  return element ? element.checked : false;
}

function getFileBase64(id) {
  const input = document.getElementById(id);
  const file = input?.files?.[0];
  if (!file) return Promise.resolve("");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result?.toString() || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function listenToHeroContent() {
  onValue(ref(database, "hero"), (snapshot) => {
    const data = snapshot.val() || {};
    state.hero = {
      title: data.title || "PRIME AUTHORITY",
      subtitle: data.subtitle || "Where Champions Are Made.",
      description: data.description || "India's Professional Free Fire Esports Organization",
      buttonText: data.buttonText || "Join Organization",
      buttonLink: data.buttonLink || "join.html",
    };
    renderHeroContent();
  });
}

function renderHeroContent() {
  const titleEl = document.querySelector(".hero .overlay h1");
  const subtitleEl = document.querySelector(".hero .overlay h2");
  const descriptionEl = document.querySelector(".hero .overlay p");
  const buttonWrap = document.querySelector(".hero .hero-btns");
  const button = buttonWrap?.querySelector("a, button");

  if (titleEl) titleEl.textContent = state.hero.title;
  if (subtitleEl) subtitleEl.textContent = state.hero.subtitle;
  if (descriptionEl) descriptionEl.textContent = state.hero.description;

  if (buttonWrap) {
    if (!button) {
      const fallbackButton = document.createElement("a");
      fallbackButton.className = "btn";
      buttonWrap.appendChild(fallbackButton);
    }

    const targetButton = buttonWrap.querySelector("a, button");
    if (targetButton) {
      targetButton.textContent = state.hero.buttonText;
      targetButton.setAttribute("href", state.hero.buttonLink || "join.html");
      targetButton.className = "btn";
    }
  }
}

function listenToLineup() {
  onValue(ref(database, "lineup"), (snapshot) => {
    const data = snapshot.val() || {};
    const entries = Object.entries(data)
      .map(([id, item]) => ({ id, ...(item || {}) }))
      .sort((a, b) => Number(a.serialNumber || 0) - Number(b.serialNumber || 0));
    state.lineup = entries;
    renderLineupPage();
  });
}

function renderLineupPage() {
  const list = document.getElementById("lineupList");
  if (!list) return;
  if (!state.lineup.length) {
    list.innerHTML = '<div class="lineup-empty">No Players Added Yet</div>';
    return;
  }

  // Group entries by teamName
  const groups = {};
  state.lineup.forEach((e) => {
    const key = e.teamName || 'Prime Authority';
    groups[key] = groups[key] || [];
    groups[key].push(e);
  });

  const rosterSize = Math.max(Number(state.rosterSize) || 5, 1);

  list.innerHTML = Object.keys(groups)
    .map((team) => {
      const entries = groups[team].slice().sort((a,b) => Number(a.serialNumber||0) - Number(b.serialNumber||0));
      const visibleRows = Math.max(rosterSize, entries.length);
      const rowsHtml = [];
      for (let i = 1; i <= visibleRows; i++) {
        const e = entries.find(x => Number(x.serialNumber) === i);
        if (e) {
          rowsHtml.push(`
            <tr>
              <td class="cell-sr">${escapeHTML(String(i))}</td>
              <td>${escapeHTML(e.playerIgn || '—')}</td>
              <td>${escapeHTML(e.playerUid || '—')}</td>
              <td>${escapeHTML(e.role || '—')}</td>
              <td>${escapeHTML(e.joiningDate || '—')}</td>
            </tr>
          `);
        } else {
          rowsHtml.push(`
            <tr class="empty-row">
              <td class="cell-sr">${i}</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
              <td>—</td>
            </tr>
          `);
        }
      }

      const logo = entries.find(e => e.logo)?.logo || '';

      return `
        <section class="team-roster">
          <div class="roster-header">
            <div class="roster-meta">
              ${logo ? `<img src="${escapeHTML(logo)}" class="roster-logo" alt="${escapeHTML(team)} logo">` : `<div class="roster-logo placeholder">PA</div>`}
              <h3 class="roster-title">${escapeHTML(team)}</h3>
            </div>
          </div>
          <div class="roster-table-wrap">
            <table class="roster-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Player IGN</th>
                  <th>Player UID</th>
                  <th>Role</th>
                  <th>Joining Date</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml.join('')}
              </tbody>
            </table>
          </div>
        </section>
      `;
    })
    .join('');

  // debug/status element
  let debug = document.getElementById('lineupDebug');
  if (!debug) {
    debug = document.createElement('div');
    debug.id = 'lineupDebug';
    debug.style.color = '#ccc';
    debug.style.fontSize = '12px';
    debug.style.marginTop = '8px';
    list.parentNode?.insertBefore(debug, list.nextSibling || null);
  }
  debug.textContent = `Lineup entries: ${state.lineup.length} • Last update: ${new Date().toLocaleTimeString()}`;
}

function listenToFormSettings() {
  onValue(ref(database, "settings/tournamentFormEnabled"), (snapshot) => {
    state.formSettings.tournament = snapshot.val() !== false;
    updateFormAvailability();
  });

  onValue(ref(database, "settings/scrimFormEnabled"), (snapshot) => {
    state.formSettings.scrims = snapshot.val() !== false;
    updateFormAvailability();
  });

  onValue(ref(database, "settings/joinFormEnabled"), (snapshot) => {
    state.formSettings.join = snapshot.val() !== false;
    updateFormAvailability();
  });

  onValue(ref(database, "settings/tournamentBannerEnabled"), (snapshot) => {
    state.formSettings.tournamentBanner = snapshot.val() === true;
    updateFormAvailability();
  });

  onValue(ref(database, "settings/scrimBannerEnabled"), (snapshot) => {
    state.formSettings.scrimBanner = snapshot.val() === true;
    updateFormAvailability();
  });

  onValue(ref(database, "settings/joinBannerEnabled"), (snapshot) => {
    state.formSettings.joinBanner = snapshot.val() === true;
    updateFormAvailability();
  });

  onValue(ref(database, "settings/upcomingTournamentBannerEnabled"), (snapshot) => {
    state.formSettings.upcomingTournamentBanner = snapshot.val() === true;
    updateFormAvailability();
  });

  onValue(ref(database, "settings/tournamentBannerImage"), (snapshot) => {
    state.formSettings.tournamentBannerImage = snapshot.val() || "";
    updateFormAvailability();
  });

  onValue(ref(database, "settings/scrimBannerImage"), (snapshot) => {
    state.formSettings.scrimBannerImage = snapshot.val() || "";
    updateFormAvailability();
  });

  onValue(ref(database, "settings/joinBannerImage"), (snapshot) => {
    state.formSettings.joinBannerImage = snapshot.val() || "";
    updateFormAvailability();
  });

  onValue(ref(database, "settings/upcomingTournamentBannerImage"), (snapshot) => {
    state.formSettings.upcomingTournamentBannerImage = snapshot.val() || "";
    updateFormAvailability();
  });

  // Room settings and mapping for showing room details after user submits
  onValue(ref(database, "settings/roomSettings"), (snapshot) => {
    state.roomSettings = snapshot.val() || {};
    updateFormAvailability();
  });

  onValue(ref(database, "settings/roomMapping"), (snapshot) => {
    state.roomMapping = snapshot.val() || {};
    updateFormAvailability();
  });

  onValue(ref(database, "settings/rosterSize"), (snapshot) => {
    const v = Number(snapshot.val());
    state.rosterSize = v > 0 ? v : 5;
    renderLineupPage();
  });
}

function getBannerHtml(formType, imageUrl) {
  if (imageUrl) {
    return `<img src="${imageUrl}" style="width: 100%; max-width: 100%; height: auto; object-fit: contain; border-radius: 14px; display: block; margin: 0 auto;" alt="${formType === "tournament" ? "Tournament" : formType === "upcomingTournament" ? "Upcoming Tournament" : formType === "join" ? "Join" : "Scrims"} banner" />`;
  }

  if (formType === "tournament") {
    return "Important: Register now before slots fill up.";
  }

  if (formType === "upcomingTournament") {
    return "Tournament details will appear here.";
  }

  if (formType === "join") {
    return "";
  }

  return "Scrims slots are open now. Book early to secure your match.";
}

function getRoomDataForForm(formType) {
  const mappingKey = state.roomMapping?.[formType] || (formType === 'join' ? 'orgTrial' : formType === 'tournament' ? 'tournament' : 'scrim');
  return state.roomSettings?.[mappingKey] || null;
}

function renderRoomInfo(formType, container) {
  if (!container) return;
  const room = getRoomDataForForm(formType);
  if (!room) {
    container.style.display = 'none';
    return;
  }

  const groups = Array.isArray(room.groups) ? room.groups : String(room.groups || '').split(',').map(s => s.trim()).filter(Boolean);

  container.innerHTML = `
    <div class="room-card" style="background:#0b0b0b;border:1px solid #1e1e2e;padding:18px;border-radius:12px;color:#fff;">
      <h3 style="margin:0 0 8px 0;">Room Details</h3>
      <div style="display:grid;gap:8px;">
        <div><strong>Room ID:</strong> ${escapeHTML(room.roomId || '—')}</div>
        <!--<password removed by admin, field deprecated>-->
        ${groups.length ? `<label style="color:#ccc;font-size:13px;margin-top:6px;">Group Reveal</label>
        <select id="${formType}RoomGroupSelect" style="padding:8px;border-radius:8px;background:#111;border:1px solid #222;color:#fff;">
          ${groups.map(g => `<option value="${escapeHTML(g)}">${escapeHTML(g)}</option>`).join('')}
        </select>` : ''}
        <div><strong>Time & Date:</strong> ${escapeHTML(room.datetime || '—')}</div>
        <div><strong>Rules:</strong><div style="color:#ccc;margin-top:6px;">${escapeHTML(room.rules || '—')}</div></div>
      </div>
    </div>
  `;
  container.style.display = 'block';
}

function updateFormAvailability() {
  const upcomingTournamentBanner = document.getElementById("upcomingTournamentBanner");
  if (upcomingTournamentBanner) {
    upcomingTournamentBanner.innerHTML = getBannerHtml("upcomingTournament", state.formSettings.upcomingTournamentBannerImage);
    upcomingTournamentBanner.style.display = state.formSettings.upcomingTournamentBanner ? "block" : "none";
  }

  const tournamentFormContainer = document.getElementById("tournamentFormContainer");
  const tournamentComingSoon = document.getElementById("tournamentComingSoon");
  const tournamentStatus = document.getElementById("tournamentStatusText");
  const tournamentBanner = document.getElementById("tournamentBanner");
  if (tournamentFormContainer || tournamentComingSoon) {
    if (state.formSettings.tournament) {
      if (tournamentFormContainer) tournamentFormContainer.style.display = "block";
      if (tournamentComingSoon) tournamentComingSoon.style.display = "none";
      if (tournamentBanner) {
        tournamentBanner.innerHTML = getBannerHtml("tournament", state.formSettings.tournamentBannerImage);
        tournamentBanner.style.display = state.formSettings.tournamentBanner ? "block" : "none";
      }
      if (tournamentStatus) {
        tournamentStatus.textContent = "";
        tournamentStatus.style.color = "#ccc";
      }
      // room info for users who already submitted
      const tournamentRoomInfoId = 'tournamentRoomInfo';
      let tournamentRoomInfo = document.getElementById(tournamentRoomInfoId);
      const tournamentSubmittedMsgId = 'tournamentSubmittedMsg';
      let tournamentSubmittedMsg = document.getElementById(tournamentSubmittedMsgId);
      if (!tournamentRoomInfo && tournamentFormContainer) {
        tournamentRoomInfo = document.createElement('div');
        tournamentRoomInfo.id = tournamentRoomInfoId;
        tournamentFormContainer.parentNode?.insertBefore(tournamentRoomInfo, tournamentFormContainer.nextSibling || null);
      }
      if (!tournamentSubmittedMsg && tournamentFormContainer) {
        tournamentSubmittedMsg = document.createElement('div');
        tournamentSubmittedMsg.id = tournamentSubmittedMsgId;
        tournamentFormContainer.parentNode?.insertBefore(tournamentSubmittedMsg, tournamentFormContainer.nextSibling || null);
      }
      const userSubmittedTournament = state.user?.forms?.tournament;
      if (userSubmittedTournament) {
        if (tournamentFormContainer) tournamentFormContainer.style.display = 'none';
        const room = getRoomDataForForm('tournament');
        if (room) {
          if (tournamentSubmittedMsg) tournamentSubmittedMsg.style.display = 'none';
          if (tournamentRoomInfo) renderRoomInfo('tournament', tournamentRoomInfo);
        } else {
          if (tournamentRoomInfo) tournamentRoomInfo.style.display = 'none';
          if (tournamentSubmittedMsg) {
            tournamentSubmittedMsg.innerHTML = `<div class="room-card" style="padding:14px;border-radius:12px;border:1px solid #1e1e2e;color:#fff;background:#0b0b0b;">Form already submitted — Room ID & Password coming soon.</div>`;
            tournamentSubmittedMsg.style.display = 'block';
          }
        }
      } else {
        if (tournamentRoomInfo) tournamentRoomInfo.style.display = 'none';
      }
    } else {
      if (tournamentFormContainer) tournamentFormContainer.style.display = "none";
      if (tournamentComingSoon) tournamentComingSoon.style.display = "block";
      if (tournamentBanner) {
        tournamentBanner.style.display = "none";
      }
      if (tournamentStatus) {
        tournamentStatus.textContent = "Tournament registrations are currently closed by the admin.";
        tournamentStatus.style.color = "#ff2b2b";
      }
    }
  }

  const joinFormContainer = document.getElementById("joinForm");
  const joinComingSoon = document.getElementById("joinComingSoon");
  const joinBanner = document.getElementById("joinBanner");
  const joinRoomInfoId = 'joinRoomInfo';
  let joinRoomInfo = document.getElementById(joinRoomInfoId);
  if (!joinRoomInfo && joinFormContainer) {
    joinRoomInfo = document.createElement('div');
    joinRoomInfo.id = joinRoomInfoId;
    joinFormContainer.parentNode?.insertBefore(joinRoomInfo, joinFormContainer.nextSibling || null);
  }
  const joinSubmittedMsgId = 'joinSubmittedMsg';
  let joinSubmittedMsg = document.getElementById(joinSubmittedMsgId);
  if (!joinSubmittedMsg && joinFormContainer) {
    joinSubmittedMsg = document.createElement('div');
    joinSubmittedMsg.id = joinSubmittedMsgId;
    joinFormContainer.parentNode?.insertBefore(joinSubmittedMsg, joinFormContainer.nextSibling || null);
  }
  if (joinFormContainer || joinComingSoon) {
    if (state.formSettings.join) {
      // If user submitted, show room info instead
      const userSubmittedJoin = state.user?.forms?.join;
      if (userSubmittedJoin) {
        if (joinFormContainer) joinFormContainer.style.display = "none";
        const room = getRoomDataForForm('join');
        if (room) {
          if (joinSubmittedMsg) joinSubmittedMsg.style.display = 'none';
          if (joinRoomInfo) renderRoomInfo('join', joinRoomInfo);
        } else {
          if (joinRoomInfo) joinRoomInfo.style.display = 'none';
          if (joinSubmittedMsg) {
            joinSubmittedMsg.innerHTML = `<div class="room-card" style="padding:14px;border-radius:12px;border:1px solid #1e1e2e;color:#fff;background:#0b0b0b;">Form already submitted — Room ID & Password coming soon.</div>`;
            joinSubmittedMsg.style.display = 'block';
          }
        }
      } else {
        if (joinFormContainer) joinFormContainer.style.display = "block";
        if (joinRoomInfo) joinRoomInfo.style.display = 'none';
      }
      if (joinComingSoon) joinComingSoon.style.display = "none";
      if (joinBanner) {
        joinBanner.innerHTML = getBannerHtml("join", state.formSettings.joinBannerImage);
        joinBanner.style.display = state.formSettings.joinBanner && state.formSettings.joinBannerImage ? "block" : "none";
      }
    } else {
      if (joinFormContainer) joinFormContainer.style.display = "none";
      if (joinComingSoon) joinComingSoon.style.display = "block";
      if (joinBanner) {
        joinBanner.style.display = "none";
      }
    }
  }

  const scrimsFormContainer = document.getElementById("scrimsFormContainer");
  const scrimsComingSoon = document.getElementById("scrimsComingSoon");
  const scrimsStatus = document.getElementById("scrimsStatusText");
  const scrimsBanner = document.getElementById("scrimsBanner");
  if (scrimsFormContainer || scrimsComingSoon) {
    if (state.formSettings.scrims) {
      // default: show form
      if (scrimsFormContainer) scrimsFormContainer.style.display = "block";
      if (scrimsComingSoon) scrimsComingSoon.style.display = "none";
      if (scrimsBanner) {
        scrimsBanner.innerHTML = getBannerHtml("scrims", state.formSettings.scrimBannerImage);
        scrimsBanner.style.display = state.formSettings.scrimBanner ? "block" : "none";
      }
      if (scrimsStatus) {
        scrimsStatus.textContent = "";
        scrimsStatus.style.color = "#ccc";
      }

      // If current user already submitted scrims form, hide form and show room info
      const scrimsRoomInfoId = 'scrimsRoomInfo';
      let scrimsRoomInfo = document.getElementById(scrimsRoomInfoId);
      const scrimsSubmittedMsgId = 'scrimsSubmittedMsg';
      let scrimsSubmittedMsg = document.getElementById(scrimsSubmittedMsgId);
      if (!scrimsRoomInfo && scrimsFormContainer) {
        scrimsRoomInfo = document.createElement('div');
        scrimsRoomInfo.id = scrimsRoomInfoId;
        scrimsFormContainer.parentNode?.insertBefore(scrimsRoomInfo, scrimsFormContainer.nextSibling || null);
      }
      if (!scrimsSubmittedMsg && scrimsFormContainer) {
        scrimsSubmittedMsg = document.createElement('div');
        scrimsSubmittedMsg.id = scrimsSubmittedMsgId;
        scrimsFormContainer.parentNode?.insertBefore(scrimsSubmittedMsg, scrimsFormContainer.nextSibling || null);
      }
      const userSubmittedScrims = state.user?.forms?.scrims;
      if (userSubmittedScrims) {
        if (scrimsFormContainer) scrimsFormContainer.style.display = 'none';
        const room = getRoomDataForForm('scrims');
        if (room) {
          if (scrimsSubmittedMsg) scrimsSubmittedMsg.style.display = 'none';
          if (scrimsRoomInfo) renderRoomInfo('scrims', scrimsRoomInfo);
        } else {
          if (scrimsRoomInfo) scrimsRoomInfo.style.display = 'none';
          if (scrimsSubmittedMsg) {
            scrimsSubmittedMsg.innerHTML = `<div class="room-card" style="padding:14px;border-radius:12px;border:1px solid #1e1e2e;color:#fff;background:#0b0b0b;">Form already submitted — Room ID & Password coming soon.</div>`;
            scrimsSubmittedMsg.style.display = 'block';
          }
        }
      } else {
        if (scrimsRoomInfo) scrimsRoomInfo.style.display = 'none';
      }

    } else {
      if (scrimsFormContainer) scrimsFormContainer.style.display = "none";
      if (scrimsComingSoon) scrimsComingSoon.style.display = "block";
      if (scrimsBanner) {
        scrimsBanner.style.display = "none";
      }
      if (scrimsStatus) {
        scrimsStatus.textContent = "Scrims booking is currently closed by the admin.";
        scrimsStatus.style.color = "#ff2b2b";
      }
    }
  }
}

function attachFormHandlers() {
  const joinForm = document.getElementById("joinForm");
  if (joinForm) {
    const whatsappInput = document.getElementById("whatsappContact");
    if (whatsappInput) {
      whatsappInput.addEventListener("blur", () => {
        const normalized = normalizeIndiaMobile(whatsappInput.value);
        if (normalized) whatsappInput.value = normalized;
      });
    }

    joinForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!auth.currentUser) {
        openAuthModal("login");
        return;
      }

      if (!state.formSettings.join) {
        await showErrorModal('Not Available', 'Join applications are currently closed by the admin.');
        return;
      }

      const detailsConfirm = getCheckboxValue("detailsConfirm");
      const rulesAgree = getCheckboxValue("rulesAgree");
      if (!detailsConfirm || !rulesAgree) {
        await showErrorModal('Validation Error', 'Please confirm your details and agree to the rules before submitting.');
        return;
      }

      const whatsappRaw = getFieldValue("whatsappContact");
      const whatsappContact = normalizeIndiaMobile(whatsappRaw);
      if (!whatsappContact) {
        await showErrorModal('Validation Error', 'WhatsApp contact must be a valid +91 10-digit number.');
        return;
      }

      const payload = {
        teamName: getFieldValue("teamName"),
        teamRegion: getFieldValue("teamRegion"),
        managerIgn: getFieldValue("managerIgn"),
        managerFullName: getFieldValue("managerFullName"),
        totalPlayers: getFieldValue("totalPlayers"),
        previousOrganization: getFieldValue("previousOrganization"),
        tournamentExperience: getFieldValue("tournamentExperience"),
        bestTournamentResult: getFieldValue("bestTournamentResult"),
        preferredPlayTime: getFieldValue("preferredPlayTime"),
        whatsappContact,
        emailAddress: getFieldValue("emailAddress"),
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email || "",
        status: "Pending",
        createdAt: new Date().toISOString(),
      };

      await push(ref(database, "applications"), payload);
      // mark user as having submitted join form
      try {
        await set(ref(database, `users/${auth.currentUser.uid}/forms/join`), true);
        // update local state immediately so UI updates without waiting for DB listener
        if (!state.user) state.user = { uid: auth.currentUser.uid, forms: {} };
        state.user.forms = state.user.forms || {};
        state.user.forms.join = true;
        updateFormAvailability();
      } catch (err) {
        console.warn('Failed to set user join flag', err);
      }
      await push(ref(database, `notifications/${auth.currentUser.uid}`), {
        type: "join",
        message: "Your recruitment request has been submitted and is pending admin review.",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      await showSuccessModal('Success', 'Your request has been submitted. You will receive updates in notifications.');
      joinForm.reset();
      // Update form visibility and hide loading
      setTimeout(() => {
        updateFormAvailability();
        if (globalLoader) globalLoader.hideLoading(200);
      }, 100);
    });
  }

  const tournamentForm = document.getElementById("tournamentForm");
  if (tournamentForm) {
    tournamentForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!auth.currentUser) {
        openAuthModal("login");
        return;
      }

      if (!state.formSettings.tournament) {
        await showErrorModal('Closed', 'Tournament registrations are currently closed by the admin.');
        return;
      }

      const tournamentAgreement = getCheckboxValue("tournamentAgreement");
      const tournamentTerms = getCheckboxValue("tournamentTerms");
      if (!tournamentAgreement || !tournamentTerms) {
        await showErrorModal('Validation Error', 'Please confirm all tournament agreement checkboxes before submitting.');
        return;
      }

      const teamLogo = await getFileBase64("teamLogo");
      const teamContactRaw = getFieldValue("teamContact");
      const teamContact = normalizeIndiaMobile(teamContactRaw);
      if (!teamContact) {
        await showErrorModal('Validation Error', 'Team contact must be a valid +91 10-digit number.');
        return;
      }
      const payload = {
        teamName: getFieldValue("teamName"),
        teamLogo,
        teamIGLUID: getFieldValue("teamIGLUID"),
        teamIGLIGN: getFieldValue("teamIGLIGN"),
        teamContact,
        player2UID: getFieldValue("player2UID"),
        player3UID: getFieldValue("player3UID"),
        player4UID: getFieldValue("player4UID"),
        player5UID: getFieldValue("player5UID"),
        player6UID: getFieldValue("player6UID"),
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email || "",
        status: "Pending",
        createdAt: new Date().toISOString(),
      };

      await push(ref(database, "tournaments"), payload);
      // mark user as having submitted tournament form
      try {
        await set(ref(database, `users/${auth.currentUser.uid}/forms/tournament`), true);
        // update local state immediately so UI updates without waiting for DB listener
        if (!state.user) state.user = { uid: auth.currentUser.uid, forms: {} };
        state.user.forms = state.user.forms || {};
        state.user.forms.tournament = true;
        updateFormAvailability();
      } catch (err) {
        console.warn('Failed to set user tournament flag', err);
      }
      await push(ref(database, `notifications/${auth.currentUser.uid}`), {
        type: "tournament",
        message: "Your tournament registration request is pending admin review.",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      await showSuccessModal('Success', 'Tournament registration submitted.');
      tournamentForm.reset();
      // Update form visibility and hide loading
      setTimeout(() => {
        updateFormAvailability();
        if (globalLoader) globalLoader.hideLoading(200);
      }, 100);
    });
  }

  const scrimsForm = document.getElementById("scrimsForm");
  if (scrimsForm) {
    scrimsForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!auth.currentUser) {
        openAuthModal("login");
        return;
      }

      if (!state.formSettings.scrims) {
        await showErrorModal('Closed', 'Scrims booking is currently closed by the admin.');
        return;
      }

      const scrimsAgreement = getCheckboxValue("scrimsAgreement");
      const scrimsTerms = getCheckboxValue("scrimsTerms");
      if (!scrimsAgreement || !scrimsTerms) {
        await showErrorModal('Validation Error', 'Please confirm all scrims agreement checkboxes before submitting.');
        return;
      }

      const teamLogo = await getFileBase64("teamLogo");
      const scrimsWhatsappRaw = getFieldValue("whatsapp");
      const scrimsWhatsapp = normalizeIndiaMobile(scrimsWhatsappRaw);
      if (!scrimsWhatsapp) {
        await showErrorModal('Validation Error', 'WhatsApp contact must be a valid +91 10-digit number.');
        return;
      }
      const payload = {
        teamName: getFieldValue("teamName"),
        teamLogo,
        captainUID: getFieldValue("captainUID"),
        captainIGN: getFieldValue("captainIGN"),
        whatsapp: scrimsWhatsapp,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email || "",
        status: "Pending",
        createdAt: new Date().toISOString(),
      };

      await push(ref(database, "scrims"), payload);
      // mark user as having submitted scrims form
      try {
        await set(ref(database, `users/${auth.currentUser.uid}/forms/scrims`), true);
        // update local state immediately so UI updates without waiting for DB listener
        if (!state.user) state.user = { uid: auth.currentUser.uid, forms: {} };
        state.user.forms = state.user.forms || {};
        state.user.forms.scrims = true;
        updateFormAvailability();
      } catch (err) {
        console.warn('Failed to set user scrims flag', err);
      }
      await push(ref(database, `notifications/${auth.currentUser.uid}`), {
        type: "scrims",
        message: "Your scrims booking request is pending admin review.",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      await showSuccessModal('Success', 'Scrims booking submitted.');
      scrimsForm.reset();
      // Update form visibility and hide loading
      setTimeout(() => {
        updateFormAvailability();
        if (globalLoader) globalLoader.hideLoading(200);
      }, 100);
    });
  }

  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    const categorySelect = document.getElementById("contactCategory");
    const messageWrap = document.getElementById("contactMessageWrap");
    const messageInput = document.getElementById("contactMessage");

    const toggleContactMessage = () => {
      const showMessage = categorySelect?.value === "Other";
      messageWrap?.classList.toggle("hidden", !showMessage);
      if (messageInput) {
        messageInput.required = showMessage;
        if (!showMessage) messageInput.value = "";
      }
    };

    toggleContactMessage();
    categorySelect?.addEventListener("change", toggleContactMessage);

    const contactSubmitBtn = contactForm.querySelector(".contact-submit");
    const contactSubmitText = contactSubmitBtn?.textContent || "Send";
    const contactMobileInput = document.getElementById("contactMobile");
    if (contactMobileInput) {
      contactMobileInput.addEventListener("blur", () => {
        const normalized = normalizeIndiaMobile(contactMobileInput.value);
        if (normalized) contactMobileInput.value = normalized;
      });
    }

    contactForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (contactSubmitBtn) {
        contactSubmitBtn.disabled = true;
        contactSubmitBtn.classList.add("loading");
        contactSubmitBtn.textContent = "Please wait...";
      }

      const contactMobileRaw = getFieldValue("contactMobile");
      const contactMobile = normalizeIndiaMobile(contactMobileRaw);
      if (!contactMobile) {
        await showErrorModal('Validation Error', 'Mobile number must be a valid +91 10-digit number.');
        if (contactSubmitBtn) {
          contactSubmitBtn.disabled = false;
          contactSubmitBtn.classList.remove("loading");
          contactSubmitBtn.textContent = contactSubmitText;
        }
        return;
      }

      const payload = {
        fullName: getFieldValue("contactFullName"),
        emailAddress: getFieldValue("contactEmail"),
        mobileNumber: contactMobile,
        subject: getFieldValue("contactSubject"),
        organization: getFieldValue("contactOrganization"),
        category: getFieldValue("contactCategory"),
        message: getFieldValue("contactMessage"),
        userId: auth.currentUser?.uid || "",
        userEmail: auth.currentUser?.email || "",
        status: "Pending",
        createdAt: new Date().toISOString(),
      };

      try {
        const response = await fetch(`${getApiBaseUrl()}/contact-form`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        let result = {};
        try {
          result = await response.json();
        } catch {
          result = {};
        }

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Failed to send your message.");
        }

        await showSuccessModal('Success', result.message || 'Your message has been sent successfully. We will get back to you soon.');
        contactForm.reset();
        toggleContactMessage();
        // Hide loading screen
        if (globalLoader) globalLoader.hideLoading(200);
      } catch (error) {
        console.error("Error submitting contact form:", error);
        await showErrorModal('Error', error.message || 'Failed to send your message. Please try again.');
      } finally {
        if (contactSubmitBtn) {
          contactSubmitBtn.disabled = false;
          contactSubmitBtn.classList.remove("loading");
          contactSubmitBtn.textContent = contactSubmitText;
        }
      }
    });
  }
}

function sanitizeNotificationPath(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function getNotificationPathsForUser(user) {
  const paths = [];
  if (user?.uid) paths.push(user.uid);
  const emailKey = sanitizeNotificationPath(user?.email || "");
  if (emailKey) paths.push(emailKey);
  return [...new Set(paths.filter(Boolean))];
}

function detachNotificationListeners() {
  notificationListeners.forEach(({ pathRef, listener }) => {
    off(pathRef, "value", listener);
  });
  notificationListeners = [];
  notificationSectionData = {};
}

function getNotificationSeenKey(user) {
  return `prime_authority_notifications_seen_${user?.uid || sanitizeNotificationPath(user?.email || "guest")}`;
}

function getLastNotificationSeenTimestamp() {
  if (!state.user) return 0;
  const value = localStorage.getItem(getNotificationSeenKey(state.user));
  const ts = Number(value);
  return Number.isFinite(ts) && ts > 0 ? ts : 0;
}

function markNotificationsAsSeen() {
  if (!state.user) return;
  localStorage.setItem(getNotificationSeenKey(state.user), String(Date.now()));
  updateNotificationBadge();
}

function loadNotifications() {
  detachNotificationListeners();

  if (!auth.currentUser) {
    state.notifications = [];
    updateNotificationBadge();
    renderNotificationsPage();
    return;
  }

  const paths = getNotificationPathsForUser(auth.currentUser);
  if (!paths.length) {
    state.notifications = [];
    updateNotificationBadge();
    renderNotificationsPage();
    return;
  }

  function refreshNotifications() {
    const allItems = [];
    Object.entries(notificationSectionData).forEach(([path, section]) => {
      Object.entries(section || {}).forEach(([id, item]) => {
        if (item && typeof item === "object") {
          allItems.push({ id, __path: path, ...item });
        }
      });
    });

    state.notifications = allItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    updateNotificationBadge();
    renderNotificationsPage();
  }

  paths.forEach((path) => {
    const pathRef = ref(database, `notifications/${path}`);
    const listener = (snapshot) => {
      notificationSectionData[path] = snapshot.val() || {};
      refreshNotifications();
    };

    onValue(pathRef, listener);
    notificationListeners.push({ pathRef, listener });
  });
}

function updateNotificationBadge() {
  const badges = document.querySelectorAll(".badge");
  const lastSeen = getLastNotificationSeenTimestamp();
  const unseenCount = state.notifications.filter((item) => {
    if (!item?.createdAt) return true;
    const created = new Date(item.createdAt).getTime();
    return created > lastSeen;
  }).length;

  badges.forEach((badge) => {
    if (unseenCount > 0) {
      badge.textContent = String(unseenCount);
      badge.style.display = "inline-flex";
    } else {
      badge.textContent = "";
      badge.style.display = "none";
    }
  });
}

function renderNotificationsPage() {
  const list = document.getElementById("notificationsList");
  if (!list) return;

  if (!auth.currentUser) {
    list.innerHTML = '<p class="empty-state">Please log in to view your notifications.</p>';
    return;
  }

  if (!state.notifications.length) {
    list.innerHTML = '<p class="empty-state">No notifications yet.</p>';
    markNotificationsAsSeen();
    return;
  }

  list.innerHTML = state.notifications
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .map((item) => {
      const date = item.createdAt ? new Date(item.createdAt).toLocaleString() : "";
      const notificationPath = item.__path || "";
      return `
        <div class="notification-item" data-notif-id="${item.id || ""}">
          <button class="notification-close" data-notif-id="${item.id || ""}" data-notif-path="${notificationPath}" onclick="removeNotification(this.getAttribute('data-notif-id'), this.getAttribute('data-notif-path'))" title="Delete notification">
            <i class="fas fa-times"></i>
          </button>
          <h3>${item.message || "New update"}</h3>
          <p>Status: ${item.status || "pending"}</p>
          <span>${date}</span>
        </div>
      `;
    })
    .join("");

  markNotificationsAsSeen();
}

async function removeNotification(notificationId, notificationPath = "") {
  if (!auth.currentUser || !notificationId) return;

  try {
    const paths = getNotificationPathsForUser(auth.currentUser);
    await Promise.all(paths.map((path) => remove(ref(database, `notifications/${path}/${notificationId}`))));
    state.notifications = state.notifications.filter((item) => item.id !== notificationId);
    renderNotificationsPage();
  } catch (err) {
    console.error('Error removing notification:', err);
  }
}

window.removeNotification = removeNotification;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
