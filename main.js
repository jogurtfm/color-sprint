/* Color Sprint — MIT — https://github.com/jogurtfm/color-sprint */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ColorSprint
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");

// src/model.ts
var COLORS = [
  { id: "pink", name: "Red / pink", hex: "#ea9999" },
  { id: "blue", name: "Light blue", hex: "#cfe2f3" },
  { id: "yellow", name: "Yellow", hex: "#fff2cc" },
  { id: "purple", name: "Lavender / purple", hex: "#d9d2e9" },
  { id: "orange", name: "Peach / orange", hex: "#fce5cd" },
  { id: "salmon", name: "Salmon / dusty rose", hex: "#e6b8af" }
];
var TASK_HEADER = "| ID | Task | Color | Page | Kind | Repeat | Timer minutes | Done means |";
var SESSION_HEADER = "| Session ID | Date | Task ID | Seconds | Note |";
var TIMER_HEADER = "| Session ID | Task ID | Date | Started ISO | Elapsed seconds | Target seconds |";
var WORKOUT_LOG_HEADER = "| ID | Date | Task ID | Duration minutes | Distance miles | Sets / reps / load | Notes |";
var QUICK_COUNT_HEADER = "| ID | Date | Task ID | Amount | Unit |";
var SECTIONS = ["Tasks", "Schedule", "Goals", "Sessions", "Timer"];
var OPTIONAL_SECTIONS = ["Reflections", "Workout Log", "Quick Counts"];
function localDay(date = /* @__PURE__ */ new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function addDays(day, n) {
  const d = /* @__PURE__ */ new Date(`${day}T12:00:00`);
  d.setDate(d.getDate() + n);
  return localDay(d);
}
function validDay(day) {
  return /^\d{4}-\d{2}-\d{2}$/.test(day) && localDay(/* @__PURE__ */ new Date(`${day}T12:00:00`)) === day;
}
function cell(text) {
  return text.replace(/[\r\n]+/g, " ").replace(/\\/g, "\\\\").replace(/\|/g, "\\|").trim();
}
function splitCells(line) {
  const trimmed = line.trim();
  const source = trimmed.startsWith("|") ? trimmed.replace(/^\|/, "").replace(/\|$/, "") : trimmed;
  const parts = [];
  let value = "";
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === "\\" && (source[i + 1] === "|" || source[i + 1] === "\\")) {
      value += source[++i];
    } else if (c === "|") {
      parts.push(value.trim());
      value = "";
    } else value += c;
  }
  parts.push(value.trim());
  return parts;
}
function ranges(lines) {
  const map = /* @__PURE__ */ new Map();
  let current = null;
  let fenced = false;
  let fenceChar = "";
  for (let i = 0; i < lines.length; i++) {
    const fence = lines[i].match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (!fenced) {
        fenced = true;
        fenceChar = fence[1][0];
      } else if (fence[1][0] === fenceChar) fenced = false;
      continue;
    }
    if (fenced) continue;
    const match = lines[i].match(/^##\s+(.+?)\s*$/);
    if (!match) continue;
    if (current) map.get(current).end = i;
    current = [...SECTIONS, ...OPTIONAL_SECTIONS].includes(match[1]) ? match[1] : null;
    if (current) {
      if (map.has(current)) throw new Error(`Duplicate section: ${current}`);
      map.set(current, { start: i + 1, end: lines.length });
    }
  }
  return map;
}
function dataLines(lines, range) {
  let fenced = false;
  return lines.slice(range.start, range.end).filter((line) => {
    if (/^\s*(`{3,}|~{3,})/.test(line)) {
      fenced = !fenced;
      return false;
    }
    return !fenced;
  });
}
function table(lines, range, header) {
  const rows = dataLines(lines, range).filter((x) => x.trim().startsWith("|"));
  if (rows.length < 2 || rows[0].replace(/\s/g, "") !== header.replace(/\s/g, "")) throw new Error(`Expected table header: ${header}`);
  if (!splitCells(rows[1]).every((x) => /^:?-{3,}:?$/.test(x))) throw new Error("Table requires a Markdown separator row.");
  const width = splitCells(header).length;
  return rows.slice(2).map((x) => {
    const parts = splitCells(x);
    if (parts.length !== width) throw new Error(`Expected ${width} cells: ${x}`);
    return parts;
  });
}
function unique(ids, kind) {
  if (ids.some((x) => !/^[-a-z0-9]+$/.test(x))) throw new Error(`${kind} IDs must use lowercase letters, numbers, and hyphens.`);
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${kind} ID. Give every item its own stable ID.`);
}
function number(value) {
  if (!/^\d+(\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) throw new Error(`Invalid nonnegative number: ${value}`);
  return Number(value);
}
function checkboxRows(lines, range) {
  return dataLines(lines, range).filter((x) => /^\s*- \[[ xX]\]/.test(x)).map((x) => {
    const match = x.match(/^\s*- \[([ xX])\]\s*(.*)$/);
    return { done: match[1].toLowerCase() === "x", parts: splitCells(match[2]) };
  });
}
function parseBoard(text) {
  const lines = text.split(/\r?\n/);
  const rs = ranges(lines);
  for (const section of SECTIONS) if (!rs.has(section)) throw new Error(`Missing ## ${section} section. Open the Markdown format guide.`);
  const tasks = table(lines, rs.get("Tasks"), TASK_HEADER).map((p) => ({ id: p[0], title: p[1], color: p[2], page: p[3], kind: p[4], repeat: p[5], minutes: number(p[6]), definition: p[7] }));
  unique(tasks.map((x) => x.id), "task");
  for (const task of tasks) {
    if (!COLORS.some((x) => x.id === task.color)) throw new Error(`Unknown color for ${task.title}: ${task.color}`);
    if (!task.title || !task.page || task.page === "All") throw new Error("Every task needs a title and page. All is reserved for the unfiltered view.");
    if (!validRepeat(task.repeat)) throw new Error(`Invalid Repeat value for ${task.title}. Use -, daily, or mon,tue,...`);
    if (task.minutes > 1440) throw new Error("Timer minutes must be 0\u20131440.");
  }
  const entries = checkboxRows(lines, rs.get("Schedule")).map(({ done, parts: p }) => {
    if (p.length !== 3) throw new Error("Schedule rows need Date | Task ID | Detail.");
    if (!validDay(p[0])) throw new Error(`Invalid schedule date: ${p[0]}`);
    return { date: p[0], taskId: p[1], detail: p[2], done };
  });
  if (new Set(entries.map((x) => `${x.date}/${x.taskId}`)).size !== entries.length) throw new Error("Duplicate task/date in Schedule. Combine details or give separate tasks unique IDs.");
  const goals = checkboxRows(lines, rs.get("Goals")).map(({ done, parts: p }) => {
    if (p.length !== 5) throw new Error("Goals rows need ID | Due date or - | Page | Goal | Evidence.");
    if (p[1] !== "-" && !validDay(p[1])) throw new Error(`Invalid goal due date: ${p[1]}`);
    if (!p[2] || p[2] === "All" || !p[3]) throw new Error("Goals need a title and page. All is a reserved page name.");
    return { id: p[0], due: p[1], page: p[2], title: p[3], evidence: p[4], done };
  });
  unique(goals.map((x) => x.id), "goal");
  const sessions = table(lines, rs.get("Sessions"), SESSION_HEADER).map((p) => ({ id: p[0], date: p[1], taskId: p[2], seconds: number(p[3]), note: p[4] }));
  unique(sessions.map((x) => x.id), "session");
  for (const session of sessions) if (!validDay(session.date)) throw new Error("Invalid session date.");
  const timers = table(lines, rs.get("Timer"), TIMER_HEADER).map((p) => ({ id: p[0], taskId: p[1], date: p[2], started: p[3], elapsed: number(p[4]), target: number(p[5]) }));
  if (timers.length > 1) throw new Error("Only one active timer is supported per tracker.");
  const timer = timers[0] || null;
  if (timer) {
    unique([timer.id], "timer");
    if (!validDay(timer.date) || timer.started !== "-" && !Number.isFinite(Date.parse(timer.started))) throw new Error("Invalid timer date or start timestamp.");
  }
  const workoutRange = rs.get("Workout Log");
  const workoutLogs = workoutRange ? table(lines, workoutRange, WORKOUT_LOG_HEADER).map((p) => ({ id: p[0], date: p[1], taskId: p[2], minutes: number(p[3]), distance: number(p[4]), details: p[5], note: p[6] })) : [];
  unique(workoutLogs.map((x) => x.id), "workout log");
  for (const log of workoutLogs) if (!validDay(log.date) || log.taskId !== "workout" && log.taskId !== "treadmill") throw new Error("Workout Log rows must use a valid date and Workout or Treadmill task ID.");
  const quickRange = rs.get("Quick Counts");
  const quickCounts = quickRange ? table(lines, quickRange, QUICK_COUNT_HEADER).map((p) => ({ id: p[0], date: p[1], taskId: p[2], amount: number(p[3]), unit: p[4] })) : [];
  unique(quickCounts.map((x) => x.id), "quick count");
  for (const count of quickCounts) if (!validDay(count.date) || count.amount <= 0 || !count.unit) throw new Error("Quick Counts need a valid date, positive amount, and unit.");
  const taskIds = new Set(tasks.map((x) => x.id));
  for (const item of [...entries, ...sessions, ...timers, ...quickCounts]) if (!taskIds.has(item.taskId)) throw new Error(`Unknown task ID: ${item.taskId}. Restore the task row or update its references.`);
  const reflectionRange = rs.get("Reflections");
  const reflections = reflectionRange ? dataLines(lines, reflectionRange).map((line) => line.trim().replace(/^[-*]\s+|^>\s?/, "")).filter((line) => line && !line.startsWith("<!--")) : [];
  const match = text.match(/^Sprint: (\d{4}-\d{2}-\d{2}) \/ (\d{4}-\d{2}-\d{2})\s*$/m);
  const start = match?.[1] || localDay();
  const end = match?.[2] || addDays(start, 13);
  if (!validDay(start) || !validDay(end) || end < start) throw new Error("Invalid Sprint date range.");
  return { tasks, entries, goals, sessions, timer, workoutLogs, quickCounts, reflections, start, end };
}
function validRepeat(value) {
  return value === "-" || value === "daily" || /^(mon|tue|wed|thu|fri|sat|sun)(,(mon|tue|wed|thu|fri|sat|sun))*$/.test(value);
}
function scheduled(task, day) {
  return task.repeat === "daily" || task.repeat.split(",").includes(["sun", "mon", "tue", "wed", "thu", "fri", "sat"][(/* @__PURE__ */ new Date(`${day}T12:00:00`)).getDay()]);
}
function entryFor(board, id, day) {
  return board.entries.find((e) => e.taskId === id && e.date === day);
}
function planned(board, task, day) {
  return !!entryFor(board, task.id, day) || day >= board.start && day <= board.end && scheduled(task, day);
}
function lineEdit(text, section, find, transform, append) {
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const range = ranges(lines).get(section);
  if (!range) throw new Error(`Missing section ${section}`);
  let matches = [];
  let fenced = false;
  for (let i = range.start; i < range.end; i++) {
    if (/^\s*(`{3,}|~{3,})/.test(lines[i])) {
      fenced = !fenced;
      continue;
    }
    if (!fenced && find(lines[i])) matches.push(i);
  }
  if (matches.length > 1) throw new Error("Ambiguous row; no changes written.");
  if (matches.length) lines[matches[0]] = transform(lines[matches[0]]);
  else if (append) {
    let index = range.end;
    while (index > range.start && !lines[index - 1].trim()) index--;
    lines.splice(index, 0, append);
  }
  return lines.join(nl);
}
function setEntry(text, date, id, done, detail) {
  const board = parseBoard(text);
  if (!validDay(date) || !board.tasks.some((x) => x.id === id)) throw new Error("Invalid task/date.");
  const old = entryFor(board, id, date);
  const row = `- [${done ? "x" : " "}] ${date} | ${id} | ${cell(detail ?? old?.detail ?? "")}`;
  return lineEdit(text, "Schedule", (line) => {
    const m = line.match(/^\s*- \[[ xX]\]\s*(.*)$/);
    if (!m) return false;
    const p = splitCells(m[1]);
    return p[0] === date && p[1] === id;
  }, () => row, row);
}
function addWorkoutLog(text, log) {
  const board = parseBoard(text);
  if (!validDay(log.date) || log.taskId !== "workout" && log.taskId !== "treadmill" || !Number.isFinite(log.minutes) || log.minutes < 0 || !Number.isFinite(log.distance) || log.distance < 0) throw new Error("Workout log needs a valid date, Workout or Treadmill, and nonnegative duration and distance.");
  const id = log.id || `w-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  if (board.workoutLogs.some((item) => item.id === id)) throw new Error("Workout log ID already exists.");
  const row = `| ${[id, log.date, log.taskId, String(log.minutes), String(log.distance), log.details, log.note].map(cell).join(" | ")} |`;
  return lineEdit(text, "Workout Log", () => false, () => row, row);
}
function addQuickCount(text, count) {
  const board = parseBoard(text);
  if (!validDay(count.date) || !board.tasks.some((task) => task.id === count.taskId) || !Number.isFinite(count.amount) || count.amount <= 0 || !count.unit.trim()) throw new Error("Quick count needs a valid date, task, positive amount, and unit.");
  const id = count.id || `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  if (board.quickCounts.some((item) => item.id === id)) throw new Error("Quick count ID already exists.");
  const row = `| ${[id, count.date, count.taskId, String(count.amount), count.unit].map(cell).join(" | ")} |`;
  return lineEdit(text, "Quick Counts", () => false, () => row, row);
}
function saveTask(text, task) {
  parseBoard(text);
  const row = `| ${[task.id, task.title, task.color, task.page, task.kind, task.repeat, String(task.minutes), task.definition].map(cell).join(" | ")} |`;
  const next = lineEdit(text, "Tasks", (line) => line.trim().startsWith("|") && splitCells(line)[0] === task.id, () => row, row);
  parseBoard(next);
  return next;
}
function setGoal(text, goal) {
  parseBoard(text);
  const row = `- [${goal.done ? "x" : " "}] ${[goal.id, goal.due, goal.page, goal.title, goal.evidence].map(cell).join(" | ")}`;
  const next = lineEdit(text, "Goals", (line) => {
    const m = line.match(/^\s*- \[[ xX]\]\s*(.*)$/);
    return !!m && splitCells(m[1])[0] === goal.id;
  }, () => row, row);
  parseBoard(next);
  return next;
}
function timerSeconds(timer, now = Date.now()) {
  return Math.floor(timer.elapsed + (timer.started === "-" ? 0 : Math.max(0, now - Date.parse(timer.started)) / 1e3));
}
function writeTimer(text, timer) {
  const board = parseBoard(text);
  const existing = board.timer;
  const row = timer ? `| ${[timer.id, timer.taskId, timer.date, timer.started, String(timer.elapsed), String(timer.target)].map(cell).join(" | ")} |` : "";
  const next = lineEdit(text, "Timer", (line) => !!existing && line.trim().startsWith("|") && splitCells(line)[0] === existing.id, () => row, row);
  parseBoard(next);
  return next;
}
function startTimer(text, taskId, date, now = Date.now()) {
  const board = parseBoard(text);
  if (board.timer) throw new Error("A timer is already active. Save it before starting another.");
  const task = board.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error("Task not found.");
  return writeTimer(text, { id: `s-${now}-${Math.random().toString(36).slice(2, 8)}`, taskId, date, started: new Date(now).toISOString(), elapsed: 0, target: task.minutes * 60 });
}
function pauseTimer(text, id, now = Date.now()) {
  const timer = parseBoard(text).timer;
  if (!timer || timer.id !== id) throw new Error("Timer changed. Refresh and try again.");
  return writeTimer(text, { ...timer, elapsed: timerSeconds(timer, now), started: "-" });
}
function resumeTimer(text, id, now = Date.now()) {
  const timer = parseBoard(text).timer;
  if (!timer || timer.id !== id || timer.started !== "-") throw new Error("Timer changed or is already running.");
  return writeTimer(text, { ...timer, started: new Date(now).toISOString() });
}
function refreshTimer(text, id, now = Date.now()) {
  const timer = parseBoard(text).timer;
  if (!timer || timer.id !== id) throw new Error("Timer changed. Refresh and try again.");
  return writeTimer(text, { ...timer, elapsed: 0, started: new Date(now).toISOString() });
}
function finishTimer(text, id, note, now = Date.now()) {
  const board = parseBoard(text);
  if (board.sessions.some((s) => s.id === id)) return text;
  const timer = board.timer;
  if (!timer || timer.id !== id) throw new Error("Timer changed. No session saved.");
  const row = `| ${[id, timer.date, timer.taskId, String(timerSeconds(timer, now)), note].map(cell).join(" | ")} |`;
  return writeTimer(lineEdit(text, "Sessions", () => false, (x) => x, row), null);
}
function duration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// src/starter.ts
function starter(start = localDay()) {
  return `# Color Sprint

Sprint: ${start} / ${addDays(start, 13)}

Edit this note or use the Color Sprint view. All new tasks begin unscheduled.
Pages are your navigation labels, independent of the six source colors.
Timer minutes are focus suggestions, never exercise prescriptions.
Repeat: - means unscheduled; daily or mon,wed,fri schedules a habit during the sprint.
Completion means the work actually happened. Timers record focus, not workout counts.

## Tasks

${TASK_HEADER}
| --- | --- | --- | --- | --- | --- | --- | --- |
| make-bed | Make Bed | pink | Morning | habit | - | 2 | Bedding straightened and bed usable; proposed |
| brush-teeth | Brush Teeth | pink | Morning | habit | - | 2 | Chosen brushing routine completed; frequency to confirm |
| clean-kitchen | Clean Kitchen | pink | Kitchen | habit | - | 10 | Relevant dishes and surfaces reset; responsibilities to confirm |
| cook | Cook | blue | Kitchen | session | - | 25 | Meal prepared and leftovers put away; proposed |
| workout | Workout | blue | Workouts | session | - | 0 | Agreed training session logged with actual details; program to confirm |
| treadmill | Treadmill | blue | Workouts | component | - | 0 | Actual walking/running duration logged; target to confirm |
| clean-room | Clean Room | blue | Room | project | - | 15 | Named category triaged, outgoing bagged, usable space reclaimed; proposed |
| five-mile-hike | 5 Mile Hike | blue | Workouts | session | - | 0 | Actual distance logged; date and relationship to Workout to confirm |
| audio-portfolio | Revamped Audio Portfolio | blue | Portfolio | project | - | 25 | Defined update shipped; scope/platform to confirm |
| hard-task | Hard Task | blue | Admin | obligation | - | 10 | Next verifiable action or blocker recorded; proposed |
| mindfulness | Mindfulness | yellow | Morning | practice | - | 2 | Practice with a beginning and end; type/duration to confirm |
| pushups | Pushups | yellow | Workouts | component | - | 0 | Actual reps/sets logged; prescription to confirm |
| plank | Plank | yellow | Workouts | component | - | 0 | Actual holds/sets logged; prescription to confirm |
| japanese | Study Japanese | purple | Learning | practice | - | 15 | Named lesson/exercise and learning recorded; resource to confirm |
| write-code | Write code | purple | Creative | practice | - | 25 | Named fix, exercise, or commit saved; project to confirm |
| model | Model | purple | Creative | practice | - | 25 | Concrete output saved; meaning of Model to confirm |
| lyrics | Lyrics | purple | Creative | practice | - | 25 | Named lyric/vocal pass saved; song to confirm |
| push-pull | Push/Pull | orange | Workouts | session | - | 0 | Agreed push or pull session logged; split to confirm |
| bench | Bench 4x10 | orange | Workouts | component | - | 0 | Four sets of ten if agreed; load/variant to confirm |
| overhead | Overhead | orange | Workouts | component | - | 0 | Actual named movement and sets logged; movement to confirm |
| dips | Dips | salmon | Workouts | component | - | 0 | Actual variation and sets logged; volume to confirm |
| leg-press | Leg Press | salmon | Workouts | component | - | 0 | Actual load/sets/reps logged; prescription to confirm |

## Schedule

<!-- Format: - [ ] YYYY-MM-DD | task-id | detail. Empty means unscheduled. -->

## Goals

<!-- Format: - [ ] goal-id | YYYY-MM-DD or - | Page | Goal title | Evidence -->

## Sessions

${SESSION_HEADER}
| --- | --- | --- | --- | --- |

## Timer

${TIMER_HEADER}
| --- | --- | --- | --- | --- | --- |

## Workout Log

${WORKOUT_LOG_HEADER}
| --- | --- | --- | --- | --- | --- |

## Quick Counts

${QUICK_COUNT_HEADER}
| --- | --- | --- | --- | --- |

## Reflections

<!-- Optional: one plain reflection quote per line. Focus and meditation mode show one at a time. -->

## Notes

Your free-form planning, links, and reflections go here. These notes are preserved.
`;
}

// src/surface.ts
var Surface = class {
  constructor(root, host, options = {}) {
    this.root = root;
    this.host = host;
    this.board = null;
    this.day = localDay();
    this.tab = "Today";
    this.page = "All";
    this.filter = "";
    this.request = 0;
    this.destroyed = false;
    this.pending = false;
    this.focusMode = false;
    this.activitySurface = null;
    this.cuedTimerId = "";
    this.audioContext = null;
    this.timerDisplay = null;
    this.day = options.day || this.day;
    this.page = options.page || "All";
    this.tab = options.tab || "Today";
    root.classList.add("cs-root");
    if (options.embedded) root.classList.add("cs-embedded");
    this.ticker = setInterval(() => this.tick(), 1e3);
  }
  get context() {
    return { day: this.day, page: this.page, tab: this.tab };
  }
  destroy() {
    this.destroyed = true;
    clearInterval(this.ticker);
    void this.audioContext?.close();
    this.root.replaceChildren();
  }
  async refresh() {
    const seq = ++this.request;
    try {
      const board = parseBoard(await this.host.read());
      if (this.destroyed || seq !== this.request) return;
      this.board = board;
      this.render();
    } catch (error) {
      if (!this.destroyed && seq === this.request) this.renderError(error);
    }
  }
  el(tag, parent, className = "", text = "") {
    const e = parent.ownerDocument.createElement(tag);
    e.className = className;
    e.textContent = text;
    parent.append(e);
    return e;
  }
  button(parent, text, action, className = "", label) {
    const b = this.el("button", parent, className, text);
    b.type = "button";
    if (label) b.setAttribute("aria-label", label);
    b.addEventListener("click", () => {
      void this.run(action);
    });
    return b;
  }
  async run(action) {
    if (this.pending) return;
    this.pending = true;
    this.root.classList.add("cs-busy");
    try {
      await action();
    } catch (error) {
      this.host.error(error);
    } finally {
      this.pending = false;
      this.root.classList.remove("cs-busy");
    }
  }
  renderError(error) {
    this.root.replaceChildren();
    this.el("p", this.root, "cs-eyebrow", "COLOR SPRINT");
    this.el("h2", this.root, "", "Your Markdown is the starting point.");
    this.el("p", this.root, "cs-muted", error instanceof Error ? error.message : String(error));
    this.button(this.root, "Create starter note", () => this.host.createNote(), "cs-primary");
    this.button(this.root, "Choose tracker note", () => this.host.settings());
    this.button(this.root, "Open Markdown", () => this.host.openNote());
  }
  render() {
    if (!this.board) return;
    const b = this.board;
    this.root.replaceChildren();
    this.timerDisplay = null;
    if (!b.timer) this.focusMode = false;
    this.root.classList.toggle("cs-focus-mode", !!b.timer && this.focusMode);
    if (b.timer && this.focusMode) {
      this.renderFocusMode();
      this.tick();
      return;
    }
    if (this.activitySurface) {
      this.renderActivitySurface(this.activitySurface);
      return;
    }
    const head = this.el("header", this.root, "cs-header");
    const title = this.el("div", head);
    this.el("p", title, "cs-eyebrow", "COLOR SPRINT \xB7 MARKDOWN FIRST");
    this.el("h1", title, "", "A little more intentional.");
    const tools = this.el("div", head, "cs-toolbar");
    if (this.host.openDaily) this.button(tools, "Daily note \u2197", () => this.host.openDaily(), "cs-link");
    this.button(tools, "Markdown \u2197", () => this.host.openNote(), "cs-link");
    this.button(tools, "\u2699", () => this.host.settings(), "cs-icon", "Tracker settings");
    const nav = this.el("nav", this.root, "cs-tabs");
    nav.setAttribute("aria-label", "Tracker views");
    for (const tab of ["Today", "Week", "Pages", "Goals", "History"]) {
      const btn = this.button(nav, tab, () => {
        this.tab = tab;
        this.render();
      }, tab === this.tab ? "is-active" : "");
      btn.setAttribute("aria-current", String(tab === this.tab));
    }
    const controls = this.el("div", this.root, "cs-controls");
    this.button(controls, "\u2039", () => {
      this.day = addDays(this.day, -1);
      this.render();
    }, "cs-icon", "Previous day");
    const date = this.el("input", controls, "cs-date");
    date.type = "date";
    date.value = this.day;
    date.setAttribute("aria-label", "Selected date");
    date.addEventListener("change", () => {
      if (date.value) {
        this.day = date.value;
        this.render();
      }
    });
    this.button(controls, "\u203A", () => {
      this.day = addDays(this.day, 1);
      this.render();
    }, "cs-icon", "Next day");
    this.button(controls, "Today", () => {
      this.day = localDay();
      this.render();
    }, "cs-link");
    const meditation = b.tasks.find((t) => t.id === "mindfulness");
    if (meditation) this.button(controls, meditation.minutes ? `Meditate \xB7 ${meditation.minutes}m` : "Meditate", async () => {
      this.prepareFocusCues();
      await this.host.start(meditation, this.day);
      this.focusMode = true;
      this.render();
    }, "cs-link cs-meditate", "Start meditation mode");
    this.el("p", this.root, "cs-muted cs-sprint", `Sprint ${b.start} \u2192 ${b.end}`);
    if (b.timer) this.renderTimer();
    if (this.tab === "Today") this.renderToday();
    else if (this.tab === "Week") this.renderWeek();
    else if (this.tab === "Pages") this.renderPages();
    else if (this.tab === "Goals") this.renderGoals();
    else this.renderHistory();
    this.tick();
  }
  pages() {
    return ["All", .../* @__PURE__ */ new Set([...this.board.tasks.map((t) => t.page), ...this.board.goals.map((g) => g.page)])];
  }
  pageFilter(parent) {
    const bar = this.el("div", parent, "cs-pages");
    for (const page of this.pages()) {
      const button = this.button(bar, page, () => {
        this.page = page;
        this.render();
      }, page === this.page ? "is-active" : "");
      button.setAttribute("aria-pressed", String(page === this.page));
    }
  }
  taskColor(task, el) {
    el.style.setProperty("--cs-color", COLORS.find((c) => c.id === task.color).hex);
    el.setAttribute("data-color", task.color);
  }
  renderToday() {
    const b = this.board;
    this.pageFilter(this.root);
    const matches = (task) => this.page === "All" || task.page === this.page;
    const tasks = b.tasks.filter((t) => planned(b, t, this.day) && matches(t));
    const available = b.tasks.filter((t) => !planned(b, t, this.day) && matches(t));
    const done = tasks.filter((t) => entryFor(b, t.id, this.day)?.done).length;
    const hero = this.el("section", this.root, "cs-summary");
    this.el("p", hero, "cs-eyebrow", (/* @__PURE__ */ new Date(`${this.day}T12:00:00`)).toLocaleDateString(void 0, { weekday: "long", month: "short", day: "numeric" }));
    this.el("h2", hero, "", tasks.length ? `${done} of ${tasks.length} planned tasks complete` : "Start with one clear action.");
    const progress = this.el("progress", hero);
    progress.max = tasks.length || 1;
    progress.value = done;
    progress.setAttribute("aria-label", "Planned tasks completed");
    this.el("p", hero, "cs-muted", "Your plan can be small. Check off what actually happened.");
    if (!tasks.length) this.el("p", this.root, "cs-empty", "Nothing is explicitly scheduled here yet. Choose a real next action below, then tap Plan this day.");
    for (const color of COLORS) {
      const groupTasks = tasks.filter((t) => t.color === color.id);
      if (!groupTasks.length) continue;
      const group = this.el("section", this.root, "cs-group");
      this.el("h3", group, "cs-group-title", color.name);
      for (const task of groupTasks) this.taskCard(task, group, true);
    }
    if (available.length) {
      const availableSection = this.el("section", this.root, "cs-available");
      this.el("h2", availableSection, "", "Available to plan");
      this.el("p", availableSection, "cs-muted", "These are not scheduled or due. They stay visible so one planned task does not make the rest of your tracker disappear.");
      for (const color of COLORS) {
        const groupTasks = available.filter((t) => t.color === color.id);
        if (!groupTasks.length) continue;
        const group = this.el("section", availableSection, "cs-group");
        this.el("h3", group, "cs-group-title", color.name);
        for (const task of groupTasks) this.taskCard(task, group, false);
      }
    }
    this.button(this.root, "+ Add task", () => this.host.editTask(), "cs-add");
  }
  taskCard(task, parent, scheduledToday) {
    const b = this.board;
    const entry = entryFor(b, task.id, this.day);
    const card = this.el("article", parent, `cs-card ${entry?.done ? "is-done" : ""}`);
    this.taskColor(task, card);
    const row = this.el("div", card, "cs-card-main");
    if (scheduledToday) {
      const target = this.el("label", row, "cs-check-target");
      const check = this.el("input", target, "cs-check");
      check.type = "checkbox";
      check.checked = !!entry?.done;
      check.setAttribute("aria-label", `Complete ${task.title}`);
      check.addEventListener("change", () => {
        void this.run(async () => {
          try {
            await this.host.check(task, this.day, check.checked);
          } catch (e) {
            check.checked = !check.checked;
            throw e;
          }
        });
      });
    }
    const body = this.el("div", row, "cs-card-body");
    this.el("h3", body, "cs-task-title", task.title);
    this.el("p", body, "cs-meta", `${task.page} \xB7 ${task.kind}`);
    if (entry?.detail) this.el("p", body, "cs-detail", entry.detail);
    this.el("p", body, "cs-definition", task.definition);
    const actions = this.el("div", card, "cs-actions");
    if (!scheduledToday) this.button(actions, "+ Plan this day", () => this.host.schedule(task, this.day, ""), "cs-small");
    if (scheduledToday) this.button(actions, "Day details", () => this.host.editEntry(task, this.day), "cs-small");
    if (task.id === "workout" || task.id === "treadmill") this.button(actions, task.id === "workout" ? "Manage workout" : "Manage treadmill", () => {
      this.activitySurface = task.id;
      this.render();
    }, "cs-small");
    const increments = this.quickIncrements(task);
    if (increments.length) {
      const total = this.board.quickCounts.filter((count) => count.date === this.day && count.taskId === task.id && count.unit === increments[0].unit).reduce((sum, count) => sum + count.amount, 0);
      if (total) this.el(actions, "span", "cs-quick-total", `Today: ${total} ${increments[0].unit}`);
      for (const increment of increments) this.button(actions, `+${increment.amount} ${increment.unit}`, () => this.host.quickCount({ date: this.day, taskId: task.id, amount: increment.amount, unit: increment.unit }), "cs-small cs-quick", `Add ${increment.amount} ${increment.unit} for ${task.title}`);
    }
    this.button(actions, task.minutes ? `Start focus \xB7 ${task.minutes}m` : "Start focus", async () => {
      this.prepareFocusCues();
      await this.host.start(task, this.day);
      this.focusMode = true;
      this.render();
    }, "cs-small cs-start-focus", `Start focus for ${task.title}`);
    this.button(actions, "Edit", () => this.host.editTask(task), "cs-small");
  }
  renderPages() {
    this.pageFilter(this.root);
    const search = this.el("input", this.root, "cs-search");
    search.type = "search";
    search.placeholder = "Find a task\u2026";
    search.value = this.filter;
    search.setAttribute("aria-label", "Search tasks");
    const list = this.el("div", this.root);
    const render = () => {
      list.replaceChildren();
      const tasks = this.board.tasks.filter((t) => (this.page === "All" || t.page === this.page) && `${t.title} ${t.definition}`.toLowerCase().includes(this.filter.toLowerCase()));
      for (const color of COLORS) {
        const group = tasks.filter((t) => t.color === color.id);
        if (!group.length) continue;
        this.el("h3", list, "cs-group-title", color.name);
        for (const task of group) this.taskCard(task, list, planned(this.board, task, this.day));
      }
      if (!tasks.length) this.el("p", list, "cs-empty", "No tasks in this page yet. Add one below.");
    };
    search.addEventListener("input", () => {
      this.filter = search.value;
      render();
    });
    render();
    this.button(this.root, "+ Add task", () => this.host.editTask(), "cs-add");
  }
  quickIncrements(task) {
    switch (task.id) {
      case "pushups":
      case "dips":
        return [{ amount: 1, unit: "reps" }, { amount: 5, unit: "reps" }];
      case "plank":
        return [{ amount: 10, unit: "sec" }, { amount: 30, unit: "sec" }];
      case "treadmill":
        return [{ amount: 1, unit: "min" }, { amount: 5, unit: "min" }];
      default:
        return [];
    }
  }
  renderWeek() {
    this.pageFilter(this.root);
    this.el("h2", this.root, "", "The next seven days");
    this.el("p", this.root, "cs-muted", "\u2713 completed \xB7 \u25CB planned \xB7 + unscheduled. Tap + to plan; tap a planned day to check it.");
    const wrap = this.el("div", this.root, "cs-grid-scroll");
    const table2 = this.el("table", wrap, "cs-grid");
    const thead = this.el("thead", table2);
    const head = this.el("tr", thead);
    this.el("th", head, "", "Task");
    const days = Array.from({ length: 7 }, (_, i) => addDays(this.day, i));
    for (const day of days) {
      const th = this.el("th", head, "", (/* @__PURE__ */ new Date(`${day}T12:00:00`)).toLocaleDateString(void 0, { weekday: "short", day: "numeric" }));
      th.scope = "col";
    }
    const body = this.el("tbody", table2);
    for (const color of COLORS) {
      for (const task of this.board.tasks.filter((t) => t.color === color.id && (this.page === "All" || t.page === this.page))) {
        const row = this.el("tr", body);
        this.taskColor(task, row);
        const name = this.el("th", row, "cs-grid-name", task.title);
        name.scope = "row";
        for (const day of days) {
          const entry = entryFor(this.board, task.id, day);
          const isPlanned = planned(this.board, task, day);
          const cell2 = this.el("td", row);
          const btn = this.button(cell2, entry?.done ? "\u2713" : isPlanned ? "\u25CB" : "+", () => isPlanned ? this.host.check(task, day, !entry?.done) : this.host.schedule(task, day, ""), entry?.done ? "cs-cell done" : isPlanned ? "cs-cell planned" : "cs-cell", `${task.title}, ${day}: ${entry?.done ? "completed" : isPlanned ? "planned" : "add to plan"}`);
          btn.setAttribute("aria-pressed", String(!!entry?.done));
        }
      }
    }
  }
  renderGoals() {
    this.pageFilter(this.root);
    this.el("h2", this.root, "", "Goals with evidence");
    const goals = this.board.goals.filter((g) => this.page === "All" || g.page === this.page);
    if (!goals.length) this.el("p", this.root, "cs-empty", "Add a milestone with a concrete definition of done.");
    for (const goal of goals) {
      const card = this.el("article", this.root, `cs-goal ${goal.done ? "is-done" : ""}`);
      this.el("p", card, "cs-eyebrow", `${goal.page} \xB7 ${goal.due === "-" ? "No deadline" : goal.due}`);
      this.el("h3", card, "", `${goal.done ? "\u2713 " : ""}${goal.title}`);
      this.el("p", card, "cs-muted", goal.evidence || "Evidence: awaiting a real result.");
      this.button(card, goal.done ? "Edit / reopen" : "Record progress", () => this.host.editGoal(goal), "cs-small");
    }
    this.button(this.root, "+ Add goal", () => this.host.editGoal(), "cs-add");
  }
  renderHistory() {
    this.pageFilter(this.root);
    this.el("h2", this.root, "", "Sessions, honestly logged");
    this.el("p", this.root, "cs-muted", "Timer sessions measure focus. They do not automatically complete a task or count as a workout.");
    const sessions = [...this.board.sessions].reverse().filter((s) => {
      const task = this.board.tasks.find((t) => t.id === s.taskId);
      return this.page === "All" || task.page === this.page;
    });
    if (!sessions.length) this.el("p", this.root, "cs-empty", "Saved timer sessions appear here.");
    for (const s of sessions) {
      const task = this.board.tasks.find((t) => t.id === s.taskId);
      const card = this.el("article", this.root, "cs-card");
      this.taskColor(task, card);
      this.el("p", card, "cs-meta", s.date);
      this.el("h3", card, "", `${task.title} \xB7 ${duration(s.seconds)}`);
      this.el("p", card, "cs-definition", s.note || "No note recorded.");
    }
  }
  renderTimer() {
    const timer = this.board.timer;
    const task = this.board.tasks.find((t) => t.id === timer.taskId);
    const box = this.el("section", this.root, "cs-timer");
    this.taskColor(task, box);
    const details = this.el("div", box);
    this.el("p", details, "cs-eyebrow", timer.started === "-" ? "PAUSED" : "IN FOCUS");
    this.el("h2", details, "", task.title);
    this.timerDisplay = this.el("div", box, "cs-time");
    this.timerDisplay.setAttribute("role", "timer");
    this.timerDisplay.setAttribute("aria-label", "Elapsed focus time");
    const actions = this.el("div", box, "cs-actions");
    this.button(actions, timer.started === "-" ? "Resume" : "Pause", () => timer.started === "-" ? this.host.resume(timer.id) : this.host.pause(timer.id), "cs-small");
    this.button(actions, "Refresh timer", async () => {
      await this.host.refresh(timer.id);
      this.prepareFocusCues();
    }, "cs-small");
    this.button(actions, "Save session", () => this.host.finish(timer.id), "cs-primary");
    this.el("p", box, "cs-muted", "Refresh restarts at zero without saving a session. Save the actual result before starting another task.");
  }
  renderFocusMode() {
    const timer = this.board.timer;
    const task = this.board.tasks.find((t) => t.id === timer.taskId);
    const entry = entryFor(this.board, task.id, timer.date);
    const meditation = task.id === "mindfulness";
    const top = this.el("header", this.root, "cs-focus-header");
    this.el("p", top, "cs-eyebrow", timer.started === "-" ? meditation ? "MEDITATION PAUSED" : "FOCUS PAUSED" : meditation ? "MEDITATION" : "FOCUS NOW");
    this.button(top, "Back to plan", () => {
      this.focusMode = false;
      this.render();
    }, "cs-link");
    const card = this.el("main", this.root, "cs-focus-card");
    this.taskColor(task, card);
    this.el("p", card, "cs-eyebrow", task.page);
    this.el("h1", card, "", task.title);
    if (entry?.detail) this.el("p", card, "cs-focus-detail", entry.detail);
    this.el("p", card, "cs-definition", task.definition);
    const quote = this.reflectionFor(timer.id);
    if (quote) this.el("blockquote", card, "cs-reflection", `\u201C${quote}\u201D`);
    this.timerDisplay = this.el("div", card, "cs-time");
    this.timerDisplay.setAttribute("role", "timer");
    this.timerDisplay.setAttribute("aria-label", "Elapsed focus time");
    const actions = this.el("div", card, "cs-actions");
    this.button(actions, timer.started === "-" ? meditation ? "Resume meditation" : "Resume focus" : "Pause", () => timer.started === "-" ? this.host.resume(timer.id) : this.host.pause(timer.id), "cs-small");
    this.button(actions, "Refresh timer", async () => {
      await this.host.refresh(timer.id);
      this.prepareFocusCues();
    }, "cs-small");
    this.button(actions, meditation ? "End & log" : "Stop & log", () => this.host.finish(timer.id), "cs-primary");
    this.el("p", card, "cs-muted", meditation ? "Keep it simple: breathe, notice, return. Refresh restarts at zero without saving a session. At the target, Color Sprint tries a chime, vibration, and permitted notification while Obsidian stays open." : "Refresh restarts at zero without saving a session. At the target, Color Sprint tries a chime, vibration, and permitted notification while Obsidian stays open. Stopping asks what actually happened; it does not auto-complete the task.");
  }
  activityField(parent, label, type, placeholder) {
    const wrap = this.el("label", parent, "cs-activity-field");
    this.el("span", wrap, "", label);
    const input = this.el("input", wrap, "cs-search");
    input.type = type;
    input.placeholder = placeholder;
    input.setAttribute("aria-label", label);
    return input;
  }
  renderActivitySurface(kind) {
    const task = this.board.tasks.find((item) => item.id === kind);
    const name = kind === "workout" ? "Workout" : "Treadmill";
    const top = this.el("header", this.root, "cs-focus-header");
    this.el("p", top, "cs-eyebrow", "TRAINING LOG");
    this.button(top, "Back to dashboard", () => {
      this.activitySurface = null;
      this.render();
    }, "cs-link");
    const card = this.el("main", this.root, "cs-activity-card");
    this.taskColor(task, card);
    this.el("h1", card, "", name);
    this.el("p", card, "cs-muted", "Save what actually happened. This does not complete a planned task or create an extra workout count.");
    const form = this.el("div", card, "cs-activity-form");
    const date = this.activityField(form, "Date", "date", "");
    date.value = this.day;
    const minutes = this.activityField(form, "Duration minutes", "number", "0");
    minutes.min = "0";
    minutes.step = "1";
    const distance = this.activityField(form, "Distance miles", "number", "0");
    distance.min = "0";
    distance.step = "0.01";
    const details = this.activityField(form, kind === "workout" ? "Sets / reps / load" : "Pace, incline, or route", "text", kind === "workout" ? "Example: Bench 4x10 at 45 lb" : "Example: 2.8 mph, incline 2");
    const note = this.activityField(form, "How it felt / note", "text", "Optional");
    this.button(form, kind === "workout" ? "Save workout data" : "Save treadmill data", async () => {
      const duration2 = Number(minutes.value || 0), miles = Number(distance.value || 0);
      if (!date.value || !Number.isFinite(duration2) || duration2 < 0 || !Number.isFinite(miles) || miles < 0) throw new Error("Enter a valid date and nonnegative duration and distance.");
      await this.host.logWorkout({ date: date.value, taskId: kind, minutes: duration2, distance: miles, details: details.value, note: note.value });
    }, "cs-primary");
    const logs = [...this.board.workoutLogs].filter((log) => log.taskId === kind).reverse();
    this.el("h2", card, "cs-activity-history", "Recent actual logs");
    if (!logs.length) this.el("p", card, "cs-muted", "No entries yet. Your first honest log goes here.");
    for (const log of logs.slice(0, 8)) {
      const row = this.el("article", card, "cs-activity-log");
      this.el("strong", row, "", log.date);
      this.el("p", row, "", `${log.minutes} min${log.distance ? ` \xB7 ${log.distance} mi` : ""}${log.details ? ` \xB7 ${log.details}` : ""}`);
      if (log.note) this.el("p", row, "cs-muted", log.note);
    }
  }
  reflectionFor(seed) {
    const reflections = this.board.reflections;
    if (!reflections.length) return void 0;
    let value = 0;
    for (const char of seed) value = value * 31 + char.charCodeAt(0) >>> 0;
    return reflections[value % reflections.length];
  }
  prepareFocusCues() {
    this.cuedTimerId = "";
    const win = this.root.ownerDocument.defaultView;
    const Audio = win?.AudioContext || win?.webkitAudioContext;
    try {
      if (Audio) {
        const context = this.audioContext || (this.audioContext = new Audio());
        void context.resume();
      }
    } catch {
    }
    const NotificationApi = win?.Notification;
    if (NotificationApi?.permission === "default") void NotificationApi.requestPermission().catch(() => {
    });
  }
  cue(timerId, task) {
    if (this.cuedTimerId === timerId) return;
    this.cuedTimerId = timerId;
    const win = this.root.ownerDocument.defaultView;
    try {
      win?.navigator?.vibrate?.([120, 80, 180, 80, 240]);
    } catch {
    }
    const NotificationApi = win?.Notification;
    try {
      if (NotificationApi?.permission === "granted") new NotificationApi("Color Sprint focus complete", { body: `${task.title}: target reached. Stop and log what happened.` });
    } catch {
    }
    const play = () => {
      try {
        const context = this.audioContext;
        if (!context) return;
        for (const [offset, hz] of [[0, 660], [0.18, 880]]) {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = hz;
          gain.gain.setValueAtTime(1e-4, context.currentTime + offset);
          gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + offset + 0.015);
          gain.gain.exponentialRampToValueAtTime(1e-4, context.currentTime + offset + 0.16);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start(context.currentTime + offset);
          oscillator.stop(context.currentTime + offset + 0.18);
        }
      } catch {
      }
    };
    if (this.audioContext?.state === "suspended") void this.audioContext.resume().then(play).catch(() => {
    });
    else play();
  }
  tick() {
    const timer = this.board?.timer;
    if (!timer || !this.timerDisplay) return;
    const elapsed = timerSeconds(timer);
    const target = timer.target;
    if (target > 0 && elapsed >= target) {
      const task = this.board.tasks.find((t) => t.id === timer.taskId);
      if (task) this.cue(timer.id, task);
    }
    this.timerDisplay.textContent = duration(elapsed);
    this.timerDisplay.setAttribute("data-target-reached", String(target > 0 && elapsed >= target));
    const parent = this.timerDisplay.parentElement;
    let label = parent.querySelector(".cs-timer-target");
    if (!label) label = this.el("p", parent, "cs-timer-target");
    label.textContent = target ? elapsed >= target ? "Target reached \u2014 stop and log when ready." : `${duration(Math.max(0, target - elapsed))} to your focus target` : "Open stopwatch";
  }
};

// src/daily.ts
function record(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}
function vaultPath(value, folder = false) {
  const path = value.trim();
  if (!path || path.startsWith("/") || /[\\:\r\n]/.test(path) || path.split("/").some((p) => !p || p === ".." || p === "." || p.startsWith(".")) || !folder && !path.endsWith(".md")) throw new Error(`Use a visible vault-relative ${folder ? "folder" : ".md path"}: ${path}`);
  return path;
}
function dateValue(value) {
  const date = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "");
  if (!validDay(date)) throw new Error("Set sprint-date to a real YYYY-MM-DD date in the daily note.");
  return date;
}
function dailyLink(frontmatter, fallbackTracker) {
  const fm = record(frontmatter);
  if (fm["color-sprint"] !== true) return null;
  return { date: dateValue(fm["sprint-date"]), tracker: vaultPath(typeof fm["sprint-tracker"] === "string" ? fm["sprint-tracker"] : fallbackTracker), page: typeof fm["sprint-page"] === "string" && fm["sprint-page"].trim() ? fm["sprint-page"].trim() : "All", autoOpen: fm["sprint-open"] === true };
}
function embedLink(config, frontmatter, fallbackTracker) {
  const cfg = record(config);
  const fm = record(frontmatter);
  const rawDate = cfg.date === "today" ? localDay() : cfg.date ?? fm["sprint-date"];
  const tracker = typeof cfg.tracker === "string" ? cfg.tracker : typeof fm["sprint-tracker"] === "string" ? fm["sprint-tracker"] : fallbackTracker;
  const page = typeof cfg.page === "string" ? cfg.page : typeof fm["sprint-page"] === "string" ? fm["sprint-page"] : "All";
  const views = { today: "Today", week: "Week", pages: "Pages", goals: "Goals", history: "History" };
  const view = views[String(cfg.view ?? "today").toLowerCase()];
  if (!view) throw new Error("Embed view must be today, week, pages, goals, or history.");
  return { date: dateValue(rawDate), tracker: vaultPath(tracker), page: page.trim() || "All", autoOpen: false, view };
}
function dailyFilename(day, format = "MM-DD-YYYY") {
  if (!validDay(day)) throw new Error("Choose a real YYYY-MM-DD date.");
  if (format !== "MM-DD-YYYY" && format !== "YYYY-MM-DD") throw new Error("Daily filename format must be MM-DD-YYYY or YYYY-MM-DD.");
  return (format === "MM-DD-YYYY" ? `${day.slice(5, 7)}-${day.slice(8, 10)}-${day.slice(0, 4)}` : day) + ".md";
}
function scaffold(date, title, tracker, autoOpen) {
  return `---
color-sprint: true
sprint-date: ${JSON.stringify(date)}
sprint-tracker: ${JSON.stringify(vaultPath(tracker))}
sprint-page: All
sprint-open: ${autoOpen}
---

# ${title}

## Today\u2019s sprint

The dashboard below uses this note\u2019s date. Checkboxes, day details, goals, and timers save into the linked tracker.

\`\`\`color-sprint
\`\`\`

## Notes / next action

- First action:
- What changed:
- Blocker or adjustment:

## Evening check-in

- Completed (actual evidence):
- Workout (actual sets / duration / distance, if any):
- Room (category sorted / items removed / space reclaimed):
- Creative / learning / admin result:
- One thing to start with tomorrow:
`;
}
function dailyScaffold(date, tracker, autoOpen = true) {
  if (!validDay(date)) throw new Error("Choose a real YYYY-MM-DD date.");
  const title = (/* @__PURE__ */ new Date(`${date}T12:00:00`)).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  return scaffold(date, title, tracker, autoOpen);
}

// src/main.ts
var VIEW = "color-sprint-view";
var ColorSprint = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { path: "Sync/Color Sprint.md", autoOpenDaily: true, dailyFolder: "Sync/Daily", dailyFormat: "MM-DD-YYYY" };
    this.queue = Promise.resolve();
    this.surfaces = /* @__PURE__ */ new Map();
    this.dailyRequest = 0;
    this.stopped = false;
    this.bypassDaily = /* @__PURE__ */ new Set();
  }
  async onload() {
    const saved = await this.loadData();
    if (saved && typeof saved.path === "string") this.settings.path = saved.path;
    if (typeof saved?.autoOpenDaily === "boolean") this.settings.autoOpenDaily = saved.autoOpenDaily;
    if (typeof saved?.dailyFolder === "string") this.settings.dailyFolder = saved.dailyFolder;
    if (saved?.dailyFormat === "YYYY-MM-DD" || saved?.dailyFormat === "MM-DD-YYYY") this.settings.dailyFormat = saved.dailyFormat;
    this.registerView(VIEW, (leaf) => new SprintView(leaf, this));
    this.addSettingTab(new SprintSettings(this.app, this));
    this.registerMarkdownCodeBlockProcessor("color-sprint", (source, el, ctx) => {
      ctx.addChild(new SprintEmbed(el, this, source, ctx.sourcePath));
    });
    this.addRibbonIcon("calendar-check", "Open Color Sprint", () => {
      void this.open().catch((e) => this.error(e));
    });
    this.addCommand({ id: "open", name: "Open tracker", callback: () => {
      void this.open().catch((e) => this.error(e));
    } });
    this.addCommand({ id: "choose-note", name: "Choose tracker Markdown note", callback: () => this.chooseNote() });
    this.addCommand({ id: "create-starter", name: "Create starter Markdown note", callback: () => {
      void this.createNote().catch((e) => this.error(e));
    } });
    this.addCommand({ id: "open-source", name: "Open tracker Markdown", callback: () => {
      void this.openNote().catch((e) => this.error(e));
    } });
    this.addCommand({ id: "daily-today", name: "Open or create today\u2019s daily dashboard", callback: () => {
      void this.createDaily(localDay()).catch((e) => this.error(e));
    } });
    this.addCommand({ id: "daily-date", name: "Create daily dashboard for a date", callback: () => {
      const modal = new FormModal(this.app, "Daily dashboard");
      let date = localDay();
      modal.field("Date", "Create or open this day without replacing existing note content.", date, (v) => date = v, "date");
      modal.save(() => this.createDaily(date), "Open day");
      modal.open();
    } });
    const refresh = (0, import_obsidian.debounce)(() => this.refresh(), 120, true);
    const watched = (path) => path === this.settings.path || [...this.surfaces.values()].includes(path);
    this.registerEvent(this.app.vault.on("modify", (file) => {
      if (watched(file.path)) refresh();
    }));
    this.registerEvent(this.app.vault.on("create", (file) => {
      if (watched(file.path)) refresh();
    }));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      if (watched(file.path)) refresh();
    }));
    this.registerEvent(this.app.vault.on("rename", (file, old) => {
      if (old === this.settings.path && file instanceof import_obsidian.TFile) {
        this.settings.path = file.path;
        void this.saveData(this.settings);
        new import_obsidian.Notice("Tracker renamed. Update sprint-tracker properties in linked daily notes.");
        refresh();
      }
    }));
    this.registerEvent(this.app.workspace.on("file-open", (file) => {
      void this.openDailyFile(file).catch((e) => this.error(e));
    }));
    this.app.workspace.onLayoutReady(() => {
      if (!this.stopped) void this.openDailyFile(this.app.workspace.getActiveFile()).catch((e) => this.error(e));
    });
    this.registerDomEvent(document, "visibilitychange", () => {
      if (!document.hidden) this.refresh();
    });
  }
  onunload() {
    this.stopped = true;
    this.dailyRequest++;
    for (const surface of this.surfaces.keys()) surface.destroy();
    this.surfaces.clear();
  }
  async open(context = {}) {
    let leaf = this.app.workspace.getLeavesOfType(VIEW)[0];
    if (!leaf) leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: VIEW, active: true, state: { tracker: context.tracker || this.settings.path, date: context.day || localDay(), page: context.page || "All", tab: context.tab || "Today", dailyNote: context.dailyNote } });
    await this.app.workspace.revealLeaf(leaf);
  }
  file(path = this.settings.path) {
    const file = this.app.vault.getAbstractFileByPath(vaultPath(path));
    if (!(file instanceof import_obsidian.TFile)) throw new Error(`Tracker note not found: ${path}. Create it or choose an existing tracker note.`);
    return file;
  }
  async read(path = this.settings.path) {
    return this.app.vault.read(this.file(path));
  }
  change(transform, path = this.settings.path) {
    const operation = this.queue.then(async () => {
      await this.app.vault.process(this.file(path), (text) => {
        const next = transform(text);
        parseBoard(next);
        return next;
      });
      this.refresh();
    });
    this.queue = operation.catch(() => {
    });
    return operation;
  }
  refresh() {
    for (const surface of this.surfaces.keys()) void surface.refresh();
  }
  error(error) {
    new import_obsidian.Notice(error instanceof Error ? error.message : String(error), 8e3);
  }
  attach(root, context = {}) {
    const path = vaultPath(context.tracker || this.settings.path);
    const change = (fn) => this.change(fn, path);
    const host = {
      read: () => this.read(path),
      change,
      editTask: (task) => new TaskModal(this.app, this, task, path).open(),
      editGoal: (goal) => new GoalModal(this.app, this, goal, path).open(),
      editEntry: (task, day) => {
        void this.read(path).then((text) => new EntryModal(this.app, this, task, day, text, path).open()).catch((e) => this.error(e));
      },
      schedule: (task, day, detail) => change((text) => {
        const board = parseBoard(text);
        if (board.entries.some((e) => e.taskId === task.id && e.date === day)) throw new Error("Task already has an entry on this day.");
        return setEntry(text, day, task.id, false, detail);
      }),
      check: (task, day, done) => change((text) => setEntry(text, day, task.id, done)),
      start: (task, day) => change((text) => startTimer(text, task.id, day)),
      pause: (id) => change((text) => pauseTimer(text, id)),
      resume: (id) => change((text) => resumeTimer(text, id)),
      refresh: (id) => change((text) => refreshTimer(text, id)),
      logWorkout: (log) => change((text) => addWorkoutLog(text, log)),
      quickCount: (count) => change((text) => addQuickCount(text, count)),
      finish: (id) => new SessionModal(this.app, this, id, path).open(),
      openNote: () => {
        void this.openNote(path).catch((e) => this.error(e));
      },
      openDaily: context.dailyNote && !context.embedded ? () => {
        void this.openDailyMarkdown(context.dailyNote).catch((e) => this.error(e));
      } : void 0,
      createNote: () => this.createNote(path),
      settings: () => this.chooseNote(),
      error: (e) => this.error(e)
    };
    const surface = new Surface(root, host, context);
    this.surfaces.set(surface, path);
    return surface;
  }
  detach(surface) {
    surface.destroy();
    this.surfaces.delete(surface);
  }
  async openNote(path = this.settings.path) {
    await this.app.workspace.getLeaf("tab").openFile(this.file(path));
  }
  async openDailyMarkdown(path) {
    const file = this.file(path);
    this.bypassDaily.add(path);
    try {
      await this.app.workspace.getLeaf("tab").openFile(file);
    } finally {
      this.bypassDaily.delete(path);
    }
  }
  async ensureFolder(path) {
    const pieces = path.split("/");
    pieces.pop();
    let parent = "";
    for (const piece of pieces) {
      parent = parent ? `${parent}/${piece}` : piece;
      if (!this.app.vault.getAbstractFileByPath(parent)) await this.app.vault.createFolder(parent);
    }
  }
  async createNote(path = this.settings.path) {
    vaultPath(path);
    if (this.app.vault.getAbstractFileByPath(path)) {
      new import_obsidian.Notice("Note already exists. No content was replaced.");
      this.refresh();
      return;
    }
    await this.ensureFolder(path);
    await this.app.vault.create(path, starter());
    this.refresh();
    new import_obsidian.Notice("Markdown starter created. Choose tasks in Pages to plan your first day.");
  }
  async frontmatter(path) {
    const source = this.app.vault.getAbstractFileByPath(path);
    if (!(source instanceof import_obsidian.TFile)) return {};
    const text = await this.app.vault.read(source);
    const info = (0, import_obsidian.getFrontMatterInfo)(text);
    return info.exists ? (0, import_obsidian.parseYaml)(info.frontmatter) : {};
  }
  async openDailyFile(file) {
    const request = ++this.dailyRequest;
    if (this.stopped || !this.settings.autoOpenDaily || !file || !file.path.endsWith(".md")) return;
    if (this.bypassDaily.delete(file.path)) return;
    const link = dailyLink(await this.frontmatter(file.path), this.settings.path);
    if (!link?.autoOpen || this.stopped || request !== this.dailyRequest || this.app.workspace.getActiveFile()?.path !== file.path) return;
    await this.open({ tracker: link.tracker, day: link.date, page: link.page, dailyNote: file.path });
  }
  async createDaily(date) {
    const path = `${vaultPath(this.settings.dailyFolder, true)}/${dailyFilename(date, this.settings.dailyFormat)}`;
    let file = this.app.vault.getAbstractFileByPath(path);
    if (!file) {
      await this.ensureFolder(path);
      file = await this.app.vault.create(path, dailyScaffold(date, this.settings.path, true));
    }
    if (!(file instanceof import_obsidian.TFile)) throw new Error("Daily destination is a folder, not a note.");
    await this.app.workspace.getLeaf("tab").openFile(file);
    new import_obsidian.Notice("Daily dashboard opened. Existing notes are preserved.");
  }
  chooseNote() {
    const modal = new FormModal(this.app, "Choose your tracker note");
    let path = this.settings.path;
    modal.field("Markdown path", "Relative to this vault, such as Sync/Color Sprint.md", path, (v) => path = v);
    modal.save(async () => {
      this.settings.path = vaultPath(path);
      await this.saveData(this.settings);
      await this.open();
    });
    modal.open();
  }
};
var SprintView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.context = {};
  }
  getViewType() {
    return VIEW;
  }
  getDisplayText() {
    return "Color Sprint";
  }
  getIcon() {
    return "calendar-check";
  }
  getState() {
    const selected = this.surface?.context;
    return { tracker: this.context.tracker || this.plugin.settings.path, date: selected?.day || this.context.day || localDay(), page: selected?.page || this.context.page || "All", tab: selected?.tab || this.context.tab || "Today", dailyNote: this.context.dailyNote };
  }
  async setState(state, result) {
    const data = state && typeof state === "object" ? state : {};
    this.context = { tracker: typeof data.tracker === "string" ? vaultPath(data.tracker) : this.plugin.settings.path, day: typeof data.date === "string" && validDay(data.date) ? data.date : localDay(), page: typeof data.page === "string" ? data.page : "All", tab: ["Today", "Week", "Pages", "Goals", "History"].includes(String(data.tab)) ? data.tab : "Today", dailyNote: typeof data.dailyNote === "string" ? vaultPath(data.dailyNote) : void 0 };
    if (this.surface) this.plugin.detach(this.surface);
    this.surface = this.plugin.attach(this.contentEl, this.context);
    await this.surface.refresh();
    await super.setState(state, result);
  }
  async onOpen() {
    this.surface = this.plugin.attach(this.contentEl, this.context);
    await this.surface.refresh();
  }
  async onClose() {
    if (this.surface) this.plugin.detach(this.surface);
  }
};
var SprintEmbed = class extends import_obsidian.MarkdownRenderChild {
  constructor(el, plugin, source, sourcePath) {
    super(el);
    this.plugin = plugin;
    this.source = source;
    this.sourcePath = sourcePath;
    this.disposed = false;
    this.request = 0;
  }
  onload() {
    this.registerEvent(this.plugin.app.vault.on("modify", (file) => {
      if (file.path === this.sourcePath) void this.render();
    }));
    void this.render();
  }
  async render() {
    const request = ++this.request;
    try {
      const fm = await this.plugin.frontmatter(this.sourcePath);
      const config = this.source.trim() ? (0, import_obsidian.parseYaml)(this.source) : {};
      const link = embedLink(config, fm, this.plugin.settings.path);
      if (this.disposed || request !== this.request) return;
      if (this.surface) this.plugin.detach(this.surface);
      this.containerEl.replaceChildren();
      this.containerEl.classList.add("cs-embed-frame");
      const expand = this.containerEl.createEl("button", { cls: "cs-expand", text: "Open full tracker \u2197" });
      expand.addEventListener("click", () => {
        void this.plugin.open({ tracker: link.tracker, day: link.date, page: link.page, tab: link.view }).catch((e) => this.plugin.error(e));
      });
      const root = this.containerEl.createEl("div");
      this.surface = this.plugin.attach(root, { tracker: link.tracker, day: link.date, page: link.page, tab: link.view, embedded: true });
      await this.surface.refresh();
    } catch (e) {
      if (this.disposed || request !== this.request) return;
      if (this.surface) {
        this.plugin.detach(this.surface);
        this.surface = void 0;
      }
      this.containerEl.replaceChildren();
      this.containerEl.createEl("p", { cls: "cs-form-error", text: e instanceof Error ? e.message : String(e) });
    }
  }
  onunload() {
    this.disposed = true;
    this.request++;
    if (this.surface) this.plugin.detach(this.surface);
  }
};
var SprintSettings = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Daily dashboards" });
    new import_obsidian.Setting(containerEl).setName("Open linked daily notes as a sprint").setDesc("Only notes with color-sprint: true and sprint-open: true auto-open. Set sprint-open: false to stay with the inline embed.").addToggle((toggle) => toggle.setValue(this.plugin.settings.autoOpenDaily).onChange(async (value) => {
      this.plugin.settings.autoOpenDaily = value;
      await this.plugin.saveData(this.plugin.settings);
    }));
    new import_obsidian.Setting(containerEl).setName("Daily note folder").setDesc("Used by the daily dashboard creation commands.").addText((input) => input.setValue(this.plugin.settings.dailyFolder).onChange(async (value) => {
      try {
        this.plugin.settings.dailyFolder = vaultPath(value, true);
        await this.plugin.saveData(this.plugin.settings);
      } catch {
      }
    }));
    new import_obsidian.Setting(containerEl).setName("Daily filename format").addDropdown((input) => input.addOptions({ "MM-DD-YYYY": "MM-DD-YYYY", "YYYY-MM-DD": "YYYY-MM-DD" }).setValue(this.plugin.settings.dailyFormat).onChange(async (value) => {
      this.plugin.settings.dailyFormat = value;
      await this.plugin.saveData(this.plugin.settings);
    }));
    new import_obsidian.Setting(containerEl).setName("Tracker note").setDesc(this.plugin.settings.path).addButton((button) => button.setButtonText("Choose note").onClick(() => this.plugin.chooseNote()));
  }
};
var FormModal = class extends import_obsidian.Modal {
  constructor(app, title) {
    super(app);
    this.setTitle(title);
    this.contentEl.addClass("cs-form");
    this.errorEl = this.contentEl.createEl("p", { cls: "cs-form-error", attr: { role: "alert" } });
  }
  field(name, desc, value, change, type = "text") {
    new import_obsidian.Setting(this.contentEl).setName(name).setDesc(desc).addText((input) => {
      input.setValue(value);
      input.inputEl.type = type;
      input.inputEl.setAttribute("aria-label", name);
      input.onChange(change);
    });
  }
  text(name, desc, value, change) {
    new import_obsidian.Setting(this.contentEl).setName(name).setDesc(desc).addTextArea((input) => {
      input.setValue(value);
      input.inputEl.setAttribute("aria-label", name);
      input.onChange(change);
    });
  }
  select(name, desc, value, options, change) {
    new import_obsidian.Setting(this.contentEl).setName(name).setDesc(desc).addDropdown((input) => input.addOptions(options).setValue(value).onChange(change));
  }
  save(action, label = "Save") {
    new import_obsidian.Setting(this.contentEl).addButton((button) => button.setButtonText(label).setCta().onClick(async () => {
      button.setDisabled(true);
      this.errorEl.textContent = "";
      try {
        await action();
        this.close();
      } catch (e) {
        this.errorEl.textContent = e instanceof Error ? e.message : String(e);
        button.setDisabled(false);
      }
    }));
  }
  onClose() {
    this.contentEl.empty();
  }
};
var TaskModal = class extends FormModal {
  constructor(app, plugin, original, path = plugin.settings.path) {
    super(app, original ? "Edit task" : "Add a task");
    const task = original ? { ...original } : { id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: "", color: "blue", page: "General", kind: "habit", repeat: "-", minutes: 10, definition: "" };
    this.field("Task name", "Keep the label meaningful.", task.title, (v) => task.title = v.trim());
    this.field("Page", "Examples: Morning, Workouts, Room. Create pages by naming them here.", task.page, (v) => task.page = v.trim());
    this.select("Color", "These six colors retain their original grouping.", task.color, Object.fromEntries(COLORS.map((c) => [c.id, c.name])), (v) => task.color = v);
    this.field("Kind", "habit, session, component, project, practice, or obligation", task.kind, (v) => task.kind = v.trim());
    this.field("Repeat", "- means unscheduled. Use daily or mon,wed,fri. Applies inside the Sprint dates.", task.repeat, (v) => task.repeat = v.trim().toLowerCase());
    this.field("Focus timer minutes", "0 uses a stopwatch. This sets focus time, not exercise workload.", String(task.minutes), (v) => task.minutes = Number(v), "number");
    this.text("Done means", "Write the small, observable result that counts.", task.definition, (v) => task.definition = v.trim());
    this.save(() => plugin.change((text) => {
      const current = parseBoard(text).tasks.find((t) => t.id === task.id);
      if (original && JSON.stringify(current) !== JSON.stringify(original)) throw new Error("This task changed in Markdown. Reopen it to edit the latest version.");
      if (!task.title || !task.page || !task.kind || !Number.isFinite(task.minutes) || task.minutes < 0 || task.minutes > 1440) throw new Error("Name, page, kind, and 0\u20131440 timer minutes are required.");
      return saveTask(text, task);
    }, path));
  }
};
var GoalModal = class extends FormModal {
  constructor(app, plugin, original, path = plugin.settings.path) {
    super(app, original ? "Goal progress" : "Add a goal");
    const goal = original ? { ...original } : { id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, due: "-", page: "General", title: "", evidence: "", done: false };
    this.field("Goal", "One observable milestone.", goal.title, (v) => goal.title = v.trim());
    this.field("Page", "Match a task page or make a new one.", goal.page, (v) => goal.page = v.trim());
    this.field("Due date", "YYYY-MM-DD, or - for no deadline.", goal.due, (v) => goal.due = v.trim() || "-");
    this.text("Evidence", "What actually changed? File, count, usable space, or other result.", goal.evidence, (v) => goal.evidence = v.trim());
    this.select("Status", "Completion needs real evidence.", goal.done ? "done" : "open", { open: "Open", done: "Done" }, (v) => goal.done = v === "done");
    this.save(() => plugin.change((text) => {
      const current = parseBoard(text).goals.find((g) => g.id === goal.id);
      if (original && JSON.stringify(current) !== JSON.stringify(original)) throw new Error("This goal changed in Markdown. Reopen it.");
      if (!goal.title || !goal.page) throw new Error("Goal and page are required.");
      if (goal.done && !goal.evidence) throw new Error("Record the evidence before marking this goal done.");
      return setGoal(text, goal);
    }, path));
  }
};
var SessionModal = class extends FormModal {
  constructor(app, plugin, id, path = plugin.settings.path) {
    super(app, "Save your focus session");
    let note = "";
    this.text("Actual result", "Record what happened. For training, include actual sets/reps/distance. A saved timer does not mark the task complete.", note, (v) => note = v);
    this.save(() => plugin.change((text) => finishTimer(text, id, note), path), "Save session");
  }
};
var EntryModal = class extends FormModal {
  constructor(app, plugin, task, day, text, path = plugin.settings.path) {
    super(app, `${task.title} \xB7 ${day}`);
    const original = entryFor(parseBoard(text), task.id, day);
    let detail = original?.detail || "";
    this.text("Plan / actual result", "Keep source assignments intact; add actual sets, reps, distances, evidence, or blockers here.", detail, (v) => detail = v);
    this.save(() => plugin.change((current) => {
      const entry = entryFor(parseBoard(current), task.id, day);
      if (JSON.stringify(entry) !== JSON.stringify(original)) throw new Error("This entry changed in Markdown. Reopen the latest version.");
      return setEntry(current, day, task.id, entry?.done || false, detail);
    }, path));
  }
};
