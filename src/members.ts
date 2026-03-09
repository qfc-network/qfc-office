import type { Member, Room } from "./types.js";

export const DEFAULT_MEMBERS: Member[] = [
  { name: "Larry Lai", chineseName: "来拉里", role: "Founder & Lead Architect", type: "human", emoji: "👤", status: "offline", statusMessage: "", room: "大厅" },
  { name: "Jarvis Lam", chineseName: "林哲维", role: "QA Engineer", type: "ai", emoji: "🤖", status: "offline", statusMessage: "", room: "大厅" },
  { name: "Aria Tanaka", chineseName: "田中爱莉", role: "QA Engineer", type: "ai", emoji: "🤖", status: "offline", statusMessage: "", room: "大厅" },
  { name: "Ryan Chen", chineseName: "陈睿安", role: "Full-Stack Engineer", type: "ai", emoji: "🤖", status: "offline", statusMessage: "", room: "大厅" },
  { name: "Leo Lindqvist", chineseName: "林德奎", role: "DevOps Engineer", type: "ai", emoji: "🤖", status: "offline", statusMessage: "", room: "大厅" },
  { name: "Kevin Zhang", chineseName: "张凯文", role: "Lead Core Engineer", type: "ai", emoji: "🤖", status: "offline", statusMessage: "", room: "大厅" },
  { name: "Sora Tanaka", chineseName: "田中空", role: "Protocol Engineer", type: "ai", emoji: "🤖", status: "offline", statusMessage: "", room: "大厅" },
  { name: "Maya Okonkwo", chineseName: "欧玛雅", role: "Cryptography Engineer", type: "ai", emoji: "🤖", status: "offline", statusMessage: "", room: "大厅" },
  { name: "Rik Andersen", chineseName: "安德瑞", role: "Smart Contract Engineer", type: "ai", emoji: "🤖", status: "offline", statusMessage: "", room: "大厅" },
  { name: "Nina Volkov", chineseName: "沃尼娜", role: "Frontend Engineer", type: "ai", emoji: "🤖", status: "offline", statusMessage: "", room: "大厅" },
  { name: "Kai Nakamura", chineseName: "中村凯", role: "AI/ML Engineer", type: "ai", emoji: "🤖", status: "offline", statusMessage: "", room: "大厅" },
  { name: "Alex Wei", chineseName: "魏亚历", role: "Product Manager", type: "ai", emoji: "🤖", status: "offline", statusMessage: "", room: "大厅" },
];

export const DEFAULT_ROOMS: Room[] = [
  { name: "大厅", description: "Lobby" },
  { name: "工位区", description: "Workstations" },
  { name: "会议室A", description: "Meeting Room A" },
  { name: "会议室B", description: "Meeting Room B" },
  { name: "茶水间", description: "Break Room" },
  { name: "服务器室", description: "Server Room" },
];
