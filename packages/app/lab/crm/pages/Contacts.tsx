import React, { useState, useMemo, useEffect } from "react";
import { useCrm, Customer, Transaction, TransactionType } from "../CrmContext";
import { Link } from "app/routing";

export default function ContactsPage() {
  const { customers, transactions, updateCustomer, addCustomer } = useCrm();
  const [selectedId, setSelectedId] = useState(customers[0]?.id);
  const [activeTab, setActiveTab] = useState("Transactions");
  
  // 核心过滤状态 - 重新找回并强化
  const [showType, setShowType] = useState<"All" | TransactionType>("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "Paid">("All");
  const [dateFilter, setDateFilter] = useState<"All" | "2026" | "2025" | "2024">("All");

  const [isEditing, setIsEditing] = useState<"Full" | "Notes" | "None">("None");
  const [form, setForm] = useState<Partial<Customer>>({});

  useEffect(() => { document.title = "Customer Center - NOLO ERP"; }, []);

  const selectedCustomer = customers.find(c => c.id === selectedId);

  // 深度联动过滤逻辑
  const filteredTxs = useMemo(() => {
    let list = transactions.filter(t => t.customerId === selectedId);
    if (showType !== "All") list = list.filter(t => t.type === showType);
    if (statusFilter === "Open") list = list.filter(t => t.total - t.amountPaid > 0.01);
    if (statusFilter === "Paid") list = list.filter(t => t.total - t.amountPaid <= 0.01);
    if (dateFilter !== "All") list = list.filter(t => t.date.startsWith(dateFilter));
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedId, showType, statusFilter, dateFilter]);

  const totalAmount = useMemo(() => filteredTxs.reduce((sum, t) => sum + t.total, 0), [filteredTxs]);

  const handleSave = () => {
    if (form.id) {
      if (customers.find(c => c.id === form.id)) updateCustomer(form as Customer);
      else addCustomer(form as Customer);
      setIsEditing("None");
    }
  };

  return (
    <div style={{ display: "flex", height: "calc(100vh - 90px)", background: "#fff", border: "1px solid #c5c5c5" }}>
      {/* 左侧客户列表 - 固定 */}
      <div style={{ width: "280px", borderRight: "1px solid #c5c5c5", background: "#f0f0f0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px", borderBottom: "1px solid #c5c5c5", background: "#e0e0e0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "12px" }}>CUSTOMER:JOB</strong>
          <button type="button" onClick={() => { setForm({ id: `CUST-${Date.now()}`, name: "", terms: "Net 30", status: "Active" }); setIsEditing("Full"); }} style={{ fontSize: "10px", padding: "2px 8px" }}>+ New</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {customers.map(c => (
            <div key={c.id} onClick={() => setSelectedId(c.id)} style={{ padding: "10px 15px", cursor: "pointer", borderBottom: "1px solid #d5d5d5", background: selectedId === c.id ? "#337ab7" : "transparent", color: selectedId === c.id ? "#fff" : "#000", fontSize: "13px" }}>
              {c.name}
            </div>
          ))}
        </div>
      </div>

      {/* 右侧主面板 */}
      {selectedCustomer && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* 1. 深度补全详情头部 (对标图5) */}
          <div style={{ padding: "20px", borderBottom: "1px solid #c5c5c5", background: "#fff" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h2 style={{ margin: 0, color: "#2c3e50" }}>{selectedCustomer.name}</h2>
              <div style={{ display: "flex", gap: "8px" }}>
                 <button type="button" onClick={() => { setForm(selectedCustomer); setIsEditing("Full"); }}>Edit</button>
              </div>
            </div>

            <div style={{ display: "flex", gap: "30px", marginTop: "20px", fontSize: "12px" }}>
              <div style={{ flex: 1 }}>
                <p><strong>Company:</strong> {selectedCustomer.companyName}</p>
                <p><strong>Contact:</strong> {selectedCustomer.contact}</p>
                <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
                <p><strong>Fax:</strong> {selectedCustomer.fax || "--"}</p>
              </div>
              <div style={{ flex: 1 }}>
                <p><strong>Terms:</strong> <span style={{ color: "red", fontWeight: "bold" }}>{selectedCustomer.terms}</span></p>
                <p><strong>Email:</strong> {selectedCustomer.email}</p>
                <p><strong>Tax ID:</strong> {selectedCustomer.taxId || "--"}</p>
                <p><strong>Address:</strong> {selectedCustomer.billTo}</p>
              </div>
              {/* 黄色备注区 - 支持点击编辑 */}
              <div 
                onClick={() => { setForm(selectedCustomer); setIsEditing("Notes"); }}
                style={{ flex: 1.5, background: "#fff9c4", padding: "12px", border: "1px solid #fbc02d", borderRadius: "4px", height: "110px", overflowY: "auto", cursor: "pointer" }}
              >
                <strong style={{ fontSize: "10px", color: "#856404", display: "block", marginBottom: "5px" }}>NOTES (Click to edit):</strong>
                <pre style={{ margin: 0, fontSize: "11px", whiteSpace: "pre-wrap", fontFamily: "sans-serif", color: "#856404" }}>
                  {selectedCustomer.notes}
                </pre>
              </div>
            </div>
          </div>

          {/* 2. 补全 Filter & Show 逻辑 (对标图5) */}
          <div style={{ background: "#f8f9fa", padding: "10px 20px", borderBottom: "1px solid #ddd", display: "flex", gap: "25px", alignItems: "center", fontSize: "12px" }}>
             <div>Show: 
               <select value={showType} onChange={e => setShowType(e.target.value as any)} style={{ marginLeft: "5px" }}>
                 <option value="All">All Transactions</option>
                 <option value="Estimate">Estimates</option>
                 <option value="SalesOrder">Sales Orders</option>
                 <option value="Invoice">Invoices</option>
               </select>
             </div>
             <div>Filter By: 
               <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={{ marginLeft: "5px" }}>
                 <option value="All">All Status</option>
                 <option value="Open">Open (Unpaid)</option>
                 <option value="Paid">Fully Paid</option>
               </select>
             </div>
             <div>Date: 
               <select value={dateFilter} onChange={e => setDateFilter(e.target.value as any)} style={{ marginLeft: "5px" }}>
                 <option value="All">All Dates</option>
                 <option value="2026">2026</option>
                 <option value="2025">2025</option>
                 <option value="2024">2024</option>
               </select>
             </div>
          </div>

          {/* 3. 交易历史 - 固定表头，数据滚动 */}
          <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", marginTop: "15px" }}>
              <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1, boxShadow: "0 1px 0 #eee" }}>
                <tr style={{ textAlign: "left" }}>
                  <th style={{ padding: "12px", borderBottom: "2px solid #ddd" }}>TYPE</th>
                  <th style={{ padding: "12px", borderBottom: "2px solid #ddd" }}>DATE</th>
                  <th style={{ padding: "12px", borderBottom: "2px solid #ddd" }}>REF #</th>
                  <th style={{ padding: "12px", borderBottom: "2px solid #ddd", textAlign: "right" }}>AMOUNT</th>
                  <th style={{ padding: "12px", borderBottom: "2px solid #ddd", textAlign: "right" }}>BALANCE</th>
                  <th style={{ padding: "12px", borderBottom: "2px solid #ddd", textAlign: "center" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxs.map(t => (
                  <tr key={t.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: "12px" }}><strong>{t.type}</strong></td>
                    <td style={{ padding: "12px" }}>{t.date}</td>
                    <td style={{ padding: "12px" }}>{t.id}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>${t.total.toLocaleString()}</td>
                    <td style={{ padding: "12px", textAlign: "right", color: t.total - t.amountPaid > 0 ? "red" : "green" }}>
                      ${(t.total - t.amountPaid).toLocaleString()}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <Link to={`/quotes?id=${t.id}`} style={{ color: "#337ab7" }}>View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: "right", padding: "20px 0", fontWeight: "bold", borderTop: "2px solid #333", marginTop: "10px" }}>
               TOTAL: ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* 4. 补全所有编辑弹窗 (Full Info & Notes) */}
      {isEditing === "Notes" && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: "20px", width: "600px", borderRadius: "8px" }}>
            <h3>Edit Notes for {form.name}</h3>
            <textarea style={{ width: "100%", height: "250px", padding: "10px", background: "#fff9c4", border: "1px solid #fbc02d" }} value={form.notes || ""} onChange={e => setForm({...form, notes: e.target.value})} />
            <div style={{ marginTop: "15px", textAlign: "right" }}>
              <button type="button" onClick={() => setIsEditing("None")}>Cancel</button>
              <button type="button" onClick={handleSave} style={{ background: "#337ab7", color: "#fff", border: "none", padding: "6px 20px", marginLeft: "10px" }}>Save Notes</button>
            </div>
          </div>
        </div>
      )}

      {isEditing === "Full" && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: "30px", width: "700px", borderRadius: "8px", maxHeight: "90vh", overflowY: "auto" }}>
            <h2>Customer Editor</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginTop: "20px" }}>
               <div style={{ gridColumn: "span 2" }}><label>Company Name</label><input style={{ width: "100%" }} value={form.name || ""} onChange={e => setForm({...form, name: e.target.value, companyName: e.target.value})} /></div>
               <div><label>Phone</label><input style={{ width: "100%" }} value={form.phone || ""} onChange={e => setForm({...form, phone: e.target.value})} /></div>
               <div><label>Fax</label><input style={{ width: "100%" }} value={form.fax || ""} onChange={e => setForm({...form, fax: e.target.value})} /></div>
               <div><label>Email</label><input style={{ width: "100%" }} value={form.email || ""} onChange={e => setForm({...form, email: e.target.value})} /></div>
               <div><label>Tax ID</label><input style={{ width: "100%" }} value={form.taxId || ""} onChange={e => setForm({...form, taxId: e.target.value})} /></div>
               <div style={{ gridColumn: "span 2" }}><label>Address</label><textarea style={{ width: "100%" }} value={form.billTo || ""} onChange={e => setForm({...form, billTo: e.target.value})} /></div>
            </div>
            <div style={{ marginTop: "30px", textAlign: "right" }}>
              <button type="button" onClick={() => setIsEditing("None")}>Cancel</button>
              <button type="button" onClick={handleSave} style={{ background: "#28a745", color: "#fff", border: "none", padding: "8px 30px", marginLeft: "10px" }}>Save & Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}