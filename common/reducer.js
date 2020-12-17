const initState ={
  templateName:'simple',
  userInfo:{},
  menu:[],
  setting:{},
  authData:{isLogin:false}
}
const reducer = (state = initState, action) => {
  switch (action.type) {
    case 'fetch':
      return {
        ...state,
        users: action.payload,
      };
      case 'loginSuccess':
        return {
          ...state,
          islogin: action.payload,
          userInfo:action.payload.userInfo
        };
        case 'initSuccess':
          return {
            ...state,
            menu: action.payload.menu,
            setting:action.payload.setting
          };
    default:
      return state;
  }
};

export default reducer;
