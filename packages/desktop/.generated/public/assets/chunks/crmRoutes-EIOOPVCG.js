import {
  Link,
  NavLink,
  Outlet,
  useNavigate
} from "/public/assets/chunks/chunk-BELEJNOF.js";
import "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/lab/crm/crmRoutes.tsx
var import_react7 = __toESM(require_react(), 1);

// packages/lab/crm/CrmContext.tsx
var import_react = __toESM(require_react(), 1);

// packages/lab/crm/data.ts
var PRODUCTS = [
  {
    model: "RF-ATT-75G",
    description: "Precision Fixed Attenuator\nFreq: 10-15GHz\nAttenuation: 20dB\nPower: 350W\nMaterial: Aluminum",
    price: 2150,
    leadTime: "4-6 Weeks",
    supplierId: "SUP-ALPHA",
    cost: 1300
  },
  {
    model: "MED-SENS-V2",
    description: "High-Sensitivity Biosensor\nAccuracy: \xB10.01%\nCert: CE/FDA Class II",
    price: 450,
    leadTime: "In Stock",
    supplierId: "SUP-BETA",
    cost: 210
  },
  {
    model: "ALU-SHEET-304",
    description: "Industrial Aluminum Sheet\nSize: 1200x2400mm\nThickness: 0.5mm\nFinish: Mirror Polished",
    price: 85,
    leadTime: "3 Days",
    supplierId: "SUP-GAMMA",
    cost: 45
  },
  {
    model: "WAVE-GUIDE-R42",
    description: "Rectangular Waveguide\nMaterial: Copper\nFinish: Silver Plated",
    price: 1250,
    leadTime: "2 Weeks",
    supplierId: "SUP-ALPHA",
    cost: 800
  },
  {
    model: "AUTO-VALVE-X1",
    description: "Pneumatic Control Valve\nPressure: 10 Bar\nInterface: DN25",
    price: 320,
    leadTime: "1 Week",
    supplierId: "SUP-DELTA",
    cost: 180
  },
  {
    model: "LASER-DIODE-808",
    description: "High Power Laser Diode\nWave: 808nm\nPower: 5W",
    price: 890,
    leadTime: "Next Day",
    supplierId: "SUP-EPSILON",
    cost: 550
  }
];
var CUSTOMERS = [
  {
    id: "C-1001",
    name: "Quantum Micro Systems",
    companyName: "Quantum Micro Systems LLC",
    contact: "Sarah Jenkins",
    phone: "+1 (555) 123-4567",
    altPhone: "+1 (555) 987-6543",
    fax: "+1 (555) 123-0000",
    email: "s.jenkins@quantum-micro.com",
    billTo: "123 Technology Drive, San Jose, CA 95110, USA",
    shipTo: "Quantum Logistics Center, 456 Port Road, Long Beach, CA 90802, USA",
    terms: "Net 30",
    priceLevel: "Wholesale",
    taxId: "TX-99887766",
    creditLimit: 1e6,
    notes: "Prefer UPS for shipping."
  },
  {
    id: "C-1002",
    name: "Apex Aerospace Ltd",
    companyName: "Apex Aerospace Manufacturing",
    contact: "Marcus Thorne",
    phone: "+44 20 7946 0000",
    altPhone: "",
    fax: "",
    email: "m.thorne@apex-aero.uk",
    billTo: "Aero House, London Heathrow Airport, TW6 1QG, UK",
    shipTo: "Hangar 7, Brize Norton, OX18 3LX, UK",
    terms: "100% Pre-payment",
    priceLevel: "Distributor",
    taxId: "VAT-GB123456",
    creditLimit: 5e5,
    notes: "Strict QC required."
  },
  {
    id: "C-1003",
    name: "Global Health Solutions",
    companyName: "Global Health & Medical Inc.",
    contact: "Dr. Elena Rossi",
    phone: "+39 02 1234567",
    altPhone: "",
    fax: "+39 02 7654321",
    email: "e.rossi@ghs-medical.it",
    billTo: "Via Roma 10, 20121 Milano, Italy",
    shipTo: "Warehouse 4, Milan Logistics Park, Italy",
    terms: "Net 60",
    priceLevel: "Premium",
    taxId: "IT-00998877",
    creditLimit: 2e6,
    notes: "Monthly regular buyer."
  },
  {
    id: "C-1004",
    name: "Nordic Tech OY",
    companyName: "Nordic Technology Solutions",
    contact: "Erik Larsson",
    phone: "+358 9 123 456",
    altPhone: "",
    fax: "",
    email: "erik@nordictech.fi",
    billTo: "Mannerheimintie 12, Helsinki, Finland",
    shipTo: "Helsinki Port Warehouse B, Finland",
    terms: "Net 30",
    priceLevel: "Standard",
    taxId: "FI-11223344",
    creditLimit: 3e5,
    notes: "New customer from 2026."
  },
  {
    id: "C-1005",
    name: "Pacific Robotics",
    companyName: "Pacific Robotics & AI Corp",
    contact: "Kenji Tanaka",
    phone: "+81 3 1234 5678",
    altPhone: "",
    fax: "+81 3 1234 0000",
    email: "tanaka@pacific-robot.jp",
    billTo: "2-1-1 Nihonbashi, Chuo-ku, Tokyo, Japan",
    shipTo: "Yokohama Terminal 3, Japan",
    terms: "Net 15",
    priceLevel: "OEM",
    taxId: "JP-556677",
    creditLimit: 15e5,
    notes: "Interested in AUTO-VALVE series."
  }
];
var QUOTES = [
  {
    id: "EST-5001",
    date: "2026-01-20",
    customerId: "C-1001",
    items: [{ model: "RF-ATT-75G", qty: 10, price: 2150 }],
    total: 21500,
    amountPaid: 5e3,
    amountInvoiced: 0,
    status: "Draft",
    type: "Estimate",
    isActive: true
  },
  {
    id: "SO-6002",
    date: "2026-01-25",
    customerId: "C-1002",
    items: [{ model: "WAVE-GUIDE-R42", qty: 5, price: 1250 }],
    total: 6250,
    amountPaid: 6250,
    amountInvoiced: 0,
    status: "Order",
    type: "SalesOrder",
    isActive: true
  }
];

