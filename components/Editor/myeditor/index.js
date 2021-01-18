import React, {useState, useRef} from 'react';
import ReactDOM, {unstable_batchedUpdates} from 'react-dom';
import {logOption} from './log';
import {stateToHtmlString} from './render';
const Editor = (props) => {
  const {onChange} = props;

  const editorEl = useRef(null);

  const [htmlString, setHtmlString] = useState('');
  const [state, setstate] = useState([{type: 'text', text: 'test'}]);
  // useEffect(() => {
  //   effect
  //   return () => {
  //     cleanup
  //   }
  // }, [state])

  const onBeforeInput = (e) => {
    e.preventDefault();
    reallyChange(e, 'input');
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
    reallyChange(e, 'composition');
  };
  const reallyChange = (e, from) => {
    //compositionEnd will force dom update, so we need render every time with random、

    unstable_batchedUpdates(() => {
      setHtmlString(`
        <div>${stateToHtmlString(state)}</div>
        <div style="display:inline;background:yellow;">${Math.random()}</div>`);
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
          __html: htmlString,
        }}
      />
    </>
  );
};

export default Editor;
