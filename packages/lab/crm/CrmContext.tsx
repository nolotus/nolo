import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { PRODUCTS, CUSTOMERS, QUOTES } from "./data";

export type Product = typeof PRODUCTS[0];
export type QuoteItem = { 
  model: string; 
  qty: number; 
  price: number; 
  description?: string;
  uom?: string;      
  delivery?: string;
};
export type TransactionType = "Estimate" | "SalesOrder" | "Invoice";

export type Transaction = {
  id: string;
  type: TransactionType;
  date: string;
  customerId: string;
  items: QuoteItem[];
  total: number;
  taxRate: number;       // 税率 (如 0.13)
  taxAmount: number;     // 税额
  amountPaid: number;
  amountInvoiced: number; 
  taxType?: string;      
  shippingTerms?: string; 
  rep?: string;          // 销售代表 (图6中的 Rep)
  billTo?: string;       
  shipTo?: string;       
  memo?: string;         
  isActive: boolean;     
  refId?: string;
};

export type Customer = {
  id: string; name: string; companyName: string; status?: "Active" | "Inactive";
  contact: string; phone: string; altPhone: string; fax: string; email: string;
  billTo: string; shipTo: string; terms: string; priceLevel: string;
  taxId?: string; creditLimit: number; notes: string; 
};

export type Supplier = { id: string; name: string; contact: string; email: string };

interface CrmContextType {
  products: Product[];
  customers: Customer[];
  transactions: Transaction[];
  suppliers: Supplier[];
  createTransaction: (customerId: string, productModel: string) => string;
  convertTransaction: (sourceId: string, targetType: TransactionType) => string;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  recordPayment: (id: string, amount: number) => void;
  updateCustomer: (customer: Customer) => void;
  addCustomer: (customer: Customer) => void;
  addProduct: (product: Product) => void;
  updateProduct: (product: Product) => void;
  resetData: () => void;
}

const CrmContext = createContext<CrmContextType | undefined>(undefined);
const STORAGE_KEY = "NOLO_CRM_DATA_V2";

export function CrmProvider({ children }: { children: ReactNode }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [customers, setCustomers] = useState<Customer[]>(CUSTOMERS);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suppliers] = useState<Supplier[]>([
    { id: "SUP-ALPHA", name: "Alpha Component Mfg.", contact: "Jim", email: "jim@alpha.com" },
    { id: "SUP-BETA", name: "Beta Medical Tech", contact: "Lina", email: "lina@beta.com" }
  ]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomers(parsed.customers || []);
        setTransactions(parsed.transactions || []);
        setProducts(parsed.products || []);
      } catch (e) { console.error(e); }
    } else {
      setTransactions(QUOTES.map(q => ({ 
        ...q, 
        taxRate: 0.13, taxAmount: q.total * 0.13,
        amountInvoiced: q.type === "Invoice" ? q.total : 0,
        isActive: true, rep: "Sales-01"
      } as Transaction)));
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem(STORAGE_KEY, JSON.stringify({ customers, transactions, products }));
  }, [customers, transactions, products, isLoaded]);

  const createTransaction = (customerId: string, productModel: string) => {
    const product = products.find(p => p.model === productModel);
    const customer = customers.find(c => c.id === customerId);
    if (!product) return "";
    const newId = `EST-${Date.now().toString().slice(-6)}`;
    const newTx: Transaction = {
      id: newId, type: "Estimate", date: new Date().toISOString().slice(0, 10),
      customerId, items: [{ model: product.model, qty: 1, price: product.price }],
      total: product.price, taxRate: 0.13, taxAmount: product.price * 0.13,
      amountPaid: 0, amountInvoiced: 0, isActive: true,
      billTo: customer?.billTo, shipTo: customer?.shipTo || customer?.billTo,
      taxType: "13% VAT", shippingTerms: "Ex-Works", rep: "Manager"
    };
    setTransactions(prev => [newTx, ...prev]);
    return newId;
  };

  const convertTransaction = (sourceId: string, targetType: TransactionType) => {
    const source = transactions.find(t => t.id === sourceId);
    if (!source) return "";
    const prefix = targetType === "SalesOrder" ? "SO" : "INV";
    const newId = `${prefix}-${Date.now().toString().slice(-6)}`;
    const newTx: Transaction = { ...source, id: newId, type: targetType, date: new Date().toISOString().slice(0, 10), refId: sourceId };
    setTransactions(prev => [newTx, ...prev]);
    return newId;
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const recordPayment = (id: string, amount: number) => {
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, amountPaid: t.amountPaid + amount } : t));
  };

  const updateCustomer = (c: Customer) => setCustomers(prev => prev.map(item => item.id === c.id ? c : item));
  const addCustomer = (c: Customer) => setCustomers(prev => [...prev, c]);
  const addProduct = (p: Product) => setProducts(prev => [...prev, p]);
  const updateProduct = (p: Product) => setProducts(prev => prev.map(item => item.model === p.model ? p : item));
  const resetData = () => { if (window.confirm("Reset all data?")) { localStorage.removeItem(STORAGE_KEY); window.location.reload(); } };

  if (!isLoaded) return <div>Initializing...</div>;

  return (
    <CrmContext.Provider value={{ 
      products, customers, transactions, suppliers,
      createTransaction, convertTransaction, updateTransaction, recordPayment, updateCustomer, addCustomer, addProduct, updateProduct, resetData 
    }}>
      {children}
    </CrmContext.Provider>
  );
}

export const useCrm = () => {
  const context = useContext(CrmContext);
  if (!context) throw new Error("useCrm missing");
  return context;
};
