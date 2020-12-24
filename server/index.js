import { matchRoutes } from "react-router-config";
import Routes from "../common/Routes";
import store from "../common/store";
import render from "./render";

require("greenlock-express")
    .init(function getConfig() {
        // Greenlock Config
        return {
            packageRoot: process.cwd(),
            configDir: "./greenlock.d",
            maintainerEmail: "s@nolotus.com",
            cluster: false
        };
    })
    .ready(httpsWorker);

function httpsWorker(glx) {
    // we need the raw https server
    var server = glx.httpsServer();
    var proxy = require("http-proxy").createProxyServer({ xfwd: true });

    // catches error events during proxying
    proxy.on("error", function(err, req, res) {
        console.error(err);
        res.statusCode = 500;
        res.end();
        return;
    });

    // We'll proxy websockets too
    server.on("upgrade", function(req, socket, head) {
        proxy.ws(req, socket, head, {
            ws: true,
            target: "ws://localhost:3000"
        });
    });
    // servers a node app that proxies requests to a localhost
    glx.serveApp(function(req, res) {
        if (req.hostname === "tw.db.nolotus.com") { 
        proxy.web(req, res, {
            target: "http://localhost:5984"
        });}
        else{
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
}
