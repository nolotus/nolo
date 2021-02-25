import {defaultNavConfig} from '../config/menu';

const initState = {
  templateName: 'simple',
  userInfo: {},
  nav: defaultNavConfig,
  setting: {},
  authData: {isLogin: false},
  userDb: {},
  modalInfo: {isVisible: false},
};
const reducer = (state = initState, action) => {
  const {payload} = action;
  switch (action.type) {
    case 'fetch':
      return {
        ...state,
        users: action.payload,
      };
    case 'modal':
      return {
        ...state,
        modalInfo: {isVisible: true, ...payload.modalInfo},
      };
    case 'closeModal':
      return {
        ...state,
        modalInfo: {isVisible: false},
      };
    case 'loginSuccess':
      return {
        ...state,
        authData: {isLogin: true},
        userInfo: action.payload.userInfo,
        userDb: action.payload.userDb,
      };
    case 'logout':
      return {
        ...state,
        authData: {isLogin: false},
        userInfo: {},
      };
    case 'initSuccess':
      return {
        ...state,
        nav: action.payload.nav,
        setting: action.payload.setting,
      };
    default:
      return state;
  }
};

export default reducer;
