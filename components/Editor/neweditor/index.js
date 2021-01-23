import React, {useState, useCallback, useMemo} from 'react';
import {jsx} from 'slate-hyperscript';
import {Editor, Transforms, Range, Point, createEditor} from 'slate';
import {withHistory} from 'slate-history';
import {Slate, Editable, withReact} from '../slate-react/index.es';
import {initialValue} from './constant';
import Element from './Element';
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

// COMPAT: `B` is omitted here because Google Docs uses `<b>` in weird ways.
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
const SHORTCUTS = {
  '*': 'list-item',
  '-': 'list-item',
  '+': 'list-item',
  '>': 'block-quote',
  '#': 'heading-one',
  '##': 'heading-two',
  '###': 'heading-three',
  '####': 'heading-four',
  '#####': 'heading-five',
  '######': 'heading-six',
};
const withShortcuts = (editor) => {
  const {deleteBackward, insertText} = editor;

  editor.insertText = (text) => {
    const {selection} = editor;

    if (text === ' ' && selection && Range.isCollapsed(selection)) {
      const {anchor} = selection;
      const block = Editor.above(editor, {
        match: (n) => Editor.isBlock(editor, n),
      });
      const path = block ? block[1] : [];
      const start = Editor.start(editor, path);
      const range = {anchor, focus: start};
      const beforeText = Editor.string(editor, range);
      const type = SHORTCUTS[beforeText];

      if (type) {
        Transforms.select(editor, range);
        Transforms.delete(editor);
        Transforms.setNodes(
          editor,
          {type},
          {match: (n) => Editor.isBlock(editor, n)},
        );

        if (type === 'list-item') {
          const list = {type: 'bulleted-list', children: []};
          Transforms.wrapNodes(editor, list, {
            match: (n) => n.type === 'list-item',
          });
        }

        return;
      }
    }

    insertText(text);
  };

  editor.deleteBackward = (...args) => {
    const {selection} = editor;

    if (selection && Range.isCollapsed(selection)) {
      const match = Editor.above(editor, {
        match: (n) => Editor.isBlock(editor, n),
      });

      if (match) {
        const [block, path] = match;
        const start = Editor.start(editor, path);

        if (
          block.type !== 'paragraph' &&
          Point.equals(selection.anchor, start)
        ) {
          Transforms.setNodes(editor, {type: 'paragraph'});

          if (block.type === 'list-item') {
            Transforms.unwrapNodes(editor, {
              match: (n) => n.type === 'bulleted-list',
              split: true,
            });
          }

          return;
        }
      }

      deleteBackward(...args);
    }
  };

  return editor;
};

const WrapEditor = (props) => {
  const {readOnly} = props;
  const onChange = (value) => {
    console.log('value', value);
    const headingOneArray =
      value.filter((item) => item.type === 'heading-one') || [];
    const title = headingOneArray[0] && headingOneArray[0].children[0].text;
    const json = {title: title, content: value};
    props.onChange(json);
    setValue(value);
  };
  const [value, setValue] = useState(props.value || initialValue);
  const renderElement = useCallback((props) => <Element {...props} />, []);
  const renderLeaf = useCallback((props) => <Leaf {...props} />, []);
  const editor = useMemo(
    () => withHtml(withShortcuts(withReact(withHistory(createEditor())))),
    [],
  );
  return (
    <Slate editor={editor} value={value} onChange={onChange}>
      <Editable
        readOnly={readOnly}
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        spellCheck
        autoFocus
      />
    </Slate>
  );
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

const Leaf = ({attributes, children, leaf}) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  if (leaf.strikethrough) {
    children = <del>{children}</del>;
  }

  return <span {...attributes}>{children}</span>;
};

export default WrapEditor;
