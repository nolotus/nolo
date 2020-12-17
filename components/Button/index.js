import React from "react";
import PropTypes from "prop-types";
import {Loading} from "../Loading";
import styled from 'styled-components';

const WrapButton = styled.div`
outline: none;
width: 100%;
text-align: center;
display: inline-block;
border: none;
font: 500 16px/1 "Poppins", sans-serif;
padding: 20px;
cursor: pointer;
border-radius: var(--borderRadius);
background: var(--primaryColor);
color: var(--backgroundColor);
position: relative;
top: 0;
transition: 0.2s ease;
:hover{
  top: -3px;
box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
}
`;
const Button = (props) => {
  const { type, loading = false, children, preIcon } = props;
  return (
    <>
      {(() => {
        switch (type) {
          default:
            return (
              <WrapButton type="button" {...props}>
                {preIcon ? (
                  <>
                    {loading ? (
                      <Loading></Loading>
                    ) : (
                      <div>icon placeholder</div>
                    )}
                    {children}
                  </>
                ) : (
                  <>{loading ? <Loading></Loading> : children}</>
                )}
              </WrapButton>
            );
        }
      })()}
    </>
  );
};

Button.propTypes = {
  type: PropTypes.string,
  children: PropTypes.node,
  onClick: PropTypes.func,
  loading: PropTypes.bool,
  className: PropTypes.string,
  disable: PropTypes.bool,
  size: PropTypes.object,
  preIcon: PropTypes.string,
};

export default Button;
