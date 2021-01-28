import React, {useState, useEffect} from 'react';
// import "./style.scss";
// import { remoteDb,remoteAdress  } from "../../config/db";
import {useLocation} from 'react-router-dom';

function Life() {
  const [list, setList] = useState([]);
  // const [imglist, setImgList] = useState([]);

  function useQuery() {
    return new URLSearchParams(useLocation().search);
  }
  let query = useQuery();
  let taglist = query.get('tags').split(';');
  console.log('taglist', taglist);

  useEffect(() => {
    // getData();
  }, []);

  // async function getData(params) {
  //   try {
  //     const result = await remoteDb.getIndexes();
  //     console.log("allindex", result);
  //   } catch (err) {
  //     console.log(err);
  //   }

  //   try {
  //      remoteDb.createIndex({
  //       index: { fields: ["_attachments"] }
  //     });
  //   } catch (err) {
  //     console.log(err);
  //   }

  //   try {
  //     const result = await remoteDb.find({
  //       selector: {
  //         _attachments: { $gte: null }
  //       }
  //     });
  //     console.log("index", result);
  //     console.log("att", Object.keys(result.docs[0]._attachments));

  //     setList(result.docs);
  //     setImgList(Object.keys(result.docs[0]._attachments))
  //   } catch (err) {
  //     console.log("index", err);
  //   }
  // }

  return (
    <div>
      {/* <button onClick={() => getData()}>刷新</button> */}
      {list.map((item, index) => (
        <div key={item._id}>
          {/* <img
          alt=""
            src={`${remoteAdress}${item._id}/${imglist[index]}`}
          ></img> */}
        </div>
      ))}
    </div>
  );
}

export default Life;