// packages/lab/crm/CrmContext.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var CrmContext = (0, import_react.createContext)(void 0);
var STORAGE_KEY = "NOLO_CRM_DATA_V2";
function CrmProvider({ children }) {
  const [isLoaded, setIsLoaded] = (0, import_react.useState)(false);
  const [products, setProducts] = (0, import_react.useState)(PRODUCTS);
  const [customers, setCustomers] = (0, import_react.useState)(CUSTOMERS);
  const [transactions, setTransactions] = (0, import_react.useState)([]);
  const [suppliers] = (0, import_react.useState)([
    { id: "SUP-ALPHA", name: "Alpha Component Mfg.", contact: "Jim", email: "jim@alpha.com" },
    { id: "SUP-BETA", name: "Beta Medical Tech", contact: "Lina", email: "lina@beta.com" }
  ]);
  (0, import_react.useEffect)(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomers(parsed.customers || []);
        setTransactions(parsed.transactions || []);
        setProducts(parsed.products || []);
      } catch (e) {
        console.error(e);
      }
    } else {
      setTransactions(QUOTES.map((q) => ({
        ...q,
        taxRate: 0.13,
        taxAmount: q.total * 0.13,
        amountInvoiced: q.type === "Invoice" ? q.total : 0,
        isActive: true,
        rep: "Sales-01"
      })));
    }
    setIsLoaded(true);
  }, []);
  (0, import_react.useEffect)(() => {
    if (isLoaded) localStorage.setItem(STORAGE_KEY, JSON.stringify({ customers, transactions, products }));
  }, [customers, transactions, products, isLoaded]);
  const createTransaction = (customerId, productModel) => {
    const product = products.find((p) => p.model === productModel);
    const customer = customers.find((c) => c.id === customerId);
    if (!product) return "";
    const newId = `EST-${Date.now().toString().slice(-6)}`;
    const newTx = {
      id: newId,
      type: "Estimate",
      date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      customerId,
      items: [{ model: product.model, qty: 1, price: product.price }],
      total: product.price,
      taxRate: 0.13,
      taxAmount: product.price * 0.13,
      amountPaid: 0,
      amountInvoiced: 0,
      isActive: true,
      billTo: customer?.billTo,
      shipTo: customer?.shipTo || customer?.billTo,
      taxType: "13% VAT",
      shippingTerms: "Ex-Works",
      rep: "Manager"
    };
    setTransactions((prev) => [newTx, ...prev]);
    return newId;
  };
  const convertTransaction = (sourceId, targetType) => {
    const source = transactions.find((t) => t.id === sourceId);
    if (!source) return "";
    const prefix = targetType === "SalesOrder" ? "SO" : "INV";
    const newId = `${prefix}-${Date.now().toString().slice(-6)}`;
    const newTx = { ...source, id: newId, type: targetType, date: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), refId: sourceId };
    setTransactions((prev) => [newTx, ...prev]);
    return newId;
  };
  const updateTransaction = (id, updates) => {
    setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, ...updates } : t));
  };
  const recordPayment = (id, amount) => {
    setTransactions((prev) => prev.map((t) => t.id === id ? { ...t, amountPaid: t.amountPaid + amount } : t));
  };
  const updateCustomer = (c) => setCustomers((prev) => prev.map((item) => item.id === c.id ? c : item));
  const addCustomer = (c) => setCustomers((prev) => [...prev, c]);
  const addProduct = (p) => setProducts((prev) => [...prev, p]);
  const updateProduct = (p) => setProducts((prev) => prev.map((item) => item.model === p.model ? p : item));
  const resetData = () => {
    if (window.confirm("Reset all data?")) {
      localStorage.removeItem(STORAGE_KEY);
      window.location.reload();
    }
  };
  if (!isLoaded) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "Initializing..." });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CrmContext.Provider, { value: {
    products,
    customers,
    transactions,
    suppliers,
    createTransaction,
    convertTransaction,
    updateTransaction,
    recordPayment,
    updateCustomer,
    addCustomer,
    addProduct,
    updateProduct,
    resetData
  }, children });
}
var useCrm = () => {
  const context = (0, import_react.useContext)(CrmContext);
  if (!context) throw new Error("useCrm missing");
  return context;
};

