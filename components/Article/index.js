import React, { useState } from "react";
import { CurrentEditor } from "../../components/Editor";
import { isEqual } from "lodash";
import { useLocation } from "react-router-dom";
import { initialValue } from "../../components/Editor/neweditor/constant";
import { dbNew, dbUpdate } from "../../common/api";
import { localDb } from "../../common/db";
import PropTypes from "prop-types";
import Template from "../../template";

export const Article = (props) => {
  const [_id, setId] = useState(props._id);

  const useQuery = () => new URLSearchParams(useLocation().search);

  let query = useQuery();

  const [_rev, set_rev] = useState(query.get("rev"));
  const onChange = async (json) => {
    const { title, content } = json;
    const isSame = isEqual(content, initialValue);
    if (!isSame) {
      if (_id) {
        const type = "article";
        let data = { title, type, content, _id };
        let res = await dbUpdate(localDb, data);
        console.log("update", res);
        res && set_rev(res.rev);
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
      <CurrentEditor
        _id={_id}
        _rev={_rev}
        value={props.content}
        onChange={onChange}
      />
    </Template>
  );
};
Article.propTypes = {
  _id: PropTypes.string.isRequired,
  content: PropTypes.object,
};
