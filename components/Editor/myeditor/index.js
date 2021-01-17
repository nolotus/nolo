import React, {useState, useRef} from 'react';
import ReactDOM, {unstable_batchedUpdates} from 'react-dom';
import {logOption} from './log';

const Editor = (props) => {
  const {onChange} = props;

  const editorEl = useRef(null);

  const [state, setstate] = useState('');
  // useEffect(() => {
  //   effect
  //   return () => {
  //     cleanup
  //   }
  // }, [state])

  const onBeforeInput = (e) => {
    e.preventDefault();
  };

  const compositionUpdate = (e) => {
    e.preventDefault();
    if (logOption.compositionUpdate) {
      console.log('compositionUpdate', e);
    }
  };
  const compositionStart = (e) => {
    e.preventDefault();
    if (logOption.compositionStart) {
      console.log('compositionStart', e);
    }
  };

  const compositionEnd = (e) => {
    e.preventDefault();
    if (logOption.compositionEnd) {
      console.log('compositionEnd', e);
    }
    reallyChange(e.data);
  };
  const reallyChange = (e) => {
    console.log('reallyChange', e);
    unstable_batchedUpdates(() => {
      setstate(
        `<div style="display: inline;background:yellow;>${Math.random()}\n${Math.random()}</div>`,
      );
    });
  };
  // const onInput = (e) => {
  //   e.preventDefault();
  //   setstate("123");
  //   const html = e.target;
  //   const deState = deserialize(html);
  //   onChange("deState", deState);
  // };
  const onBlur = (e) => {};
  return (
    <>
      <div
        contentEditable={true}
        onBlur={onBlur}
        onBeforeInput={onBeforeInput}
        ref={editorEl}
        onCompositionUpdate={compositionUpdate}
        onCompositionStart={compositionStart}
        onCompositionEnd={compositionEnd}
        dangerouslySetInnerHTML={{
          __html: state,
        }}
      />
      <button
        onClick={() => {
          setstate(`${Math.random()}\n${Math.random()}`);
        }}>
        Click me to change contnet
      </button>
    </>
  );
};

export default Editor;
