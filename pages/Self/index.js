import React, { useState } from "react";
import Template from "../../template";
import { WrapSelf } from "./styled";
import { useHistory } from "react-router-dom";
import Button from "../../components/Button";
import Input from "../../components/Input";
import Error from "../../components/Error";
import { Tab, Tabs } from "../../components/Tabs";
import { useSelector, useDispatch } from "react-redux";
import { connectDb, hostDb } from "../../common/db";

const Self = (props) => {
  let history = useHistory();
  const dispatch = useDispatch();
  const [type, setType] = useState("signin");
  const [error, setError] = useState();
  const { isLogin } = useSelector((state) => state.authData);
  const dbLogin = async (username, password) => {
    try {
      console.log('hostDb',hostDb)
      const doc = await hostDb.remote.login(username, password);
      console.log("logininfo", doc);
      if (doc.ok) {
        const userInfo = { name: doc.name, roles: doc.roles };
        const userDb = connectDb(doc.name);
        dispatch({ type: "loginSuccess", payload: { userInfo, userDb } });
        history.push("/setting");
      }
      return doc;
    } catch (err) {
      return err;
    }
  };
  const dbSignUp = async (username, password) => {
    try {
      const doc = await hostDb.remote.signUp(username, password);
      console.log("signUpinfo", doc);
      if (doc.ok) {
        alert("注册成功");
        dbLogin(username, password);
      }

      return doc;
    } catch (err) {
      return err;
    }
  };
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
