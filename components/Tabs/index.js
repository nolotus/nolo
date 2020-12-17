import React from "react";
import styled from "styled-components";
export const WrapTabs = styled.div`
  display: flex;
  margin: 0 auto;
  width: 20vw;
`;
export const WrapTab = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 10vw;
  padding: 10px ;
  border-bottom: ${(props) => (props.active ? `2px solid var(--primaryColor)` : "none")};
`;

export const Tabs = (props) => {
  const { children } = props;
  return <WrapTabs {...props}>{children}</WrapTabs>;
};
export const Tab = (props) => {
  const { children } = props;
  return <WrapTab {...props}>{children}</WrapTab>;
};
