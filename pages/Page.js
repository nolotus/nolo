import React, {useEffect, useState} from 'react';
import {dbGet} from '../common/api';
import {useParams, useLocation} from 'react-router-dom';
import {Article} from '../components/Article';
import Template from '../template';
import {LoadingBox} from '../components/Loading';
import {localDb, hostDb} from '../common/db';

export const Page = (props) => {
  // function useQuery() {
  //   return new URLSearchParams(useLocation().search);
  // }
  // let query = useQuery();
  // const rev = query.get('rev');
  //props id from url or home
  const id = useParams().id || props.id;
  const [doc, setDoc] = useState();

  useEffect(() => {
    const getdata = async () => {
      const localDoc = await dbGet(localDb, id);
      if (localDoc) {
        setDoc(localDoc);
        return;
      } else {
        const hostDoc = await dbGet(hostDb.remote, id);

        if (hostDoc) {
          hostDoc !== undefined && setDoc(hostDoc);
        }
      }
    };
    getdata();
    return () => {};
  }, [id]);
  return <Template>{doc ? <Article doc={doc} /> : <LoadingBox />}</Template>;
};
