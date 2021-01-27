import styled from "styled-components";
export const WrapModal =styled.div`
.over-layer {
  position: fixed;
  top: 0;
  background-color: rgba(35, 35, 35, 0.5);
  width: 100%;
  height: 100%;
  z-index: 3;
}
//is just wrap another dom  ,not need width or style
.modal-content {
  display: flex;
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  top: 0;
  height: auto;

  z-index: 4;
  margin: 178px auto;

  p {
    font-size: 16px;
  }
}
`
export const WrapWarning =styled.div`
  width: 527px;
  padding: 34px 43px;
  border-radius: 10px;
  box-shadow: 0 2px 11px 0 rgba(158, 158, 166, 0.32);
  border: solid 1px #dadada;
  background-color: #ffffff;
  .title {
    text-align: center;
    margin-bottom: 26px;

    height: 35px;
    font-size: 20px;
    font-weight: 500;
    color: rgba(51, 51, 51, 1);
    line-height: 28px;
  }
  .content {
    color: #333;
    font-size: 16px;
    text-align: center;
  }
  .button-area {
    display: flex;
    justify-content: space-between;
    width: 85%;
    padding: 30px 0 0;
    margin: 0 auto;
  }
`