import express from "express";
import render from "./render";
import { matchRoutes } from "react-router-config";
import Routes from "../common/Routes";
import store from "../common/store";
const app = express();

app.use(express.static("public"));
app.get("*", (req, res) => {
  const promises = matchRoutes(Routes, req.path).map(({ route }) => {
    const component = route.component;
    return component.getInitialData ? component.getInitialData(store) : null;
  });
  Promise.all(promises).then(() => {
    const html = render(req, store);
    res.send(html);
  });
});
app.listen(80, () => console.log("Example app listening on port 80!"));
