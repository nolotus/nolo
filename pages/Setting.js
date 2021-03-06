import React from 'react';
import {useDispatch} from 'react-redux';
import Template from '../template';
import {hostDb} from '../common/db';
import {BlockEditor} from '../components/Editor/blockEditor';
import {useHistory} from 'react-router-dom';

export const Setting = () => {
  const history = useHistory();
  const dispatch = useDispatch();
  const logout = () => {
    hostDb.remote.logOut(function (err, response) {
      dispatch({type: 'logout'});
      if (err) {
        // network error
      }
      history.push('/');
    });
  };
  return (
    <Template>
      <BlockEditor />
      <div onClick={logout}>退出登录</div>
    </Template>
  );
};
