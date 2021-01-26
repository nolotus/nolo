import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {faTimes} from '@fortawesome/free-solid-svg-icons';

const WrapCloseButton = styled.div`
  position: absolute;
  right: 20px;
  top: 20px;
  cursor: pointer;
  color: ${(props) => (props.color ? props.color : 'rgba(191, 191, 191, 1)')};
  z-index: 1;
`;
const CloseButton = (props) => {
  const {children} = props;
  return (
    <WrapCloseButton {...props}>
      <FontAwesomeIcon icon={faTimes} />
      {children}
    </WrapCloseButton>
  );
};

CloseButton.propTypes = {
  children: PropTypes.node,
};

export default CloseButton;