// packages/lab/crm/pages/Dashboard.tsx
var import_react2 = __toESM(require_react(), 1);
var import_jsx_runtime2 = __toESM(require_jsx_runtime(), 1);
function CrmDashboard() {
  const { transactions, customers } = useCrm();
  (0, import_react2.useEffect)(() => {
    document.title = "Dashboard - NOLO ERP";
  }, []);
  const totalAR = transactions.reduce((sum, t) => sum + (t.total - t.amountPaid), 0);
  const openEstimates = transactions.filter((t) => t.type === "Estimate").length;
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { padding: 40, maxWidth: "1200px", margin: "0 auto" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h1", { style: { marginBottom: "10px" }, children: "Business Overview" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { style: { color: "#666", marginBottom: "30px" }, children: "Performance tracking for global operations." }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "25px", marginBottom: "40px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { background: "#fff", padding: "30px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: "6px solid #ff4d4f" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: "13px", color: "#888", fontWeight: "bold" }, children: "TOTAL A/R" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { fontSize: "32px", fontWeight: "bold", marginTop: "10px" }, children: [
          "$",
          totalAR.toLocaleString(void 0, { minimumFractionDigits: 2 })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { background: "#fff", padding: "30px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: "6px solid #1890ff" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: "13px", color: "#888", fontWeight: "bold" }, children: "PENDING QUOTES" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: "32px", fontWeight: "bold", marginTop: "10px" }, children: openEstimates })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { background: "#fff", padding: "30px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: "6px solid #52c41a" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: "13px", color: "#888", fontWeight: "bold" }, children: "TOTAL CUSTOMERS" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: "32px", fontWeight: "bold", marginTop: "10px" }, children: customers.length })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "30px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { background: "#fff", padding: "25px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #eee" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h3", { style: { marginTop: 0, borderBottom: "1px solid #eee", paddingBottom: "15px" }, children: "Recent Activity" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { maxHeight: "400px", overflowY: "auto" }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { style: { textAlign: "left", fontSize: "11px", color: "#aaa" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: { padding: "12px 10px" }, children: "TX ID" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: { padding: "12px 10px" }, children: "CLIENT" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("th", { style: { padding: "12px 10px", textAlign: "right" }, children: "AMOUNT" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("tbody", { children: transactions.slice(0, 10).map((t) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("tr", { style: { borderBottom: "1px solid #f5f5f5" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: { padding: "12px 10px", fontSize: "13px" }, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Link, { to: `/quotes?id=${t.id}`, style: { color: "#337ab7", textDecoration: "none" }, children: t.id }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("td", { style: { padding: "12px 10px", fontSize: "13px" }, children: customers.find((c) => c.id === t.customerId)?.name }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("td", { style: { padding: "12px 10px", textAlign: "right", fontSize: "13px", fontWeight: "bold" }, children: [
              "$",
              t.total.toFixed(2)
            ] })
          ] }, t.id)) })
        ] }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: "20px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { background: "#e6f7ff", padding: "25px", borderRadius: "12px", border: "1px solid #91d5ff" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { style: { margin: "0 0 10px 0", color: "#0050b3" }, children: "New Sales Inquiry" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { style: { fontSize: "12px", color: "#444", lineHeight: "1.6" }, children: "Search your product parameters and generate a professional estimate in seconds." }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Link, { to: "/products", style: { display: "inline-block", marginTop: "10px", padding: "8px 20px", background: "#1890ff", color: "#fff", textDecoration: "none", borderRadius: "4px", fontWeight: "bold", fontSize: "12px" }, children: "Open Product Library" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { background: "#f6ffed", padding: "25px", borderRadius: "12px", border: "1px solid #b7eb8f" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h4", { style: { margin: "0 0 10px 0", color: "#237804" }, children: "Vendor Management" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { style: { fontSize: "12px", color: "#444", lineHeight: "1.6" }, children: "View connected suppliers and track your component sourcing network." }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(Link, { to: "/suppliers", style: { display: "inline-block", marginTop: "10px", padding: "8px 20px", background: "#52c41a", color: "#fff", textDecoration: "none", borderRadius: "4px", fontWeight: "bold", fontSize: "12px" }, children: "Open Vendor Center" })
        ] })
      ] })
    ] })
  ] });
}

