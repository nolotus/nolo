import React, {useState, useEffect} from 'react';
import {LoadingPage} from '../components/Loading';
import {Page} from './Page';
import {dbGet} from '../common/api';
import {hostDb} from '../common/db';
import {useDispatch, useSelector} from 'react-redux';

// import Template from "../template"
const Home = () => {
  const [loading, setLoading] = useState(true);
  const dispatch = useDispatch();
  const {home} = useSelector((state) => state.setting);
  useEffect(() => {
    //get menu and setting from hostDb
    const fetchData = async () => {
      console.log('hostDb.remote', hostDb.remote);
      const menu = await dbGet(hostDb.remote, 'menu');
      console.log('menu xxx', menu);
      const setting = (await dbGet(hostDb.remote, 'setting')) || {};
      dispatch({type: 'initSuccess', payload: {menu, setting}});
      setLoading(false);
    };
    fetchData();
    return () => {};
  }, [dispatch]);
  return <>{loading ? <LoadingPage /> : <Page id={home} />}</>;
};

export default Home;
