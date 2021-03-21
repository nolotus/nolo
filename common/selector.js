import {hostDb} from './db';

export const selectUserInfo = (state) => state.userInfo;
export const selectUserDb = (state) => state.userDb;
export const selectNavs = (state) => state.navs;
export const selectCurrentDb = (state) => {
  return state.userInfo ? state.userDb : hostDb;
};
