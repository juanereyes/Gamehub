const AUTH_API_BASE = "http://127.0.0.1:8001";
const TOKEN_KEY = "gamehub_auth_token";

const form = document.querySelector("#auth-form");
const modeInput = document.querySelector("#auth-mode");
const submitButton = document.querySelector(".auth-submit");
const message = document.querySelector("#auth-message");
const passwordInput = document.querySelector("#password");
const passwordToggle = document.querySelector(".password-toggle");
const passwordRequirements = document.querySelector("#password-requirements");
const tabs = Array.from(document.querySelectorAll(".auth-tab"));
const PASSWORD_REQUIREMENT = "Password must be at least 8 characters and include uppercase, lowercase, and numeric characters.";

function setMessage(text, type = "neutral") {
  message.textContent = text;
  message.dataset.type = type;
}

function setMode(mode) {
  modeInput.value = mode;
  submitButton.textContent = mode === "register" ? "Register" : "Login";
  passwordInput.autocomplete = mode === "register" ? "new-password" : "current-password";
  passwordRequirements.hidden = mode !== "register";
  updatePasswordRequirements();
  tabs.forEach((tab) => {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  setMessage("");
}

function setPasswordVisibility(isVisible) {
  passwordInput.type = isVisible ? "text" : "password";
  passwordToggle.setAttribute("aria-label", isVisible ? "Hide password" : "Show password");
  passwordToggle.setAttribute("aria-pressed", String(isVisible));
  passwordToggle.querySelector(".eye-icon").toggleAttribute("hidden", isVisible);
  passwordToggle.querySelector(".eye-off-icon").toggleAttribute("hidden", !isVisible);
}

function passwordMeetsPolicy(password) {
  const checks = getPasswordChecks(password);
  return checks.length && checks.case && checks.number;
}

function getPasswordChecks(password) {
  return {
    length: password.length >= 8,
    case: /[A-Z]/.test(password) && /[a-z]/.test(password),
    number: /[0-9]/.test(password),
  };
}

function updateRequirement(name, isMet) {
  const item = passwordRequirements.querySelector(`[data-requirement="${name}"]`);
  const mark = item.querySelector(".requirement-mark");
  item.classList.toggle("met", isMet);
  item.classList.toggle("unmet", !isMet);
  mark.textContent = isMet ? "✓" : "✕";
}

function updatePasswordRequirements() {
  const checks = getPasswordChecks(passwordInput.value);
  updateRequirement("length", checks.length);
  updateRequirement("case", checks.case);
  updateRequirement("number", checks.number);
}

async function request(path, options = {}) {
  const { headers = {}, ...fetchOptions } = options;
  let response;
  try {
    response = await fetch(`${AUTH_API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      ...fetchOptions,
    });
  } catch {
    throw new Error("Could not reach the authentication service. Start it with Docker and try again.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Authentication request failed.");
  }
  return data;
}

async function refreshSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    return;
  }

  try {
    await request("/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    window.location.href = "index.html";
  } catch {
    localStorage.removeItem(TOKEN_KEY);
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

passwordToggle.addEventListener("click", () => {
  setPasswordVisibility(passwordInput.type === "password");
  passwordInput.focus();
});

passwordInput.addEventListener("input", updatePasswordRequirements);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = document.querySelector("#username").value.trim();
  const password = document.querySelector("#password").value;
  const mode = modeInput.value;

  if (!passwordMeetsPolicy(password)) {
    setMessage(PASSWORD_REQUIREMENT, "error");
    passwordInput.focus();
    return;
  }

  submitButton.disabled = true;
  setMessage(mode === "register" ? "Creating account..." : "Signing in...");

  try {
    const data = await request(`/${mode}`, {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem(TOKEN_KEY, data.token);
    window.location.href = "index.html";
  } catch (error) {
    setMessage(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

refreshSession();
