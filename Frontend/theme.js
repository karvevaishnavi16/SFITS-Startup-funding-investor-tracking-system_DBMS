// Shared SFITS browser helpers: theme + authenticated API requests.
(function () {
  const saved = localStorage.getItem("sfits-theme");
  if (saved) document.documentElement.setAttribute("data-theme", saved);

  // Existing pages use direct fetch() calls. Centralizing the bearer-token
  // injection here keeps those pages simple and prevents credentials from
  // being copied into every request manually.
  const nativeFetch = window.fetch.bind(window);
  window.fetch = function (input, init = {}) {
    const token = localStorage.getItem("token");
    const url = typeof input === "string" ? input : input?.url || "";

    if (!token || !url.includes(":5000/")) {
      return nativeFetch(input, init);
    }

    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);

    return nativeFetch(input, { ...init, headers });
  };
})();

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("sfits-theme", next);
}

document.addEventListener("DOMContentLoaded", function () {
  const btn = document.createElement("button");
  btn.className = "theme-toggle";
  btn.onclick = toggleTheme;
  btn.setAttribute("title", "Toggle Light/Dark Mode");
  btn.innerHTML = '<span class="icon-sun">☀️</span><span class="icon-moon">🌙</span>';
  document.body.appendChild(btn);
});
