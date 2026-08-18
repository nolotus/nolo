// packages/lab/crm/crmRoutes.tsx
import React from "react";
import { Outlet, NavLink } from "app/routing";
import { CrmProvider, useCrm } from "./CrmContext";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import Products from "./pages/Products";
import Quotes from "./pages/Quotes";
import Suppliers from "./pages/Suppliers";

const Navbar = () => {
  const { resetData } = useCrm();
  return (
    <nav style={{ padding: "0 20px", height: "50px", borderBottom: "1px solid #c5c5c5", background: "#fff", display: "flex", alignItems: "center", boxShadow: "0 2px 5px rgba(0,0,0,0.1)", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div style={{ marginRight: "40px", fontWeight: "bold", color: "#2c3e50", fontSize: "1.2em" }}>
          <span style={{ color: "#337ab7" }}>NOLO</span> ERP
        </div>
        
        <div style={{ display: "flex", height: "100%" }}>
          {[
            { to: "/", label: "Dashboard" },
            { to: "/products", label: "Product Library" },
            { to: "/quotes", label: "Transactions" },
            { to: "/contacts", label: "Customer Center" },
            { to: "/suppliers", label: "Vendors" }
          ].map(link => (
            <NavLink 
              key={link.to} 
              to={link.to} 
              style={({ isActive }) => ({
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
              })}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>

      <button type="button" 
        onClick={resetData}
        style={{ 
          background: "#fff", 
          border: "1px solid #dc3545", 
          color: "#dc3545", 
          padding: "4px 12px", 
          borderRadius: "4px", 
          fontSize: "11px", 
          cursor: "pointer",
          transition: "all 0.2s"
        }}
        onMouseOver={(e) => { e.currentTarget.style.background = "#dc3545"; e.currentTarget.style.color = "#fff"; }}
        onMouseOut={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.color = "#dc3545"; }}
      >
        Reset Database
      </button>
    </nav>
  );
};

export const crmRoutes = [
  {
    path: "/",
    element: (
      <CrmProvider>
        <div style={{ fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif', color: "#333", background: "#f4f4f4", minHeight: "100vh" }}>
          <Navbar />
          <div style={{ padding: "20px" }}>
            <Outlet />
          </div>
        </div>
      </CrmProvider>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: "contacts", element: <Contacts /> },
      { path: "products", element: <Products /> },
      { path: "quotes", element: <Quotes /> },
      { path: "suppliers", element: <Suppliers /> },
    ],
  },
];
