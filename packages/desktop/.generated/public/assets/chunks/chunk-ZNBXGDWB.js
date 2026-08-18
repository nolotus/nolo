import {
  Input
} from "/public/assets/chunks/chunk-XXYYZRCQ.js";
import {
  Button_default
} from "/public/assets/chunks/chunk-252FCKHS.js";
import {
  LuAlarmClock,
  LuApple,
  LuArchive,
  LuAtom,
  LuAward,
  LuBadgeCheck,
  LuBanknote,
  LuBatteryCharging,
  LuBean,
  LuBell,
  LuBlocks,
  LuBluetooth,
  LuBook,
  LuBookmark,
  LuBot,
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
  LuCircleDollarSign,
  LuCircleHelp,
  LuCircleUser,
  LuClipboardList,
  LuClock,
  LuCloud,
  LuCloudRain,
  LuCloudSun,
  LuClover,
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
  LuFileArchive,
  LuFileCode,
  LuFileImage,
  LuFileSpreadsheet,
  LuFileText,
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
  LuLanguages,
  LuLaptop,
  LuLayers,
  LuLayoutGrid,
  LuLeaf,
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
  LuMoon,
  LuMountain,
  LuMousePointer2,
  LuMusic,
  LuNetwork,
  LuNewspaper,
  LuNotebook,
  LuPackage,
  LuPaintbrush,
  LuPalette,
  LuPaperclip,
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
  LuShield,
  LuShip,
  LuShoppingBag,
  LuSiren,
  LuSlidersHorizontal,
  LuSmartphone,
  LuSmile,
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
  LuTreePine,
  LuTrees,
  LuTrophy,
  LuTruck,
  LuUmbrella,
  LuUsers,
  LuVegan,
  LuVideo,
  LuWallet,
  LuWheat,
  LuWifi,
  LuWorkflow,
  LuWrench,
  LuX,
  LuZap
} from "/public/assets/chunks/chunk-GQPLRP65.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  asTrimmedLowercaseString
} from "/public/assets/chunks/chunk-VCXOIOLL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/contentIcon/ContentIconPicker.tsx
var import_react = __toESM(require_react(), 1);
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var EMOJI_OPTIONS = [
  "\u{1F9E0}",
  "\u{1F4CC}",
  "\u{1F5C2}\uFE0F",
  "\u{1F4CA}",
  "\u2728",
  "\u{1F680}",
  "\u{1F4DD}",
  "\u{1F3A8}",
  "\u{1F4A1}",
  "\u2705",
  "\u{1F525}",
  "\u2B50",
  "\u2764\uFE0F",
  "\u{1F50D}",
  "\u{1F9EA}",
  "\u{1F6E0}\uFE0F",
  "\u{1F4DA}",
  "\u{1F4C5}",
  "\u{1F4AC}",
  "\u{1F310}",
  "\u{1F3AC}",
  "\u{1F3B5}",
  "\u{1F6D2}",
  "\u{1F4CD}",
  "\u{1F331}",
  "\u{1FAB4}",
  "\u{1F33F}",
  "\u2618\uFE0F",
  "\u{1F340}",
  "\u{1F343}",
  "\u{1F335}",
  "\u{1F334}",
  "\u{1F333}",
  "\u{1F332}",
  "\u{1F337}",
  "\u{1F338}",
  "\u{1F33C}",
  "\u{1F33B}",
  "\u{1F339}",
  "\u{1FAB7}",
  "\u{1F490}",
  "\u{1F344}",
  "\u{1F34E}",
  "\u{1F34B}",
  "\u{1F353}",
  "\u{1F351}",
  "\u{1F951}",
  "\u{1F955}",
  "\u{1F4A7}",
  "\u2600\uFE0F",
  "\u{1F327}\uFE0F",
  "\u{1F3D4}\uFE0F",
  "\u{1F3E0}",
  "\u{1F381}",
  "\u{1F3C6}",
  "\u{1F3AE}",
  "\u{1F4F7}",
  "\u{1F3A7}",
  "\u2615",
  "\u{1F4B0}",
  "\u{1F511}",
  "\u{1F4E6}",
  "\u2708\uFE0F",
  "\u{1F3AF}",
  "\u{1F9E9}"
];
var EMOJI_KEYWORDS = {
  "\u{1F331}": "plant sprout seed green \u690D\u7269 \u53D1\u82BD \u7EFF\u690D",
  "\u{1FAB4}": "plant pot houseplant \u76C6\u683D \u7EFF\u690D \u82B1\u76C6",
  "\u{1F33F}": "leaf herb green \u8349 \u53F6\u5B50 \u690D\u7269",
  "\u{1F337}": "flower tulip \u82B1 \u90C1\u91D1\u9999",
  "\u{1F338}": "flower blossom \u82B1 \u5F00\u82B1",
  "\u{1F33B}": "flower sunflower \u5411\u65E5\u8475 \u82B1",
  "\u{1F4A7}": "water droplet \u6D47\u6C34 \u6C34",
  "\u2600\uFE0F": "sun light \u9633\u5149 \u592A\u9633",
  "\u{1F327}\uFE0F": "rain water \u96E8 \u6D47\u6C34"
};
var LUCIDE_OPTIONS = [
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
  { icon: { kind: "lucide", value: "archive" }, label: "Archive", keywords: "box storage \u5F52\u6863", Component: LuArchive },
  { icon: { kind: "lucide", value: "award" }, label: "Award", keywords: "honor badge \u5956\u52B1", Component: LuAward },
  { icon: { kind: "lucide", value: "badge-check" }, label: "Verified", keywords: "check verified \u8BA4\u8BC1", Component: LuBadgeCheck },
  { icon: { kind: "lucide", value: "bell" }, label: "Bell", keywords: "notice reminder \u901A\u77E5 \u63D0\u9192", Component: LuBell },
  { icon: { kind: "lucide", value: "box" }, label: "Box", keywords: "package \u6536\u7EB3 \u76D2\u5B50", Component: LuBox },
  { icon: { kind: "lucide", value: "boxes" }, label: "Boxes", keywords: "inventory stack \u5E93\u5B58", Component: LuBoxes },
  { icon: { kind: "lucide", value: "cake" }, label: "Cake", keywords: "birthday \u751F\u65E5", Component: LuCake },
  { icon: { kind: "lucide", value: "camera" }, label: "Camera", keywords: "photo image \u7167\u7247 \u6444\u5F71", Component: LuCamera },
  { icon: { kind: "lucide", value: "circle-dollar-sign" }, label: "Money", keywords: "finance price \u94B1 \u9884\u7B97", Component: LuCircleDollarSign },
  { icon: { kind: "lucide", value: "circle-help" }, label: "Help", keywords: "question faq \u5E2E\u52A9 \u95EE\u9898", Component: LuCircleHelp },
  { icon: { kind: "lucide", value: "coffee" }, label: "Coffee", keywords: "drink break \u5496\u5561", Component: LuCoffee },
  { icon: { kind: "lucide", value: "compass" }, label: "Compass", keywords: "direction explore \u6307\u5357 \u65B9\u5411", Component: LuCompass },
  { icon: { kind: "lucide", value: "cpu" }, label: "CPU", keywords: "chip ai hardware \u82AF\u7247", Component: LuCpu },
  { icon: { kind: "lucide", value: "crown" }, label: "Crown", keywords: "king premium \u738B\u51A0", Component: LuCrown },
  { icon: { kind: "lucide", value: "diamond" }, label: "Diamond", keywords: "gem value \u94BB\u77F3", Component: LuDiamond },
  { icon: { kind: "lucide", value: "dumbbell" }, label: "Fitness", keywords: "gym workout \u5065\u8EAB", Component: LuDumbbell },
  { icon: { kind: "lucide", value: "file-archive" }, label: "Archive file", keywords: "zip \u5F52\u6863\u6587\u4EF6", Component: LuFileArchive },
  { icon: { kind: "lucide", value: "file-image" }, label: "Image file", keywords: "photo \u56FE\u7247\u6587\u4EF6", Component: LuFileImage },
  { icon: { kind: "lucide", value: "file-spreadsheet" }, label: "Sheet file", keywords: "excel sheet \u8868\u683C\u6587\u4EF6", Component: LuFileSpreadsheet },
  { icon: { kind: "lucide", value: "file-type" }, label: "Text file", keywords: "type font \u5B57\u4F53 \u6587\u672C", Component: LuFileType },
  { icon: { kind: "lucide", value: "flask-conical" }, label: "Experiment", keywords: "lab test \u5B9E\u9A8C", Component: LuFlaskConical },
  { icon: { kind: "lucide", value: "gamepad-2" }, label: "Game", keywords: "play \u6E38\u620F", Component: LuGamepad2 },
  { icon: { kind: "lucide", value: "gift" }, label: "Gift", keywords: "present \u793C\u7269", Component: LuGift },
  { icon: { kind: "lucide", value: "graduation-cap" }, label: "Study", keywords: "school learn \u5B66\u4E60", Component: LuGraduationCap },
  { icon: { kind: "lucide", value: "hammer" }, label: "Build", keywords: "make construct \u6784\u5EFA", Component: LuHammer },
  { icon: { kind: "lucide", value: "handshake" }, label: "Deal", keywords: "partner agreement \u5408\u4F5C", Component: LuHandshake },
  { icon: { kind: "lucide", value: "headphones" }, label: "Audio", keywords: "listen podcast \u97F3\u9891", Component: LuHeadphones },
  { icon: { kind: "lucide", value: "house" }, label: "Home", keywords: "family \u5BB6", Component: LuHouse },
  { icon: { kind: "lucide", value: "key" }, label: "Key", keywords: "password access \u5BC6\u94A5", Component: LuKey },
  { icon: { kind: "lucide", value: "languages" }, label: "Language", keywords: "translate \u7FFB\u8BD1 \u8BED\u8A00", Component: LuLanguages },
  { icon: { kind: "lucide", value: "laptop" }, label: "Laptop", keywords: "computer \u7535\u8111", Component: LuLaptop },
  { icon: { kind: "lucide", value: "library" }, label: "Library", keywords: "books knowledge \u56FE\u4E66\u9986 \u77E5\u8BC6", Component: LuLibrary },
  { icon: { kind: "lucide", value: "mail" }, label: "Mail", keywords: "email \u90AE\u4EF6", Component: LuMail },
  { icon: { kind: "lucide", value: "megaphone" }, label: "Announce", keywords: "marketing broadcast \u516C\u544A", Component: LuMegaphone },
  { icon: { kind: "lucide", value: "mic" }, label: "Mic", keywords: "voice audio \u8BED\u97F3", Component: LuMic },
  { icon: { kind: "lucide", value: "monitor" }, label: "Monitor", keywords: "screen desktop \u5C4F\u5E55", Component: LuMonitor },
  { icon: { kind: "lucide", value: "moon" }, label: "Moon", keywords: "night sleep \u591C\u665A", Component: LuMoon },
  { icon: { kind: "lucide", value: "newspaper" }, label: "News", keywords: "article \u65B0\u95FB", Component: LuNewspaper },
  { icon: { kind: "lucide", value: "package" }, label: "Package", keywords: "parcel \u5305\u88F9", Component: LuPackage },
  { icon: { kind: "lucide", value: "paperclip" }, label: "Attach", keywords: "attachment \u9644\u4EF6", Component: LuPaperclip },
  { icon: { kind: "lucide", value: "plane" }, label: "Travel", keywords: "flight \u65C5\u884C", Component: LuPlane },
  { icon: { kind: "lucide", value: "puzzle" }, label: "Puzzle", keywords: "idea solve \u62FC\u56FE", Component: LuPuzzle },
  { icon: { kind: "lucide", value: "route" }, label: "Route", keywords: "path plan \u8DEF\u7EBF", Component: LuRoute },
  { icon: { kind: "lucide", value: "shield" }, label: "Shield", keywords: "security \u5B89\u5168", Component: LuShield },
  { icon: { kind: "lucide", value: "smile" }, label: "Smile", keywords: "mood happy \u5FC3\u60C5", Component: LuSmile },
  { icon: { kind: "lucide", value: "tags" }, label: "Tags", keywords: "label category \u6807\u7B7E", Component: LuTags },
  { icon: { kind: "lucide", value: "target" }, label: "Target", keywords: "goal aim \u76EE\u6807", Component: LuTarget },
  { icon: { kind: "lucide", value: "telescope" }, label: "Observe", keywords: "research astronomy \u89C2\u5BDF", Component: LuTelescope },
  { icon: { kind: "lucide", value: "ticket" }, label: "Ticket", keywords: "event \u7968", Component: LuTicket },
  { icon: { kind: "lucide", value: "trophy" }, label: "Trophy", keywords: "win achievement \u5956\u676F", Component: LuTrophy },
  { icon: { kind: "lucide", value: "wallet" }, label: "Wallet", keywords: "money finance \u94B1\u5305", Component: LuWallet },
  { icon: { kind: "lucide", value: "workflow" }, label: "Workflow", keywords: "automation flow \u5DE5\u4F5C\u6D41", Component: LuWorkflow },
  { icon: { kind: "lucide", value: "alarm-clock" }, label: "Alarm", keywords: "time reminder \u95F9\u949F \u63D0\u9192", Component: LuAlarmClock },
  { icon: { kind: "lucide", value: "atom" }, label: "Atom", keywords: "science physics \u79D1\u5B66", Component: LuAtom },
  { icon: { kind: "lucide", value: "banknote" }, label: "Cash", keywords: "money bill \u73B0\u91D1", Component: LuBanknote },
  { icon: { kind: "lucide", value: "battery-charging" }, label: "Battery", keywords: "power charge \u7535\u91CF \u5145\u7535", Component: LuBatteryCharging },
  { icon: { kind: "lucide", value: "bluetooth" }, label: "Bluetooth", keywords: "wireless \u84DD\u7259", Component: LuBluetooth },
  { icon: { kind: "lucide", value: "bug" }, label: "Bug", keywords: "issue debug \u7F3A\u9677 \u8C03\u8BD5", Component: LuBug },
  { icon: { kind: "lucide", value: "car" }, label: "Car", keywords: "drive vehicle \u6C7D\u8F66", Component: LuCar },
  { icon: { kind: "lucide", value: "circle-user" }, label: "Profile", keywords: "user account \u7528\u6237 \u8D26\u53F7", Component: LuCircleUser },
  { icon: { kind: "lucide", value: "cloud" }, label: "Cloud", keywords: "weather sync \u4E91", Component: LuCloud },
  { icon: { kind: "lucide", value: "command" }, label: "Command", keywords: "shortcut mac \u5FEB\u6377\u952E", Component: LuCommand },
  { icon: { kind: "lucide", value: "construction" }, label: "Construction", keywords: "build road \u65BD\u5DE5", Component: LuConstruction },
  { icon: { kind: "lucide", value: "contact" }, label: "Contact", keywords: "person card \u8054\u7CFB\u4EBA", Component: LuContact },
  { icon: { kind: "lucide", value: "copy" }, label: "Copy", keywords: "duplicate \u590D\u5236", Component: LuCopy },
  { icon: { kind: "lucide", value: "download" }, label: "Download", keywords: "save \u4E0B\u8F7D", Component: LuDownload },
  { icon: { kind: "lucide", value: "eraser" }, label: "Eraser", keywords: "clean remove \u6A61\u76AE \u6E05\u7406", Component: LuEraser },
  { icon: { kind: "lucide", value: "film" }, label: "Film", keywords: "movie video \u7535\u5F71", Component: LuFilm },
  { icon: { kind: "lucide", value: "fingerprint" }, label: "Fingerprint", keywords: "identity security \u6307\u7EB9", Component: LuFingerprint },
  { icon: { kind: "lucide", value: "flame" }, label: "Flame", keywords: "hot fire \u70ED\u95E8 \u706B", Component: LuFlame },
  { icon: { kind: "lucide", value: "gem" }, label: "Gem", keywords: "diamond precious \u5B9D\u77F3", Component: LuGem },
  { icon: { kind: "lucide", value: "hard-drive" }, label: "Drive", keywords: "disk storage \u786C\u76D8", Component: LuHardDrive },
  { icon: { kind: "lucide", value: "hospital" }, label: "Hospital", keywords: "health medical \u533B\u7597 \u533B\u9662", Component: LuHospital },
  { icon: { kind: "lucide", value: "map-pin" }, label: "Pin", keywords: "location \u5730\u70B9 \u5B9A\u4F4D", Component: LuMapPin },
  { icon: { kind: "lucide", value: "medal" }, label: "Medal", keywords: "award honor \u52CB\u7AE0", Component: LuMedal },
  { icon: { kind: "lucide", value: "mouse-pointer-2" }, label: "Cursor", keywords: "click pointer \u9F20\u6807 \u70B9\u51FB", Component: LuMousePointer2 },
  { icon: { kind: "lucide", value: "network" }, label: "Network", keywords: "graph nodes \u7F51\u7EDC", Component: LuNetwork },
  { icon: { kind: "lucide", value: "paintbrush" }, label: "Paint", keywords: "draw design \u753B\u7B14", Component: LuPaintbrush },
  { icon: { kind: "lucide", value: "pencil" }, label: "Pencil", keywords: "write edit \u94C5\u7B14 \u5199\u4F5C", Component: LuPencil },
  { icon: { kind: "lucide", value: "printer" }, label: "Printer", keywords: "print \u6253\u5370", Component: LuPrinter },
  { icon: { kind: "lucide", value: "qr-code" }, label: "QR code", keywords: "scan \u4E8C\u7EF4\u7801", Component: LuQrCode },
  { icon: { kind: "lucide", value: "radar" }, label: "Radar", keywords: "detect monitor \u96F7\u8FBE", Component: LuRadar },
  { icon: { kind: "lucide", value: "receipt" }, label: "Receipt", keywords: "invoice bill \u53D1\u7968 \u6536\u636E", Component: LuReceipt },
  { icon: { kind: "lucide", value: "recycle" }, label: "Recycle", keywords: "reuse \u73AF\u4FDD \u56DE\u6536", Component: LuRecycle },
  { icon: { kind: "lucide", value: "scan-line" }, label: "Scan", keywords: "ocr scan \u626B\u63CF", Component: LuScanLine },
  { icon: { kind: "lucide", value: "school" }, label: "School", keywords: "education \u5B66\u6821 \u6559\u80B2", Component: LuSchool },
  { icon: { kind: "lucide", value: "server" }, label: "Server", keywords: "backend cloud \u670D\u52A1\u5668", Component: LuServer },
  { icon: { kind: "lucide", value: "ship" }, label: "Ship", keywords: "boat travel \u8239", Component: LuShip },
  { icon: { kind: "lucide", value: "siren" }, label: "Alert", keywords: "warning emergency \u8B66\u62A5", Component: LuSiren },
  { icon: { kind: "lucide", value: "sliders-horizontal" }, label: "Controls", keywords: "adjust settings \u63A7\u5236 \u8C03\u8282", Component: LuSlidersHorizontal },
  { icon: { kind: "lucide", value: "smartphone" }, label: "Phone", keywords: "mobile \u624B\u673A", Component: LuSmartphone },
  { icon: { kind: "lucide", value: "snowflake" }, label: "Snow", keywords: "cold winter \u96EA \u51AC\u5929", Component: LuSnowflake },
  { icon: { kind: "lucide", value: "store" }, label: "Store", keywords: "shop business \u5546\u5E97", Component: LuStore },
  { icon: { kind: "lucide", value: "sunrise" }, label: "Sunrise", keywords: "morning \u65E5\u51FA \u65E9\u6668", Component: LuSunrise },
  { icon: { kind: "lucide", value: "sunset" }, label: "Sunset", keywords: "evening \u65E5\u843D \u508D\u665A", Component: LuSunset },
  { icon: { kind: "lucide", value: "timer" }, label: "Timer", keywords: "countdown \u8BA1\u65F6\u5668", Component: LuTimer },
  { icon: { kind: "lucide", value: "truck" }, label: "Truck", keywords: "delivery logistics \u8D27\u8F66 \u7269\u6D41", Component: LuTruck },
  { icon: { kind: "lucide", value: "umbrella" }, label: "Umbrella", keywords: "rain protection \u96E8\u4F1E", Component: LuUmbrella },
  { icon: { kind: "lucide", value: "wifi" }, label: "Wi-Fi", keywords: "network wireless \u65E0\u7EBF \u7F51\u7EDC", Component: LuWifi }
];
function ContentIconPicker({
  open,
  onClose,
  onSelect
}) {
  const { t } = useTranslation();
  const ref = (0, import_react.useRef)(null);
  const [query, setQuery] = (0, import_react.useState)("");
  const normalizedQuery = asTrimmedLowercaseString(query);
  const filteredEmojiOptions = (0, import_react.useMemo)(() => {
    if (!normalizedQuery) return EMOJI_OPTIONS;
    return EMOJI_OPTIONS.filter((emoji) => {
      const haystack = `${emoji} ${EMOJI_KEYWORDS[emoji] ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);
  const filteredLucideOptions = (0, import_react.useMemo)(() => {
    if (!normalizedQuery) return LUCIDE_OPTIONS;
    return LUCIDE_OPTIONS.filter(({ icon, label, keywords }) => {
      const haystack = `${icon.value} ${label} ${keywords ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery]);
  (0, import_react.useEffect)(() => {
    if (!open) setQuery("");
  }, [open]);
  (0, import_react.useEffect)(() => {
    if (!open) return;
    const handlePointerDown = (event) => {
      if (!ref.current?.contains(event.target)) onClose();
    };
    const handleKeyDown = (event) => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "content-icon-picker", ref, role: "menu", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Input,
      {
        className: "content-icon-picker__search",
        size: "sm",
        variant: "filled",
        icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuSearch, { size: 15 }),
        value: query,
        onChange: (event) => setQuery(event.target.value),
        placeholder: t(
          "contentIcon.searchPlaceholder",
          "Search icons, plants, tables, code..."
        ),
        autoFocus: true
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "content-icon-picker__section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "content-icon-picker__label", children: [
        t("contentIcon.emojiSection", "Emoji"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: filteredEmojiOptions.length })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "content-icon-picker__grid", children: filteredEmojiOptions.map((emoji) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "content-icon-picker__option",
          onClick: () => onSelect({ kind: "emoji", value: emoji }),
          title: emoji,
          "aria-label": emoji,
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: emoji })
        },
        emoji
      )) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "content-icon-picker__section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "content-icon-picker__label", children: [
        t("contentIcon.iconsSection", "Icons"),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: filteredLucideOptions.length })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "content-icon-picker__grid", children: filteredLucideOptions.map(({ icon, label, Component }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "content-icon-picker__option",
          onClick: () => onSelect(icon),
          title: label,
          "aria-label": label,
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Component, { size: 18, "aria-hidden": "true" })
        },
        icon.value
      )) })
    ] }),
    filteredEmojiOptions.length === 0 && filteredLucideOptions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "content-icon-picker__empty", children: t("contentIcon.empty", "No matching icons") }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      Button_default,
      {
        type: "button",
        variant: "ghost",
        size: "small",
        block: true,
        className: "content-icon-picker__clear",
        icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LuX, { size: 15 }),
        onClick: () => onSelect(null),
        children: t("contentIcon.clear", "Clear icon")
      }
    )
  ] });
}

export {
  ContentIconPicker
};
