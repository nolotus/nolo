import React from 'react';
import PropTypes from 'prop-types';
// import './Warning.scss';
import Button from '../Button';
import {WrapWarning} from './styled'
const Warning = (props) => {
  const { modalInfo } = props;
  const { title, content, buttons } = modalInfo;

  return (
    <WrapWarning>
      <div className="title">{title}</div>
      <div className="content">{content}</div>
      {buttons && buttons.length === 1 ? (
        <Button
          loading={buttons[0].loading}
          {...buttons[0]}
          onClick={() => {
            buttons[0].onClick();
          }}
        >{buttons[0].text}
        </Button>
      ) : (
        <div className="button-area">
          {buttons && buttons.map((buttonProps) => (
            <Button
              {...buttonProps}
              key={buttonProps.type + buttonProps.className + buttonProps.text}
              onClick={() => buttonProps.onClick()}
            >
              {buttonProps.text}
            </Button>
          ))}
        </div>
      )}

    </WrapWarning>
  );
};

Warning.propTypes = {
  modalInfo: PropTypes.object,
};

export default Warning;
