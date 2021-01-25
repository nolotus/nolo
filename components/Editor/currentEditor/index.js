/* eslint-disable react-native/no-inline-styles */
import React, {useState, useCallback, useMemo, useRef, useEffect} from 'react';
import {Slate, Editable, withReact, ReactEditor} from '../slate-react/index.es';
import {
  Editor,
  Transforms,
  Range,
  Point,
  createEditor,
  Element as SlateElement,
} from 'slate';
import ReactDOM from 'react-dom';
import {withHistory} from 'slate-history';
import {deserialize} from './deserialize';
import {Element} from './element';
import {Leaf} from './leaf';
import {insertImage, isImageUrl} from './image';
import {CHARACTERS} from './constant';
import {withLinks} from './link';
export const Portal = ({children}) => {
  return ReactDOM.createPortal(children, document.body);
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

const CurrentEditor = (props) => {
  const ref = useRef();
  const [value, setValue] = useState(props.value || initialValue);
  const [target, setTarget] = useState();
  const [search, setSearch] = useState('');
  const [index, setIndex] = useState(0);

  const renderElement = useCallback((props) => <Element {...props} />, []);
  const renderLeaf = useCallback((props) => <Leaf {...props} />, []);

  const chars = CHARACTERS.filter((c) =>
    c.toLowerCase().startsWith(search.toLowerCase()),
  ).slice(0, 10);
  const insertMention = (editor, character) => {
    const mention = {type: 'mention', character, children: [{text: ''}]};
    Transforms.insertNodes(editor, mention);
    Transforms.move(editor);
  };
  const onKeyDown = useCallback(
    (event) => {
      if (target) {
        switch (event.key) {
          case 'ArrowDown':
            event.preventDefault();
            // eslint-disable-next-line no-case-declarations
            const prevIndex = index >= chars.length - 1 ? 0 : index + 1;
            setIndex(prevIndex);
            break;
          case 'ArrowUp':
            event.preventDefault();
            // eslint-disable-next-line no-case-declarations
            const nextIndex = index <= 0 ? chars.length - 1 : index - 1;
            setIndex(nextIndex);
            break;
          case 'Tab':
          case 'Enter':
            event.preventDefault();
            Transforms.select(editor, target);
            insertMention(editor, chars[index]);
            setTarget(null);
            break;
          case 'Escape':
            event.preventDefault();
            setTarget(null);
            break;
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, search, target],
  );
  const editor = useMemo(
    () =>
      withLinks(
        withMentions(withNoloEditor(withReact(withHistory(createEditor())))),
      ),
    [],
  );

  useEffect(() => {
    if (target && chars.length > 0) {
      const el = ref.current;
      const domRange = ReactEditor.toDOMRange(editor, target);
      const rect = domRange.getBoundingClientRect();
      el.style.top = `${rect.top + window.pageYOffset + 24}px`;
      el.style.left = `${rect.left + window.pageXOffset}px`;
    }
  }, [chars.length, editor, index, search, target]);

  return (
    <Slate
      editor={editor}
      value={value}
      onChange={(value) => {
        setValue(value);
        const {selection} = editor;

        if (selection && Range.isCollapsed(selection)) {
          const [start] = Range.edges(selection);
          const wordBefore = Editor.before(editor, start, {unit: 'word'});
          const before = wordBefore && Editor.before(editor, wordBefore);
          const beforeRange = before && Editor.range(editor, before, start);
          const beforeText = beforeRange && Editor.string(editor, beforeRange);
          const beforeMatch = beforeText && beforeText.match(/^@(\w+)$/);
          const after = Editor.after(editor, start);
          const afterRange = Editor.range(editor, start, after);
          const afterText = Editor.string(editor, afterRange);
          const afterMatch = afterText.match(/^(\s|$)/);

          if (beforeMatch && afterMatch) {
            setTarget(beforeRange);
            setSearch(beforeMatch[1]);
            setIndex(0);
            return;
          }
        }

        setTarget(null);

        const headingOneArray =
          value.filter((item) => item.type === 'heading-one') || [];
        const title = headingOneArray[0] && headingOneArray[0].children[0].text;
        const json = {title: title, content: value};
        if (props.onChange) {
          props.onChange(json);
        }
      }}>
      <Editable
        renderElement={renderElement}
        renderLeaf={renderLeaf}
        onKeyDown={onKeyDown}
        autoFocus
      />
      {target && chars.length > 0 && (
        <Portal>
          <div
            ref={ref}
            style={{
              top: '-9999px',
              left: '-9999px',
              position: 'absolute',
              zIndex: 1,
              padding: '3px',
              background: 'white',
              borderRadius: '4px',
              boxShadow: '0 1px 5px rgba(0,0,0,.2)',
            }}>
            {chars.map((char, i) => (
              <div
                key={char}
                style={{
                  padding: '1px 3px',
                  borderRadius: '3px',
                  background: i === index ? '#B4D5FF' : 'transparent',
                }}>
                {char}
              </div>
            ))}
          </div>
        </Portal>
      )}
    </Slate>
  );
};

const withMentions = (editor) => {
  const {isInline, isVoid} = editor;

  editor.isInline = (element) => {
    return element.type === 'mention' ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    return element.type === 'mention' ? true : isVoid(element);
  };
  return editor;
};
const withNoloEditor = (editor) => {
  const {deleteBackward, insertText, insertData, isInline, isVoid} = editor;
  editor.isInline = (element) => {
    return element.type === 'link' ? true : isInline(element);
  };
  editor.isVoid = (element) => {
    return element.type === 'image' ? true : isVoid(element);
  };

  editor.insertData = (data) => {
    const html = data.getData('text/html');
    const text = data.getData('text/plain');
    const {files} = data;
    if (files && files.length > 0) {
      for (const file of files) {
        const reader = new FileReader();
        const [mime] = file.type.split('/');
        if (mime === 'image') {
          reader.addEventListener('load', () => {
            const url = reader.result;
            insertImage(editor, url);
          });
          reader.readAsDataURL(file);
        }
      }
    } else if (isImageUrl(text)) {
      insertImage(editor, text);
    }
    if (html) {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const fragment = deserialize(parsed.body);
      Transforms.insertFragment(editor, fragment);
      return;
    }
    insertData(data);
  };
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
        const newProperties = {
          type,
        };
        Transforms.setNodes(editor, newProperties, {
          match: (n) => Editor.isBlock(editor, n),
        });

        if (type === 'list-item') {
          const list = {type: 'bulleted-list', children: []};
          Transforms.wrapNodes(editor, list, {
            match: (n) =>
              !Editor.isEditor(n) &&
              SlateElement.isElement(n) &&
              n.type === 'list-item',
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
          !Editor.isEditor(block) &&
          SlateElement.isElement(block) &&
          block.type !== 'paragraph' &&
          Point.equals(selection.anchor, start)
        ) {
          const newProperties = {
            type: 'paragraph',
          };
          Transforms.setNodes(editor, newProperties);

          if (block.type === 'list-item') {
            Transforms.unwrapNodes(editor, {
              match: (n) =>
                !Editor.isEditor(n) &&
                SlateElement.isElement(n) &&
                n.type === 'bulleted-list',
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

const initialValue = [
  {
    type: 'paragraph',
    children: [
      {
        text:
          'The editor gives you full control over the logic you can add. For example, it\'s fairly common to want to add markdown-like shortcuts to editors. So that, when you start a line with "> " you get a blockquote that looks like this:',
      },
    ],
  },
  {
    type: 'block-quote',
    children: [{text: 'A wise quote.'}],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          'Order when you start a line with "## " you get a level-two heading, like this:',
      },
    ],
  },
  {
    type: 'heading-two',
    children: [{text: 'Try it out!'}],
  },
  {
    type: 'paragraph',
    children: [
      {
        text:
          'Try it out for yourself! Try starting a new line with ">", "-", or "#"s.',
      },
    ],
  },
];

export default CurrentEditor;
