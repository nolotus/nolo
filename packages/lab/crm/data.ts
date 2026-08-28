export const PRODUCTS = [
  {
    model: "RF-ATT-75G",
    description: "Precision Fixed Attenuator\nFreq: 10-15GHz\nAttenuation: 20dB\nPower: 350W\nMaterial: Aluminum",
    price: 2150.00,
    leadTime: "4-6 Weeks",
    supplierId: "SUP-ALPHA",
    cost: 1300.00
  },
  {
    model: "MED-SENS-V2",
    description: "High-Sensitivity Biosensor\nAccuracy: ±0.01%\nCert: CE/FDA Class II",
    price: 450.00,
    leadTime: "In Stock",
    supplierId: "SUP-BETA",
    cost: 210.00
  },
  {
    model: "ALU-SHEET-304",
    description: "Industrial Aluminum Sheet\nSize: 1200x2400mm\nThickness: 0.5mm\nFinish: Mirror Polished",
    price: 85.00,
    leadTime: "3 Days",
    supplierId: "SUP-GAMMA",
    cost: 45.00
  },
  {
    model: "WAVE-GUIDE-R42",
    description: "Rectangular Waveguide\nMaterial: Copper\nFinish: Silver Plated",
    price: 1250.00,
    leadTime: "2 Weeks",
    supplierId: "SUP-ALPHA",
    cost: 800.00
  },
  {
    model: "AUTO-VALVE-X1",
    description: "Pneumatic Control Valve\nPressure: 10 Bar\nInterface: DN25",
    price: 320.00,
    leadTime: "1 Week",
    supplierId: "SUP-DELTA",
    cost: 180.00
  },
  {
    model: "LASER-DIODE-808",
    description: "High Power Laser Diode\nWave: 808nm\nPower: 5W",
    price: 890.00,
    leadTime: "Next Day",
    supplierId: "SUP-EPSILON",
    cost: 550.00
  }
];

export const CUSTOMERS = [
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
    creditLimit: 1000000,
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
    creditLimit: 500000,
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
    creditLimit: 2000000,
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
    creditLimit: 300000,
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
    creditLimit: 1500000,
    notes: "Interested in AUTO-VALVE series."
  }
];

export const QUOTES = [
  {
    id: "EST-5001",
    date: "2026-01-20",
    customerId: "C-1001",
    items: [{ model: "RF-ATT-75G", qty: 10, price: 2150.00 }],
    total: 21500.00,
    amountPaid: 5000.00,
    amountInvoiced: 0,
    status: "Draft",
    type: "Estimate",
    isActive: true
  },
  {
    id: "SO-6002",
    date: "2026-01-25",
    customerId: "C-1002",
    items: [{ model: "WAVE-GUIDE-R42", qty: 5, price: 1250.00 }],
    total: 6250.00,
    amountPaid: 6250.00,
    amountInvoiced: 0,
    status: "Order",
    type: "SalesOrder",
    isActive: true
  }
];
