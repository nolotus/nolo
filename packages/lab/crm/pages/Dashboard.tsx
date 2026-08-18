import React, { useEffect } from "react";
import { Link } from "app/routing";
import { useCrm } from "../CrmContext";

export default function CrmDashboard() {
  const { transactions, customers } = useCrm();
  
  useEffect(() => { document.title = "Dashboard - NOLO ERP"; }, []);

  const totalAR = transactions.reduce((sum, t) => sum + (t.total - t.amountPaid), 0);
  const openEstimates = transactions.filter(t => t.type === "Estimate").length;

  return (
    <div style={{ padding: 40, maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "10px" }}>Business Overview</h1>
      <p style={{ color: "#666", marginBottom: "30px" }}>Performance tracking for global operations.</p>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "25px", marginBottom: "40px" }}>
        <div style={{ background: "#fff", padding: "30px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: "6px solid #ff4d4f" }}>
          <div style={{ fontSize: "13px", color: "#888", fontWeight: "bold" }}>TOTAL A/R</div>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginTop: "10px" }}>${totalAR.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={{ background: "#fff", padding: "30px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: "6px solid #1890ff" }}>
          <div style={{ fontSize: "13px", color: "#888", fontWeight: "bold" }}>PENDING QUOTES</div>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginTop: "10px" }}>{openEstimates}</div>
        </div>
        <div style={{ background: "#fff", padding: "30px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", borderLeft: "6px solid #52c41a" }}>
          <div style={{ fontSize: "13px", color: "#888", fontWeight: "bold" }}>TOTAL CUSTOMERS</div>
          <div style={{ fontSize: "32px", fontWeight: "bold", marginTop: "10px" }}>{customers.length}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "30px" }}>
        <div style={{ background: "#fff", padding: "25px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #eee" }}>
          <h3 style={{ marginTop: 0, borderBottom: "1px solid #eee", paddingBottom: "15px" }}>Recent Activity</h3>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
               <thead>
                 <tr style={{ textAlign: "left", fontSize: "11px", color: "#aaa" }}>
                   <th style={{ padding: "12px 10px" }}>TX ID</th>
                   <th style={{ padding: "12px 10px" }}>CLIENT</th>
                   <th style={{ padding: "12px 10px", textAlign: "right" }}>AMOUNT</th>
                 </tr>
               </thead>
               <tbody>
                 {transactions.slice(0, 10).map(t => (
                   <tr key={t.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                     <td style={{ padding: "12px 10px", fontSize: "13px" }}><Link to={`/quotes?id=${t.id}`} style={{ color: "#337ab7", textDecoration: "none" }}>{t.id}</Link></td>
                     <td style={{ padding: "12px 10px", fontSize: "13px" }}>{customers.find(c => c.id === t.customerId)?.name}</td>
                     <td style={{ padding: "12px 10px", textAlign: "right", fontSize: "13px", fontWeight: "bold" }}>${t.total.toFixed(2)}</td>
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{ background: "#e6f7ff", padding: "25px", borderRadius: "12px", border: "1px solid #91d5ff" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#0050b3" }}>New Sales Inquiry</h4>
            <p style={{ fontSize: "12px", color: "#444", lineHeight: "1.6" }}>Search your product parameters and generate a professional estimate in seconds.</p>
            <Link to="/products" style={{ display: "inline-block", marginTop: "10px", padding: "8px 20px", background: "#1890ff", color: "#fff", textDecoration: "none", borderRadius: "4px", fontWeight: "bold", fontSize: "12px" }}>Open Product Library</Link>
          </div>
          <div style={{ background: "#f6ffed", padding: "25px", borderRadius: "12px", border: "1px solid #b7eb8f" }}>
            <h4 style={{ margin: "0 0 10px 0", color: "#237804" }}>Vendor Management</h4>
            <p style={{ fontSize: "12px", color: "#444", lineHeight: "1.6" }}>View connected suppliers and track your component sourcing network.</p>
            <Link to="/suppliers" style={{ display: "inline-block", marginTop: "10px", padding: "8px 20px", background: "#52c41a", color: "#fff", textDecoration: "none", borderRadius: "4px", fontWeight: "bold", fontSize: "12px" }}>Open Vendor Center</Link>
          </div>
        </div>
      </div>
    </div>
  );
}