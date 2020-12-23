const initState = {
  templateName: "simple",
  userInfo: {},
  menu: [],
  setting: {},
  authData: { isLogin: false },
  userDb: {},
};
const reducer = (state = initState, action) => {
  switch (action.type) {
    case "fetch":
      return {
        ...state,
        users: action.payload,
      };
    case "loginSuccess":
      return {
        ...state,
        authData: { isLogin: true },
        userInfo: action.payload.userInfo,
        userDb: action.payload.userDb,
      };
      case "logout":
        return {
          ...state,
          authData: { isLogin: false },
          userInfo: {},
        };
    case "initSuccess":
      return {
        ...state,
        menu: action.payload.menu,
        setting: action.payload.setting,
      };
    default:
      return state;
  }
};

export default reducer;
