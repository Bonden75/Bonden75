const STORAGE_KEY = "padel_matchmaker_state";
const SESSION_PARAM = "session";
const API_ENDPOINT = "/api/session";
const POLL_INTERVAL_MS = 5000;
const DEFAULT_SLOTS = [
  { day: "Måndag", times: ["17:00", "18:00", "19:00", "20:00"] },
  { day: "Onsdag", times: ["17:00", "18:00", "19:00", "20:00"] },
  { day: "Fredag", times: ["16:30", "17:30", "18:30", "19:30"] },
  { day: "Söndag", times: ["10:00", "11:00", "12:00", "13:00"] },
];

const demoPlayers = [
  "alex@mail.se",
  "bea@mail.se",
  "chris@mail.se",
  "dani@mail.se",
];

const inviteForm = document.getElementById("invite-form");
const inviteLinks = document.getElementById("invite-links");
const sessionLink = document.getElementById("session-link");
const playerSelect = document.getElementById("player-select");
const scheduleContainer = document.getElementById("schedule");
const statusPill = document.getElementById("player-status");
const matchSummary = document.getElementById("match-summary");
const resetButton = document.getElementById("reset-demo");
const demoButton = document.getElementById("use-demo");

const sessionId = getSessionId();
const state = loadState();
let pollTimer;

function getSessionId() {
  const params = new URLSearchParams(window.location.search);
  const existing = params.get(SESSION_PARAM);
  if (existing) {
    return existing;
  }
  const generated = crypto.randomUUID();
  params.set(SESSION_PARAM, generated);
  window.history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
  return generated;
}

function loadState() {
  const saved = localStorage.getItem(storageKey());
  if (saved) {
    return JSON.parse(saved);
  }
  return {
    players: ["", "", "", ""],
    availability: {},
  };
}

function saveState() {
  localStorage.setItem(storageKey(), JSON.stringify(state));
}

function storageKey() {
  return `${STORAGE_KEY}:${sessionId}`;
}

function init() {
  populatePlayerSelect();
  renderInviteLinks();
  renderSessionLink();
  renderSchedule();
  updateMatchSummary();
  applyPlayerFromUrl();
  syncFromServer();
  startPolling();
}

function populatePlayerSelect() {
  playerSelect.innerHTML = "";
  state.players.forEach((email, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = email ? `${email} (Spelare ${index + 1})` : `Spelare ${index + 1}`;
    playerSelect.appendChild(option);
  });
}

function renderInviteLinks() {
  inviteLinks.innerHTML = "";
  if (state.players.every((player) => !player)) {
    inviteLinks.textContent = "Inga länkar ännu.";
    return;
  }

  state.players.forEach((email, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "invite-link";

    const label = document.createElement("span");
    label.textContent = `Spelare ${index + 1}`;

    const mail = document.createElement("div");
    mail.textContent = email || "Saknas";

    const link = document.createElement("code");
    const url = new URL(window.location.href);
    url.searchParams.set("player", String(index + 1));
    link.textContent = url.toString();

    wrapper.append(label, mail, link);
    inviteLinks.appendChild(wrapper);
  });
}

function renderSessionLink() {
  const url = new URL(window.location.href);
  url.searchParams.delete("player");
  sessionLink.innerHTML = `
    <strong>Delbar sessionslänk</strong>
    <code>${url.toString()}</code>
    <span>Dela denna länk så att alla fyra spelare hamnar i samma session.</span>
  `;
}

function renderSchedule() {
  scheduleContainer.innerHTML = "";
  DEFAULT_SLOTS.forEach((slot) => {
    const row = document.createElement("div");
    row.className = "schedule-row";

    const label = document.createElement("div");
    label.className = "schedule-row__label";
    label.textContent = slot.day;

    const list = document.createElement("div");
    list.className = "slot-list";

    slot.times.forEach((time) => {
      const slotId = `${slot.day}-${time}`;
      const slotCard = document.createElement("div");
      slotCard.className = "slot";

      const header = document.createElement("div");
      header.className = "slot__header";

      const title = document.createElement("span");
      title.textContent = time;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "slot__checkbox";
      checkbox.dataset.slotId = slotId;

      header.append(title, checkbox);

      const others = document.createElement("div");
      others.className = "slot__others";
      others.textContent = "Andra spelare:";

      const tags = document.createElement("div");
      tags.className = "slot__tags";

      slotCard.append(header, others, tags);
      list.appendChild(slotCard);
    });

    row.append(label, list);
    scheduleContainer.appendChild(row);
  });

  scheduleContainer.addEventListener("change", handleAvailabilityChange);
  refreshScheduleUI();
}

function handleAvailabilityChange(event) {
  if (!(event.target instanceof HTMLInputElement)) {
    return;
  }
  const playerIndex = Number(playerSelect.value);
  const slotId = event.target.dataset.slotId;
  if (!slotId || Number.isNaN(playerIndex)) {
    return;
  }

  const playerKey = `player-${playerIndex}`;
  if (!state.availability[playerKey]) {
    state.availability[playerKey] = [];
  }

  if (event.target.checked) {
    if (!state.availability[playerKey].includes(slotId)) {
      state.availability[playerKey].push(slotId);
    }
  } else {
    state.availability[playerKey] = state.availability[playerKey].filter(
      (slot) => slot !== slotId
    );
  }

  saveState();
  refreshScheduleUI();
  updateMatchSummary();
  pushToServer();
}

