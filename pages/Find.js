import React,{useEffect,useState} from 'react'
import Template from "../template"
import UserCard from "../components/UserCard";
import { dbGet } from "../common/api";
import { hostDb } from "../common/db";

const Find = () => {
  const [friends, setFriends] = useState([]);
  useEffect(() => {
    const getData = async () => {
      console.log("getData");
      try {
        const result = await dbGet(hostDb.remote, "friends");
        console.log("result", result);
        result && setFriends(result.list);
      } catch (err) {
        console.log(err);
      }
    };
    getData();
    return () => {};
  }, []);
  return (
    <Template>

<div> 住在本站的站点</div>
      <div>
        {friends.map((item) => {
          return <UserCard name={item} key={item}></UserCard>;
        })}
      </div>

      <div> 添加你的个人网站，让更多人看到你（暂未开放）</div>

      <div>推荐的网站</div>

      <div>推荐的内容</div>
    </Template>
  )
}

export default Find
