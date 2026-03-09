export type MemberStatus = "online" | "busy" | "idle" | "offline";
export type MemberType = "human" | "ai";

export interface Member {
  name: string;
  chineseName: string;
  role: string;
  type: MemberType;
  emoji: string;
  status: MemberStatus;
  statusMessage: string;
  room: string;
}

export interface Message {
  timestamp: string;
  sender: string;
  room: string;
  text: string;
}

export interface Room {
  name: string;
  description: string;
}

export interface OfficeState {
  members: Member[];
  rooms: Room[];
  messages: Message[];
  currentUser: string | null;
}
