import { createAsyncThunk } from "@reduxjs/toolkit";
import { fetchUserData } from "../client/fetchUserData";
import { AppThunkApi } from "app/store";

export const fetchUserDataThunk = createAsyncThunk<
    any,
    { types: string | string[]; userId: string; includeDeleted?: boolean },
    AppThunkApi
>("db/fetchUserData", async ({ types, userId, includeDeleted }, { extra }) => {
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
