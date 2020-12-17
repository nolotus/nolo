import React, { useState, useEffect } from "react";
import { Loading } from "../components/Loading";

// import Template from "../template"
const Home = () => {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    return () => {};
  }, []);
  return <div>{loading ? <Loading></Loading> : <Loading></Loading>}</div>;
};

export default Home;
