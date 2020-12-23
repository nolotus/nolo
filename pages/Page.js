import React, { useEffect, useState } from "react";
import { dbGet } from "../common/api";
import { hostDb } from "../common/db";
import { useParams } from "react-router-dom";
import { Article } from "../components/Article";
import Template from "../template";
import { LoadingBox } from "../components/Loading";

export const Page = (props) => {
  const _id = useParams().id || props._id;
  const [doc, setDoc] = useState();

  useEffect(() => {
    const getdata = async () => {
      const doc = await dbGet(hostDb.remote, _id);
      doc !== undefined && setDoc(doc);
    };
    getdata();
    return () => {};
  }, [_id]);
  return (
    <Template>
    {doc ? <Article doc={doc} />:<LoadingBox/>}
      
    </Template>
  );
};