// packages/lab/crm/pages/Contacts.tsx
var import_react3 = __toESM(require_react(), 1);
var import_jsx_runtime3 = __toESM(require_jsx_runtime(), 1);
function ContactsPage() {
  const { customers, transactions, updateCustomer, addCustomer } = useCrm();
  const [selectedId, setSelectedId] = (0, import_react3.useState)(customers[0]?.id);
  const [activeTab, setActiveTab] = (0, import_react3.useState)("Transactions");
  const [showType, setShowType] = (0, import_react3.useState)("All");
  const [statusFilter, setStatusFilter] = (0, import_react3.useState)("All");
  const [dateFilter, setDateFilter] = (0, import_react3.useState)("All");
  const [isEditing, setIsEditing] = (0, import_react3.useState)("None");
  const [form, setForm] = (0, import_react3.useState)({});
  (0, import_react3.useEffect)(() => {
    document.title = "Customer Center - NOLO ERP";
  }, []);
  const selectedCustomer = customers.find((c) => c.id === selectedId);
  const filteredTxs = (0, import_react3.useMemo)(() => {
    let list = transactions.filter((t) => t.customerId === selectedId);
    if (showType !== "All") list = list.filter((t) => t.type === showType);
    if (statusFilter === "Open") list = list.filter((t) => t.total - t.amountPaid > 0.01);
    if (statusFilter === "Paid") list = list.filter((t) => t.total - t.amountPaid <= 0.01);
    if (dateFilter !== "All") list = list.filter((t) => t.date.startsWith(dateFilter));
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedId, showType, statusFilter, dateFilter]);
  const totalAmount = (0, import_react3.useMemo)(() => filteredTxs.reduce((sum, t) => sum + t.total, 0), [filteredTxs]);
  const handleSave = () => {
    if (form.id) {
      if (customers.find((c) => c.id === form.id)) updateCustomer(form);
      else addCustomer(form);
      setIsEditing("None");
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", height: "calc(100vh - 90px)", background: "#fff", border: "1px solid #c5c5c5" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { width: "280px", borderRight: "1px solid #c5c5c5", background: "#f0f0f0", display: "flex", flexDirection: "column" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { padding: "12px", borderBottom: "1px solid #c5c5c5", background: "#e0e0e0", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { style: { fontSize: "12px" }, children: "CUSTOMER:JOB" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", onClick: () => {
          setForm({ id: `CUST-${Date.now()}`, name: "", terms: "Net 30", status: "Active" });
          setIsEditing("Full");
        }, style: { fontSize: "10px", padding: "2px 8px" }, children: "+ New" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { flex: 1, overflowY: "auto" }, children: customers.map((c) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { onClick: () => setSelectedId(c.id), style: { padding: "10px 15px", cursor: "pointer", borderBottom: "1px solid #d5d5d5", background: selectedId === c.id ? "#337ab7" : "transparent", color: selectedId === c.id ? "#fff" : "#000", fontSize: "13px" }, children: c.name }, c.id)) })
    ] }),
    selectedCustomer && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { padding: "20px", borderBottom: "1px solid #c5c5c5", background: "#fff" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", justifyContent: "space-between" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { style: { margin: 0, color: "#2c3e50" }, children: selectedCustomer.name }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { display: "flex", gap: "8px" }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", onClick: () => {
            setForm(selectedCustomer);
            setIsEditing("Full");
          }, children: "Edit" }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "flex", gap: "30px", marginTop: "20px", fontSize: "12px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { flex: 1 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: "Company:" }),
              " ",
              selectedCustomer.companyName
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: "Contact:" }),
              " ",
              selectedCustomer.contact
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: "Phone:" }),
              " ",
              selectedCustomer.phone
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: "Fax:" }),
              " ",
              selectedCustomer.fax || "--"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { flex: 1 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: "Terms:" }),
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { style: { color: "red", fontWeight: "bold" }, children: selectedCustomer.terms })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: "Email:" }),
              " ",
              selectedCustomer.email
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: "Tax ID:" }),
              " ",
              selectedCustomer.taxId || "--"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: "Address:" }),
              " ",
              selectedCustomer.billTo
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "div",
            {
              onClick: () => {
                setForm(selectedCustomer);
                setIsEditing("Notes");
              },
              style: { flex: 1.5, background: "#fff9c4", padding: "12px", border: "1px solid #fbc02d", borderRadius: "4px", height: "110px", overflowY: "auto", cursor: "pointer" },
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { style: { fontSize: "10px", color: "#856404", display: "block", marginBottom: "5px" }, children: "NOTES (Click to edit):" }),
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("pre", { style: { margin: 0, fontSize: "11px", whiteSpace: "pre-wrap", fontFamily: "sans-serif", color: "#856404" }, children: selectedCustomer.notes })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { background: "#f8f9fa", padding: "10px 20px", borderBottom: "1px solid #ddd", display: "flex", gap: "25px", alignItems: "center", fontSize: "12px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
          "Show:",
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("select", { value: showType, onChange: (e) => setShowType(e.target.value), style: { marginLeft: "5px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "All", children: "All Transactions" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "Estimate", children: "Estimates" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "SalesOrder", children: "Sales Orders" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "Invoice", children: "Invoices" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
          "Filter By:",
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), style: { marginLeft: "5px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "All", children: "All Status" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "Open", children: "Open (Unpaid)" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "Paid", children: "Fully Paid" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
          "Date:",
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("select", { value: dateFilter, onChange: (e) => setDateFilter(e.target.value), style: { marginLeft: "5px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "All", children: "All Dates" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "2026", children: "2026" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "2025", children: "2025" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("option", { value: "2024", children: "2024" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { flex: 1, overflowY: "auto", padding: "0 20px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "12px", marginTop: "15px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("thead", { style: { position: "sticky", top: 0, background: "#fff", zIndex: 1, boxShadow: "0 1px 0 #eee" }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("tr", { style: { textAlign: "left" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { style: { padding: "12px", borderBottom: "2px solid #ddd" }, children: "TYPE" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { style: { padding: "12px", borderBottom: "2px solid #ddd" }, children: "DATE" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { style: { padding: "12px", borderBottom: "2px solid #ddd" }, children: "REF #" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { style: { padding: "12px", borderBottom: "2px solid #ddd", textAlign: "right" }, children: "AMOUNT" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { style: { padding: "12px", borderBottom: "2px solid #ddd", textAlign: "right" }, children: "BALANCE" }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("th", { style: { padding: "12px", borderBottom: "2px solid #ddd", textAlign: "center" }, children: "ACTION" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("tbody", { children: filteredTxs.map((t) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("tr", { style: { borderBottom: "1px solid #eee" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { style: { padding: "12px" }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("strong", { children: t.type }) }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { style: { padding: "12px" }, children: t.date }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { style: { padding: "12px" }, children: t.id }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("td", { style: { padding: "12px", textAlign: "right" }, children: [
              "$",
              t.total.toLocaleString()
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("td", { style: { padding: "12px", textAlign: "right", color: t.total - t.amountPaid > 0 ? "red" : "green" }, children: [
              "$",
              (t.total - t.amountPaid).toLocaleString()
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("td", { style: { padding: "12px", textAlign: "center" }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(Link, { to: `/quotes?id=${t.id}`, style: { color: "#337ab7" }, children: "View" }) })
          ] }, t.id)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { textAlign: "right", padding: "20px 0", fontWeight: "bold", borderTop: "2px solid #333", marginTop: "10px" }, children: [
          "TOTAL: $",
          totalAmount.toLocaleString(void 0, { minimumFractionDigits: 2 })
        ] })
      ] })
    ] }),
    isEditing === "Notes" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1e3 }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { background: "#fff", padding: "20px", width: "600px", borderRadius: "8px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("h3", { children: [
        "Edit Notes for ",
        form.name
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("textarea", { style: { width: "100%", height: "250px", padding: "10px", background: "#fff9c4", border: "1px solid #fbc02d" }, value: form.notes || "", onChange: (e) => setForm({ ...form, notes: e.target.value }) }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { marginTop: "15px", textAlign: "right" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", onClick: () => setIsEditing("None"), children: "Cancel" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", onClick: handleSave, style: { background: "#337ab7", color: "#fff", border: "none", padding: "6px 20px", marginLeft: "10px" }, children: "Save Notes" })
      ] })
    ] }) }),
    isEditing === "Full" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1e3 }, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { background: "#fff", padding: "30px", width: "700px", borderRadius: "8px", maxHeight: "90vh", overflowY: "auto" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h2", { children: "Customer Editor" }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "20px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { gridColumn: "span 2" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { children: "Company Name" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { style: { width: "100%" }, value: form.name || "", onChange: (e) => setForm({ ...form, name: e.target.value, companyName: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { children: "Phone" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { style: { width: "100%" }, value: form.phone || "", onChange: (e) => setForm({ ...form, phone: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { children: "Fax" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { style: { width: "100%" }, value: form.fax || "", onChange: (e) => setForm({ ...form, fax: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { children: "Email" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { style: { width: "100%" }, value: form.email || "", onChange: (e) => setForm({ ...form, email: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { children: "Tax ID" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("input", { style: { width: "100%" }, value: form.taxId || "", onChange: (e) => setForm({ ...form, taxId: e.target.value }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { gridColumn: "span 2" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("label", { children: "Address" }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("textarea", { style: { width: "100%" }, value: form.billTo || "", onChange: (e) => setForm({ ...form, billTo: e.target.value }) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { marginTop: "30px", textAlign: "right" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", onClick: () => setIsEditing("None"), children: "Cancel" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { type: "button", onClick: handleSave, style: { background: "#28a745", color: "#fff", border: "none", padding: "8px 30px", marginLeft: "10px" }, children: "Save & Close" })
      ] })
    ] }) })
  ] });
}

// packages/lab/crm/pages/Products.tsx
var import_react4 = __toESM(require_react(), 1);
var import_jsx_runtime4 = __toESM(require_jsx_runtime(), 1);
function ProductsPage() {
  const { products, customers, transactions, createTransaction, updateProduct, addProduct } = useCrm();
  const [search, setSearch] = (0, import_react4.useState)("");
  const [isEditing, setIsEditing] = (0, import_react4.useState)(false);
  const [editForm, setEditForm] = (0, import_react4.useState)({});
  const [historyModel, setHistoryModel] = (0, import_react4.useState)(null);
  const navigate = useNavigate();
  (0, import_react4.useEffect)(() => {
    document.title = "Product Library - NOLO ERP";
    const params = new URLSearchParams(window.location.search);
    const s = params.get("search");
    if (s) setSearch(s);
  }, []);
  const filteredProducts = products.filter(
    (p) => p.model.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
  );
  const handleSave = () => {
    if (!editForm.model) return alert("Model is required");
    const exists = products.find((p) => p.model === editForm.model);
    if (exists) updateProduct(editForm);
    else addProduct(editForm);
    setIsEditing(false);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { padding: "20px", display: "flex", flexDirection: "column", height: "calc(100vh - 90px)" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h1", { style: { margin: 0 }, children: "Product Library" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", gap: "10px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "input",
          {
            type: "text",
            placeholder: "Filter specifications...",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            style: { padding: "8px 15px", width: "300px", borderRadius: "4px", border: "1px solid #ccc" }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", onClick: () => {
          setEditForm({ model: "", description: "", price: 0 });
          setIsEditing(true);
        }, style: { padding: "8px 20px", background: "#28a745", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }, children: "+ New Product" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { flex: 1, overflowY: "auto", border: "1px solid #ddd", background: "#fff" }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("thead", { style: { position: "sticky", top: 0, background: "#f8f9fa", zIndex: 1, boxShadow: "0 1px 0 #ddd" }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("tr", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("th", { style: { padding: "12px", borderBottom: "1px solid #ddd", textAlign: "left" }, children: "MODEL" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("th", { style: { padding: "12px", borderBottom: "1px solid #ddd", textAlign: "left" }, children: "SPECIFICATIONS" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("th", { style: { padding: "12px", borderBottom: "1px solid #ddd", textAlign: "right" }, children: "PRICE (USD)" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("th", { style: { padding: "12px", borderBottom: "1px solid #ddd", textAlign: "center" }, children: "ACTIONS" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("tbody", { children: filteredProducts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("tr", { style: { borderBottom: "1px solid #eee" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { style: { padding: "12px", fontWeight: "bold", verticalAlign: "top" }, children: p.model }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { style: { padding: "12px", verticalAlign: "top", whiteSpace: "pre-wrap", fontFamily: "monospace", color: "#555" }, children: p.description }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("td", { style: { padding: "12px", verticalAlign: "top", textAlign: "right", fontWeight: "bold" }, children: [
          "$",
          p.price.toFixed(2)
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("td", { style: { padding: "12px", verticalAlign: "top", textAlign: "center" }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "flex", gap: "5px", justifyContent: "center" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", onClick: () => setHistoryModel(p.model), children: "History" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", onClick: () => {
            setEditForm(p);
            setIsEditing(true);
          }, children: "Edit" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", onClick: () => {
            const c = prompt("Client?");
            createTransaction(customers.find((cu) => cu.name.includes(c || ""))?.id || "C-1001", p.model);
            navigate("/quotes");
          }, style: { background: "#337ab7", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "3px" }, children: "Quote" })
        ] }) })
      ] }, p.model)) })
    ] }) }),
    isEditing && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1e3 }, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { background: "#fff", padding: "25px", width: "500px", borderRadius: "8px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h3", { children: "Product Editor" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { display: "grid", gap: "15px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("input", { placeholder: "Model Name", value: editForm.model || "", onChange: (e) => setEditForm({ ...editForm, model: e.target.value }), disabled: products.some((pr) => pr.model === editForm.model && !isEditing) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("textarea", { rows: 6, placeholder: "Full Parameters...", value: editForm.description || "", onChange: (e) => setEditForm({ ...editForm, description: e.target.value }) }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("input", { type: "number", placeholder: "Price", value: editForm.price || 0, onChange: (e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { marginTop: "20px", textAlign: "right" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", onClick: () => setIsEditing(false), style: { marginRight: "10px" }, children: "Cancel" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { type: "button", onClick: handleSave, style: { background: "#28a745", color: "#fff", border: "none", padding: "8px 25px", borderRadius: "4px" }, children: "Save Product" })
      ] })
    ] }) })
  ] });
}

// packages/lab/crm/pages/Quotes.tsx
var import_react5 = __toESM(require_react(), 1);
var import_jsx_runtime5 = __toESM(require_jsx_runtime(), 1);
function TransactionsPage() {
  const { transactions, customers, products, convertTransaction, recordPayment } = useCrm();
  const [viewId, setViewId] = (0, import_react5.useState)(null);
  const [isPackingList, setIsPackingList] = (0, import_react5.useState)(false);
  const [filter, setFilter] = (0, import_react5.useState)("All");
  (0, import_react5.useEffect)(() => {
    document.title = "Transaction Center - NOLO ERP";
  }, []);
  const filteredList = (0, import_react5.useMemo)(() => {
    let list = transactions;
    if (filter !== "All") list = list.filter((t) => t.type === filter);
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filter]);
  import_react5.default.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) setViewId(id);
  }, []);
  if (viewId) {
    const tx = transactions.find((t) => t.id === viewId);
    if (!tx) return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", onClick: () => setViewId(null), children: "Back" });
    const customer = customers.find((c) => c.id === tx.customerId);
    const themeColor = isPackingList ? "#000" : tx.type === "SalesOrder" ? "#e67e22" : tx.type === "Invoice" ? "#2980b9" : "#666";
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { padding: "20px", maxWidth: "1050px", margin: "0 auto", background: "#f0f0f0", minHeight: "100vh" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { background: "#fff", padding: "10px", border: "1px solid #ccc", marginBottom: "15px", display: "flex", gap: "12px", alignItems: "center" }, className: "no-print", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("button", { type: "button", onClick: () => setViewId(null), style: { padding: "4px 15px" }, children: [
          "\u2190",
          " Back to Center"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", onClick: () => window.print(), children: "Print" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", onClick: () => setIsPackingList(!isPackingList), children: isPackingList ? "Invoice View" : "Packing List View" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { flex: 1 } }),
        tx.type !== "Invoice" && !isPackingList && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", onClick: () => {
          const nid = convertTransaction(tx.id, tx.type === "Estimate" ? "SalesOrder" : "Invoice");
          setViewId(nid);
        }, style: { background: themeColor, color: "#fff", border: "none", padding: "5px 20px" }, children: "Convert" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { background: "#fff", border: `2px solid ${themeColor}`, padding: "40px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "30px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h1", { style: { margin: 0, color: themeColor }, children: isPackingList ? "PACKING LIST" : tx.type.toUpperCase() }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { textAlign: "right", fontSize: "14px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("strong", { children: "DATE:" }),
            " ",
            tx.date,
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("br", {}),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("strong", { children: "REF #:" }),
            " ",
            tx.id
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", gap: "40px", marginBottom: "30px", fontSize: "12px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { flex: 1 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("strong", { children: "BILL TO:" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("br", {}),
            customer?.companyName,
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("br", {}),
            customer?.billTo
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { flex: 1 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("strong", { children: "SHIP TO:" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("br", {}),
            customer?.shipTo || customer?.billTo
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("thead", { style: { background: themeColor, color: "#fff", fontSize: "12px" }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("tr", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { style: { padding: "10px", textAlign: "left" }, children: "ITEM" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { style: { padding: "10px", textAlign: "left" }, children: "SPECS" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { style: { padding: "10px" }, children: "QTY" }),
            !isPackingList && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { style: { padding: "10px", textAlign: "right" }, children: "AMOUNT" })
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("tbody", { children: tx.items.map((it, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("tr", { style: { borderBottom: "1px solid #eee", fontSize: "12px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { style: { padding: "10px", fontWeight: "bold" }, children: it.model }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { style: { padding: "10px", whiteSpace: "pre-wrap" }, children: products.find((p) => p.model === it.model)?.description }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { style: { padding: "10px", textAlign: "center" }, children: it.qty }),
            !isPackingList && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("td", { style: { padding: "10px", textAlign: "right" }, children: [
              "$",
              (it.qty * it.price).toFixed(2)
            ] })
          ] }, i)) })
        ] }),
        !isPackingList && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { textAlign: "right", marginTop: "30px", borderTop: `2px solid ${themeColor}`, paddingTop: "10px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { fontSize: "20px", fontWeight: "bold" }, children: [
            "TOTAL: $",
            tx.total.toFixed(2)
          ] }),
          tx.type === "Invoice" && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { color: "red", fontWeight: "bold" }, children: [
            "BALANCE: $",
            (tx.total - tx.amountPaid).toFixed(2)
          ] })
        ] })
      ] })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { padding: "20px", display: "flex", flexDirection: "column", height: "calc(100vh - 90px)" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h1", { style: { margin: 0 }, children: "Transaction Center" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("select", { value: filter, onChange: (e) => setFilter(e.target.value), style: { padding: "8px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "All", children: "All Transactions" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "Estimate", children: "Estimates" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "SalesOrder", children: "Sales Orders" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "Invoice", children: "Invoices" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { flex: 1, overflowY: "auto", background: "#fff", border: "1px solid #ddd" }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("thead", { style: { position: "sticky", top: 0, background: "#f8f9fa", zIndex: 1, boxShadow: "0 1px 0 #ddd" }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("tr", { style: { textAlign: "left" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { style: { padding: "12px" }, children: "TYPE" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { style: { padding: "12px" }, children: "REF #" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { style: { padding: "12px" }, children: "CUSTOMER" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { style: { padding: "12px", textAlign: "right" }, children: "TOTAL" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("th", { style: { padding: "12px", textAlign: "center" }, children: "ACTION" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("tbody", { children: filteredList.map((t) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("tr", { style: { borderBottom: "1px solid #eee" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { style: { padding: "12px" }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("strong", { children: t.type }) }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { style: { padding: "12px" }, children: t.id }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { style: { padding: "12px" }, children: customers.find((c) => c.id === t.customerId)?.name }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("td", { style: { padding: "12px", textAlign: "right", fontWeight: "bold" }, children: [
          "$",
          t.total.toLocaleString()
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("td", { style: { padding: "12px", textAlign: "center" }, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", onClick: () => setViewId(t.id), children: "Open" }) })
      ] }, t.id)) })
    ] }) })
  ] });
}

// packages/lab/crm/pages/Suppliers.tsx
var import_react6 = __toESM(require_react(), 1);
var import_jsx_runtime6 = __toESM(require_jsx_runtime(), 1);
function SuppliersPage() {
  const { suppliers, products } = useCrm();
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { padding: 20 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h1", { children: "Vendor Center" }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { style: { color: "#666" }, children: "Management of component providers and manufacturing partners." }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "20px", marginTop: "20px" }, children: suppliers.map((s) => {
      const supplierProducts = products.filter((p) => p.supplierId === s.id);
      return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { background: "#fff", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { padding: "15px", background: "#f8f9fa", borderBottom: "1px solid #ddd" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { style: { margin: 0, color: "#337ab7" }, children: s.name }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { style: { fontSize: "11px", color: "#888" }, children: [
            "VENDOR ID: ",
            s.id
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { padding: "15px", fontSize: "13px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("strong", { children: "Contact:" }),
            " ",
            s.contact
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("strong", { children: "Email:" }),
            " ",
            s.email
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { marginTop: "15px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("strong", { children: "Linked Products (Click to view):" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }, children: [
              supplierProducts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                Link,
                {
                  to: `/products?search=${encodeURIComponent(p.model)}`,
                  style: { padding: "4px 10px", background: "#e6f7ff", border: "1px solid #91d5ff", borderRadius: "4px", color: "#1890ff", textDecoration: "none", fontSize: "12px" },
                  children: p.model
                },
                p.model
              )),
              supplierProducts.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: { color: "#999" }, children: "No products linked" })
            ] })
          ] })
        ] })
      ] }, s.id);
    }) })
  ] });
}

