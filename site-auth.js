(function () {
  const AUTH_API_BASE = "http://127.0.0.1:8001";
  const TOKEN_KEY = "gamehub_auth_token";
  const navTarget = document.querySelector("[data-auth-nav]");
  let currentAuthNav = navTarget;

  if (!navTarget) {
    return;
  }

  async function request(path, options = {}) {
    const { headers = {}, ...fetchOptions } = options;
    const response = await fetch(`${AUTH_API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      ...fetchOptions,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Authentication request failed.");
    }
    return data;
  }

  function renderSignIn() {
    const link = document.createElement("a");
    link.href = "auth.html";
    link.textContent = "Sign In";
    link.dataset.authNav = "";
    if (location.pathname.endsWith("auth.html")) {
      link.setAttribute("aria-current", "page");
    }
    currentAuthNav.replaceWith(link);
    currentAuthNav = link;
  }

  function renderUserMenu(username) {
    const wrapper = document.createElement("div");
    wrapper.className = "user-menu";
    wrapper.dataset.authNav = "";

    wrapper.innerHTML = `
      <button class="user-menu-trigger" type="button" aria-haspopup="true" aria-expanded="false">
        <span class="user-menu-name"></span>
        <span class="user-menu-caret" aria-hidden="true"></span>
      </button>
      <div class="user-menu-dropdown" role="menu" hidden>
        <button class="user-menu-item" type="button" role="menuitem" data-sign-out>
          <svg class="door-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 21h14"></path>
            <path d="M7 21V4.8A1.8 1.8 0 0 1 8.8 3H17v18"></path>
            <path d="M10 12h.01"></path>
            <path d="M17 7h2a1 1 0 0 1 1 1v13"></path>
          </svg>
          <span>Sign out</span>
        </button>
        <button class="user-menu-item danger" type="button" role="menuitem" data-delete-account>
          <svg class="delete-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18"></path>
            <path d="M8 6V4h8v2"></path>
            <path d="M19 6l-1 15H6L5 6"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
          </svg>
          <span>Delete account</span>
        </button>
      </div>
    `;

    wrapper.querySelector(".user-menu-name").textContent = username;
    const trigger = wrapper.querySelector(".user-menu-trigger");
    const dropdown = wrapper.querySelector(".user-menu-dropdown");
    const signOut = wrapper.querySelector("[data-sign-out]");
    const deleteAccount = wrapper.querySelector("[data-delete-account]");

    trigger.addEventListener("click", () => {
      const isOpen = !dropdown.hidden;
      dropdown.hidden = isOpen;
      trigger.setAttribute("aria-expanded", String(!isOpen));
    });

    signOut.addEventListener("click", async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_KEY);
      renderSignIn();
      if (token) {
        await request("/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    });

    deleteAccount.addEventListener("click", () => {
      dropdown.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      openDeleteAccountModal(username);
    });

    document.addEventListener("click", (event) => {
      if (!wrapper.contains(event.target)) {
        dropdown.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
      }
    });

    currentAuthNav.replaceWith(wrapper);
    currentAuthNav = wrapper;
  }

  function closeDeleteAccountModal(modal) {
    modal.remove();
  }

  function openDeleteAccountModal(username) {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.setAttribute("role", "presentation");
    modal.innerHTML = `
      <div class="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
        <p class="section-kicker">Permanent action</p>
        <h2 id="delete-account-title">Delete account?</h2>
        <p>
          This will permanently delete the account for <strong></strong>. This action is not reversible.
        </p>
        <label for="delete-confirmation">Type <strong>delete</strong> to confirm.</label>
        <input id="delete-confirmation" type="text" autocomplete="off" spellcheck="false">
        <div class="modal-actions">
          <button class="button secondary" type="button" data-cancel-delete>Cancel</button>
          <button class="button danger" type="button" data-confirm-delete disabled>Send</button>
        </div>
        <p class="modal-message" role="status" aria-live="polite"></p>
      </div>
    `;

    modal.querySelector("strong").textContent = username;
    const input = modal.querySelector("#delete-confirmation");
    const cancel = modal.querySelector("[data-cancel-delete]");
    const confirm = modal.querySelector("[data-confirm-delete]");
    const modalMessage = modal.querySelector(".modal-message");

    input.addEventListener("input", () => {
      confirm.disabled = input.value.trim().toLowerCase() !== "delete";
    });

    cancel.addEventListener("click", () => closeDeleteAccountModal(modal));

    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeDeleteAccountModal(modal);
      }
    });

    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeDeleteAccountModal(modal);
      }
    });

    confirm.addEventListener("click", async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        closeDeleteAccountModal(modal);
        renderSignIn();
        return;
      }

      confirm.disabled = true;
      cancel.disabled = true;
      modalMessage.textContent = "Deleting account...";

      try {
        await request("/account", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        localStorage.removeItem(TOKEN_KEY);
        closeDeleteAccountModal(modal);
        renderSignIn();
        window.location.href = "index.html";
      } catch (error) {
        confirm.disabled = false;
        cancel.disabled = false;
        modalMessage.textContent = error.message;
      }
    });

    document.body.appendChild(modal);
    input.focus();
  }

  async function initializeAuthNav() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      return;
    }

    try {
      const data = await request("/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      renderUserMenu(data.user.username);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      renderSignIn();
    }
  }

  initializeAuthNav();
})();
