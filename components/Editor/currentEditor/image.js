import {Transforms} from 'slate';
import isUrl from 'is-url';
import imageExtensions from 'image-extensions';
import {useSelected, useFocused} from '../slate-react/index.es';
import {css} from 'emotion';
import React from 'react';

export const ImageElement = ({attributes, children, element}) => {
  const selected = useSelected();
  const focused = useFocused();
  return (
    <div {...attributes}>
      {children}
      <img
        src={element.url}
        className={css`
          display: block;
          max-width: 100%;
          max-height: 20em;
          box-shadow: ${selected && focused ? '0 0 0 2px blue;' : 'none'};
        `}
      />
    </div>
  );
};

export const insertImage = (editor, url) => {
  const text = {text: ''};
  const image = {type: 'image', url, children: [text]};
  Transforms.insertNodes(editor, image);
};
export const isImageUrl = (url) => {
  if (!url) {
    return false;
  }
  if (!isUrl(url)) {
    return false;
  }
  const ext = new URL(url).pathname.split('.').pop();
  return imageExtensions.includes(ext);
};
