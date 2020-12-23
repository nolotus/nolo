import React from "react";
import { useDispatch } from "react-redux";
import Template from "../template";

export const Setting = () => {
  const dispatch = useDispatch();
  const logout = dispatch({ type: "logout" });

  return (
    <Template>
      <div onClick={logout}>退出登录</div>
    </Template>
  );
};
