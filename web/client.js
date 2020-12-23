import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter } from "react-router-dom";
import { renderRoutes } from "react-router-config";
import Routes from "../common/Routes";
import store from "../common/store"
import { Provider } from "react-redux";
import {themeMap,useTheme} from '../common/theme'

function Root() {
  const theme= themeMap.get('light')
  useTheme(theme)
  return (
  <Provider store={store}>
    <BrowserRouter>{renderRoutes(Routes)}</BrowserRouter>
  </Provider>
  );
}

ReactDOM.hydrate(<Root />, document.getElementById("root"));