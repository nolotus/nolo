import React from "react";
import styled from "styled-components";
const WrapInput = styled.label`
  display: block;
  margin: 20px auto;
  position: relative;
  width: 100%;
  max-width: 280px;
  * {
    box-sizing: border-box;
  }
  .label {
    position: absolute;
    top: 1.1rem;
    left: 0;
    font-size: 1.1rem;
    color: var(--neutralShade4);
    opacity: 1;
    font-weight: 500;
    transform-origin: 0 0;
    transition: all 0.2s ease;
  }
  .border {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 2px;
    width: 100%;
    background: var(--primaryColor);
    transform: scaleX(0);
    transform-origin: 0 0;
    transition: all 0.15s ease;
  }
  input {
    -webkit-appearance: none;
    width: 100%;
    border: 0;
    font-family: inherit;
    padding: 12px 0;
    height: 48px;
    font-size: 1.1rem;
    font-weight: 500;
    border-bottom: 2px solid var(--neutralShade3);

    background: none;
    border-radius: 0;
    color: #223254;
    transition: all 0.15s ease;
  }
  input:hover {
    background: rgba(34, 50, 84, 0.03);
  }
  input:not(:placeholder-shown) + span {
    color: #5a667f;
    transform: translateY(-28px) scale(1);
  }
  input:focus {
    background: none;
    outline: none;
  }
  ${"" /* label color */}
  input:focus + span {
    color: var(--primaryColor);
    transform: translateY(-28px) scale(0.9);
  }
  input:focus + span + .border {
    transform: scaleX(1);
  }
`;
const index = (props) => {
  const { name } = props;
  return (
    <WrapInput htmlFor={name}>
      <input type="text" {...props} id={name} placeholder="&nbsp;" />
      <span className="label">{props.label}</span>
      <span className="border"></span>
    </WrapInput>
  );
};

export default index;
