import React from "react";
import { useCrm } from "../CrmContext";
import { Link } from "app/routing";

export default function SuppliersPage() {
  const { suppliers, products } = useCrm();

  return (
    <div style={{ padding: 20 }}>
      <h1>Vendor Center</h1>
      <p style={{ color: "#666" }}>Management of component providers and manufacturing partners.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "20px", marginTop: "20px" }}>
        {suppliers.map(s => {
          const supplierProducts = products.filter(p => p.supplierId === s.id);
          return (
            <div key={s.id} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
              <div style={{ padding: "15px", background: "#f8f9fa", borderBottom: "1px solid #ddd" }}>
                <h3 style={{ margin: 0, color: "#337ab7" }}>{s.name}</h3>
                <span style={{ fontSize: "11px", color: "#888" }}>VENDOR ID: {s.id}</span>
              </div>
              <div style={{ padding: "15px", fontSize: "13px" }}>
                <p><strong>Contact:</strong> {s.contact}</p>
                <p><strong>Email:</strong> {s.email}</p>
                <div style={{ marginTop: "15px" }}>
                  <strong>Linked Products (Click to view):</strong>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                    {supplierProducts.map(p => (
                      <Link 
                        key={p.model} 
                        to={`/products?search=${encodeURIComponent(p.model)}`}
                        style={{ padding: "4px 10px", background: "#e6f7ff", border: "1px solid #91d5ff", borderRadius: "4px", color: "#1890ff", textDecoration: "none", fontSize: "12px" }}
                      >
                        {p.model}
                      </Link>
                    ))}
                    {supplierProducts.length === 0 && <span style={{ color: "#999" }}>No products linked</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}