// packages/lab/crm/crmRoutes.tsx
var import_jsx_runtime7 = __toESM(require_jsx_runtime(), 1);
var Navbar = () => {
  const { resetData } = useCrm();
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("nav", { style: { padding: "0 20px", height: "50px", borderBottom: "1px solid #c5c5c5", background: "#fff", display: "flex", alignItems: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", justifyContent: "space-between" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { display: "flex", alignItems: "center" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { marginRight: "40px", fontWeight: "bold", color: "#2c3e50", fontSize: "1.2em" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { style: { color: "#337ab7" }, children: "NOLO" }),
        " ERP"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { display: "flex", height: "100%" }, children: [
        { to: "/", label: "Dashboard" },
        { to: "/products", label: "Product Library" },
        { to: "/quotes", label: "Transactions" },
        { to: "/contacts", label: "Customer Center" },
        { to: "/suppliers", label: "Vendors" }
      ].map((link) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        NavLink,
        {
          to: link.to,
          style: ({ isActive }) => ({
            padding: "0 15px",
            textDecoration: "none",
            color: isActive ? "#337ab7" : "#666",
            display: "flex",
            alignItems: "center",
            borderBottom: isActive ? "3px solid #337ab7" : "3px solid transparent",
            fontWeight: isActive ? "bold" : "normal",
            fontSize: "13px",
            height: "47px",
            transition: "all 0.2s"
          }),
          children: link.label
        },
        link.to
      )) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      "button",
      {
        type: "button",
        onClick: resetData,
        style: {
          background: "#fff",
          border: "1px solid #dc3545",
          color: "#dc3545",
          padding: "4px 12px",
          borderRadius: "4px",
          fontSize: "11px",
          cursor: "pointer",
          transition: "all 0.2s"
        },
        onMouseOver: (e) => {
          e.currentTarget.style.background = "#dc3545";
          e.currentTarget.style.color = "#fff";
        },
        onMouseOut: (e) => {
          e.currentTarget.style.background = "#fff";
          e.currentTarget.style.color = "#dc3545";
        },
        children: "Reset Database"
      }
    )
  ] });
};
var crmRoutes = [
  {
    path: "/",
    element: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(CrmProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', color: "#333", background: "#f4f4f4", minHeight: "100vh" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Navbar, {}),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { padding: "20px" }, children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Outlet, {}) })
    ] }) }),
    children: [
      { index: true, element: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(CrmDashboard, {}) },
      { path: "contacts", element: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ContactsPage, {}) },
      { path: "products", element: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(ProductsPage, {}) },
      { path: "quotes", element: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(TransactionsPage, {}) },
      { path: "suppliers", element: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(SuppliersPage, {}) }
    ]
  }
];
export {
  crmRoutes
};
