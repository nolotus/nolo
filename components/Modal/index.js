import React from 'react';
import PropTypes from 'prop-types';
// import './style.scss';
import {useKey} from 'react-use';
import {useDispatch} from 'react-redux';

import Warning from './Warning';
import CloseButton from '../Button/CloseButton';
import {WrapModal} from './styled';
const Modal = (props) => {
  const {modalInfo} = props;
  const {hasCloseButton, modalType} = modalInfo;
  const dispatch = useDispatch();
  const closeModal = () => dispatch({type: 'closeModal'});
  useKey('Escape', closeModal);

  const getModalComponent = () => {
    switch (modalType) {
      //  here is  for common warning，title, and button
      case 'warning':
        return <Warning {...props} />;
      //  here is  for generator
      default:
        return <div>modal error,need modalType</div>;
    }
  };
  return (
    <WrapModal>
      <div
        className="over-layer"
        tabIndex="0"
        role="button"
        onKeyDown={closeModal}
        onClick={closeModal}
      />
      <div className="modal-content">
        {getModalComponent()}
        {hasCloseButton && <CloseButton onClick={closeModal} />}
      </div>
    </WrapModal>
  );
};

Modal.propTypes = {
  closeModal: PropTypes.func,
  modalInfo: PropTypes.object,
};

export default Modal;
