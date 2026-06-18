export type Wolf = {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio?: string;
  packMembers: number;
  followingPack: number;
};

export type Howl = {
  id: string;
  author: Wolf;
  content: string;
  createdAt: string;
  howls: number;
  echoes: number;
  rehowls: number;
  liked?: boolean;
};

const avatar = (seed: string) =>
  `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear`;

export const currentWolf: Wolf = {
  id: "me",
  name: "Lone Wanderer",
  handle: "lone_wanderer",
  avatar: avatar("LoneWanderer"),
  bio: "Howling at the moon since 2024 🌙",
  packMembers: 1287,
  followingPack: 342,
};

export const wolves: Wolf[] = [
  { id: "1", name: "Luna Nightshade", handle: "luna", avatar: avatar("Luna"), packMembers: 9821, followingPack: 220 },
  { id: "2", name: "Shadow Fang", handle: "shadowfang", avatar: avatar("Shadow"), packMembers: 4520, followingPack: 110 },
  { id: "3", name: "Aurora Frost", handle: "aurora", avatar: avatar("Aurora"), packMembers: 18204, followingPack: 502 },
  { id: "4", name: "Ember Wild", handle: "ember", avatar: avatar("Ember"), packMembers: 760, followingPack: 88 },
  { id: "5", name: "Storm Howler", handle: "storm", avatar: avatar("Storm"), packMembers: 3340, followingPack: 198 },
];

export const howls: Howl[] = [
  {
    id: "h1",
    author: wolves[0],
    content: "Just witnessed the most stunning blood moon over the ridge. The pack went wild 🌕🐺",
    createdAt: "2h",
    howls: 421, echoes: 38, rehowls: 12, liked: true,
  },
  {
    id: "h2",
    author: wolves[2],
    content: "Hot take: night runs hit different when the whole pack syncs their breathing. Try it.",
    createdAt: "4h",
    howls: 982, echoes: 144, rehowls: 87,
  },
  {
    id: "h3",
    author: wolves[1],
    content: "Built my first den from scratch this winter. Slate roof, moss floor, full moon skylight. 10/10 would howl again.",
    createdAt: "8h",
    howls: 240, echoes: 19, rehowls: 5,
  },
  {
    id: "h4",
    author: wolves[4],
    content: "Trending: silent stalking is the new meditation. Change my mind.",
    createdAt: "1d",
    howls: 1320, echoes: 220, rehowls: 140,
  },
  {
    id: "h5",
    author: wolves[3],
    content: "Today I learned that wolves can hear up to 6 miles in open terrain. Range check passed ✅",
    createdAt: "1d",
    howls: 88, echoes: 7, rehowls: 2,
  },
];

export const trending = [
  { tag: "#BloodMoon", howls: "24.1K Howls" },
  { tag: "#PackLife", howls: "12.8K Howls" },
  { tag: "#NightRun", howls: "8.3K Howls" },
  { tag: "#LoneWolfTips", howls: "5.2K Howls" },
  { tag: "#AuroraSeason", howls: "3.7K Howls" },
];

export const notifications = [
  { id: "n1", type: "howl", wolf: wolves[0], text: "howled at your Howl", time: "2m" },
  { id: "n2", type: "echo", wolf: wolves[2], text: "echoed: 'Couldn't agree more 🐺'", time: "10m" },
  { id: "n3", type: "follow", wolf: wolves[1], text: "joined your Pack", time: "1h" },
  { id: "n4", type: "rehowl", wolf: wolves[4], text: "rehowled your Howl", time: "3h" },
  { id: "n5", type: "mention", wolf: wolves[3], text: "mentioned you in an Echo", time: "1d" },
];

export const conversations = [
  { id: "c1", wolf: wolves[0], lastMessage: "Meeting at the clearing tonight?", time: "2m", unread: 2 },
  { id: "c2", wolf: wolves[2], lastMessage: "That trail you sent was perfect 🔥", time: "1h", unread: 0 },
  { id: "c3", wolf: wolves[1], lastMessage: "Sending pack coords now.", time: "5h", unread: 1 },
  { id: "c4", wolf: wolves[4], lastMessage: "Howl heard. Approaching from the east.", time: "1d", unread: 0 },
];