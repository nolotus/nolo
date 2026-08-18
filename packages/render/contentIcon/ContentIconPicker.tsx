import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LuAlarmClock,
  LuArchive,
  LuAtom,
  LuAward,
  LuBadgeCheck,
  LuBanknote,
  LuBatteryCharging,
  LuBell,
  LuBluetooth,
  LuBlocks,
  LuBot,
  LuBook,
  LuBookmark,
  LuBox,
  LuBoxes,
  LuBrain,
  LuBriefcase,
  LuBug,
  LuCake,
  LuCalendar,
  LuCamera,
  LuCar,
  LuChartBar,
  LuChartLine,
  LuCircleUser,
  LuCircleDollarSign,
  LuCircleHelp,
  LuClipboardList,
  LuClock,
  LuCloudRain,
  LuCloudSun,
  LuCloud,
  LuCode,
  LuCoffee,
  LuCommand,
  LuCompass,
  LuConstruction,
  LuContact,
  LuCopy,
  LuCpu,
  LuCrown,
  LuDatabase,
  LuDiamond,
  LuDownload,
  LuDroplets,
  LuDumbbell,
  LuEarth,
  LuEraser,
  LuFileText,
  LuFileCode,
  LuFileArchive,
  LuFileImage,
  LuFileSpreadsheet,
  LuFileType,
  LuFilm,
  LuFingerprint,
  LuFlag,
  LuFlame,
  LuFlaskConical,
  LuFlower,
  LuFlower2,
  LuFolder,
  LuFolderKanban,
  LuGamepad2,
  LuGem,
  LuGift,
  LuGlobe,
  LuGraduationCap,
  LuHammer,
  LuHandshake,
  LuHardDrive,
  LuHeadphones,
  LuHeart,
  LuHospital,
  LuHouse,
  LuImage,
  LuKanban,
  LuKey,
  LuLayers,
  LuLayoutGrid,
  LuLeaf,
  LuLanguages,
  LuLaptop,
  LuLibrary,
  LuLightbulb,
  LuLink,
  LuListTodo,
  LuMail,
  LuMap,
  LuMapPin,
  LuMedal,
  LuMegaphone,
  LuMessageSquare,
  LuMic,
  LuMonitor,
  LuMousePointer2,
  LuMountain,
  LuMoon,
  LuMusic,
  LuNetwork,
  LuNewspaper,
  LuNotebook,
  LuPackage,
  LuPalette,
  LuPaperclip,
  LuPaintbrush,
  LuPenTool,
  LuPencil,
  LuPlane,
  LuPrinter,
  LuPuzzle,
  LuQrCode,
  LuRadar,
  LuReceipt,
  LuRecycle,
  LuRoute,
  LuScanLine,
  LuSchool,
  LuSearch,
  LuServer,
  LuSettings,
  LuShell,
  LuShip,
  LuShield,
  LuShoppingBag,
  LuSiren,
  LuSlidersHorizontal,
  LuSmile,
  LuSmartphone,
  LuSnowflake,
  LuSparkles,
  LuSprout,
  LuStar,
  LuStore,
  LuSun,
  LuSunrise,
  LuSunset,
  LuTable,
  LuTags,
  LuTarget,
  LuTelescope,
  LuTerminal,
  LuTicket,
  LuTimer,
  LuTrophy,
  LuTreePine,
  LuTrees,
  LuTruck,
  LuUmbrella,
  LuUsers,
  LuVegan,
  LuVideo,
  LuWallet,
  LuWifi,
  LuWrench,
  LuX,
  LuWheat,
  LuApple,
  LuBean,
  LuClover,
  LuWorkflow,
  LuZap,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { Input } from "render/web/form/Input";
import Button from "render/web/ui/Button";
import type { ContentIcon } from "./types";
import "./contentIcon.css";

