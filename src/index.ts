#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import { loadState, saveState, initState, findMember, addMessage, getCurrentUser } from "./state.js";
import { getChainInfo } from "./chain.js";
import { renderDashboard } from "./dashboard.js";
import type { MemberStatus } from "./types.js";

const program = new Command();

program
  .name("qfc-office")
  .description("QFC Virtual Office — Terminal Mode")
  .version("0.1.0");

// Default command: show dashboard
program
  .command("status", { isDefault: true })
  .description("Show the office dashboard")
  .action(async () => {
    const state = loadState();
    if (state.members.length === 0) {
      console.log(chalk.yellow("Office not initialized. Run `qfc-office init` first."));
      return;
    }
    const chain = await getChainInfo();
    console.log(renderDashboard(state, chain));
  });

// init
program
  .command("init")
  .description("Initialize office with default team members")
  .action(() => {
    const state = initState();
    console.log(chalk.green(`✅ Office initialized with ${state.members.length} members and ${state.rooms.length} rooms.`));
  });

// checkin
program
  .command("checkin")
  .description("Check in to the office")
  .option("--as <name>", "Check in as a specific member")
  .action((opts: { as?: string }) => {
    const state = loadState();
    if (state.members.length === 0) {
      console.log(chalk.yellow("Office not initialized. Run `qfc-office init` first."));
      return;
    }
    const name = opts.as ?? "Larry Lai";
    const member = findMember(state, name);
    if (!member) {
      console.log(chalk.red(`Member "${name}" not found.`));
      return;
    }
    member.status = "online";
    member.room = "大厅";
    state.currentUser = member.name;
    addMessage(state, member.name, "大厅", `${member.name} checked in`);
    saveState(state);
    console.log(chalk.green(`✅ Checked in as ${member.emoji} ${member.name}（${member.chineseName}）`));
  });

// checkout
program
  .command("checkout")
  .description("Check out of the office")
  .action(() => {
    const state = loadState();
    const user = getCurrentUser(state);
    if (!user) {
      console.log(chalk.yellow("You are not checked in."));
      return;
    }
    addMessage(state, user.name, user.room, `${user.name} checked out`);
    user.status = "offline";
    user.statusMessage = "";
    state.currentUser = null;
    saveState(state);
    console.log(chalk.green(`✅ Checked out. See you later!`));
  });

// set-status
program
  .command("set-status <status> [message...]")
  .description("Set your status: online/busy/idle/offline")
  .action((status: string, messageParts: string[]) => {
    const valid: MemberStatus[] = ["online", "busy", "idle", "offline"];
    if (!valid.includes(status as MemberStatus)) {
      console.log(chalk.red(`Invalid status. Use: ${valid.join(", ")}`));
      return;
    }
    const state = loadState();
    const user = getCurrentUser(state);
    if (!user) {
      console.log(chalk.yellow("You are not checked in."));
      return;
    }
    user.status = status as MemberStatus;
    user.statusMessage = messageParts.join(" ");
    saveState(state);
    const msg = user.statusMessage ? ` — "${user.statusMessage}"` : "";
    console.log(chalk.green(`✅ Status set to ${status}${msg}`));
  });

// move
program
  .command("move <room>")
  .description("Move to a room")
  .action((room: string) => {
    const state = loadState();
    const user = getCurrentUser(state);
    if (!user) {
      console.log(chalk.yellow("You are not checked in."));
      return;
    }
    const target = state.rooms.find(
      (r) => r.name === room || r.description.toLowerCase() === room.toLowerCase()
    );
    if (!target) {
      const roomNames = state.rooms.map((r) => `${r.name} (${r.description})`).join(", ");
      console.log(chalk.red(`Room "${room}" not found. Available: ${roomNames}`));
      return;
    }
    const oldRoom = user.room;
    user.room = target.name;
    addMessage(state, user.name, target.name, `${user.name} moved from ${oldRoom} to ${target.name}`);
    saveState(state);
    console.log(chalk.green(`✅ Moved to ${target.name} (${target.description})`));
  });

