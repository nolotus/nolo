
const initState ={
}
const reducer = (state = initState, action) => {
  switch (action.type) {
    case 'fetch':
      return {
        ...state,
        users: action.payload,
      };
    default:
      return state;
  }
};

export default reducer;