const EMOJI_OPTIONS = [
  "🧠",
  "📌",
  "🗂️",
  "📊",
  "✨",
  "🚀",
  "📝",
  "🎨",
  "💡",
  "✅",
  "🔥",
  "⭐",
  "❤️",
  "🔍",
  "🧪",
  "🛠️",
  "📚",
  "📅",
  "💬",
  "🌐",
  "🎬",
  "🎵",
  "🛒",
  "📍",
  "🌱",
  "🪴",
  "🌿",
  "☘️",
  "🍀",
  "🍃",
  "🌵",
  "🌴",
  "🌳",
  "🌲",
  "🌷",
  "🌸",
  "🌼",
  "🌻",
  "🌹",
  "🪷",
  "💐",
  "🍄",
  "🍎",
  "🍋",
  "🍓",
  "🍑",
  "🥑",
  "🥕",
  "💧",
  "☀️",
  "🌧️",
  "🏔️",
  "🏠",
  "🎁",
  "🏆",
  "🎮",
  "📷",
  "🎧",
  "☕",
  "💰",
  "🔑",
  "📦",
  "✈️",
  "🎯",
  "🧩",
];
const EMOJI_KEYWORDS: Record<string, string> = {
  "🌱": "plant sprout seed green 植物 发芽 绿植",
  "🪴": "plant pot houseplant 盆栽 绿植 花盆",
  "🌿": "leaf herb green 草 叶子 植物",
  "🌷": "flower tulip 花 郁金香",
  "🌸": "flower blossom 花 开花",
  "🌻": "flower sunflower 向日葵 花",
  "💧": "water droplet 浇水 水",
  "☀️": "sun light 阳光 太阳",
  "🌧️": "rain water 雨 浇水",
};
const LUCIDE_OPTIONS: Array<{
  icon: Extract<ContentIcon, { kind: "lucide" }>;
  label: string;
  keywords?: string;
  Component: React.ComponentType<{ size?: number }>;
}> = [
  { icon: { kind: "lucide", value: "file-text" }, label: "Page", Component: LuFileText },
  { icon: { kind: "lucide", value: "table" }, label: "Table", Component: LuTable },
  { icon: { kind: "lucide", value: "layout-grid" }, label: "App", Component: LuLayoutGrid },
  { icon: { kind: "lucide", value: "star" }, label: "Star", Component: LuStar },
  { icon: { kind: "lucide", value: "book" }, label: "Book", Component: LuBook },
  { icon: { kind: "lucide", value: "image" }, label: "Image", Component: LuImage },
  { icon: { kind: "lucide", value: "folder" }, label: "Folder", Component: LuFolder },
  { icon: { kind: "lucide", value: "folder-kanban" }, label: "Project", Component: LuFolderKanban },
  { icon: { kind: "lucide", value: "kanban" }, label: "Board", Component: LuKanban },
  { icon: { kind: "lucide", value: "layers" }, label: "Layers", Component: LuLayers },
  { icon: { kind: "lucide", value: "notebook" }, label: "Notebook", Component: LuNotebook },
  { icon: { kind: "lucide", value: "clipboard-list" }, label: "Checklist", Component: LuClipboardList },
  { icon: { kind: "lucide", value: "briefcase" }, label: "Work", Component: LuBriefcase },
  { icon: { kind: "lucide", value: "calendar" }, label: "Calendar", Component: LuCalendar },
  { icon: { kind: "lucide", value: "clock" }, label: "Time", Component: LuClock },
  { icon: { kind: "lucide", value: "list-todo" }, label: "Todo", Component: LuListTodo },
  { icon: { kind: "lucide", value: "chart-bar" }, label: "Chart", Component: LuChartBar },
  { icon: { kind: "lucide", value: "chart-line" }, label: "Trend", Component: LuChartLine },
  { icon: { kind: "lucide", value: "database" }, label: "Database", Component: LuDatabase },
  { icon: { kind: "lucide", value: "code" }, label: "Code", Component: LuCode },
  { icon: { kind: "lucide", value: "file-code" }, label: "Code file", Component: LuFileCode },
  { icon: { kind: "lucide", value: "terminal" }, label: "Terminal", Component: LuTerminal },
  { icon: { kind: "lucide", value: "settings" }, label: "Settings", Component: LuSettings },
  { icon: { kind: "lucide", value: "wrench" }, label: "Tool", Component: LuWrench },
  { icon: { kind: "lucide", value: "pen-tool" }, label: "Design", Component: LuPenTool },
  { icon: { kind: "lucide", value: "palette" }, label: "Palette", Component: LuPalette },
  { icon: { kind: "lucide", value: "sparkles" }, label: "Sparkles", Component: LuSparkles },
  { icon: { kind: "lucide", value: "brain" }, label: "Brain", Component: LuBrain },
  { icon: { kind: "lucide", value: "bot" }, label: "Bot", Component: LuBot },
  { icon: { kind: "lucide", value: "message-square" }, label: "Chat", Component: LuMessageSquare },
  { icon: { kind: "lucide", value: "users" }, label: "People", Component: LuUsers },
  { icon: { kind: "lucide", value: "globe" }, label: "Web", Component: LuGlobe },
  { icon: { kind: "lucide", value: "link" }, label: "Link", Component: LuLink },
  { icon: { kind: "lucide", value: "bookmark" }, label: "Bookmark", Component: LuBookmark },
  { icon: { kind: "lucide", value: "heart" }, label: "Heart", Component: LuHeart },
  { icon: { kind: "lucide", value: "flag" }, label: "Flag", Component: LuFlag },
  { icon: { kind: "lucide", value: "zap" }, label: "Energy", Component: LuZap },
  { icon: { kind: "lucide", value: "lightbulb" }, label: "Idea", Component: LuLightbulb },
  { icon: { kind: "lucide", value: "search" }, label: "Search", Component: LuSearch },
  { icon: { kind: "lucide", value: "map" }, label: "Map", Component: LuMap },
  { icon: { kind: "lucide", value: "shopping-bag" }, label: "Shop", Component: LuShoppingBag },
  { icon: { kind: "lucide", value: "music" }, label: "Music", Component: LuMusic },
  { icon: { kind: "lucide", value: "video" }, label: "Video", Component: LuVideo },
  { icon: { kind: "lucide", value: "blocks" }, label: "Blocks", Component: LuBlocks },
  { icon: { kind: "lucide", value: "flower" }, label: "Flower", Component: LuFlower },
  { icon: { kind: "lucide", value: "flower-2" }, label: "Bloom", Component: LuFlower2 },
  { icon: { kind: "lucide", value: "leaf" }, label: "Leaf", Component: LuLeaf },
  { icon: { kind: "lucide", value: "sprout" }, label: "Sprout", Component: LuSprout },
  { icon: { kind: "lucide", value: "tree-pine" }, label: "Pine", Component: LuTreePine },
  { icon: { kind: "lucide", value: "trees" }, label: "Trees", Component: LuTrees },
  { icon: { kind: "lucide", value: "clover" }, label: "Clover", Component: LuClover },
  { icon: { kind: "lucide", value: "vegan" }, label: "Plant", Component: LuVegan },
  { icon: { kind: "lucide", value: "bean" }, label: "Bean", Component: LuBean },
  { icon: { kind: "lucide", value: "wheat" }, label: "Wheat", Component: LuWheat },
  { icon: { kind: "lucide", value: "apple" }, label: "Apple", Component: LuApple },
  { icon: { kind: "lucide", value: "sun" }, label: "Sun", Component: LuSun },
  { icon: { kind: "lucide", value: "cloud-sun" }, label: "Partly sunny", Component: LuCloudSun },
  { icon: { kind: "lucide", value: "cloud-rain" }, label: "Rain", Component: LuCloudRain },
  { icon: { kind: "lucide", value: "droplets" }, label: "Water", Component: LuDroplets },
  { icon: { kind: "lucide", value: "mountain" }, label: "Mountain", Component: LuMountain },
  { icon: { kind: "lucide", value: "earth" }, label: "Earth", Component: LuEarth },
  { icon: { kind: "lucide", value: "shell" }, label: "Shell", Component: LuShell },
  { icon: { kind: "lucide", value: "archive" }, label: "Archive", keywords: "box storage 归档", Component: LuArchive },
  { icon: { kind: "lucide", value: "award" }, label: "Award", keywords: "honor badge 奖励", Component: LuAward },
  { icon: { kind: "lucide", value: "badge-check" }, label: "Verified", keywords: "check verified 认证", Component: LuBadgeCheck },
  { icon: { kind: "lucide", value: "bell" }, label: "Bell", keywords: "notice reminder 通知 提醒", Component: LuBell },
  { icon: { kind: "lucide", value: "box" }, label: "Box", keywords: "package 收纳 盒子", Component: LuBox },
  { icon: { kind: "lucide", value: "boxes" }, label: "Boxes", keywords: "inventory stack 库存", Component: LuBoxes },
  { icon: { kind: "lucide", value: "cake" }, label: "Cake", keywords: "birthday 生日", Component: LuCake },
  { icon: { kind: "lucide", value: "camera" }, label: "Camera", keywords: "photo image 照片 摄影", Component: LuCamera },
  { icon: { kind: "lucide", value: "circle-dollar-sign" }, label: "Money", keywords: "finance price 钱 预算", Component: LuCircleDollarSign },
  { icon: { kind: "lucide", value: "circle-help" }, label: "Help", keywords: "question faq 帮助 问题", Component: LuCircleHelp },
  { icon: { kind: "lucide", value: "coffee" }, label: "Coffee", keywords: "drink break 咖啡", Component: LuCoffee },
  { icon: { kind: "lucide", value: "compass" }, label: "Compass", keywords: "direction explore 指南 方向", Component: LuCompass },
  { icon: { kind: "lucide", value: "cpu" }, label: "CPU", keywords: "chip ai hardware 芯片", Component: LuCpu },
  { icon: { kind: "lucide", value: "crown" }, label: "Crown", keywords: "king premium 王冠", Component: LuCrown },
  { icon: { kind: "lucide", value: "diamond" }, label: "Diamond", keywords: "gem value 钻石", Component: LuDiamond },
  { icon: { kind: "lucide", value: "dumbbell" }, label: "Fitness", keywords: "gym workout 健身", Component: LuDumbbell },
  { icon: { kind: "lucide", value: "file-archive" }, label: "Archive file", keywords: "zip 归档文件", Component: LuFileArchive },
  { icon: { kind: "lucide", value: "file-image" }, label: "Image file", keywords: "photo 图片文件", Component: LuFileImage },
  { icon: { kind: "lucide", value: "file-spreadsheet" }, label: "Sheet file", keywords: "excel sheet 表格文件", Component: LuFileSpreadsheet },
  { icon: { kind: "lucide", value: "file-type" }, label: "Text file", keywords: "type font 字体 文本", Component: LuFileType },
  { icon: { kind: "lucide", value: "flask-conical" }, label: "Experiment", keywords: "lab test 实验", Component: LuFlaskConical },
  { icon: { kind: "lucide", value: "gamepad-2" }, label: "Game", keywords: "play 游戏", Component: LuGamepad2 },
  { icon: { kind: "lucide", value: "gift" }, label: "Gift", keywords: "present 礼物", Component: LuGift },
  { icon: { kind: "lucide", value: "graduation-cap" }, label: "Study", keywords: "school learn 学习", Component: LuGraduationCap },
  { icon: { kind: "lucide", value: "hammer" }, label: "Build", keywords: "make construct 构建", Component: LuHammer },
  { icon: { kind: "lucide", value: "handshake" }, label: "Deal", keywords: "partner agreement 合作", Component: LuHandshake },
  { icon: { kind: "lucide", value: "headphones" }, label: "Audio", keywords: "listen podcast 音频", Component: LuHeadphones },
  { icon: { kind: "lucide", value: "house" }, label: "Home", keywords: "family 家", Component: LuHouse },
  { icon: { kind: "lucide", value: "key" }, label: "Key", keywords: "password access 密钥", Component: LuKey },
  { icon: { kind: "lucide", value: "languages" }, label: "Language", keywords: "translate 翻译 语言", Component: LuLanguages },
  { icon: { kind: "lucide", value: "laptop" }, label: "Laptop", keywords: "computer 电脑", Component: LuLaptop },
  { icon: { kind: "lucide", value: "library" }, label: "Library", keywords: "books knowledge 图书馆 知识", Component: LuLibrary },
  { icon: { kind: "lucide", value: "mail" }, label: "Mail", keywords: "email 邮件", Component: LuMail },
  { icon: { kind: "lucide", value: "megaphone" }, label: "Announce", keywords: "marketing broadcast 公告", Component: LuMegaphone },
  { icon: { kind: "lucide", value: "mic" }, label: "Mic", keywords: "voice audio 语音", Component: LuMic },
  { icon: { kind: "lucide", value: "monitor" }, label: "Monitor", keywords: "screen desktop 屏幕", Component: LuMonitor },
  { icon: { kind: "lucide", value: "moon" }, label: "Moon", keywords: "night sleep 夜晚", Component: LuMoon },
  { icon: { kind: "lucide", value: "newspaper" }, label: "News", keywords: "article 新闻", Component: LuNewspaper },
  { icon: { kind: "lucide", value: "package" }, label: "Package", keywords: "parcel 包裹", Component: LuPackage },
  { icon: { kind: "lucide", value: "paperclip" }, label: "Attach", keywords: "attachment 附件", Component: LuPaperclip },
  { icon: { kind: "lucide", value: "plane" }, label: "Travel", keywords: "flight 旅行", Component: LuPlane },
  { icon: { kind: "lucide", value: "puzzle" }, label: "Puzzle", keywords: "idea solve 拼图", Component: LuPuzzle },
  { icon: { kind: "lucide", value: "route" }, label: "Route", keywords: "path plan 路线", Component: LuRoute },
  { icon: { kind: "lucide", value: "shield" }, label: "Shield", keywords: "security 安全", Component: LuShield },
  { icon: { kind: "lucide", value: "smile" }, label: "Smile", keywords: "mood happy 心情", Component: LuSmile },
  { icon: { kind: "lucide", value: "tags" }, label: "Tags", keywords: "label category 标签", Component: LuTags },
  { icon: { kind: "lucide", value: "target" }, label: "Target", keywords: "goal aim 目标", Component: LuTarget },
  { icon: { kind: "lucide", value: "telescope" }, label: "Observe", keywords: "research astronomy 观察", Component: LuTelescope },
  { icon: { kind: "lucide", value: "ticket" }, label: "Ticket", keywords: "event 票", Component: LuTicket },
  { icon: { kind: "lucide", value: "trophy" }, label: "Trophy", keywords: "win achievement 奖杯", Component: LuTrophy },
  { icon: { kind: "lucide", value: "wallet" }, label: "Wallet", keywords: "money finance 钱包", Component: LuWallet },
  { icon: { kind: "lucide", value: "workflow" }, label: "Workflow", keywords: "automation flow 工作流", Component: LuWorkflow },
  { icon: { kind: "lucide", value: "alarm-clock" }, label: "Alarm", keywords: "time reminder 闹钟 提醒", Component: LuAlarmClock },
  { icon: { kind: "lucide", value: "atom" }, label: "Atom", keywords: "science physics 科学", Component: LuAtom },
  { icon: { kind: "lucide", value: "banknote" }, label: "Cash", keywords: "money bill 现金", Component: LuBanknote },
  { icon: { kind: "lucide", value: "battery-charging" }, label: "Battery", keywords: "power charge 电量 充电", Component: LuBatteryCharging },
  { icon: { kind: "lucide", value: "bluetooth" }, label: "Bluetooth", keywords: "wireless 蓝牙", Component: LuBluetooth },
  { icon: { kind: "lucide", value: "bug" }, label: "Bug", keywords: "issue debug 缺陷 调试", Component: LuBug },
  { icon: { kind: "lucide", value: "car" }, label: "Car", keywords: "drive vehicle 汽车", Component: LuCar },
  { icon: { kind: "lucide", value: "circle-user" }, label: "Profile", keywords: "user account 用户 账号", Component: LuCircleUser },
  { icon: { kind: "lucide", value: "cloud" }, label: "Cloud", keywords: "weather sync 云", Component: LuCloud },
  { icon: { kind: "lucide", value: "command" }, label: "Command", keywords: "shortcut mac 快捷键", Component: LuCommand },
  { icon: { kind: "lucide", value: "construction" }, label: "Construction", keywords: "build road 施工", Component: LuConstruction },
  { icon: { kind: "lucide", value: "contact" }, label: "Contact", keywords: "person card 联系人", Component: LuContact },
  { icon: { kind: "lucide", value: "copy" }, label: "Copy", keywords: "duplicate 复制", Component: LuCopy },
  { icon: { kind: "lucide", value: "download" }, label: "Download", keywords: "save 下载", Component: LuDownload },
  { icon: { kind: "lucide", value: "eraser" }, label: "Eraser", keywords: "clean remove 橡皮 清理", Component: LuEraser },
  { icon: { kind: "lucide", value: "film" }, label: "Film", keywords: "movie video 电影", Component: LuFilm },
  { icon: { kind: "lucide", value: "fingerprint" }, label: "Fingerprint", keywords: "identity security 指纹", Component: LuFingerprint },
  { icon: { kind: "lucide", value: "flame" }, label: "Flame", keywords: "hot fire 热门 火", Component: LuFlame },
  { icon: { kind: "lucide", value: "gem" }, label: "Gem", keywords: "diamond precious 宝石", Component: LuGem },
  { icon: { kind: "lucide", value: "hard-drive" }, label: "Drive", keywords: "disk storage 硬盘", Component: LuHardDrive },
  { icon: { kind: "lucide", value: "hospital" }, label: "Hospital", keywords: "health medical 医疗 医院", Component: LuHospital },
  { icon: { kind: "lucide", value: "map-pin" }, label: "Pin", keywords: "location 地点 定位", Component: LuMapPin },
  { icon: { kind: "lucide", value: "medal" }, label: "Medal", keywords: "award honor 勋章", Component: LuMedal },
  { icon: { kind: "lucide", value: "mouse-pointer-2" }, label: "Cursor", keywords: "click pointer 鼠标 点击", Component: LuMousePointer2 },
  { icon: { kind: "lucide", value: "network" }, label: "Network", keywords: "graph nodes 网络", Component: LuNetwork },
  { icon: { kind: "lucide", value: "paintbrush" }, label: "Paint", keywords: "draw design 画笔", Component: LuPaintbrush },
  { icon: { kind: "lucide", value: "pencil" }, label: "Pencil", keywords: "write edit 铅笔 写作", Component: LuPencil },
  { icon: { kind: "lucide", value: "printer" }, label: "Printer", keywords: "print 打印", Component: LuPrinter },
  { icon: { kind: "lucide", value: "qr-code" }, label: "QR code", keywords: "scan 二维码", Component: LuQrCode },
  { icon: { kind: "lucide", value: "radar" }, label: "Radar", keywords: "detect monitor 雷达", Component: LuRadar },
  { icon: { kind: "lucide", value: "receipt" }, label: "Receipt", keywords: "invoice bill 发票 收据", Component: LuReceipt },
  { icon: { kind: "lucide", value: "recycle" }, label: "Recycle", keywords: "reuse 环保 回收", Component: LuRecycle },
  { icon: { kind: "lucide", value: "scan-line" }, label: "Scan", keywords: "ocr scan 扫描", Component: LuScanLine },
  { icon: { kind: "lucide", value: "school" }, label: "School", keywords: "education 学校 教育", Component: LuSchool },
  { icon: { kind: "lucide", value: "server" }, label: "Server", keywords: "backend cloud 服务器", Component: LuServer },
  { icon: { kind: "lucide", value: "ship" }, label: "Ship", keywords: "boat travel 船", Component: LuShip },
  { icon: { kind: "lucide", value: "siren" }, label: "Alert", keywords: "warning emergency 警报", Component: LuSiren },
  { icon: { kind: "lucide", value: "sliders-horizontal" }, label: "Controls", keywords: "adjust settings 控制 调节", Component: LuSlidersHorizontal },
  { icon: { kind: "lucide", value: "smartphone" }, label: "Phone", keywords: "mobile 手机", Component: LuSmartphone },
  { icon: { kind: "lucide", value: "snowflake" }, label: "Snow", keywords: "cold winter 雪 冬天", Component: LuSnowflake },
  { icon: { kind: "lucide", value: "store" }, label: "Store", keywords: "shop business 商店", Component: LuStore },
  { icon: { kind: "lucide", value: "sunrise" }, label: "Sunrise", keywords: "morning 日出 早晨", Component: LuSunrise },
  { icon: { kind: "lucide", value: "sunset" }, label: "Sunset", keywords: "evening 日落 傍晚", Component: LuSunset },
  { icon: { kind: "lucide", value: "timer" }, label: "Timer", keywords: "countdown 计时器", Component: LuTimer },
  { icon: { kind: "lucide", value: "truck" }, label: "Truck", keywords: "delivery logistics 货车 物流", Component: LuTruck },
  { icon: { kind: "lucide", value: "umbrella" }, label: "Umbrella", keywords: "rain protection 雨伞", Component: LuUmbrella },
  { icon: { kind: "lucide", value: "wifi" }, label: "Wi-Fi", keywords: "network wireless 无线 网络", Component: LuWifi },
];

type ContentIconPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (icon: ContentIcon | null) => void;
};

export default function ContentIconPicker({
  open,
  onClose,
  onSelect,
}: ContentIconPickerProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const normalizedQuery = asTrimmedLowercaseString(query);

  const filteredEmojiOptions = useMemo(() => {
    if (!normalizedQuery) return EMOJI_OPTIONS;
    return EMOJI_OPTIONS.filter((emoji) => {
      const haystack = `${emoji} ${EMOJI_KEYWORDS[emoji] ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  const filteredLucideOptions = useMemo(() => {
    if (!normalizedQuery) return LUCIDE_OPTIONS;
    return LUCIDE_OPTIONS.filter(({ icon, label, keywords }) => {
      const haystack = `${icon.value} ${label} ${keywords ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="content-icon-picker" ref={ref} role="menu">
      <Input
        className="content-icon-picker__search"
        size="sm"
        variant="filled"
        icon={<LuSearch size={15} />}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t(
          "contentIcon.searchPlaceholder",
          "Search icons, plants, tables, code..."
        )}
        autoFocus
      />

      <div className="content-icon-picker__section">
        <div className="content-icon-picker__label">
          {t("contentIcon.emojiSection", "Emoji")}
          <span>{filteredEmojiOptions.length}</span>
        </div>
        <div className="content-icon-picker__grid">
          {filteredEmojiOptions.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="content-icon-picker__option"
              onClick={() => onSelect({ kind: "emoji", value: emoji })}
              title={emoji}
              aria-label={emoji}
            >
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="content-icon-picker__section">
        <div className="content-icon-picker__label">
          {t("contentIcon.iconsSection", "Icons")}
          <span>{filteredLucideOptions.length}</span>
        </div>
        <div className="content-icon-picker__grid">
          {filteredLucideOptions.map(({ icon, label, Component }) => (
            <button
              key={icon.value}
              type="button"
              className="content-icon-picker__option"
              onClick={() => onSelect(icon)}
              title={label}
              aria-label={label}
            >
              <Component size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      {filteredEmojiOptions.length === 0 && filteredLucideOptions.length === 0 ? (
        <div className="content-icon-picker__empty">
          {t("contentIcon.empty", "No matching icons")}
        </div>
      ) : null}

      <Button
        type="button"
        variant="ghost"
        size="small"
        block
        className="content-icon-picker__clear"
        icon={<LuX size={15} />}
        onClick={() => onSelect(null)}
      >
        {t("contentIcon.clear", "Clear icon")}
      </Button>
    </div>
  );
}