// msg
program
  .command("msg <room> <message...>")
  .description("Send a message to a room")
  .action((room: string, messageParts: string[]) => {
    const state = loadState();
    const user = getCurrentUser(state);
    if (!user) {
      console.log(chalk.yellow("You are not checked in."));
      return;
    }
    const target = state.rooms.find(
      (r) => r.name === room || r.description.toLowerCase() === room.toLowerCase()
    );
    if (!target) {
      console.log(chalk.red(`Room "${room}" not found.`));
      return;
    }
    const text = messageParts.join(" ");
    addMessage(state, user.name, target.name, text);
    saveState(state);
    console.log(chalk.green(`✅ Message sent to ${target.name}`));
  });

// log
program
  .command("log")
  .description("View message log")
  .option("--room <room>", "Filter by room")
  .option("--limit <n>", "Number of messages to show", "20")
  .action((opts: { room?: string; limit: string }) => {
    const state = loadState();
    let msgs = state.messages;
    if (opts.room) {
      const target = state.rooms.find(
        (r) => r.name === opts.room || r.description.toLowerCase() === opts.room!.toLowerCase()
      );
      if (target) {
        msgs = msgs.filter((m) => m.room === target.name);
      }
    }
    const limit = parseInt(opts.limit, 10) || 20;
    const recent = msgs.slice(-limit);
    if (recent.length === 0) {
      console.log(chalk.dim("No messages."));
      return;
    }
    console.log(chalk.bold("Message Log:"));
    for (const msg of recent) {
      const time = new Date(msg.timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const sender = state.members.find((m) => m.name === msg.sender);
      const emoji = sender?.emoji ?? "💬";
      console.log(`  ${chalk.dim(time)} [${chalk.cyan(msg.room)}] ${emoji} ${msg.sender}: ${msg.text}`);
    }
  });

// rooms
program
  .command("rooms")
  .description("List all rooms and occupants")
  .action(() => {
    const state = loadState();
    if (state.rooms.length === 0) {
      console.log(chalk.yellow("Office not initialized. Run `qfc-office init` first."));
      return;
    }
    console.log(chalk.bold("Rooms:"));
    for (const room of state.rooms) {
      const occupants = state.members.filter((m) => m.room === room.name && m.status !== "offline");
      const count = occupants.length;
      const label = `${room.name} (${room.description})`;
      console.log(`\n  ${chalk.cyan(label)} — ${count} occupant${count !== 1 ? "s" : ""}`);
      if (count > 0) {
        for (const m of occupants) {
          console.log(`    ${m.emoji} ${m.name}（${m.chineseName}）`);
        }
      }
    }
    console.log();
  });

// members
program
  .command("members")
  .description("List all members")
  .action(() => {
    const state = loadState();
    if (state.members.length === 0) {
      console.log(chalk.yellow("Office not initialized. Run `qfc-office init` first."));
      return;
    }
    console.log(chalk.bold("Team Members:"));
    for (const m of state.members) {
      const statusIcon = m.status === "online" || m.status === "busy" ? "🟢" : m.status === "idle" ? "🟡" : "⚫";
      console.log(`  ${m.emoji} ${m.name}（${m.chineseName}） — ${chalk.dim(m.role)} ${statusIcon} ${m.status}`);
    }
    console.log();
  });

// whoami
program
  .command("whoami")
  .description("Show current identity")
  .action(() => {
    const state = loadState();
    const user = getCurrentUser(state);
    if (!user) {
      console.log(chalk.yellow("Not checked in. Use `qfc-office checkin` to check in."));
      return;
    }
    console.log(`${user.emoji} ${user.name}（${user.chineseName}）`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Status: ${user.status}${user.statusMessage ? ` — "${user.statusMessage}"` : ""}`);
    console.log(`  Room: ${user.room}`);
  });

program.parse();
