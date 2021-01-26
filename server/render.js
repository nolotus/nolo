import React from 'react';
import Helmet from 'react-helmet';
import {renderToString} from 'react-dom/server';
import {StaticRouter} from 'react-router-dom';
import {Provider} from 'react-redux';
import {renderRoutes} from 'react-router-config';
import {ServerStyleSheet} from 'styled-components';

import Routes from '../common/Routes';
const sheet = new ServerStyleSheet();

const render = (req, store) => {
  try {
    const content = renderToString(
      sheet.collectStyles(
        <Provider store={store}>
          <StaticRouter location={req.path}>
            {renderRoutes(Routes)}
          </StaticRouter>
        </Provider>,
      ),
    );

    const styleTags = sheet.getStyleTags();
    const helmet = Helmet.renderStatic();

    const html = `
      <html ${helmet.htmlAttributes.toString()}>
        <head>
      <link rel="stylesheet" href="/common.css" type="text/css" />
        ${styleTags}
        ${helmet.title.toString()}
        ${helmet.meta.toString()}
        ${helmet.link.toString()}
        </head>
        <body ${helmet.bodyAttributes.toString()}>
          <div id="root">${content}</div>
          <script src="bundle.js"></script>
        </body>
      </html>
    `;
    return html;
  } catch (error) {
    // handle error
    console.error(error);
  } finally {
    sheet.seal();
  }
};

export default render;
