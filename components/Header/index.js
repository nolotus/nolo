import React from 'react';
import {Link} from 'react-router-dom';
import {useSelector} from 'react-redux';
import {selectUserInfo, selectNav} from '../../common/selector';
import {WrapHeader, Menu, Nav, Logo} from './styled';
const Header = () => {
  const userInfo = useSelector(selectUserInfo);
  const navs = useSelector(selectNav);
  return (
    <WrapHeader>
      <Menu>
        <Logo href="/">Nolotus</Logo>
        <Nav>
          {navs.map((item, index) => {
            return (
              <Link key={index} to={`/${item.path}`}>
                {item.path === 'self' && userInfo.name
                  ? userInfo.name
                  : item.title}
              </Link>
            );
          })}
        </Nav>
      </Menu>
    </WrapHeader>
  );
};

export default Header;
