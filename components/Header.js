import React,{useState} from 'react'
import styled from "styled-components";
import { Link } from "react-router-dom";
export const Logo = styled.a`
  color: #ffffff;
  display: flex;
  align-items: center;
  margin-right: 10px;
  width: calc(100% / 6);
`;
const Header = () => {
    const [menu, setmenu] = useState([{ title: "加载中", path: "" }]);
    return (
        <header>
        <div className="menu">
          <Logo href="/">Nolotus</Logo>

          <nav>
            {menu.map((item, index) => {
              return (
                <>
                  {item.path === "self" ? (
                    <Link key={index} to={`/${item.path}`}>
                      {userInfo.name || item.title}
                    </Link>
                  ) : (
                    <Link key={index} to={`/${item.path}`}>{item.title}</Link>
                  )}
                </>
              );
            })}
          </nav>
        </div>
      </header>
    )
}

export default Header
