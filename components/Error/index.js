import React from "react";
import styled from "styled-components";
const WrapError = styled.div`
  color: red;
  margin: 0 auto;
  width: 15vw;
`;
const index = (props) => {
  const { children } = props;
  return <WrapError>{children}</WrapError>;
};

export default index;
