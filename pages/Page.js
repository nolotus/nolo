import React,{useEffect,useState} from 'react'
import { dbGet } from "../common/api";
import { localDb } from "../common/db";
import {  useParams } from "react-router-dom";
import {Article} from '../components/Article'

export const Page= () => {

  const _id = useParams().id;
  const [doc, setDoc] = useState({});

    useEffect(() => {
        const getdata = async () => {
            const doc = await dbGet(localDb, _id);
            console.log("home获取数据", doc);
            doc !== undefined && setDoc(doc);
          };
          getdata();
        return () => {
            
        }
    }, [])
    return (
        <div>
            <Article {...doc} />
        </div>
    )
}