function refreshScheduleUI() {
  const playerIndex = Number(playerSelect.value);
  const playerKey = `player-${playerIndex}`;
  const slots = document.querySelectorAll(".slot");

  slots.forEach((slotElement) => {
    const checkbox = slotElement.querySelector("input");
    const tags = slotElement.querySelector(".slot__tags");
    const slotId = checkbox.dataset.slotId;
    const selection = state.availability[playerKey] || [];

    checkbox.checked = selection.includes(slotId);

    tags.innerHTML = "";
    state.players.forEach((email, index) => {
      const key = `player-${index}`;
      const otherSelection = state.availability[key] || [];
      if (otherSelection.includes(slotId)) {
        const tag = document.createElement("span");
        tag.className = "tag";
        if (index !== playerIndex) {
          tag.classList.add("tag--other");
        }
        tag.textContent = email || `Spelare ${index + 1}`;
        tags.appendChild(tag);
      }
    });

    const allSelected = state.players.every((_, index) => {
      const key = `player-${index}`;
      return (state.availability[key] || []).includes(slotId);
    });

    if (allSelected) {
      const matchTag = document.createElement("span");
      matchTag.className = "tag tag--match";
      matchTag.textContent = "Match!";
      tags.appendChild(matchTag);
    }
  });

  updateRowHighlights();
}

function updateRowHighlights() {
  const rows = document.querySelectorAll(".schedule-row");
  rows.forEach((row) => {
    const slotCards = row.querySelectorAll(".slot");
    const hasMatch = Array.from(slotCards).some((slot) => {
      const matchTag = slot.querySelector(".tag--match");
      return Boolean(matchTag);
    });

    row.classList.toggle("match", hasMatch);
  });
}

function updateMatchSummary() {
  const matchingSlots = [];

  DEFAULT_SLOTS.forEach((slot) => {
    slot.times.forEach((time) => {
      const slotId = `${slot.day}-${time}`;
      const allSelected = state.players.every((_, index) => {
        const key = `player-${index}`;
        return (state.availability[key] || []).includes(slotId);
      });
      if (allSelected) {
        matchingSlots.push({ day: slot.day, time });
      }
    });
  });

  if (matchingSlots.length === 0) {
    matchSummary.innerHTML =
      '<div class="match-summary__empty">Ingen match ännu. Fortsätt att fylla i tider.</div>';
    return;
  }

  matchSummary.innerHTML = matchingSlots
    .map(
      (slot) =>
        `<div>✅ Match på <strong>${slot.day}</strong> kl <strong>${slot.time}</strong></div>`
    )
    .join("");
}

function applyPlayerFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const player = Number(params.get("player"));
  if (player && player >= 1 && player <= 4) {
    playerSelect.value = String(player - 1);
    statusPill.textContent = `Du fyller i tider för Spelare ${player}`;
  } else {
    statusPill.textContent = "Välj spelare för att börja";
  }
  refreshScheduleUI();
}

inviteForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(inviteForm);
  state.players = [
    formData.get("player1"),
    formData.get("player2"),
    formData.get("player3"),
    formData.get("player4"),
  ].map((value) => String(value).trim());

  saveState();
  populatePlayerSelect();
  renderInviteLinks();
  renderSessionLink();
  refreshScheduleUI();
  pushToServer();
});

playerSelect.addEventListener("change", () => {
  const playerNumber = Number(playerSelect.value) + 1;
  statusPill.textContent = `Du fyller i tider för Spelare ${playerNumber}`;
  refreshScheduleUI();
});

demoButton.addEventListener("click", () => {
  inviteForm.player1.value = demoPlayers[0];
  inviteForm.player2.value = demoPlayers[1];
  inviteForm.player3.value = demoPlayers[2];
  inviteForm.player4.value = demoPlayers[3];
});

resetButton.addEventListener("click", () => {
  localStorage.removeItem(storageKey());
  window.location.href = `${window.location.pathname}?${SESSION_PARAM}=${sessionId}`;
});

function startPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
  }
  pollTimer = setInterval(syncFromServer, POLL_INTERVAL_MS);
}

async function syncFromServer() {
  try {
    const response = await fetch(`${API_ENDPOINT}?session=${sessionId}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return;
    }
    const data = await response.json();
    if (!data) {
      return;
    }
    const hasServerPlayers = (data.players || []).some((player) => player);
    const hasServerAvailability = Object.values(data.availability || {}).some(
      (slots) => Array.isArray(slots) && slots.length > 0
    );
    const hasLocalPlayers = state.players.some((player) => player);
    const hasLocalAvailability = Object.values(state.availability).some(
      (slots) => Array.isArray(slots) && slots.length > 0
    );
    if (!hasServerPlayers && !hasServerAvailability && (hasLocalPlayers || hasLocalAvailability)) {
      return;
    }
    state.players = data.players || state.players;
    state.availability = data.availability || state.availability;
    saveState();
    populatePlayerSelect();
    renderInviteLinks();
    updateMatchSummary();
    refreshScheduleUI();
  } catch (error) {
    console.warn("Kunde inte synka från backend, använder lokal data.", error);
  }
}

async function pushToServer() {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        players: state.players,
        availability: state.availability,
      }),
    });
    if (!response.ok) {
      return;
    }
  } catch (error) {
    console.warn("Kunde inte spara till backend, lagrar lokalt.", error);
  }
}

init();
