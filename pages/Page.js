import React, {useEffect, useState} from 'react';
import {dbGet} from '../common/api';
import {useSelector} from 'react-redux';
import {useParams, useLocation} from 'react-router-dom';
import {Article} from '../components/Article';
import Template from '../template';
import {LoadingBox} from '../components/Loading';
import {localDb} from '../common/db';
import {selectCurrentDb} from '../common/selector';

export const Page = (props) => {
  // function useQuery() {
  //   return new URLSearchParams(useLocation().search);
  // }
  // let query = useQuery();
  // const rev = query.get('rev');
  //props id from url or home
  const id = useParams().id || props.id;
  const [doc, setDoc] = useState();
  const currentDb = useSelector(selectCurrentDb);
  console.log('currentDb', currentDb);
  useEffect(() => {
    const getdata = async () => {
      const localDoc = await dbGet(localDb, id);
      if (localDoc) {
        setDoc(localDoc);
        return;
      } else {
        const hostDoc = await dbGet(currentDb.remote, id);

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
