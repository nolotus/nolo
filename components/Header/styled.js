import styled from "styled-components";
export const WrapHeader =styled.header`
  background-color: #20232a;
    display: flex;
    width: 100%;
`
export const Menu = styled.div`
  display: flex;
  height: 60px;
  width: 90%;
  max-width: 1260px;
  margin: auto;
`;

export const Nav = styled.nav`
  height: 100%;
  display: flex;
  a {
    display: flex;
    transition: color 0.2s ease-out;
    align-items: center;
    padding-left: 20px;
    padding-right: 20px;
    font-size: 18px;
    color: #ffffff;
    font-weight: 300;
    :hover {
      color: var(--primaryColor);
    }
  }
`;
export const Logo = styled.a`
  color: #ffffff;
  display: flex;
  align-items: center;
  margin-right: 10px;
  width: calc(100% / 6);
`;
