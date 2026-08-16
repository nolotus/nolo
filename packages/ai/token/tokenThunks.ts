import { createAsyncThunk } from "@reduxjs/toolkit";
import { AppThunkApi } from "app/store";
import { getTokenStats, StatsParams, TokenStats } from "./query";
import { queryUserTokens, QueryParams, QueryResult } from "./queryUserTokens";

export const getTokenStatsThunk = createAsyncThunk<
    TokenStats[],
    StatsParams,
    AppThunkApi
>("token/getStats", async (params, { extra }) => {
    const { db } = extra;
    if (!db) throw new Error("Database not available");
    return await getTokenStats(db, params);
});

export const queryUserTokensThunk = createAsyncThunk<
    QueryResult,
    QueryParams,
    AppThunkApi
>("token/queryUserTokens", async (params, { extra }) => {
    const { db } = extra;
    if (!db) throw new Error("Database not available");
    return await queryUserTokens(db, params);
});
