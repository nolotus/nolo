import express from 'express';
import render from './render';
import {matchRoutes} from 'react-router-config';
import Routes from '../common/Routes';
import store from '../common/store';
import {isProdEnv, env} from './config';
const app = express();
const {createProxyMiddleware} = require('http-proxy-middleware');
if (isProdEnv) {
  const filter = function (pathname, req) {
    return req.hostname === 'tw.db.nolotus.com';
  };
  const dbProxy = createProxyMiddleware(filter, {
    target: 'http://localhost:5984',
    changeOrigin: true,
  });
  app.use('/', dbProxy);
}

app.use(express.static('public'));
// get request
app.get('*', (req, res) => {
  const promises = matchRoutes(Routes, req.path).map(({route}) => {
    const component = route.component;
    return component.getInitialData ? component.getInitialData(store) : null;
  });
  Promise.all(promises).then(() => {
    const html = render(req, store);
    res.send(html);
  });
});
console.log('env', env);
if (isProdEnv) {
  require('greenlock-express')
    .init({
      packageRoot: process.cwd(),
      configDir: './greenlock.d',
      // contact for security and critical bug notices
      maintainerEmail: 's@nolotus.com',
      // whether or not to run at cloudscale
      cluster: false,
    })
    // Serves on 80 and 443
    // Get's SSL certificates magically!
    .serve(app);
} else {
  app.listen(80, () => console.log('localhost develop 80!'));
}
