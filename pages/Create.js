import React, { useState } from "react";
import Template from "../template";
import { CurrentEditor } from "../components/Editor";
import _ from "lodash";
import { initialValue } from "../components/Editor/neweditor/constant";
import { dbNew, dbUpdate } from "../common/api";
import { localDb } from "../common/db";

const Create = () => {
  // if user is save once
  const [_id, setId] = useState();
  const [_rev, setRev] = useState();
  //handle  change
  const onChange = async (json) => {
    const { title, content } = json;
    const isSame = _.isEqual(content, initialValue);
    if (!isSame) {
      if (_id) {
        const type = "article";
        let data = { title, type, content, _id };
        let res = await dbUpdate(localDb, data);
        console.log("update", res);
        res && setRev(res.rev);
        console.log("result", res);
      } else {
        const data = {
          title,
          type: "article",
          content,
          status: "draft",
        };
        const res = await dbNew(localDb, data);
        console.log("res", res);
        setId(res.id);
      }
    }
  };
  return (
    <Template>
      {_rev}
      <CurrentEditor onChange={onChange}></CurrentEditor>
    </Template>
  );
};

export default Create;
