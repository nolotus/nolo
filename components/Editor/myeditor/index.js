import React, { useState, useRef } from "react";
import ReactDOM, { unstable_batchedUpdates } from "react-dom";
// import escapeHtml from 'escape-html'
const deserialize = (el) => {
  console.log("el");
};
const Editor = (props) => {
  const { onChange } = props;

  const editorEl = useRef(null);
  if (editorEl.current) {
    console.log("editorEl", editorEl.onCompositionStart);
  }

  const [state, setstate] = useState("");
  // useEffect(() => {
  //   effect
  //   return () => {
  //     cleanup
  //   }
  // }, [state])

  const onBeforeInput = (e) => {
    e.preventDefault();
    const html = e.target;
    // console.log('compositionStart',html)

    // const deState = deserialize(html);
    // onChange("deState", deState);
  };

  const compositionupdate = (e) => {
    e.preventDefault();
    const html = e.target;
    console.log("compositionupdate", html);
    // const deState = deserialize(html);
    // onChange("deState", deState);
  };
  const compositionStart = (e) => {
    e.preventDefault();
    const html = e.target;
    console.log("compositionStart", e.data);
    reallyChange(e.data);
    // const deState = deserialize(html);
    // onChange("deState", deState);
  };

  const compositionEnd = (e) => {
    e.preventDefault();

    // const html = e.target;
    console.log("compositionEnd", e.data);
    reallyChange(e.data);

    // const deState = deserialize(html);
    // onChange("deState", deState);
  };
  const reallyChange = (data) => {
    console.log("reallyChange", data);
    unstable_batchedUpdates(() => {
      setstate(` +${Math.random()}\n${Math.random()}`);
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
        onCompositionUpdate={compositionupdate}
        onCompositionStart={compositionStart}
        onCompositionEnd={compositionEnd}
        dangerouslySetInnerHTML={{
          __html: state,
        }}
      ></div>
      <button
        onClick={() => {
          setstate(`${Math.random()}\n${Math.random()}`);
        }}
      >
        Click me to change contnet
      </button>
    </>
  );
};

export default Editor;
