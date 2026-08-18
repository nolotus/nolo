import {
  useDispatch,
  useSelector
} from "/public/assets/chunks/chunk-O47BZ5SQ.js";
import {
  authSlice_default,
  configureStore,
  dbSlice_default,
  messageSlice_default,
  settingSlice_default,
  spaceSlice_default,
  tableSlice_default
} from "/public/assets/chunks/chunk-RWWUEPWY.js";

// packages/app/reducer.ts
var reducer = {
  message: messageSlice_default,
  auth: authSlice_default,
  db: dbSlice_default,
  settings: settingSlice_default,
  space: spaceSlice_default,
  table: tableSlice_default
};

// packages/app/store.ts
var createAppStore = (options = {}) => {
  const { dbInstance, tokenManager, preloadedState } = options;
  if (dbInstance) {
    void import("/public/assets/chunks/syncMapping-UMT5WIIV.js").then(({ bindSyncMappingClientDb }) => {
      bindSyncMappingClientDb(dbInstance);
    }).catch(() => {
    });
  }
  const extra = {
    db: dbInstance || null,
    tokenManager: tokenManager || null
  };
  const store = configureStore({
    reducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({
      serializableCheck: false,
      thunk: { extraArgument: extra }
    }),
    preloadedState
  });
  void import("/public/assets/chunks/chatQueueReduxAdapter-PSDT7FNB.js").then(({ ChatQueueReduxAdapter }) => {
    extra.chatQueueAdapter = new ChatQueueReduxAdapter(store);
  }).catch(() => {
  });
  return store;
};
var useAppSelector = useSelector;
var useAppDispatch = () => useDispatch();

export {
  createAppStore,
  useAppSelector,
  useAppDispatch
};
