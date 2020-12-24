import express from "express";
import render from "./render";
import { matchRoutes } from "react-router-config";
import Routes from "../common/Routes";
import store from "../common/store";
import { isDevEnv } from "./config";
const app = express();
var proxy = require("express-http-proxy");
// app.use("/db", );
app.use(express.static("public"));
app.get("*", (req, res) => {
  console.log("req", req.hostname);
  if (req.hostname === "tw.db.nolotus.com") {
    proxy("http://localhost:5984");
  } else {
    const promises = matchRoutes(Routes, req.path).map(({ route }) => {
      const component = route.component;
      return component.getInitialData ? component.getInitialData(store) : null;
    });
    Promise.all(promises).then(() => {
      const html = render(req, store);
      res.send(html);
    });
  }
});

if (isDevEnv) {
  app.listen(80, () => console.log("Example app listening on port 80!"));
} else {
  require("greenlock-express")
    .init({
      packageRoot: process.cwd(),
      configDir: "./greenlock.d",

      // contact for security and critical bug notices
      maintainerEmail: "s@nolotus.com",

      // whether or not to run at cloudscale
      cluster: false,
    })
    // Serves on 80 and 443
    // Get's SSL certificates magically!
    .serve(app);
}
