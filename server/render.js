import React from "react";
import Helmet from 'react-helmet';
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { renderRoutes } from "react-router-config";
import Routes from "../common/Routes";

const render = (req, store) => {
  const content = renderToString(
    <Provider store={store}>
      <StaticRouter location={req.path}>
    
      {renderRoutes(Routes)}
   
      </StaticRouter>
    </Provider>
  );
  const helmet = Helmet.renderStatic();

  const html = `
    <html ${helmet.htmlAttributes.toString()}>
      <head>
    <link rel="stylesheet" href="/common.css" type="text/css" />

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
};

export default render;
