import React from "react";
// import PropTypes from "prop-types";
import styled from "styled-components";
const Wrap = styled.div`
  display: flex;
  margin-top: 5px;
  color: #1a1a1a;
  a{
   color:#1a1a1a;
   :hover{
    color: #6d6d6d;
   }
  }
`;
const index = (props) => {
  const { children } = props;
  return <Wrap>{children}</Wrap>;
};

index.propTypes = {};

export default index;
