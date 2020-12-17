import React, { useState, useEffect } from "react";
import { localDb } from "../common/db";
import Template from "../template";
import { dbAll } from "../common/api";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Link } from "react-router-dom";
import ArticleTitle from "../components/ArticleTitle";
import { useDispatch } from "react-redux";

const Life = () => {
  const [list, setList] = useState([]);
  const dispatch = useDispatch();
  const getData = () => {
    dbAll(localDb).then((result) => {
      if (result) {
        console.log("result", result);
        setList(result.rows);
      }
    });
  };
  const goDelete = (id) => {
    localDb.get(id).then(async (doc) => {
      const result = await localDb.remove(doc);
      console.log("handleDetele", result);
      getData();
      closeModal()
    }).catch(function (err) {
      console.log(err);
    });
  };
  const modal = (modalInfo) => {
    dispatch({ type: "modal", modalInfo: { ...modalInfo, isVisible: true } });
  };
  const closeModal =()=> dispatch({ type: "modal", modalInfo: { isVisible: false } })
  useEffect(() => {
    dbAll(localDb).then((result) => {
      if (result) {
        console.log("result", result);
        setList(result.rows);
      }
    });
    return () => {};
  }, []);

  const handleDetele = async (id) => {
    modal({
      modalType: "warning",
      title: `确认删除？`,
      content: `删除内容不可恢复！`,
      buttons: [
        {
          text: "取消",
          className: "button-warning-cancel",
          onClick: closeModal,
        },
        {
          text: "确认",
          className: "button-warning-blue",
          onClick: () => {
            goDelete(id);
          },
        },
      ],
    });
  };
  return (
    <Template>
      {list.map((post) => (
        <ArticleTitle key={post.id}>
          <div>
            <Link to={{ pathname: post.doc._id }}>
              {post.doc.title || post.doc._id}
            </Link>
          </div>

          <div
            className="delete-button"
            onClick={() => handleDetele(post.doc._id)}
          >
            <FontAwesomeIcon icon={["fas", "times"]} />
          </div>

          {/*<p>{post.doc.content}</p>*/}
        </ArticleTitle>
      ))}
    </Template>
  );
};

export default Life;
