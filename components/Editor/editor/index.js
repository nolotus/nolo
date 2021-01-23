// import useStore from "../../store/action";
// import { hostDb } from "../../tools/db";

// function Index() {
//   let history = useHistory();
//   const { isLogin, userDb } = useStore();

//   useEffect(() => {
//     async function postData() {
//       const title = "无标题";
//       let data = {
//         title,
//         type: "article",
//         content: initialValue,
//         status: "draft",
//       };
//       const db = isLogin ? userDb : hostDb;
//     }
//     postData();
//     return () => {};
//   }, [history, isLogin, userDb]);

//   return <div></div>;
// }

// export default Index;

import React, {useState, useCallback, useMemo} from 'react';
import {Slate, Editable, withReact} from '../slate-react/index.es';

import {Transforms, createEditor} from 'slate';
import {withHistory} from 'slate-history';
import {jsx} from 'slate-hyperscript';
import isHotkey from 'is-hotkey';

import {Toolbar} from './components';
import Element from './Element';
import Leaf from './Leaf';

import {withLayout, withLinks, toggleMark} from './tools';
import {
  InsertImageButton,
  LinkButton,
  MarkButton,
  BlockButton,
} from './buttons';

const ELEMENT_TAGS = {
  A: (el) => ({type: 'link', url: el.getAttribute('href')}),
  BLOCKQUOTE: () => ({type: 'quote'}),
  H1: () => ({type: 'heading-one'}),
  H2: () => ({type: 'heading-two'}),
  H3: () => ({type: 'heading-three'}),
  H4: () => ({type: 'heading-four'}),
  H5: () => ({type: 'heading-five'}),
  H6: () => ({type: 'heading-six'}),
  IMG: (el) => ({type: 'image', url: el.getAttribute('src')}),
  LI: () => ({type: 'list-item'}),
  OL: () => ({type: 'numbered-list'}),
  P: () => ({type: 'paragraph'}),
  PRE: () => ({type: 'code'}),
  UL: () => ({type: 'bulleted-list'}),
};
const TEXT_TAGS = {
  CODE: () => ({code: true}),
  DEL: () => ({strikethrough: true}),
  EM: () => ({italic: true}),
  I: () => ({italic: true}),
  S: () => ({strikethrough: true}),
  STRONG: () => ({bold: true}),
  U: () => ({underline: true}),
};
export const deserialize = (el) => {
  if (el.nodeType === 3) {
    return el.textContent;
  } else if (el.nodeType !== 1) {
    return null;
  } else if (el.nodeName === 'BR') {
    return '\n';
  }

  const {nodeName} = el;
  let parent = el;

  if (
    nodeName === 'PRE' &&
    el.childNodes[0] &&
    el.childNodes[0].nodeName === 'CODE'
  ) {
    parent = el.childNodes[0];
  }
  const children = Array.from(parent.childNodes).map(deserialize).flat();

  if (el.nodeName === 'BODY') {
    return jsx('fragment', {}, children);
  }

  if (ELEMENT_TAGS[nodeName]) {
    const attrs = ELEMENT_TAGS[nodeName](el);
    return jsx('element', attrs, children);
  }

  if (TEXT_TAGS[nodeName]) {
    const attrs = TEXT_TAGS[nodeName](el);
    return children.map((child) => jsx('text', attrs, child));
  }

  return children;
};
const withHtml = (editor) => {
  const {insertData, isInline, isVoid} = editor;

  editor.isInline = (element) => {
    return element.type === 'link' ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    return element.type === 'image' ? true : isVoid(element);
  };

  editor.insertData = (data) => {
    const html = data.getData('text/html');

    if (html) {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const fragment = deserialize(parsed.body);
      Transforms.insertFragment(editor, fragment);
      return;
    }

    insertData(data);
  };

  return editor;
};

const initialValue = [
  {
    type: 'paragraph',
    children: [
      {
        text: '谢谢你的支持，本站还在持续开发中',
      },
    ],
  },
];

const HOTKEYS = {
  'mod+b': 'bold',
  'mod+i': 'italic',
  'mod+u': 'underline',
  'mod+`': 'code',
};
const Editor = (props) => {
  const [value, setValue] = useState(initialValue);
  const renderElement = useCallback((props) => <Element {...props} />, []);
  const renderLeaf = useCallback((props) => <Leaf {...props} />, []);
  const editor = useMemo(
    () =>
      withHtml(withLayout(withLinks(withHistory(withReact(createEditor()))))),
    [],
  );
  const onChange = async (value) => {
    props.onChange(value);
    setValue(value);
  };
  return (
    <Slate editor={editor} value={value} onChange={onChange}>
      <Toolbar>
        <MarkButton format="bold" icon="format_bold" />
        <MarkButton format="italic" icon="format_italic" />
        <MarkButton format="underline" icon="format_underlined" />
        <MarkButton format="code" icon="code" />
        <BlockButton format="heading-two" icon="looks_two" />
        <BlockButton format="block-quote" icon="format_quote" />
        <BlockButton format="numbered-list" icon="format_list_numbered" />
        <BlockButton format="bulleted-list" icon="format_list_bulleted" />
        <LinkButton />
        <InsertImageButton />
      </Toolbar>
      <Editable
        spellCheck
        autoFocus
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        placeholder="Paste in some HTML..."
        onKeyDown={(event) => {
          for (const hotkey in HOTKEYS) {
            if (isHotkey(hotkey, event)) {
              event.preventDefault();
              const mark = HOTKEYS[hotkey];
              toggleMark(editor, mark);
            }
          }
        }}
      />
    </Slate>
  );
};

export default Editor;
