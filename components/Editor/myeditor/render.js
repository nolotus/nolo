import React, {useState, useRef, useEffect} from 'react';
import ReactDOMServer from 'react-dom/server';
import ReactDOM, {render, unstable_batchedUpdates} from 'react-dom';

const Editor = (props) => {
  const {onChange} = props;

  const editorEl = useRef(null);
  if (editorEl.current) {
    console.log('editorEl', editorEl.onCompositionStart);
  }

  const onKeyPress = (e) => {
    e.preventDefault();
    console.log('onKeyPress', e);
  };
  const [realState, setRealState] = useState([]);
  useEffect(() => {
    console.log('realState', realState);
    return () => {};
  }, [realState]);
  const [renderTime, setRenderTime] = useState(0);

  const stateToReact = (stateArray) => {
    return (
      <>
        {stateArray.map((node, index) => {
          return <div key={'node' + index}>{node.text}</div>;
        })}
      </>
    );
  };

  const [htmlString, setHtmlString] = useState('');

  const onBeforeInput = (e) => {
    e.preventDefault();
    reallyChange(e);
  };
  const compositionEnd = (e) => {
    e.preventDefault();
    reallyChange(e);
  };
  const htmlToJs = (e) => {
    console.log('reallyChange target', e.target);
    const children = Array.from(e.target.children);
    console.log('reallyChange childNodes', children);
    const newState = children.map((node, index) => {
      console.log('node', node);
      return {type: node.nodeType, text: node.innerText};
    });
    setRealState(newState);
    console.log('newState', newState);

    const nextHtmlString = ReactDOMServer.renderToStaticMarkup(
      stateToReact(newState),
    );
    console.log('nextHtmlString', nextHtmlString);
  };
  const reallyChange = (e) => {
    console.log('reallyChange e', e);
    htmlToJs(e);
    console.log('reallyChange data', e.data);
    if (e.data) {
      setRenderTime(renderTime + 1);
      unstable_batchedUpdates(() => {
        setHtmlString(
          `
          <div>
          ${htmlString}}
          </div>
          <div id="hidden" style="display: inline;background:yellow;">${renderTime}</div>`,
        );
      });
    }
  };

  const onBlur = (e) => {};
  return (
    <>
      <div
        contentEditable={true}
        onBlur={onBlur}
        onKeyPress={onKeyPress}
        tabIndex="0"
        onBeforeInput={onBeforeInput}
        ref={editorEl}
        onCompositionEnd={compositionEnd}
        dangerouslySetInnerHTML={{
          __html: htmlString,
        }}
      />
    </>
  );
};

export default Editor;
