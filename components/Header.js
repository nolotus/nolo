import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { dbGet } from "../common/api";
import { hostDb } from "../common/db";
import { useSelector } from "react-redux";
import { selectUserInfo } from "../common/selector";
export const Logo = styled.a`
  color: #ffffff;
  display: flex;
  align-items: center;
  margin-right: 10px;
  width: calc(100% / 6);
`;
const Header = () => {
  const [menu, setmenu] = useState([{ title: "加载中", path: "" }]);
  const userInfo = useSelector(selectUserInfo);

  useEffect(() => {
    //get menu and setting from hostDb
    const fetchData = async () => {
      const menu = await dbGet(hostDb.remote, "menu");
      console.log("menu", menu);
      // const setting = await dbGet(hostDb.remote, "setting");
      menu && menu.result && setmenu(menu.result);
    };
    fetchData();
    return () => {};
  }, []);
  return (
    <header>
      <div className="menu">
        <Logo href="/">Nolotus</Logo>

        <nav>
          {menu.map((item, index) => {
            return (
              <Link key={index} to={`/${item.path}`}>
                {item.path === "self" ? userInfo.name : item.title}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

export default Header;
