import { Office3D } from "./Office3D";
import { fetchState, checkin } from "./api";

// --- Login Flow ---
const app = document.getElementById("app")!;

// Create login modal
const loginModal = document.createElement("div");
loginModal.id = "login-modal";
loginModal.innerHTML = `
  <div class="modal-box" style="background:#16213e;border:2px solid #0f3460;border-radius:12px;padding:32px;text-align:center;color:#e0e0e0;font-family:'Courier New',monospace;">
    <div style="font-size:1.5rem;margin-bottom:8px;">💀 QFC Office 3D</div>
    <div style="color:#888;font-size:0.85rem;">Enter your name to check in</div>
    <div><input id="login-input" type="text" placeholder="e.g. Larry Lai" list="login-members" autofocus
      style="margin-top:16px;padding:10px 16px;background:#1a1a2e;border:2px solid #0f3460;border-radius:6px;color:#e0e0e0;font-family:'Courier New',monospace;font-size:1rem;width:260px;outline:none;" /></div>
    <datalist id="login-members"></datalist>
    <div><button id="login-submit"
      style="margin-top:16px;padding:10px 24px;background:#00d4ff;color:#1a1a2e;border:none;border-radius:6px;font-family:'Courier New',monospace;font-size:1rem;cursor:pointer;font-weight:bold;">Enter Office</button></div>
  </div>
`;
app.appendChild(loginModal);

const loginInput = document.getElementById("login-input") as HTMLInputElement;
const loginSubmit = document.getElementById("login-submit") as HTMLButtonElement;
const loginMembers = document.getElementById("login-members") as HTMLDataListElement;

// Populate member datalist
fetchState().then((state) => {
  for (const m of state.members) {
    const opt = document.createElement("option");
    opt.value = m.name;
    loginMembers.appendChild(opt);
  }
});

function doLogin() {
  const name = loginInput.value.trim();
  if (!name) return;
  loginSubmit.disabled = true;
  loginSubmit.textContent = "Entering...";

  checkin(name)
    .then((res: any) => {
      if (res.error) {
        alert(res.error);
        loginSubmit.disabled = false;
        loginSubmit.textContent = "Enter Office";
        return;
      }
      // Hide login, start 3D
      loginModal.classList.add("hidden");
      const office = new Office3D(app);
      office.setUser(name);
    })
    .catch(() => {
      alert("Connection error");
      loginSubmit.disabled = false;
      loginSubmit.textContent = "Enter Office";
    });
}

loginSubmit.addEventListener("click", doLogin);
loginInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});
