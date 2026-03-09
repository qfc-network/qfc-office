import chalk from "chalk";
import boxen from "boxen";
import type { OfficeState, Member } from "./types.js";
import type { ChainInfo } from "./chain.js";
import { getCurrentUser } from "./state.js";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function statusIcon(status: string): string {
  switch (status) {
    case "online": return "🟢";
    case "busy": return "🟢";
    case "idle": return "🟡";
    case "offline": return "⚫";
    default: return "⚫";
  }
}

function statusLabel(status: string): string {
  const s = status.charAt(0).toUpperCase() + status.slice(1);
  switch (status) {
    case "online": return chalk.green(s);
    case "busy": return chalk.yellow(s);
    case "idle": return chalk.dim(s);
    case "offline": return chalk.gray(s);
    default: return s;
  }
}

function formatMemberLine(m: Member): string {
  const nameStr = `${m.emoji} ${m.name}（${m.chineseName}）`;
  const padded = nameStr.padEnd(36);
  const statusStr = `${statusIcon(m.status)} ${statusLabel(m.status)}`;
  const msg = m.statusMessage ? chalk.dim(`  "${m.statusMessage}"`) : "";
  return `  ${padded} ${statusStr}${msg}`;
}

function blockStr(n: number | null): string {
  if (n === null) return "N/A";
  return `#${n.toLocaleString()}`;
}

export function renderDashboard(state: OfficeState, chain: ChainInfo): string {
  const lines: string[] = [];

  // Header
  const chainStatus = chain.online
    ? chalk.green(`Block ${blockStr(chain.blockNumber)}`)
    : chalk.red("Chain: offline");
  const header = `🏢 QFC Virtual Office          ${chainStatus}    ${chalk.dim(chain.networkName)}`;
  lines.push(header);
  lines.push(chalk.dim("━".repeat(56)));
  lines.push("");

  // Group members by status
  const online = state.members.filter((m) => m.status === "online" || m.status === "busy");
  const idle = state.members.filter((m) => m.status === "idle");
  const offline = state.members.filter((m) => m.status === "offline");

  const total = state.members.length;

  // Online
  if (online.length > 0) {
    lines.push(chalk.bold(`Online (${online.length}/${total}):`));
    for (const m of online) {
      lines.push(formatMemberLine(m));
    }
    lines.push("");
  }

  // Idle
  if (idle.length > 0) {
    lines.push(chalk.bold(`Idle (${idle.length}):`));
    for (const m of idle) {
      lines.push(formatMemberLine(m));
    }
    lines.push("");
  }

  // Offline
  if (offline.length > 0) {
    const names = offline.map((m) => m.name.split(" ")[0]).join(", ");
    lines.push(chalk.bold(`Offline (${offline.length}):`));
    lines.push(`  ${chalk.gray(names)}`);
    lines.push("");
  }

  // Current user location
  const user = getCurrentUser(state);
  if (user) {
    const roomObj = state.rooms.find((r) => r.name === user.room);
    const roomDesc = roomObj ? ` (${roomObj.description})` : "";
    lines.push(`📍 You are in: ${chalk.cyan(user.room)}${chalk.dim(roomDesc)}`);
    lines.push("");
  }

  // Recent activity
  const recentMessages = state.messages.slice(-5).reverse();
  if (recentMessages.length > 0) {
    lines.push(chalk.bold("Recent Activity:"));
    for (const msg of recentMessages) {
      const sender = state.members.find((m) => m.name === msg.sender);
      const emoji = sender?.emoji ?? "💬";
      lines.push(`  ${chalk.dim(formatTime(msg.timestamp))}  ${emoji} ${msg.sender}: ${msg.text}`);
    }
    lines.push("");
  }

  return boxen(lines.join("\n"), {
    padding: 1,
    borderStyle: "round",
    borderColor: "cyan",
  });
}
