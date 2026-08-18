import React, { useState, useEffect } from "react";
import { useCrm, Product } from "../CrmContext";
import { useNavigate } from "app/routing";

export default function ProductsPage() {
  const { products, customers, transactions, createTransaction, updateProduct, addProduct } = useCrm();
  const [search, setSearch] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [historyModel, setHistoryModel] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => { 
    document.title = "Product Library - NOLO ERP"; 
    const params = new URLSearchParams(window.location.search);
    const s = params.get("search");
    if (s) setSearch(s);
  }, []);

  const filteredProducts = products.filter(p => 
    p.model.toLowerCase().includes(search.toLowerCase()) || 
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = () => {
    if (!editForm.model) return alert("Model is required");
    const exists = products.find(p => p.model === editForm.model);
    if (exists) updateProduct(editForm as Product);
    else addProduct(editForm as Product);
    setIsEditing(false);
  };

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", height: "calc(100vh - 90px)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Product Library</h1>
        <div style={{ display: "flex", gap: "10px" }}>
           <input 
             type="text" 
             placeholder="Filter specifications..." 
             value={search} 
             onChange={e => setSearch(e.target.value)} 
             style={{ padding: "8px 15px", width: "300px", borderRadius: "4px", border: "1px solid #ccc" }} 
           />
           <button type="button" onClick={() => { setEditForm({ model: "", description: "", price: 0 }); setIsEditing(true); }} style={{ padding: "8px 20px", background: "#28a745", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>+ New Product</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", border: "1px solid #ddd", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead style={{ position: "sticky", top: 0, background: "#f8f9fa", zIndex: 1, boxShadow: "0 1px 0 #ddd" }}>
            <tr>
              <th style={{ padding: "12px", borderBottom: "1px solid #ddd", textAlign: "left" }}>MODEL</th>
              <th style={{ padding: "12px", borderBottom: "1px solid #ddd", textAlign: "left" }}>SPECIFICATIONS</th>
              <th style={{ padding: "12px", borderBottom: "1px solid #ddd", textAlign: "right" }}>PRICE (USD)</th>
              <th style={{ padding: "12px", borderBottom: "1px solid #ddd", textAlign: "center" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(p => (
              <tr key={p.model} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "12px", fontWeight: "bold", verticalAlign: "top" }}>{p.model}</td>
                <td style={{ padding: "12px", verticalAlign: "top", whiteSpace: "pre-wrap", fontFamily: "monospace", color: "#555" }}>{p.description}</td>
                <td style={{ padding: "12px", verticalAlign: "top", textAlign: "right", fontWeight: "bold" }}>${p.price.toFixed(2)}</td>
                <td style={{ padding: "12px", verticalAlign: "top", textAlign: "center" }}>
                  <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                     <button type="button" onClick={() => setHistoryModel(p.model)}>History</button>
                     <button type="button" onClick={() => { setEditForm(p); setIsEditing(true); }}>Edit</button>
                     <button type="button" onClick={() => { const c = prompt("Client?"); createTransaction(customers.find(cu => cu.name.includes(c || ""))?.id || "C-1001", p.model); navigate("/quotes"); }} style={{ background: "#337ab7", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "3px" }}>Quote</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isEditing && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", padding: "25px", width: "500px", borderRadius: "8px" }}>
            <h3>Product Editor</h3>
            <div style={{ display: "grid", gap: "15px" }}>
               <input placeholder="Model Name" value={editForm.model || ""} onChange={e => setEditForm({...editForm, model: e.target.value})} disabled={products.some(pr => pr.model === editForm.model && !isEditing)} />
               <textarea rows={6} placeholder="Full Parameters..." value={editForm.description || ""} onChange={e => setEditForm({...editForm, description: e.target.value})} />
               <input type="number" placeholder="Price" value={editForm.price || 0} onChange={e => setEditForm({...editForm, price: parseFloat(e.target.value)})} />
            </div>
            <div style={{ marginTop: "20px", textAlign: "right" }}>
              <button type="button" onClick={() => setIsEditing(false)} style={{ marginRight: "10px" }}>Cancel</button>
              <button type="button" onClick={handleSave} style={{ background: "#28a745", color: "#fff", border: "none", padding: "8px 25px", borderRadius: "4px" }}>Save Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}