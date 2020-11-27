

export const dbAll = async (db,) => {
    try {
      const result = await db.allDocs({
        include_docs: true,
      });
      return result;
    } catch (err) {
      // console.log("err", err);
    }
  };
  export const dbGet = async (db, _id, option) => {
    try {
      const doc = await db.get(_id, option ? option : { attachments: true });
      return doc;
    } catch (err) {
      // console.log("err", err);
    }
  };
  
  export const dbNew = (db, params) => {
    try {
      let res = db.post({
        ...params,
      });
      // console.log(res);
      return res;
    } catch (error) {
      // console.log(error);
    }
  };
  
  export const dbUpdate = async (db, params) => {
    let res = await dbGet(db, params._id);
    // console.log("getResult", res);
    try {
      // console.log(params);
      const response = await db.put({
        ...params,
        _rev: res._rev,
        _attachments: res._attachments,
      });
      return response;
    } catch (err) {
      // console.log(err);
    }
  };
  