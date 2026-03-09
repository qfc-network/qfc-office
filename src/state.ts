import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { OfficeState, Member, Message } from "./types.js";
import { DEFAULT_MEMBERS, DEFAULT_ROOMS } from "./members.js";

const STATE_DIR = path.join(os.homedir(), ".qfc-office");
const STATE_FILE = path.join(STATE_DIR, "state.json");

function ensureDir(): void {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

export function loadState(): OfficeState {
  ensureDir();
  if (!fs.existsSync(STATE_FILE)) {
    return { members: [], rooms: [], messages: [], currentUser: null };
  }
  const raw = fs.readFileSync(STATE_FILE, "utf-8");
  return JSON.parse(raw) as OfficeState;
}

export function saveState(state: OfficeState): void {
  ensureDir();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

export function initState(): OfficeState {
  const state: OfficeState = {
    members: DEFAULT_MEMBERS,
    rooms: DEFAULT_ROOMS,
    messages: [],
    currentUser: null,
  };
  saveState(state);
  return state;
}

export function findMember(state: OfficeState, name: string): Member | undefined {
  const lower = name.toLowerCase();
  return state.members.find(
    (m) =>
      m.name.toLowerCase() === lower ||
      m.name.split(" ")[0].toLowerCase() === lower ||
      m.chineseName === name
  );
}

export function addMessage(state: OfficeState, sender: string, room: string, text: string): void {
  const msg: Message = {
    timestamp: new Date().toISOString(),
    sender,
    room,
    text,
  };
  state.messages.push(msg);
}

export function getCurrentUser(state: OfficeState): Member | undefined {
  if (!state.currentUser) return undefined;
  return state.members.find((m) => m.name === state.currentUser);
}
