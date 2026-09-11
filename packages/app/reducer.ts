// Root reducer map for web/desktop store.
// Redux is in deprecation mode: only 4 legacy domains remain active:
// - message: chat messages & stream state
// - db: database slice
// - settings: user preferences & server configuration
// - table: table rendering state
//
// Auth/session has been migrated out to AccountSessionCore.
// Ghost slices (plan, doc, space) have been migrated to module stores / DB.
import databaseReducer from "database/dbSlice";
import settingReducer from "app/settings/settingSlice";
import tableReducer from "render/table/tableSlice";
import messageReducer from "chat/messages/messageSlice";

// Using property getters guards against circular import TDZ during module evaluation.
export const reducer = {
  get message() { return messageReducer; },
  get db() { return databaseReducer; },
  get settings() { return settingReducer; },
  get table() { return tableReducer; },
};

export type RootReducer = typeof reducer;
