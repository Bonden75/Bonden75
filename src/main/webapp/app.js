const STORAGE_KEY = "number_collector_entries";

const form = document.getElementById("number-form");
const input = document.getElementById("number-input");
const list = document.getElementById("number-list");
const emptyState = document.getElementById("empty-state");
const clearButton = document.getElementById("clear-list");

const entries = loadEntries();
renderList();

function loadEntries() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return [];
  }
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn("Failed to parse saved numbers.", error);
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function renderList() {
  list.innerHTML = "";
  if (entries.length === 0) {
    emptyState.hidden = false;
    return;
  }

  entries.forEach((value, index) => {
    const item = document.createElement("li");
    item.className = "number-list__item";

    const label = document.createElement("span");
    label.textContent = value;

    const meta = document.createElement("span");
    meta.className = "number-list__meta";
    meta.textContent = `#${index + 1}`;

    item.append(label, meta);
    list.appendChild(item);
  });

  emptyState.hidden = true;
}

function addEntry(value) {
  entries.push(value);
  saveEntries();
  renderList();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = input.value.trim();
  if (!value) {
    return;
  }

  addEntry(value);
  input.value = "";
  input.focus();
});

clearButton.addEventListener("click", () => {
  entries.length = 0;
  saveEntries();
  renderList();
});
