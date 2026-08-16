import React, { useState, useMemo, useEffect } from "react";
import { useCrm, Transaction, TransactionType } from "../CrmContext";

export default function TransactionsPage() {
  const { transactions, customers, products, convertTransaction, recordPayment } = useCrm();
  const [viewId, setViewId] = useState<string | null>(null);
  const [isPackingList, setIsPackingList] = useState(false);
  const [filter, setFilter] = useState<"All" | TransactionType>("All");

  useEffect(() => { document.title = "Transaction Center - NOLO ERP"; }, []);

  const filteredList = useMemo(() => {
    let list = transactions;
    if (filter !== "All") list = list.filter(t => t.type === filter);
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filter]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) setViewId(id);
  }, []);

  if (viewId) {
    const tx = transactions.find(t => t.id === viewId);
    if (!tx) return <button type="button" onClick={() => setViewId(null)}>Back</button>;
    const customer = customers.find(c => c.id === tx.customerId);
    const themeColor = isPackingList ? "#000" : tx.type === "SalesOrder" ? "#e67e22" : tx.type === "Invoice" ? "#2980b9" : "#666";

    return (
      <div style={{ padding: "20px", maxWidth: "1050px", margin: "0 auto", background: "#f0f0f0", minHeight: "100vh" }}>
        <div style={{ background: "#fff", padding: "10px", border: "1px solid #ccc", marginBottom: "15px", display: "flex", gap: "12px", alignItems: "center" }} className="no-print">
           <button type="button" onClick={() => setViewId(null)} style={{ padding: "4px 15px" }}>{"\u2190"} Back to Center</button>
           <button type="button" onClick={() => window.print()}>Print</button>
           <button type="button" onClick={() => setIsPackingList(!isPackingList)}>
             {isPackingList ? "Invoice View" : "Packing List View"}
           </button>
           <div style={{ flex: 1 }}></div>
           {tx.type !== "Invoice" && !isPackingList && (
             <button type="button" onClick={() => { const nid = convertTransaction(tx.id, tx.type === "Estimate" ? "SalesOrder" : "Invoice"); setViewId(nid); }} style={{ background: themeColor, color: "#fff", border: "none", padding: "5px 20px" }}>Convert</button>
           )}
        </div>

        <div style={{ background: "#fff", border: `2px solid ${themeColor}`, padding: "40px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
            <h1 style={{ margin: 0, color: themeColor }}>{isPackingList ? "PACKING LIST" : tx.type.toUpperCase()}</h1>
            <div style={{ textAlign: "right", fontSize: "14px" }}>
               <strong>DATE:</strong> {tx.date}<br/>
               <strong>REF #:</strong> {tx.id}
            </div>
          </div>
          <div style={{ display: "flex", gap: "40px", marginBottom: "30px", fontSize: "12px" }}>
             <div style={{ flex: 1 }}><strong>BILL TO:</strong><br/>{customer?.companyName}<br/>{customer?.billTo}</div>
             <div style={{ flex: 1 }}><strong>SHIP TO:</strong><br/>{customer?.shipTo || customer?.billTo}</div>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: themeColor, color: "#fff", fontSize: "12px" }}>
              <tr><th style={{ padding: "10px", textAlign: "left" }}>ITEM</th><th style={{ padding: "10px", textAlign: "left" }}>SPECS</th><th style={{ padding: "10px" }}>QTY</th>{!isPackingList && <th style={{ padding: "10px", textAlign: "right" }}>AMOUNT</th>}</tr>
            </thead>
            <tbody>
              {tx.items.map((it, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #eee", fontSize: "12px" }}>
                  <td style={{ padding: "10px", fontWeight: "bold" }}>{it.model}</td>
                  <td style={{ padding: "10px", whiteSpace: "pre-wrap" }}>{products.find(p => p.model === it.model)?.description}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>{it.qty}</td>
                  {!isPackingList && <td style={{ padding: "10px", textAlign: "right" }}>${(it.qty * it.price).toFixed(2)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
          {!isPackingList && (
            <div style={{ textAlign: "right", marginTop: "30px", borderTop: `2px solid ${themeColor}`, paddingTop: "10px" }}>
               <div style={{ fontSize: "20px", fontWeight: "bold" }}>TOTAL: ${tx.total.toFixed(2)}</div>
               {tx.type === "Invoice" && <div style={{ color: "red", fontWeight: "bold" }}>BALANCE: ${(tx.total - tx.amountPaid).toFixed(2)}</div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", height: "calc(100vh - 90px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Transaction Center</h1>
        <select value={filter} onChange={e => setFilter(e.target.value as any)} style={{ padding: "8px" }}>
           <option value="All">All Transactions</option>
           <option value="Estimate">Estimates</option>
           <option value="SalesOrder">Sales Orders</option>
           <option value="Invoice">Invoices</option>
        </select>
      </div>
      <div style={{ flex: 1, overflowY: "auto", background: "#fff", border: "1px solid #ddd" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead style={{ position: "sticky", top: 0, background: "#f8f9fa", zIndex: 1, boxShadow: "0 1px 0 #ddd" }}>
            <tr style={{ textAlign: "left" }}>
              <th style={{ padding: "12px" }}>TYPE</th>
              <th style={{ padding: "12px" }}>REF #</th>
              <th style={{ padding: "12px" }}>CUSTOMER</th>
              <th style={{ padding: "12px", textAlign: "right" }}>TOTAL</th>
              <th style={{ padding: "12px", textAlign: "center" }}>ACTION</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map(t => (
              <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "12px" }}><strong>{t.type}</strong></td>
                <td style={{ padding: "12px" }}>{t.id}</td>
                <td style={{ padding: "12px" }}>{customers.find(c => c.id === t.customerId)?.name}</td>
                <td style={{ padding: "12px", textAlign: "right", fontWeight: "bold" }}>${t.total.toLocaleString()}</td>
                <td style={{ padding: "12px", textAlign: "center" }}>
                  <button type="button" onClick={() => setViewId(t.id)}>Open</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
