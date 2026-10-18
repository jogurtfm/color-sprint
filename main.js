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
var TIMER_HEADER = "| Session ID | Task ID | Date | Started ISO | Elapsed seconds | Target seconds | Queue cursor | Step offset seconds |";
var QUEUE_TIMER_HEADER = "| Session ID | Task ID | Date | Started ISO | Elapsed seconds | Target seconds | Queue cursor |";
var LEGACY_TIMER_HEADER = "| Session ID | Task ID | Date | Started ISO | Elapsed seconds | Target seconds |";
var WORKOUT_LOG_HEADER = "| ID | Date | Task ID | Duration minutes | Distance miles | Sets / reps / load | Notes |";
var QUICK_COUNT_HEADER = "| ID | Date | Task ID | Amount | Unit |";
var TIME_BLOCK_HEADER = "| Date | Task ID | Start | End | Time zone | Status | Calendar event ID | Event URL |";
var AVAILABILITY_HEADER = "| ID | Label | Days | Start | End | Time zone |";
var SECTIONS = ["Tasks", "Schedule", "Goals", "Sessions", "Timer"];
var OPTIONAL_SECTIONS = ["Reflections", "Workout Log", "Quick Counts", "Subtasks", "Time Blocks", "Availability"];
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
function timerTable(lines, range) {
  const rows = dataLines(lines, range).filter((x) => x.trim().startsWith("|"));
  if (rows.length < 2) throw new Error(`Expected table header: ${TIMER_HEADER}`);
  const header = rows[0].replace(/\s/g, "");
  const width = header === TIMER_HEADER.replace(/\s/g, "") ? 8 : header === QUEUE_TIMER_HEADER.replace(/\s/g, "") ? 7 : header === LEGACY_TIMER_HEADER.replace(/\s/g, "") ? 6 : 0;
  if (!width) throw new Error(`Expected table header: ${TIMER_HEADER}`);
  if (!splitCells(rows[1]).every((x) => /^:?-{3,}:?$/.test(x))) throw new Error("Table requires a Markdown separator row.");
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
function integer(value) {
  if (!/^\d+$/.test(value)) throw new Error(`Invalid nonnegative integer: ${value}`);
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
  const timers = timerTable(lines, rs.get("Timer")).map((p) => ({ id: p[0], taskId: p[1], date: p[2], started: p[3], elapsed: number(p[4]), target: number(p[5]), cursor: p.length >= 7 ? integer(p[6]) : 0, stepOffset: p.length === 8 ? number(p[7]) : 0 }));
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
  const knownReference = (id) => taskIds.has(id) || !!parseGroupTimerId(id);
  for (const item of [...entries, ...sessions, ...timers, ...quickCounts]) if (!knownReference(item.taskId)) throw new Error(`Unknown task ID: ${item.taskId}. Restore the task row or update its references.`);
  const reflectionRange = rs.get("Reflections");
  const reflections = reflectionRange ? dataLines(lines, reflectionRange).map((line) => line.trim().replace(/^[-*]\s+|^>\s?/, "")).filter((line) => line && !line.startsWith("<!--")) : [];
  const match = text.match(/^Sprint: (\d{4}-\d{2}-\d{2}) \/ (\d{4}-\d{2}-\d{2})\s*$/m);
  const start = match?.[1] || localDay();
  const end = match?.[2] || addDays(start, 13);
  if (!validDay(start) || !validDay(end) || end < start) throw new Error("Invalid Sprint date range.");
  const subRange = rs.get("Subtasks");
  const subtasks = subRange ? checkboxRows(lines, subRange).map(({ done, parts: p }) => {
    if (p.length !== 7) throw new Error("Subtask rows need ID | Task ID | Context or - | Minutes | Action | Done means | Completed date or -.");
    const sub = { id: p[0], taskId: p[1], context: p[2], minutes: number(p[3]), title: p[4], definition: p[5], completed: p[6], done };
    if (!taskIds.has(sub.taskId) || !sub.title || !sub.context || sub.minutes > 1440 || sub.completed !== "-" && !validDay(sub.completed)) throw new Error("Invalid subtask parent, title, duration, or completed date.");
    return sub;
  }) : [];
  unique(subtasks.map((sub) => sub.id), "subtask");
  const timeRange = rs.get("Time Blocks");
  const timeBlocks = timeRange ? table(lines, timeRange, TIME_BLOCK_HEADER).map((p) => ({ date: p[0], taskId: p[1], start: p[2], end: p[3], timezone: p[4], status: p[5], eventId: p[6], eventUrl: p[7] })) : [];
  for (const block of timeBlocks) {
    if (!validDay(block.date) || !taskIds.has(block.taskId) || !validTime(block.start) || !validTime(block.end) || block.end <= block.start || !validTimezone(block.timezone) || !["suggested", "scheduled", "needs-review"].includes(block.status)) throw new Error("Time Blocks need a real task/date, HH:MM start/end, time zone, and valid status.");
    if (block.status === "scheduled" && (!block.eventId || block.eventId === "-")) throw new Error("Scheduled blocks need a verified calendar event ID.");
    if (block.eventUrl !== "-" && !/^https:\/\/(calendar\.google\.com|www\.google\.com)\//.test(block.eventUrl)) throw new Error("Event URL must be a Google Calendar HTTPS link or -.");
  }
  if (new Set(timeBlocks.map((block) => `${block.date}/${block.taskId}`)).size !== timeBlocks.length) throw new Error("Duplicate time block for task/date.");
  const availRange = rs.get("Availability");
  const availability = availRange ? table(lines, availRange, AVAILABILITY_HEADER).map((p) => ({ id: p[0], label: p[1], days: p[2], start: p[3], end: p[4], timezone: p[5] })) : [];
  unique(availability.map((block) => block.id), "availability");
  for (const block of availability) if (!block.label || !validRepeat(block.days) || !validTime(block.start) || !validTime(block.end) || block.end <= block.start || !validTimezone(block.timezone)) throw new Error("Availability blocks need a label, repeat days, HH:MM start/end and time zone.");
  return { tasks, entries, goals, sessions, timer, workoutLogs, quickCounts, reflections, subtasks, timeBlocks, availability, start, end };
}
function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
function validTimezone(value) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
function clockLabel(value) {
  const [hour, minute] = value.split(":").map(Number);
  return `${hour % 12 || 12}${minute ? ":" + String(minute).padStart(2, "0") : ""}${hour < 12 ? " AM" : " PM"}`;
}
function timeBlockFor(board, taskId, date) {
  return board.timeBlocks.find((block) => block.date === date && block.taskId === taskId);
}
function timeBlockLabel(block) {
  return `${block.status === "scheduled" ? "On calendar" : block.status === "needs-review" ? "Review time" : "Suggested"} \xB7 ${clockLabel(block.start)}\u2013${clockLabel(block.end)}`;
}
function availabilityFor(board, date) {
  return board.availability.filter((block) => scheduled({ repeat: block.days }, date));
}
function taskSubtasks(board, taskId, date) {
  const detail = entryFor(board, taskId, date)?.detail.toLowerCase() || "";
  return board.subtasks.filter((sub) => sub.taskId === taskId && (sub.context === "-" || detail.includes(sub.context.toLowerCase())));
}
function focusQueue(board, timer) {
  const group = parseGroupTimerId(timer.taskId);
  const tasks = board.tasks.filter((task) => group ? group.kind === "page" ? task.page === group.value : task.color === group.value : task.id === timer.taskId);
  return tasks.flatMap((task) => {
    const subs = taskSubtasks(board, task.id, timer.date);
    return subs.length ? subs.map((sub) => ({ id: sub.id, taskId: task.id, subtask: sub, title: sub.title, definition: sub.definition, minutes: sub.minutes, done: sub.done })) : [{ id: task.id, taskId: task.id, title: task.title, definition: task.definition, minutes: task.minutes, done: !!entryFor(board, task.id, timer.date)?.done }];
  });
}
function dailyWins(board, date) {
  return { tasks: board.entries.filter((entry) => entry.date === date && entry.done).length, subtasks: board.subtasks.filter((sub) => sub.done && sub.completed === date).length };
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
  return !!entryFor(board, task.id, day) || board.sessions.some((session) => session.date === day && session.taskId === task.id) || board.subtasks.some((sub) => sub.taskId === task.id && sub.done && sub.completed === day) || day >= board.start && day <= board.end && scheduled(task, day);
}
function groupTimerId(group) {
  return `group:${group.kind}:${encodeURIComponent(group.value)}`;
}
function parseGroupTimerId(id) {
  const match = id.match(/^group:(page|color):(.+)$/);
  if (!match) return null;
  try {
    return { kind: match[1], value: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
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
function scheduleGroup(text, group, date) {
  let board = parseBoard(text);
  if (!validDay(date) || !group.value.trim()) throw new Error("A schedule group needs a valid date and group.");
  const tasks = board.tasks.filter((task) => group.kind === "page" ? task.page === group.value : task.color === group.value);
  if (!tasks.length) throw new Error("This schedule group has no tasks.");
  let next = text;
  for (const task of tasks) {
    if (!entryFor(board, task.id, date)) {
      next = setEntry(next, date, task.id, false);
      board = parseBoard(next);
    }
  }
  return next;
}
function saveTimeBlock(text, block) {
  const board = parseBoard(text);
  if (!validTime(block.start) || !validTime(block.end) || block.end <= block.start) throw new Error("Use HH:MM start and end, with end after start.");
  const conflict = availabilityFor(board, block.date).find((fixed) => fixed.timezone === block.timezone && block.start < fixed.end && block.end > fixed.start);
  if (conflict) throw new Error(`This overlaps ${conflict.label} (${clockLabel(conflict.start)}\u2013${clockLabel(conflict.end)}). Choose an open time.`);
  if (board.timeBlocks.some((other) => other.date === block.date && other.taskId !== block.taskId && other.timezone === block.timezone && block.start < other.end && block.end > other.start)) throw new Error("This overlaps another task on this date. Choose an open time.");
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  let next = text;
  if (!ranges(text.split(/\r?\n/)).has("Time Blocks")) next += `${nl}## Time Blocks${nl}${nl}${TIME_BLOCK_HEADER}${nl}| --- | --- | --- | --- | --- | --- | --- | --- |${nl}`;
  const row = `| ${[block.date, block.taskId, block.start, block.end, block.timezone, block.status, block.eventId || "-", block.eventUrl || "-"].map(cell).join(" | ")} |`;
  next = lineEdit(next, "Time Blocks", (line) => {
    const p = splitCells(line);
    return p[0] === block.date && p[1] === block.taskId;
  }, () => row, row);
  parseBoard(next);
  if (!entryFor(board, block.taskId, block.date)) next = setEntry(next, block.date, block.taskId, false);
  return next;
}
function clearTimeBlock(text, taskId, date) {
  if (!parseBoard(text).timeBlocks.some((block) => block.taskId === taskId && block.date === date)) return text;
  return lineEdit(text, "Time Blocks", (line) => {
    const p = splitCells(line);
    return p[0] === date && p[1] === taskId;
  }, () => "", "");
}
function saveSubtask(text, sub) {
  let next = text;
  const nl = text.includes("\r\n") ? "\r\n" : "\n";
  if (!ranges(text.split(/\r?\n/)).has("Subtasks")) next += `${nl}## Subtasks${nl}${nl}<!-- - [ ] ID | Task ID | Context or - | Minutes | Action | Done means | Completed date or - -->${nl}`;
  const row = `- [${sub.done ? "x" : " "}] ${[sub.id, sub.taskId, sub.context, String(sub.minutes), sub.title, sub.definition, sub.completed].map(cell).join(" | ")}`;
  next = lineEdit(next, "Subtasks", (line) => {
    const m = line.match(/^\s*- \[[ xX]\]\s*(.*)$/);
    return !!m && splitCells(m[1])[0] === sub.id;
  }, () => row, row);
  parseBoard(next);
  return next;
}
function setSubtaskDone(text, id, done, date) {
  const sub = parseBoard(text).subtasks.find((sub2) => sub2.id === id);
  if (!sub || !validDay(date)) throw new Error("Subtask changed or date is invalid.");
  return saveSubtask(text, { ...sub, done, completed: done ? date : "-" });
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
  parseBoard(text);
  const lines = text.split(/\r?\n/);
  const timerRange = ranges(lines).get("Timer");
  const indices = [];
  let fenced = false;
  for (let i = timerRange.start; i < timerRange.end; i++) {
    if (/^\s*(`{3,}|~{3,})/.test(lines[i])) {
      fenced = !fenced;
      continue;
    }
    if (!fenced && lines[i].trim().startsWith("|")) indices.push(i);
  }
  const row = timer ? `| ${[timer.id, timer.taskId, timer.date, timer.started, String(timer.elapsed), String(timer.target), String(timer.cursor), String(timer.stepOffset)].map(cell).join(" | ")} |` : "";
  for (let i = indices.length - 1; i >= 0; i--) lines.splice(indices[i], 1);
  const rows = [TIMER_HEADER, "| --- | --- | --- | --- | --- | --- | --- | --- |"];
  if (row) rows.push(row);
  lines.splice(indices[0], 0, ...rows);
  const next = lines.join(text.includes("\r\n") ? "\r\n" : "\n");
  parseBoard(next);
  return next;
}
function startTimer(text, taskId, date, now = Date.now()) {
  const board = parseBoard(text);
  if (board.timer) throw new Error("A timer is already active. Open its focus screen to resume or finish it.");
  const task = board.tasks.find((t) => t.id === taskId);
  if (!task || !validDay(date)) throw new Error("Task or date not found.");
  const scheduledText = entryFor(board, taskId, date) ? text : setEntry(text, date, taskId, false);
  return writeTimer(scheduledText, { id: `s-${now}-${Math.random().toString(36).slice(2, 8)}`, taskId, date, started: new Date(now).toISOString(), elapsed: 0, target: task.minutes * 60, cursor: 0, stepOffset: 0 });
}
function startGroupTimer(text, group, date, now = Date.now()) {
  const board = parseBoard(text);
  if (board.timer) throw new Error("A timer is already active. Open its focus screen to resume or save it.");
  if (!validDay(date) || !group.value.trim()) throw new Error("A group timer needs a valid date and group.");
  const tasks = board.tasks.filter((task) => group.kind === "page" ? task.page === group.value : task.color === group.value);
  if (!tasks.length) throw new Error("This focus group has no tasks.");
  if (tasks.some((task) => !entryFor(board, task.id, date))) throw new Error("Schedule every task in this group before starting routine focus.");
  return writeTimer(text, { id: `s-${now}-${Math.random().toString(36).slice(2, 8)}`, taskId: groupTimerId(group), date, started: new Date(now).toISOString(), elapsed: 0, target: 0, cursor: 0, stepOffset: 0 });
}
function moveGroupTimer(text, id, delta, now = Date.now()) {
  const board = parseBoard(text);
  const timer = board.timer;
  if (!timer || timer.id !== id) throw new Error("Routine timer changed. Refresh and try again.");
  const length = focusQueue(board, timer).length;
  if (!length) throw new Error("This queue is empty. Save this session and choose another task.");
  return writeTimer(text, { ...timer, cursor: Math.max(0, Math.min(length - 1, timer.cursor + delta)), stepOffset: timerSeconds(timer, now) });
}
function completeFocusStep(text, id, cursor, now = Date.now()) {
  const board = parseBoard(text);
  const timer = board.timer;
  if (!timer || timer.id !== id || timer.cursor !== cursor) throw new Error("Focus step changed. Refresh and try again.");
  const queue = focusQueue(board, timer);
  const step = queue[cursor];
  if (!step) throw new Error("Focus queue changed.");
  const next = step.subtask ? setSubtaskDone(text, step.subtask.id, true, timer.date) : setEntry(text, timer.date, step.taskId, true);
  return cursor < queue.length - 1 ? moveGroupTimer(next, id, 1, now) : next;
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
  return writeTimer(text, { ...timer, elapsed: 0, stepOffset: 0, started: new Date(now).toISOString() });
}
function finishTimer(text, id, note, now = Date.now()) {
  const board = parseBoard(text);
  if (board.sessions.some((s) => s.id === id)) return text;
  const timer = board.timer;
  if (!timer || timer.id !== id) throw new Error("Timer changed. No session saved.");
  const row = `| ${[id, timer.date, timer.taskId, String(timerSeconds(timer, now)), note].map(cell).join(" | ")} |`;
  return writeTimer(lineEdit(text, "Sessions", () => false, (x) => x, row), null);
}
function finishFocus(text, id, expectedStepId, note = "", now = Date.now()) {
  const board = parseBoard(text);
  if (board.sessions.some((session) => session.id === id) && board.timer?.id !== id) return text;
  const timer = board.timer;
  if (!timer || timer.id !== id) throw new Error("Timer changed. Refresh before finishing.");
  const queue = focusQueue(board, timer);
  const step = queue[Math.min(timer.cursor, Math.max(0, queue.length - 1))];
  if (!step || step.id !== expectedStepId) throw new Error("Focus item changed. Check the current item before finishing.");
  let next = entryFor(board, step.taskId, timer.date) ? text : setEntry(text, timer.date, step.taskId, false);
  next = step.subtask ? step.done ? next : setSubtaskDone(next, step.subtask.id, true, timer.date) : setEntry(next, timer.date, step.taskId, true);
  return finishTimer(next, id, `Finished: ${step.title}${note.trim() ? `. ${note.trim()}` : ""}`, now);
}
function cancelTimer(text, id) {
  const board = parseBoard(text);
  const timer = board.timer;
  if (!timer || timer.id !== id) throw new Error("Timer changed. Refresh before cancelling.");
  let next = text;
  const step = focusQueue(board, timer)[Math.min(timer.cursor, Math.max(0, focusQueue(board, timer).length - 1))];
  if (step && !entryFor(board, step.taskId, timer.date)) next = setEntry(next, timer.date, step.taskId, false);
  return writeTimer(next, null);
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
| --- | --- | --- | --- | --- | --- | --- | --- |

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

// src/roadmaps.ts
var plans = {
  "audio-portfolio": [
    ["Choose the portfolio audience and destination", 10, "Record the current URL/platform, audience, and the one update to ship."],
    ["Inventory current examples", 15, "List available clips and mark which may be shared publicly."],
    ["Choose a small set of examples", 15, "Select examples and write one sentence about your role in each."],
    ["Prepare the selected media", 25, "Save shareable edits with clear filenames and role descriptions."],
    ["Update the portfolio page", 25, "Place the selected examples, descriptions, and contact link on the chosen platform."],
    ["Check playback and phone layout", 15, "Open every selected example and test the public-facing page on a phone."],
    ["Publish and save the final link", 10, "Verify the published link and record what shipped."]
  ],
  "clean-room": [
    ["Choose the first blocked zone", 5, "Name the bed, floor path, desk, or clothing area to reclaim; record the baseline."],
    ["Clothes: first high-volume category", 20, "Sort Keep / Outgoing / Trash and bag outgoing items immediately."],
    ["Clothes: remaining categories", 20, "Triage another category and record what remains; repeat this step if needed."],
    ["Shoes: keep within actual storage capacity", 15, "Gather pairs, select keepers that fit, and bag outgoing usable pairs."],
    ["Remove outgoing items", 15, "Arrange a real donation/removal route and get the outgoing items out of the home."],
    ["Restore bed, floor paths, and work surface", 20, "Return retained items to practical homes and reclaim normal room functions."],
    ["Test whether the keepers fit", 10, "Put clothes/shoes away; reduce again if storage overflows and record remaining work."]
  ],
  "lyrics": [
    ["Choose the song and capture a listening bounce", 10, "Save a bounce and name the lyric section to work on."],
    ["Write one concrete lyric pass", 20, "Save a verse/chorus revision with a clear throughline."],
    ["Test the words against the melody", 15, "Sing a rough pass and note specific prosody fixes."],
    ["Record and save a guide vocal", 20, "Save the take and a named decision for the next session."]
  ],
  "write-code": [
    ["Choose one project and one change", 5, "Write a named bug, exercise, or feature with a small definition of done."],
    ["Make the smallest useful change", 25, "Save a working implementation or exercise output."],
    ["Verify and save the result", 10, "Run a relevant check and save the commit/file plus the next action."]
  ],
  "japanese": [
    ["Choose a resource and lesson", 5, "Name the book/app/lesson and the exercise to finish."],
    ["Complete the chosen exercise", 15, "Save answers or notes for one defined exercise."],
    ["Recall a few examples", 5, "Record what you can recall and the next lesson."]
  ],
  "model": [["Clarify what Model means and select an output", 5, "Record the actual practice, resource, and smallest saved result before expanding the roadmap."]],
  "hard-task-tax": [
    ["Identify exactly what 2020 Tax requires", 10, "Record the obligation, known status, missing facts, and any deadline to verify."],
    ["Gather relevant documents", 15, "Make a document checklist and collect what is available."],
    ["Identify the next qualified contact or filing step", 10, "Record who to contact or the verified next action and any blocking question."],
    ["Complete one administrative next action", 20, "Save evidence of the action or record the blocker; this alone does not mean taxes are resolved."]
  ],
  "hard-task-letters": [
    ["Identify the letters and each recipient", 5, "Record the purpose and recipient separately for each letter."],
    ["Draft the chosen letter", 20, "Save a recipient-specific draft in your own voice."],
    ["Review facts and boundaries", 10, "Verify concrete claims, recipient, and intended request; note unresolved questions."],
    ["Record the delivery decision", 5, "Choose whether/when to send; drafting does not imply sending."]
  ]
};
function addRoadmap(text, taskId, context = "-") {
  const board = parseBoard(text);
  const task = board.tasks.find((task2) => task2.id === taskId);
  if (!task) throw new Error("Task no longer exists.");
  const lower = context.toLowerCase();
  const key = taskId === "hard-task" ? lower.includes("tax") ? "hard-task-tax" : lower.includes("letter") ? "hard-task-letters" : "hard-task" : taskId;
  const steps = plans[key] || [["Define the next visible result", 5, "Write the smallest observable result and any decision needed."], ["Do one bounded work block", 20, "Save a file, decision, cleared zone, or other visible result."], ["Record the next action", 5, "Write what changed and the next action or blocker."]];
  const scope = key === "hard-task-tax" ? "2020 Tax" : key === "hard-task-letters" ? "Letters" : taskId === "hard-task" ? context : "-";
  let next = text;
  for (const [index, [title, minutes, definition]] of steps.entries()) {
    const id = `roadmap-${key}-${index + 1}`;
    if (board.subtasks.some((sub2) => sub2.id === id)) continue;
    const sub = { id, taskId, context: scope, minutes, title, definition: `PROPOSED: ${definition} Suggested focus time; edit to fit.`, done: false, completed: "-" };
    next = saveSubtask(next, sub);
  }
  return next;
}

// src/digest.ts
function itinerary(board, date) {
  const fixed = availabilityFor(board, date).map((block) => ({ key: `fixed:${block.id}`, kind: "protected", title: block.label, start: block.start, end: block.end, timezone: block.timezone, fixed: block, done: false, conflict: false }));
  const blocks = board.timeBlocks.filter((block) => block.date === date).flatMap((block) => {
    const task = board.tasks.find((task2) => task2.id === block.taskId);
    return task ? [{ key: task.id, kind: "task", title: task.title, start: block.start, end: block.end, timezone: block.timezone, task, block, done: !!entryFor(board, task.id, date)?.done, conflict: false }] : [];
  });
  const timed = [...fixed, ...blocks].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end) || a.key.localeCompare(b.key));
  for (const item of timed) item.conflict = timed.some((other) => other !== item && other.timezone === item.timezone && item.start < other.end && item.end > other.start);
  const timedIds = new Set(blocks.map((item) => item.task.id));
  const flexible = board.tasks.filter((task) => planned(board, task, date) && !timedIds.has(task.id));
  const available = board.tasks.filter((task) => !planned(board, task, date) && !timedIds.has(task.id));
  const minutes = blocks.reduce((total, block) => {
    const toMinutes = (value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
    return total + toMinutes(block.end) - toMinutes(block.start);
  }, 0);
  return { timed, flexible, available, minutes };
}

// src/feedback.ts
var DEFAULT_FEEDBACK = { sound: true, haptics: true, motion: true };
var Feedback = class {
  constructor(root, settings) {
    this.root = root;
    this.settings = settings;
    this.context = null;
    this.layer = null;
    this.timeout = null;
    this.stopped = false;
  }
  prepare() {
    if (this.stopped || !this.settings().sound) return;
    const win = this.root.ownerDocument.defaultView;
    try {
      const Audio = win?.AudioContext || win?.webkitAudioContext;
      if (Audio) {
        this.context = this.context || new Audio();
        void Promise.resolve(this.context.resume()).catch(() => {
        });
      }
    } catch {
    }
  }
  play(kind) {
    if (this.stopped) return;
    const prefs = this.settings();
    const win = this.root.ownerDocument.defaultView;
    if (prefs.haptics) try {
      win?.navigator?.vibrate?.(kind === "complete" ? [20, 35, 45] : kind === "timer" ? [80, 60, 120] : 10);
    } catch {
    }
    if (!prefs.sound) return;
    const play = () => {
      try {
        const ctx = this.context;
        if (!ctx || this.stopped || !this.settings().sound) return;
        const notes = kind === "complete" ? [523.25, 659.25, 783.99] : kind === "timer" ? [659.25, 880] : kind === "saved" ? [523.25, 659.25] : [740];
        for (const [index, hz] of notes.entries()) {
          const time = ctx.currentTime + index * 0.075;
          const oscillator = ctx.createOscillator(), gain = ctx.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = hz;
          gain.gain.setValueAtTime(1e-4, time);
          gain.gain.exponentialRampToValueAtTime(0.055, time + 0.012);
          gain.gain.exponentialRampToValueAtTime(1e-4, time + 0.17);
          oscillator.connect(gain).connect(ctx.destination);
          oscillator.start(time);
          oscillator.stop(time + 0.19);
          oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
          };
        }
      } catch {
      }
    };
    try {
      if (this.context?.state === "suspended") void this.context.resume().then(play).catch(() => {
      });
      else play();
    } catch {
    }
  }
  show(message, color = "#8a59ed", kind = "complete") {
    if (this.stopped) return;
    this.play(kind);
    if (this.timeout) clearTimeout(this.timeout);
    const doc = this.root.ownerDocument;
    const win = doc.defaultView;
    this.layer = this.layer || doc.createElement("div");
    this.layer.className = "cs-feedback-layer";
    this.layer.replaceChildren();
    this.layer.style.setProperty("--cs-celebrate-color", color);
    if (!this.layer.isConnected) doc.body.append(this.layer);
    const moving = this.settings().motion && !win?.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    this.layer.classList.toggle("cs-feedback-motion", moving);
    const toast = doc.createElement("div");
    toast.className = "cs-feedback-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    const icon = doc.createElement("span");
    icon.className = "cs-feedback-check";
    icon.textContent = kind === "complete" ? "\u2713" : kind === "increment" ? "+" : "\u2713";
    icon.setAttribute("aria-hidden", "true");
    toast.append(icon, doc.createTextNode(message));
    this.layer.append(toast);
    if (moving && kind === "complete") {
      const burst = doc.createElement("div");
      burst.className = "cs-feedback-burst";
      burst.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 12; i++) {
        const particle = doc.createElement("i");
        const angle = i / 12 * Math.PI * 2;
        particle.style.setProperty("--dx", `${Math.round(Math.cos(angle) * 100)}px`);
        particle.style.setProperty("--dy", `${Math.round(-65 + Math.sin(angle) * 75)}px`);
        particle.style.setProperty("--twist", `${i * 61}deg`);
        particle.style.setProperty("--delay", `${i % 3 * 15}ms`);
        burst.append(particle);
      }
      this.layer.append(burst);
    }
    this.timeout = setTimeout(() => {
      this.layer?.remove();
      this.timeout = null;
    }, kind === "increment" ? 1100 : 1900);
  }
  destroy() {
    this.stopped = true;
    if (this.timeout) clearTimeout(this.timeout);
    this.layer?.remove();
    try {
      void this.context?.close().catch(() => {
      });
    } catch {
    }
  }
};

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
    this.roadmapSurface = null;
    this.cuedTimerId = "";
    this.timerDisplay = null;
    this.focusNotes = /* @__PURE__ */ new Map();
    this.effectsOpen = false;
    this.returnTab = "Today";
    this.day = options.day || this.day;
    this.page = options.page || "All";
    this.tab = options.tab || "Today";
    this.feedbackSettings = { ...DEFAULT_FEEDBACK, ...host.getFeedback?.() };
    this.feedback = new Feedback(root, () => this.host.getFeedback?.() || this.feedbackSettings);
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
    this.feedback.destroy();
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
      this.feedback.prepare();
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
    this.feedbackSettings = this.host.getFeedback?.() || this.feedbackSettings;
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
    if (this.roadmapSurface) {
      this.renderRoadmap(this.roadmapSurface);
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
    this.button(tools, "Effects", () => {
      this.effectsOpen = !this.effectsOpen;
      this.render();
    }, "cs-link");
    this.button(tools, "\u2699", () => this.host.settings(), "cs-icon", "Tracker settings");
    const nav = this.el("nav", this.root, "cs-tabs");
    nav.setAttribute("aria-label", "Tracker views");
    for (const tab of ["Today", "Digest", "Week", "Pages", "Goals", "History"]) {
      const btn = this.button(nav, tab, () => {
        this.tab = tab;
        this.render();
      }, tab === this.tab ? "is-active" : "");
      btn.setAttribute("aria-current", String(tab === this.tab));
    }
    const sound = this.button(nav, this.feedbackSettings.sound ? "\u266B" : "\u266B\u0338", () => this.setFeedback({ sound: !this.feedbackSettings.sound }), "cs-sound-toggle", this.feedbackSettings.sound ? "Mute completion sounds" : "Enable completion sounds");
    sound.setAttribute("aria-pressed", String(this.feedbackSettings.sound));
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
    if (meditation) this.button(controls, meditation.minutes ? `Meditate \xB7 ${meditation.minutes}m` : "Meditate", () => this.beginFocus(() => this.host.start(meditation, this.day)), "cs-link cs-meditate", "Start meditation mode");
    this.el("p", this.root, "cs-muted cs-sprint", `Sprint ${b.start} \u2192 ${b.end}`);
    const fixed = availabilityFor(b, this.day);
    if (fixed.length) this.el("p", this.root, "cs-day-availability", fixed.map((block) => `${block.label} ${clockLabel(block.start)}\u2013${clockLabel(block.end)}`).join(" \xB7 "));
    if (this.effectsOpen) this.renderFeedbackSettings();
    if (b.timer) this.renderTimer();
    if (this.tab === "Today") this.renderToday();
    else if (this.tab === "Digest") this.renderDigest();
    else if (this.tab === "Week") this.renderWeek();
    else if (this.tab === "Pages") this.renderPages();
    else if (this.tab === "Goals") this.renderGoals();
    else this.renderHistory();
    const mobileTools = this.el("footer", this.root, "cs-mobile-tools");
    this.button(mobileTools, "Markdown \u2197", () => this.host.openNote(), "cs-link");
    this.button(mobileTools, "Settings", () => this.host.settings(), "cs-link");
    this.button(mobileTools, "Effects", () => {
      this.effectsOpen = !this.effectsOpen;
      this.render();
    }, "cs-link");
    if (this.host.openDaily) this.button(mobileTools, "Daily note \u2197", () => this.host.openDaily(), "cs-link");
    this.tick();
  }
  pages() {
    return ["All", .../* @__PURE__ */ new Set([...this.board.tasks.map((t) => t.page), ...this.board.goals.map((g) => g.page)])];
  }
  groupTasks(group) {
    return this.board.tasks.filter((task) => group.kind === "page" ? task.page === group.value : task.color === group.value);
  }
  groupIsScheduled(group) {
    return this.groupTasks(group).every((task) => !!entryFor(this.board, task.id, this.day));
  }
  async beginFocus(start) {
    this.returnTab = this.tab === "Digest" ? "Digest" : "Today";
    this.prepareFocusCues();
    if (this.board?.timer) {
      this.focusMode = true;
      await this.refresh();
      return;
    }
    await start();
    this.focusMode = true;
    await this.refresh();
  }
  async endFocus(finish) {
    const board = this.board;
    const timer = board.timer;
    if (!timer) return;
    const queue = focusQueue(board, timer);
    const step = queue[Math.min(timer.cursor, Math.max(0, queue.length - 1))];
    if (finish && !step) throw new Error("This queue is empty. Cancel the timer to return to the list.");
    await this.host.change((text) => finish ? finishFocus(text, timer.id, step.id, this.focusNotes.get(timer.id) || "") : cancelTimer(text, timer.id));
    this.focusNotes.delete(timer.id);
    this.focusMode = false;
    this.roadmapSurface = null;
    this.activitySurface = null;
    this.tab = this.returnTab;
    this.page = "All";
    this.filter = "";
    this.day = timer.date;
    await this.refresh();
    if (finish) this.feedback.show(step.done ? "Focus session saved" : `${step.title} \u2713`, this.colorHex(board.tasks.find((task) => task.id === step.taskId)), step.done ? "saved" : "complete");
  }
  colorHex(task) {
    return COLORS.find((color) => color.id === task.color)?.hex || "#8a59ed";
  }
  async checkTask(task, day, done) {
    const wasDone = !!entryFor(this.board, task.id, day)?.done;
    this.feedback.prepare();
    await this.host.check(task, day, done);
    if (done && !wasDone) this.feedback.show(`${task.title} \u2713`, this.colorHex(task));
  }
  async setFeedback(patch) {
    const next = { ...this.feedbackSettings, ...patch };
    await this.host.saveFeedback?.(next);
    this.feedbackSettings = next;
    this.render();
  }
  renderFeedbackSettings() {
    const panel = this.el("section", this.root, "cs-effects-settings");
    this.el("h3", panel, "", "Feedback");
    for (const [key, label] of [["sound", "Completion sounds"], ["haptics", "Haptics when supported"], ["motion", "Completion animations"]]) {
      const row = this.el("label", panel, "cs-effect-setting");
      const check = this.el("input", row);
      check.type = "checkbox";
      check.checked = this.feedbackSettings[key];
      check.setAttribute("aria-label", label);
      check.addEventListener("change", () => void this.run(() => this.setFeedback({ [key]: check.checked })));
      this.el("span", row, "", label);
    }
    this.el("p", panel, "cs-muted", "Animation follows Reduce Motion. Sound and haptics depend on device support.");
    this.button(panel, "Test feedback", () => {
      this.feedback.prepare();
      this.feedback.show("A little win. A little momentum.");
    }, "cs-small");
    this.button(panel, "Close effects", () => {
      this.effectsOpen = false;
      this.render();
    }, "cs-small");
  }
  groupAction(parent, group, label) {
    if (this.groupIsScheduled(group)) this.button(parent, `Focus ${label}`, () => this.beginFocus(() => this.host.startGroup(group, this.day)), "cs-group-focus");
    else this.button(parent, `Schedule ${label}`, () => this.host.scheduleGroup(group, this.day), "cs-group-focus");
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
    if (this.page !== "All") this.groupAction(parent, { kind: "page", value: this.page }, `${this.page} routine`);
  }
  taskColor(task, el) {
    el.style.setProperty("--cs-color", COLORS.find((c) => c.id === task.color).hex);
    el.setAttribute("data-color", task.color);
  }
  renderDigest() {
    const board = this.board, day = this.day, plan = itinerary(board, day), wins = dailyWins(board, day);
    const digest = this.el("section", this.root, "cs-digest");
    const hero = this.el("header", digest, "cs-digest-summary");
    this.el("p", hero, "cs-eyebrow", (/* @__PURE__ */ new Date(`${day}T12:00:00`)).toLocaleDateString(void 0, { weekday: "long", month: "short", day: "numeric" }));
    this.el("h2", hero, "", "Your day, in order.");
    const stats = this.el("div", hero, "cs-digest-stats");
    for (const [count, label] of [[wins.tasks, "tasks done"], [wins.subtasks, "steps done"], [plan.minutes, "planned min"]]) {
      const stat = this.el("div", stats);
      this.el("strong", stat, "", String(count));
      this.el("span", stat, "", label);
    }
    this.el("p", hero, "cs-muted", "Local itinerary \xB7 suggested blocks stay flexible.");
    const next = plan.timed.find((item) => item.task && !item.done)?.task || plan.flexible.find((task) => !entryFor(board, task.id, day)?.done);
    if (next) {
      const cue = this.el("section", digest, "cs-digest-next");
      this.taskColor(next, cue);
      const text = this.el("div", cue);
      this.el("p", text, "cs-eyebrow", "FIRST OPEN TASK");
      this.el("strong", text, "", next.title);
      this.button(cue, board.timer ? "Open focus" : "Start", () => this.beginFocus(() => this.host.start(next, day)), "cs-primary");
    }
    const timeline = this.el("ol", digest, "cs-itinerary");
    timeline.setAttribute("aria-label", "Daily itinerary");
    for (const item of plan.timed) {
      const row = this.el("li", timeline, `cs-itinerary-item ${item.kind === "protected" ? "cs-itinerary-protected" : ""} ${item.done ? "is-done" : ""}`);
      row.setAttribute("data-itinerary-key", item.key);
      if (item.task) this.taskColor(item.task, row);
      const clock = this.el("div", row, "cs-itinerary-clock");
      this.el("strong", clock, "", clockLabel(item.start));
      this.el("span", clock, "", clockLabel(item.end));
      clock.title = item.timezone;
      const content = this.el("div", row, "cs-itinerary-content");
      this.el("p", content, "cs-eyebrow", item.kind === "protected" ? "PROTECTED" : item.block?.status === "scheduled" ? "ON CALENDAR" : item.block?.status === "needs-review" ? "REVIEW TIME" : "SUGGESTED");
      this.el("h3", content, "", item.title);
      this.el("p", content, "cs-itinerary-zone", item.timezone);
      if (item.conflict) this.el("p", content, "cs-conflict", "Time overlap \xB7 adjust this block.");
      if (item.task) {
        const task = item.task;
        const entry = entryFor(board, task.id, day), steps = taskSubtasks(board, task.id, day);
        const detail = this.el("details", content, "cs-itinerary-detail");
        this.el("summary", detail, "", entry?.detail || steps.find((step) => !step.done)?.title || task.definition);
        this.el("p", detail, "cs-definition", task.definition);
        if (steps.length) this.el("p", detail, "cs-muted", `${steps.filter((step) => step.done).length}/${steps.length} roadmap steps complete`);
        const actions = this.el("div", content, "cs-actions");
        this.button(actions, "Time / details", () => this.host.editEntry(task, day), "cs-small");
        this.button(actions, "Focus", () => this.beginFocus(() => this.host.start(task, day)), "cs-small");
        const label = this.el("label", row, "cs-itinerary-check");
        const check = this.el("input", label, "cs-check");
        check.type = "checkbox";
        check.checked = item.done;
        check.setAttribute("aria-label", `Complete ${task.title} in digest`);
        check.addEventListener("change", () => void this.run(async () => {
          try {
            await this.checkTask(task, day, check.checked);
          } catch (error) {
            check.checked = !check.checked;
            throw error;
          }
        }));
      }
    }
    if (!plan.timed.length) this.el("p", digest, "cs-muted", "No clock times yet. Flexible tasks stay below; set a time in Day details when useful.");
    if (plan.flexible.length) {
      const section = this.el("section", digest, "cs-digest-flexible");
      this.el("h3", section, "", "Flexible \xB7 no clock time");
      for (const task of plan.flexible) {
        const row = this.el("article", section, `cs-flexible-item ${entryFor(board, task.id, day)?.done ? "is-done" : ""}`);
        this.taskColor(task, row);
        const label = this.el("label", row, "cs-itinerary-check");
        const check = this.el("input", label, "cs-check");
        check.type = "checkbox";
        check.checked = !!entryFor(board, task.id, day)?.done;
        check.setAttribute("aria-label", `Complete ${task.title} in digest`);
        check.addEventListener("change", () => void this.run(async () => {
          try {
            await this.checkTask(task, day, check.checked);
          } catch (error) {
            check.checked = !check.checked;
            throw error;
          }
        }));
        const title = this.el("strong", row, "", task.title);
        if (check.checked) title.title = "Completed";
        this.button(row, "Focus", () => this.beginFocus(() => this.host.start(task, day)), "cs-small");
      }
    }
    const due = board.goals.filter((goal) => goal.due === day);
    if (due.length) {
      const goals = this.el("details", digest, "cs-digest-more");
      this.el("summary", goals, "", `Milestones today \xB7 ${due.length}`);
      for (const goal of due) this.button(goals, `${goal.done ? "\u2713 " : ""}${goal.title}`, () => this.host.editGoal(goal), "cs-link");
    }
    const quote = this.reflectionFor(day);
    if (quote) {
      const reflection = this.el("details", digest, "cs-digest-more");
      this.el("summary", reflection, "", "Reflection");
      this.el("blockquote", reflection, "cs-reflection", `\u201C${quote}\u201D`);
    }
    const remaining = this.el("details", digest, "cs-digest-more");
    this.el("summary", remaining, "", `Available, not due \xB7 ${plan.available.length}`);
    for (const task of plan.available) {
      const row = this.el("div", remaining, "cs-digest-available");
      this.el("span", row, "", task.title);
      this.button(row, "+ Plan", () => this.host.schedule(task, day, ""), "cs-small");
    }
    this.button(digest, "Show all task cards", () => {
      this.tab = "Today";
      this.page = "All";
      this.render();
    }, "cs-add");
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
    const wins = dailyWins(b, this.day);
    this.el("p", hero, "cs-wins", `${wins.tasks} task${wins.tasks === 1 ? "" : "s"} done \xB7 ${wins.subtasks} subtask${wins.subtasks === 1 ? "" : "s"} done${wins.tasks + wins.subtasks ? " \xB7 Nice work." : ""}`).setAttribute("aria-live", "polite");
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
      this.groupAction(group, { kind: "color", value: color.id }, "group");
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
        if (!tasks.some((task) => task.color === color.id)) this.groupAction(group, { kind: "color", value: color.id }, "group");
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
            await this.checkTask(task, this.day, check.checked);
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
    const block = timeBlockFor(b, task.id, this.day);
    if (block) {
      const time = this.el("p", body, "cs-time-slot", timeBlockLabel(block));
      time.title = block.timezone;
      if (block.status === "scheduled" && block.eventUrl !== "-") {
        const link = this.el("a", time, "cs-event-link", " \u2197");
        link.href = block.eventUrl;
        link.setAttribute("aria-label", "Open Google Calendar event");
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }
    }
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
      if (total) this.el("span", actions, "cs-quick-total", `Today: ${total} ${increments[0].unit}`);
      for (const increment of increments) this.button(actions, `+${increment.amount} ${increment.unit}`, async () => {
        await this.host.quickCount({ date: this.day, taskId: task.id, amount: increment.amount, unit: increment.unit });
        this.feedback.show(`+${increment.amount} ${increment.unit}`, this.colorHex(task), "increment");
      }, "cs-small cs-quick", `Add ${increment.amount} ${increment.unit} for ${task.title}`);
    }
    const subs = taskSubtasks(b, task.id, this.day);
    if (subs.length || ["project", "obligation"].includes(task.kind)) this.button(actions, subs.length ? `Steps ${subs.filter((sub) => sub.done).length}/${subs.length}` : "Roadmap", () => {
      this.roadmapSurface = task.id;
      this.render();
    }, "cs-small");
    this.button(actions, subs.length ? "Focus steps" : task.minutes ? `Start focus \xB7 ${task.minutes}m` : "Start focus", () => this.beginFocus(() => this.host.start(task, this.day)), "cs-small cs-start-focus", `Start focus for ${task.title}`);
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
          const block = timeBlockFor(this.board, task.id, day);
          const cell2 = this.el("td", row);
          const btn = this.button(cell2, entry?.done ? "\u2713" : isPlanned ? "\u25CB" : "+", () => isPlanned ? this.checkTask(task, day, !entry?.done) : this.host.schedule(task, day, ""), entry?.done ? "cs-cell done" : isPlanned ? "cs-cell planned" : "cs-cell", `${task.title}, ${day}: ${entry?.done ? "completed" : isPlanned ? "planned" : "add to plan"}${block ? `, ${timeBlockLabel(block)}, ${block.timezone}` : ""}`);
          if (block) {
            this.el("span", btn, "cs-cell-time", `${block.status === "scheduled" ? "" : "~"}${clockLabel(block.start)}`);
            btn.title = `${timeBlockLabel(block)} \xB7 ${block.timezone}`;
          }
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
    this.el("p", this.root, "cs-muted", "Finish records focus and checks off the current task or subtask. Earlier log-only sessions retain their original completion state.");
    const sessions = [...this.board.sessions].reverse().filter((s) => {
      const task = this.board.tasks.find((t) => t.id === s.taskId);
      const group = parseGroupTimerId(s.taskId);
      return this.page === "All" || task?.page === this.page || group?.kind === "page" && group.value === this.page;
    });
    if (!sessions.length) this.el("p", this.root, "cs-empty", "Saved timer sessions appear here.");
    for (const s of sessions) {
      const task = this.board.tasks.find((t) => t.id === s.taskId);
      const group = parseGroupTimerId(s.taskId);
      const card = this.el("article", this.root, "cs-card");
      if (task) this.taskColor(task, card);
      else if (group) this.groupColor(group, card);
      this.el("p", card, "cs-meta", s.date);
      this.el("h3", card, "", `${task?.title || (group ? this.groupTitle(group) : "Focus session")} \xB7 ${duration(s.seconds)}`);
      this.el("p", card, "cs-definition", s.note || "No note recorded.");
    }
  }
  renderTimer() {
    this.button(this.root, "Open active focus", () => {
      this.focusMode = true;
      this.render();
    }, "cs-primary cs-open-focus");
    const timer = this.board.timer;
    const task = this.board.tasks.find((t) => t.id === timer.taskId);
    const group = parseGroupTimerId(timer.taskId);
    const queue = focusQueue(this.board, timer);
    const step = queue[Math.min(timer.cursor, Math.max(0, queue.length - 1))];
    const box = this.el("section", this.root, "cs-timer");
    if (task) this.taskColor(task, box);
    else if (group) this.groupColor(group, box);
    const details = this.el("div", box);
    this.el("p", details, "cs-eyebrow", timer.started === "-" ? "PAUSED" : "IN FOCUS");
    this.el("h2", details, "", step?.title || task?.title || (group ? this.groupTitle(group) : "Focus session"));
    this.timerDisplay = this.el("div", box, "cs-time");
    this.timerDisplay.setAttribute("role", "timer");
    this.timerDisplay.setAttribute("aria-label", "Elapsed focus time");
    const actions = this.el("div", box, "cs-actions");
    this.button(actions, timer.started === "-" ? "Resume" : "Pause", () => timer.started === "-" ? this.host.resume(timer.id) : this.host.pause(timer.id), "cs-small");
    this.button(actions, "Refresh timer", async () => {
      await this.host.refresh(timer.id);
      this.prepareFocusCues();
    }, "cs-small");
    this.button(actions, "Cancel", () => this.endFocus(false), "cs-small");
    if (step) this.button(actions, "Finish", () => this.endFocus(true), "cs-primary");
    this.el("p", box, "cs-muted", "Finish saves and checks off this item. Cancel discards the running timer; already completed work stays checked.");
  }
  renderFocusMode() {
    const board = this.board;
    const timer = board.timer;
    const group = parseGroupTimerId(timer.taskId);
    const queue = focusQueue(board, timer);
    const cursor = Math.min(timer.cursor, Math.max(0, queue.length - 1));
    const step = queue[cursor];
    const task = board.tasks.find((task2) => task2.id === step?.taskId);
    const meditation = task?.id === "mindfulness";
    const top = this.el("header", this.root, "cs-focus-header");
    this.el("p", top, "cs-eyebrow", timer.started === "-" ? "FOCUS PAUSED" : meditation ? "MEDITATION" : "FOCUS NOW");
    this.button(top, "Back to plan", () => {
      this.focusMode = false;
      this.render();
    }, "cs-link");
    const card = this.el("main", this.root, "cs-focus-card");
    if (task) this.taskColor(task, card);
    this.el("p", card, "cs-eyebrow", `${group ? this.groupTitle(group) : task?.title || "Focus"}${queue.length > 1 ? ` \xB7 ${cursor + 1}/${queue.length}` : ""}`);
    this.el("h1", card, "", step?.title || "Queue is empty");
    this.el("p", card, "cs-definition", step?.definition || "Save this session and choose an available task.");
    this.timerDisplay = this.el("div", card, "cs-time");
    this.timerDisplay.setAttribute("role", "timer");
    this.timerDisplay.setAttribute("aria-label", step?.minutes ? "Remaining step time" : "Elapsed step time");
    if (step && cursor < queue.length - 1) {
      this.button(card, step.done ? "Next completed step \u2713" : "Done & next", async () => {
        if (step.done) await this.host.moveGroup(timer.id, 1);
        else {
          await this.host.change((text) => completeFocusStep(text, timer.id, timer.cursor));
          this.feedback.show(`${step.title} \u2713`, task ? this.colorHex(task) : "#8a59ed");
        }
      }, step.done ? "cs-small" : "cs-primary");
    }
    const noteDetails = this.el("details", card, "cs-focus-note");
    this.el("summary", noteDetails, "", "Add a result note (optional)");
    const note = this.el("textarea", noteDetails);
    note.value = this.focusNotes.get(timer.id) || "";
    note.setAttribute("aria-label", "Focus result note");
    note.placeholder = "What changed?";
    note.addEventListener("input", () => this.focusNotes.set(timer.id, note.value));
    const actions = this.el("div", card, "cs-actions");
    if (cursor > 0) this.button(actions, "Back", () => this.host.moveGroup(timer.id, -1), "cs-small");
    if (cursor < queue.length - 1) this.button(actions, "Skip / next", () => this.host.moveGroup(timer.id, 1), "cs-small");
    this.button(actions, timer.started === "-" ? "Resume" : "Pause", () => timer.started === "-" ? this.host.resume(timer.id) : this.host.pause(timer.id), "cs-small");
    this.button(actions, "Refresh timer", async () => {
      await this.host.refresh(timer.id);
      this.prepareFocusCues();
    }, "cs-small");
    this.button(actions, "Cancel", () => this.endFocus(false), "cs-small");
    if (step) this.button(actions, "Finish", () => this.endFocus(true), "cs-primary");
    if (queue.length > 1) {
      const next = this.el("details", card, "cs-routine-queue");
      this.el("summary", next, "", `Up next \xB7 ${Math.max(0, queue.length - cursor - 1)} steps`);
      for (const upcoming of queue.slice(cursor + 1)) this.el("p", next, "cs-muted", `${upcoming.done ? "\u2713 " : ""}${upcoming.title}${upcoming.minutes ? ` \xB7 ${upcoming.minutes}m` : ""}`);
    }
    const quote = this.reflectionFor(`${timer.id}-${cursor}`);
    if (quote) this.el("blockquote", card, "cs-reflection", `\u201C${quote}\u201D`);
    this.el("p", card, "cs-muted", step ? `Finish checks off \u201C${step.title}\u201D and returns to the daily list. Cancel discards the timer and keeps your tasks.` : "Cancel returns to the daily list.");
  }
  groupTitle(group) {
    return group.kind === "page" ? `${group.value} routine` : `${COLORS.find((color) => color.id === group.value)?.name || group.value} group`;
  }
  groupColor(group, element) {
    const task = group.kind === "color" ? this.board.tasks.find((item) => item.color === group.value) : this.board.tasks.find((item) => item.page === group.value);
    if (task) this.taskColor(task, element);
  }
  renderRoadmap(id) {
    const board = this.board;
    const task = board.tasks.find((task2) => task2.id === id);
    if (!task) {
      this.roadmapSurface = null;
      this.render();
      return;
    }
    const top = this.el("header", this.root, "cs-focus-header");
    this.el("p", top, "cs-eyebrow", "ROADMAP");
    this.button(top, "Back to plan", () => {
      this.roadmapSurface = null;
      this.render();
    }, "cs-link");
    const card = this.el("section", this.root, "cs-activity-card");
    this.taskColor(task, card);
    this.el("h2", card, "", task.title);
    const subs = taskSubtasks(board, id, this.day);
    const detail = entryFor(board, id, this.day)?.detail || "-";
    this.el("p", card, "cs-muted", "Suggested steps and minutes are editable. Completing steps does not automatically finish the parent task.");
    if (!subs.length) this.button(card, "Generate proposed roadmap", () => this.host.change((text) => addRoadmap(text, id, detail)), "cs-primary");
    for (const sub of subs) {
      const row = this.el("article", card, "cs-subtask");
      const label = this.el("label", row, "cs-group-step");
      const check = this.el("input", label);
      check.type = "checkbox";
      check.checked = sub.done;
      check.setAttribute("aria-label", `Complete subtask ${sub.title}`);
      check.addEventListener("change", () => {
        this.feedback.prepare();
        void this.run(async () => {
          await this.host.change((text) => setSubtaskDone(text, sub.id, check.checked, this.day));
          if (check.checked && !sub.done) this.feedback.show(`${sub.title} \u2713`, this.colorHex(task));
        });
      });
      this.el("span", label, "", sub.title);
      this.el("small", label, "", sub.minutes ? `${sub.minutes}m` : "Open");
      this.el("p", row, "cs-definition", sub.definition);
      this.button(row, "Edit step", () => this.host.editSubtask(task, sub), "cs-small");
    }
    const actions = this.el("div", card, "cs-actions");
    this.button(actions, "+ Add step", () => this.host.editSubtask(task), "cs-small");
    if (subs.length) this.button(actions, "Focus steps", () => this.beginFocus(() => this.host.start(task, this.day)), "cs-primary");
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
    this.feedback.prepare();
    const win = this.root.ownerDocument.defaultView;
    const NotificationApi = win?.Notification;
    try {
      if (NotificationApi?.permission === "default" && typeof NotificationApi.requestPermission === "function") void Promise.resolve(NotificationApi.requestPermission()).catch(() => {
      });
    } catch {
    }
  }
  cue(timerId, title) {
    if (this.cuedTimerId === timerId) return;
    this.cuedTimerId = timerId;
    this.feedback.show(`${title}: time reached`, "#8a59ed", "timer");
    const win = this.root.ownerDocument.defaultView;
    const NotificationApi = win?.Notification;
    try {
      if (NotificationApi?.permission === "granted") new NotificationApi("Color Sprint focus complete", { body: `${title}: target reached. Choose Finish when the item is done, or Cancel.` });
    } catch {
    }
  }
  tick() {
    const timer = this.board?.timer;
    if (!timer || !this.timerDisplay) return;
    const elapsed = timerSeconds(timer);
    const queue = focusQueue(this.board, timer);
    const step = queue[Math.min(timer.cursor, Math.max(0, queue.length - 1))];
    const target = step ? step.minutes * 60 : timer.target;
    const stepElapsed = Math.max(0, elapsed - timer.stepOffset);
    if (target > 0 && stepElapsed >= target) this.cue(`${timer.id}:${timer.cursor}:${timer.stepOffset}`, step?.title || "Focus session");
    this.timerDisplay.textContent = this.focusMode && target > 0 ? duration(Math.max(0, target - stepElapsed)) : duration(elapsed);
    this.timerDisplay.setAttribute("data-target-reached", String(target > 0 && stepElapsed >= target));
    const parent = this.timerDisplay.parentElement;
    let label = parent.querySelector(".cs-timer-target");
    if (!label) label = this.el("p", parent, "cs-timer-target");
    label.textContent = target ? stepElapsed >= target ? `Time reached \xB7 ${duration(elapsed)} total focus` : `${duration(Math.max(0, target - stepElapsed))} remaining \xB7 ${duration(elapsed)} total focus` : `${duration(elapsed)} total focus \xB7 open stopwatch`;
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
  const views = { today: "Today", digest: "Digest", week: "Week", pages: "Pages", goals: "Goals", history: "History" };
  const view = views[String(cfg.view ?? "today").toLowerCase()];
  if (!view) throw new Error("Embed view must be today, digest, week, pages, goals, or history.");
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
    this.settings = { path: "Sync/Color Sprint.md", autoOpenDaily: true, dailyFolder: "Sync/Daily", dailyFormat: "MM-DD-YYYY", feedback: { ...DEFAULT_FEEDBACK } };
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
    for (const key of ["sound", "haptics", "motion"]) if (typeof saved?.feedback?.[key] === "boolean") this.settings.feedback[key] = saved.feedback[key];
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
    this.addCommand({ id: "open-digest", name: "Open daily digest / itinerary", callback: () => {
      void this.open({ tab: "Digest" }).catch((e) => this.error(e));
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
      getFeedback: () => ({ ...this.settings.feedback }),
      saveFeedback: async (prefs) => {
        await this.saveData({ ...this.settings, feedback: prefs });
        this.settings.feedback = { ...prefs };
        this.refresh();
      },
      editTask: (task) => new TaskModal(this.app, this, task, path).open(),
      editSubtask: (task, sub) => new SubtaskModal(this.app, this, task, sub, path).open(),
      editGoal: (goal) => new GoalModal(this.app, this, goal, path).open(),
      editEntry: (task, day) => {
        void this.read(path).then((text) => new EntryModal(this.app, this, task, day, text, path).open()).catch((e) => this.error(e));
      },
      schedule: (task, day, detail) => change((text) => {
        const board = parseBoard(text);
        if (board.entries.some((e) => e.taskId === task.id && e.date === day)) throw new Error("Task already has an entry on this day.");
        return setEntry(text, day, task.id, false, detail);
      }),
      scheduleGroup: (group, day) => change((text) => scheduleGroup(text, group, day)),
      check: (task, day, done) => change((text) => setEntry(text, day, task.id, done)),
      start: (task, day) => change((text) => startTimer(text, task.id, day)),
      startGroup: (group, day) => change((text) => startGroupTimer(text, group, day)),
      moveGroup: (id, delta) => change((text) => moveGroupTimer(text, id, delta)),
      pause: (id) => change((text) => pauseTimer(text, id)),
      resume: (id) => change((text) => resumeTimer(text, id)),
      refresh: (id) => change((text) => refreshTimer(text, id)),
      logWorkout: (log) => change((text) => addWorkoutLog(text, log)),
      quickCount: (count) => change((text) => addQuickCount(text, count)),
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
    this.context = { tracker: typeof data.tracker === "string" ? vaultPath(data.tracker) : this.plugin.settings.path, day: typeof data.date === "string" && validDay(data.date) ? data.date : localDay(), page: typeof data.page === "string" ? data.page : "All", tab: ["Today", "Digest", "Week", "Pages", "Goals", "History"].includes(String(data.tab)) ? data.tab : "Today", dailyNote: typeof data.dailyNote === "string" ? vaultPath(data.dailyNote) : void 0 };
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
    containerEl.createEl("h2", { text: "Completion feedback" });
    for (const [key, label] of [["sound", "Completion sounds"], ["haptics", "Haptics when supported"], ["motion", "Completion animations"]]) new import_obsidian.Setting(containerEl).setName(label).setDesc(key === "motion" ? "Always respects system Reduce Motion." : key === "haptics" ? "Uses vibration only when the device exposes it." : "Quiet synthesized chimes after successful saves.").addToggle((toggle) => toggle.setValue(this.plugin.settings.feedback[key]).onChange(async (value) => {
      this.plugin.settings.feedback[key] = value;
      await this.plugin.saveData(this.plugin.settings);
      this.plugin.refresh();
    }));
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
var SubtaskModal = class extends FormModal {
  constructor(app, plugin, task, original, path = plugin.settings.path) {
    super(app, original ? "Edit roadmap step" : "Add roadmap step");
    const sub = original ? { ...original } : { id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, taskId: task.id, context: "-", minutes: 10, title: "", definition: "", done: false, completed: "-" };
    this.field("Step", "A concrete next action.", sub.title, (v) => sub.title = v.trim());
    this.field("Suggested minutes", "0 runs an open stopwatch.", String(sub.minutes), (v) => sub.minutes = Number(v), "number");
    this.field("Context", "- for all days; or a schedule detail such as 2020 Tax or Letters.", sub.context, (v) => sub.context = v.trim() || "-");
    this.text("Done means", "What visible result finishes this step?", sub.definition, (v) => sub.definition = v.trim());
    this.save(() => plugin.change((text) => {
      const current = parseBoard(text).subtasks.find((item) => item.id === sub.id);
      if (original && JSON.stringify(current) !== JSON.stringify(original)) throw new Error("This step changed in Markdown. Reopen it.");
      if (!Number.isFinite(sub.minutes) || sub.minutes < 0 || sub.minutes > 1440) throw new Error("Use 0\u20131440 minutes.");
      return saveSubtask(text, sub);
    }, path));
  }
};
var EntryModal = class extends FormModal {
  constructor(app, plugin, task, day, text, path = plugin.settings.path) {
    super(app, `${task.title} \xB7 ${day}`);
    const board = parseBoard(text);
    const original = entryFor(board, task.id, day);
    const originalBlock = timeBlockFor(board, task.id, day);
    let detail = original?.detail || "";
    let start = originalBlock?.start || "", end = originalBlock?.end || "", timezone = originalBlock?.timezone || board.availability[0]?.timezone || "America/Chicago";
    this.text("Plan / actual result", "Keep source assignments intact; add actual sets, reps, distances, evidence, or blockers here.", detail, (v) => detail = v);
    this.field("Suggested start", "24-hour local time, such as 19:00; leave both time fields empty for flexible.", start, (v) => start = v, "time");
    this.field("Suggested end", "Same day, after the start.", end, (v) => end = v, "time");
    this.field("Time zone", "Time zone used by the calendar block.", timezone, (v) => timezone = v.trim());
    this.save(() => plugin.change((current) => {
      const latest = parseBoard(current);
      const entry = entryFor(latest, task.id, day);
      const block = timeBlockFor(latest, task.id, day);
      if (JSON.stringify(entry) !== JSON.stringify(original) || JSON.stringify(block) !== JSON.stringify(originalBlock)) throw new Error("This entry changed in Markdown. Reopen the latest version.");
      let next = setEntry(current, day, task.id, entry?.done || false, detail);
      if (start || end) {
        const changed = start !== originalBlock?.start || end !== originalBlock?.end || timezone !== originalBlock?.timezone;
        next = saveTimeBlock(next, { date: day, taskId: task.id, start, end, timezone, status: changed ? "suggested" : originalBlock?.status || "suggested", eventId: originalBlock?.eventId || "-", eventUrl: originalBlock?.eventUrl || "-" });
      } else {
        if (block?.eventId && block.eventId !== "-") throw new Error("This time has a calendar event. Change its time and reconcile the linked event before clearing it.");
        next = clearTimeBlock(next, task.id, day);
      }
      return next;
    }, path));
  }
};
