import React from 'react';
import {Link} from 'react-router-dom';
import {useSelector} from 'react-redux';
import {selectUserInfo, selectNavs} from '../../common/selector';
import {WrapHeader, Menu, Nav, Logo} from './styled';
const Header = () => {
  const userInfo = useSelector(selectUserInfo);
  const navs = useSelector(selectNavs);
  console.log('navs', navs);
  return (
    <WrapHeader>
      <Menu>
        <Logo href="/">Nolotus</Logo>
        <Nav>
          {navs
            ? navs.map((item, index) => {
                return (
                  <Link key={index} to={`/${item.path}`}>
                    {item.path === 'self' && userInfo.name
                      ? userInfo.name
                      : item.title}
                  </Link>
                );
              })
            : '加载中'}
        </Nav>
      </Menu>
    </WrapHeader>
  );
};

export default Header;
