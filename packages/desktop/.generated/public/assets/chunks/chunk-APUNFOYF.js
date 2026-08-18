import {
  createAsyncThunk,
  fetchUserData
} from "/public/assets/chunks/chunk-RWWUEPWY.js";

// packages/database/actions/fetchUserData.ts
var fetchUserDataThunk = createAsyncThunk("db/fetchUserData", async ({ types, userId, includeDeleted }, { extra }) => {
  const { db } = extra;
  if (!db) {
    console.error("Database not available in fetchUserDataThunk");
    throw new Error("Database not available");
  }
  if (Array.isArray(types)) {
    return await fetchUserData(db, types, userId, { includeDeleted });
  }
  return await fetchUserData(db, types, userId, { includeDeleted });
});

export {
  fetchUserDataThunk
};
