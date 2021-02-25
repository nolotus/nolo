import React from 'react';
import {useSelector} from 'react-redux';
import {selectUserInfo} from '../../common/selector';
export const Guide = () => {
  const userInfo = useSelector(selectUserInfo);

  return <div>{userInfo.name}</div>;
};
