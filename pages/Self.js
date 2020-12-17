



import React, { useState } from "react";
import Template from "../template"

import { useHistory } from "react-router-dom";
import Button from "../componets/Button";
import Input from "../../componets/Input";

import Error from "../../componets/Error";

import { Tab, Tabs } from "../../componets/Tabs";
import {WrapSelf} from './styled'
const Self = (props) => {
  let history = useHistory();
  const [type, setType] = useState("signin");
  const [error, setError] = useState();

  let { isLogin, dbLogin, dbSignUp,  } = useStore();

  isLogin && history.push("/setting");
  const [state, setstate] = useState({
    username: "",
    password: "",
  });
  const login = async () => {
    const result = await dbLogin(state.username, state.password);
    console.log("loginresult", result);
    if (result.error) {
      setError(result.message);
    }
  };
  const signup = async () => {
    const result = await dbSignUp(state.username, state.password);
    // console.log('result',result)

    if (result.error === "conflict") {
      setError("此用户名已被注册");
    }
  };
  const submit = (e) => {
    e.preventDefault();
    console.log(type);
    type === "signin" ? login() : signup();
  };

  const onChange = (key, value) => {
    console.log(key, value);

    setstate({ ...state, [key]: value });
  };

  return (
    <Template>
    <WrapSelf>
      <div>
        <Tabs>
          <Tab
            active={type === "signin"}
            onClick={() => {
              setType("signin");
            }}
          >
            登录
          </Tab>
          <Tab
            active={type === "signup"}
            onClick={() => {
              setType("signup");
            }}
          >
            注册
          </Tab>
        </Tabs>

        <form>
          <Error>{error}</Error>
          <Input
            label="名字"
            onChange={(e) => onChange("username", e.target.value)}
            name="name"
            type="text"
            id="inp"
            placeholder="&nbsp;"
          ></Input>

          <Input
            label="密码"
            onChange={(e) => onChange("password", e.target.value)}
            name="password"
            type="password"
            placeholder="&nbsp;"
          ></Input>
          <Button onClick={submit}>提交</Button>
        </form>
      </div>
    </WrapSelf>
    </Template>
  );
};

export default Self;
