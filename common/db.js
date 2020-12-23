import PouchDB from "pouchdb";
import PouchDBAuth from "pouchdb-authentication";
import find from "pouchdb-find";
import { toHex } from "../common/tools";

const dbArray = ["nolotus.com/db","nolotus.xyz/db"];

// if in electron host is undefined ,so need default
// let hostname = window.location.hostname || defaultDBname;
// let hostDbName;

// if (hostname === "nolotus.com") {
//   hostDbName = defaultDBname;
// } else {
//   hostDbName =
//     window.location.hostname === "localhost"
//       ? defaultDBname
//       : `${hostArray[0]}-${hostArray[1]}`;
// }

let hostDbName = "admin";

// export const remoteAdress = `https://${dbArray[0]}/${dbName}/`;
PouchDB.plugin(PouchDBAuth).plugin(find);

//remote dbname is different local dbname
export const connectDb = (dbName) => {
  const remoteDbName= "userdb-" + toHex(dbName)
  const remoteAdress = `https://${dbArray[0]}/${remoteDbName}/`;
  const remote = new PouchDB(remoteAdress);
   const local = new PouchDB(dbName);
   local.sync(remote, {
    live: true,
    retry: true
  }).on('change', function (change) {
  //  console.log('同步中',change)
  }).on('complete', function (info) {
    // console.log('同步完成',info)
   }).on('paused', function (info) {
    // console.log('同步暂停',info)
  }).on('active', function (info) {
    // console.log('active',info)
  }).on('error', function (err) {
    // console.log('sync err',err)

  });
  
  
  return { remote,local };
};
// export const remoteDb = connectDb(dbName);

export const hostDb = connectDb(hostDbName);
export const localDb = new PouchDB("localDb");
export const linkDb = connectDb('_users');

// PouchDB.sync(dbName, remoteAdress);
