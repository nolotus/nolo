import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { dbGet } from "../../common/api";
import { hostDb } from "../../common/db";
import { useSelector } from "react-redux";
import { selectUserInfo } from "../../common/selector";
import {WrapHeader,Menu,Nav,Logo}from "./styled"
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
    <WrapHeader>
      <Menu>
        <Logo href="/">Nolotus</Logo>

        <Nav>
          {menu.map((item, index) => {
            return (
              <Link key={index} to={`/${item.path}`}>
                {item.path === "self"&&userInfo.name ? userInfo.name : item.title}
              </Link>
            );
          })}
        </Nav>
      </Menu>
    </WrapHeader>
  );
};

export default Header;
